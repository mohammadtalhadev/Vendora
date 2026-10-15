import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { toFriendlyError } from '../../../lib/friendly-error';
import type { Database } from '../../../types/database';
import type { User, UserRole, VendorStatus } from '../../../types/domain';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

type ProfileIdentity = Pick<
  ProfileRow,
  | 'id'
  | 'email'
  | 'name'
  | 'avatar_url'
  | 'roles'
  | 'vendor_status'
  | 'rejection_reason'
  | 'account_status'
  | 'account_status_reason'
>;

/**
 * Maps the row the backend actually authorizes on. `profiles.roles` is the source of
 * truth for access control; the JWT never carries roles, so nothing here trusts the
 * client's idea of who it is.
 */
function toDomainUser(profile: ProfileIdentity, vendorId?: string): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name || profile.email.split('@')[0],
    avatar: profile.avatar_url || undefined,
    roles: profile.roles as UserRole[],
    vendorStatus: profile.vendor_status as VendorStatus,
    accountStatus: profile.account_status ?? 'active',
    accountStatusReason: profile.account_status_reason ?? undefined,
    vendorId,
    rejectionReason: profile.rejection_reason ?? undefined,
  };
}

async function loadProfile(authUser: SupabaseUser): Promise<User | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'id, name, email, avatar_url, roles, vendor_status, rejection_reason, account_status, account_status_reason',
    )
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw toFriendlyError(error, { prefix: 'Could not load your profile', context: 'auth' });
  if (!profile) return null;

  const { data: store, error: storeError } = await supabase
    .from('vendor_profiles')
    .select('id')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (storeError) throw toFriendlyError(storeError, { prefix: 'Could not load your store', context: 'auth' });

  return toDomainUser(profile, store?.id);
}

/**
 * Re-reads the profile for the stored session, used when roles or vendor status may
 * have changed server-side (an application approved, a store suspended) without a
 * sign-in event.
 */
export async function refreshProfile(): Promise<{ user: User | null; session: Session | null }> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return { user: null, session: null };

  const user = await loadProfile(data.session.user);
  return { user, session: user ? data.session : null };
}

/** Password sign-in. Rejects a session whose profile row is missing. */
export async function signIn(email: string, password: string): Promise<{ user: User; session: Session }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw toFriendlyError(error, { context: 'auth' });
  if (!data.session) throw new Error('Sign-in succeeded but no session was returned.');

  const user = await loadProfile(data.user);
  if (!user) {
    await supabase.auth.signOut();
    throw new Error('This account has no profile. Sign out and contact support.');
  }
  return { user, session: data.session };
}

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  /** True when the project asks new emails to be confirmed before a session exists. */
  requiresEmailConfirmation: boolean;
}

export async function signUp(name: string, email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw toFriendlyError(error, { context: 'auth' });
  if (!data.user) throw new Error('Registration failed.');
  if (!data.session) return { user: null, session: null, requiresEmailConfirmation: true };

  const user = await loadProfile(data.user);
  if (!user) throw new Error('Your profile could not be created. Try again in a moment.');
  return { user, session: data.session, requiresEmailConfirmation: false };
}

/**
 * Re-sends the sign-up confirmation email for an address whose registration
 * is waiting on verification (the "Resend" action on the register page's
 * check-your-inbox panel). This is Supabase's dedicated resend call — it
 * re-issues the same activation link, it does not create a second account.
 */
export async function resendSignupConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: `${window.location.origin}/login` },
  });
  if (error) throw toFriendlyError(error, { prefix: 'Could not resend the confirmation email', context: 'auth' });
}

/**
 * Starts a password reset for the login page's "forgot password" action.
 * This lives in the session layer (the page used to call Supabase directly)
 * so a refusal — a rate limit, a server fault — reaches the visitor as the
 * mapped friendly sentence, never as GoTrue's raw text.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw toFriendlyError(error, { context: 'auth' });
}

/**
 * Verifies the email code (OTP) a new account was sent at sign-up — the
 * typed-code alternative to clicking the confirmation link (Batch 36). The
 * code only exists when the project's "Confirm signup" template carries
 * `{{ .Token }}`; on success Supabase returns a live session and the caller
 * lands the user exactly where an instantly-confirmed sign-up would.
 */
export async function verifySignupOtp(email: string, token: string): Promise<User> {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'signup',
  });
  if (error) {
    // The expired/invalid wording this function used to special-case now
    // lives in the friendly-error mapper, alongside every other refusal.
    throw toFriendlyError(error, { context: 'auth' });
  }
  if (!data.user) {
    throw new Error('That code could not be verified. Request a new code and try again.');
  }
  const user = await loadProfile(data.user);
  if (!user) throw new Error('Your profile could not be loaded. Try signing in instead.');
  return user;
}

