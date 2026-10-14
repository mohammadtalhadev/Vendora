import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import type { User, UserRole, VendorStatus } from '../../../types/domain';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

type ProfileIdentity = Pick<
  ProfileRow,
  'id' | 'email' | 'name' | 'avatar_url' | 'roles' | 'vendor_status' | 'rejection_reason'
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
    vendorId,
    rejectionReason: profile.rejection_reason ?? undefined,
  };
}

async function loadProfile(authUser: SupabaseUser): Promise<User | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url, roles, vendor_status, rejection_reason')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  if (!profile) return null;

  const { data: store, error: storeError } = await supabase
    .from('vendor_profiles')
    .select('id')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (storeError) throw new Error(`Could not load your store: ${storeError.message}`);

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
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(`Could not resend the confirmation email: ${error.message}`);
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
  if (error) throw new Error(`Could not verify your session: ${error.message}`);

  const row: ProfileUpdate = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.avatar !== undefined) row.avatar_url = updates.avatar;
  if (Object.keys(row).length === 0) return;

  const { error: writeError } = await supabase.from('profiles').update(row).eq('id', data.user.id);
  if (writeError) throw new Error(`Failed to save your profile: ${writeError.message}`);
}

/**
 * Sets a new passcode. There is no current-password field on purpose: the bearer token of
 * this session is what proves the request, and Supabase ignores any the client would send.
 */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(`Failed to update your password: ${error.message}`);
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
  if (error) throw new Error(`Could not start the email change: ${error.message}`);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
}

/**
 * Subscribes to auth changes and resolves the profile for each one. A null user means
 * signed out, or a session whose profile could not be read.
 */
export function onAuthStateChange(
  listener: (user: User | null, session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      listener(null, null);
      return;
    }
    void loadProfile(session.user).then(
      (user) => listener(user, user ? session : null),
      () => listener(null, null),
    );
  });
  return () => data.subscription.unsubscribe();
}