/**
 * The columns `profiles_update_self` lets an owner write. `email` is absent: it mirrors
 * the auth email at signup and changing it here would desync the login credential, since
 * no trigger writes back from `profiles` to `auth.users`. `roles` is frozen by the policy.
 */
export interface ProfileIdentityUpdate {
  name?: string;
  avatar?: string;
}

export async function updateProfileIdentity(updates: ProfileIdentityUpdate): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw toFriendlyError(error, { prefix: 'Could not verify your session', context: 'auth' });

  const row: ProfileUpdate = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.avatar !== undefined) row.avatar_url = updates.avatar;
  if (Object.keys(row).length === 0) return;

  const { error: writeError } = await supabase.from('profiles').update(row).eq('id', data.user.id);
  if (writeError) throw toFriendlyError(writeError, { prefix: 'Failed to save your profile', context: 'auth' });
}

/**
 * Sets a new passcode. There is no current-password field on purpose: the bearer token of
 * this session is what proves the request, and Supabase ignores any the client would send.
 */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toFriendlyError(error, { prefix: 'Failed to update your password', context: 'auth' });
}

/**
 * Starts an email change for the signed-in account. Nothing changes yet:
 * Supabase emails a confirmation link to the NEW address, and the sign-in
 * credential only moves once that link is opened (with the project's secure
 * email-change setting, the current inbox is asked to confirm as well).
 * Until then the old address keeps signing in. `profiles.email` follows via
 * the on_auth_user_email_changed trigger (migration 20261014010100) — the
 * client cannot write it, by policy design.
 */
export async function requestEmailChange(newEmail: string): Promise<void> {
  const trimmed = newEmail.trim();
  const { data } = await supabase.auth.getUser();
  if (data.user?.email && data.user.email.toLowerCase() === trimmed.toLowerCase()) {
    throw new Error('That is already your sign-in email.');
  }
  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) throw toFriendlyError(error, { prefix: 'Could not start the email change', context: 'auth' });
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toFriendlyError(error, { context: 'auth' });
}

/**
 * Permanently deletes the signed-in account through the `delete-account`
 * Edge Function: it anonymizes the user's orders, removes their personal
 * rows and deletes the auth record. The typed confirmation travels in the
 * body exactly as the function demands (`{ confirm: 'DELETE' }`).
 * On failure the function's own error message is what the caller shows -
 * including the honest case where the function is not deployed at all.
 */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'delete-account',
    { body: { confirm: 'DELETE' } },
  );
  if (!error && data?.ok) return;

  let message = error?.message ?? data?.error ?? 'The account could not be deleted.';
  // A non-2xx response surfaces as a generic FunctionsHttpError; the function's
  // own `{ error }` body rides on its context response, and that is the
  // explanation the user deserves verbatim.
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.clone === 'function') {
    try {
      const body = (await context.clone().json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // Body was not JSON (e.g. a 404 from an undeployed function) - keep the
      // transport message rather than inventing one.
    }
  }
  throw new Error(message);
}

/** Signs the account out on every device, this one included. */
export async function signOutEverywhere(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) throw toFriendlyError(error, { context: 'auth' });
}

/**
 * Starts an OAuth sign-in; the browser is redirected to the provider and back to
 * `redirectTo` once it completes. Requires the provider to be enabled in the
 * Supabase dashboard, otherwise the server reports it.
 */
export async function signInWithOAuth(provider: 'google' | 'apple'): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) throw toFriendlyError(error, { context: 'auth' });
}

/**
 * Subscribes to auth changes and resolves the profile for each one.
 *
 * The listener contract keeps three outcomes apart, because collapsing them
 * is what used to kick signed-in staff out mid-session (Batch 59):
 * - (user, session): the profile the backend authorized.
 * - (null, null): there is no session — a definitive sign-out.
 * - (null, session): a session EXISTS but its profile read failed (a
 *   transient PostgREST/network refusal during restore or a token refresh).
 *   That is "unresolved", never "signed out": the caller must hold its
 *   current state instead of logging the user out or denying their role.
 *
 * Resolutions are ticketed: auth events can arrive faster than the two
 * profile round-trips resolve, and a stale read must never land after a
 * newer one and overwrite it with an older picture of the account.
 */
export function onAuthStateChange(
  listener: (user: User | null, session: Session | null) => void,
): () => void {
  let ticket = 0;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const mine = ++ticket;
    if (!session?.user) {
      listener(null, null);
      return;
    }
    void loadProfile(session.user).then(
      (user) => {
        if (mine === ticket) listener(user, user ? session : null);
      },
      () => {
        if (mine === ticket) listener(null, session);
      },
    );
  });
  return () => data.subscription.unsubscribe();
}
