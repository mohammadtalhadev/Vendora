import { supabase } from '../../../lib/supabase';
import { MFA_FACTOR_CONFLICT_TEXT, toFriendlyError } from '../../../lib/friendly-error';

/**
 * mfa — the TOTP two-factor layer (Batch 64).
 *
 * Staff accounts prove a second factor at the staff portal before any staff
 * console renders: a session that has only passed the password check sits at
 * aal1, and a session that has also verified a TOTP challenge sits at aal2.
 * The functions below are the only place the app talks to `supabase.auth.mfa`;
 * every call is defensive, because a client built without the MFA surface
 * (an old test double, a stubbed client) must degrade to "no factor, aal1"
 * instead of crashing the sign-in flow it was asked to protect.
 */

export type AalLevel = 'aal1' | 'aal2';

export interface TotpFactor {
  id: string;
  status: 'verified' | 'unverified';
  createdAt: string;
  friendlyName?: string;
}

export interface TotpFactorLists {
  verified: TotpFactor[];
  unverified: TotpFactor[];
}

export interface TotpEnrollment {
  factorId: string;
  /** SVG data URI Supabase returns for authenticator-app scanning. */
  qrCode: string;
  /** The manual-entry secret, for apps that cannot scan. */
  secret: string;
  uri: string;
}

/** Staff = the roles the staff portal and the AAL2 console gate protect. */
export function isStaffRoles(roles: readonly string[] | null | undefined): boolean {
  return Boolean(roles?.includes('admin') || roles?.includes('support'));
}

interface RawFactor {
  id: string;
  status?: string;
  created_at?: string;
  friendly_name?: string;
  factor_type?: string;
}

/** The session's current assurance level; any failure reads as aal1. */
export async function getAalLevel(): Promise<AalLevel> {
  try {
    const mfa = supabase.auth.mfa;
    if (!mfa?.getAuthenticatorAssuranceLevel) return 'aal1';
    const { data, error } = await mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return 'aal1';
    return data.currentLevel === 'aal2' ? 'aal2' : 'aal1';
  } catch {
    return 'aal1';
  }
}

/**
 * The account's TOTP factors, split by state — or null when the MFA surface
 * could not be read at all (callers treat null as "unknown", never as proof
 * that no factor exists).
 */
export async function listTotpFactors(): Promise<TotpFactorLists | null> {
  try {
    const mfa = supabase.auth.mfa;
    if (!mfa?.listFactors) return null;
    const { data, error } = await mfa.listFactors();
    if (error || !data) return null;
    const raw: RawFactor[] = (data.totp ?? data.all ?? []).filter(
      (factor) => !factor.factor_type || factor.factor_type === 'totp',
    );
    const toFactor = (factor: RawFactor): TotpFactor => ({
      id: factor.id,
      status: factor.status === 'verified' ? 'verified' : 'unverified',
      createdAt: factor.created_at ?? '',
      friendlyName: factor.friendly_name,
    });
    return {
      verified: raw.filter((f) => f.status === 'verified').map(toFactor),
      unverified: raw.filter((f) => f.status !== 'verified').map(toFactor),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Already-set-up enrollments (Batch 88)
//
// GoTrue refuses to enrol a second factor under a friendly name the account
// already uses. When that refusal — or a factor list that already holds a
// VERIFIED factor — says the account is protected already, enrollTotp
// throws this typed error instead of letting the refusal be dressed up as
// the sign-up "email already exists" sentence. The UI branches on it: the
// staff portal moves the person to the code step, because what they
// actually need is to enter a code, not to set anything up.
// ---------------------------------------------------------------------------

/** Stable branch code carried by MfaAlreadyEnrolledError. */
export const MFA_ALREADY_ENROLLED_CODE = 'mfa_already_enrolled';

export class MfaAlreadyEnrolledError extends Error {
  readonly code = MFA_ALREADY_ENROLLED_CODE;

  constructor(message: string = MFA_FACTOR_CONFLICT_TEXT) {
    super(message);
    this.name = 'MfaAlreadyEnrolledError';
  }
}

/** True for the typed error above, including a plain object carrying its code. */
export function isMfaAlreadyEnrolledError(cause: unknown): cause is MfaAlreadyEnrolledError {
  if (cause instanceof MfaAlreadyEnrolledError) return true;
  return Boolean(
    cause &&
      typeof cause === 'object' &&
      (cause as { code?: unknown }).code === MFA_ALREADY_ENROLLED_CODE,
  );
}

/**
 * The raw shapes GoTrue answers a duplicate enrollment with: its
 * `mfa_factor_name_conflict` code, or — on responses that arrive without
 * a code — the sentence naming the factor that already exists.
 */
function isFactorConflictError(error: unknown): boolean {
  const shape = error as { code?: unknown; message?: unknown } | null;
  if (!shape || typeof shape !== 'object') return false;
  if (shape.code === 'mfa_factor_name_conflict') return true;
  const message = typeof shape.message === 'string' ? shape.message : '';
  return /factor/i.test(message) && /already exists/i.test(message);
}

/**
 * Starts a fresh TOTP enrollment. An abandoned earlier attempt leaves an
 * UNVERIFIED factor behind, and Supabase refuses look-alike enrollments
 * while it lingers — so stale unverified factors are removed first. That
 * cleanup is what keeps forced enrollment at the staff portal from ever
 * becoming a dead end.
 *
 * An account that already holds a VERIFIED factor has nothing to set up:
 * enrolling again can only end in the service's name-conflict refusal, so
 * the typed MfaAlreadyEnrolledError is thrown before any enroll is
 * attempted and the caller moves the person to the code step instead
 * (Batch 88). A stale factor that refuses removal is not fatal either —
 * the enroll still runs, and a conflict there becomes the same typed
 * error rather than a misleading sentence about the account's email.
 */
export async function enrollTotp(): Promise<TotpEnrollment> {
  const existing = await listTotpFactors();
  if (existing?.verified.length) {
    throw new MfaAlreadyEnrolledError();
  }
  if (existing) {
    let cleanupFailed = false;
    for (const stale of existing.unverified) {
      try {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: stale.id });
        if (unenrollError) cleanupFailed = true;
      } catch {
        cleanupFailed = true;
      }
    }
    if (cleanupFailed) {
      // A stale factor that would not remove may still hold the friendly
      // name the enroll below wants. Re-read the list once before trying:
      // a verified factor that has since appeared means the account is
      // already set up; anything else, the enroll itself decides — and a
      // conflict there is translated below, never swallowed.
      const recheck = await listTotpFactors();
      if (recheck?.verified.length) throw new MfaAlreadyEnrolledError();
    }
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Vendora authenticator',
  });
  if (error) {
    if (isFactorConflictError(error)) throw new MfaAlreadyEnrolledError();
    throw toFriendlyError(error, { prefix: 'Could not start authenticator setup', context: 'auth' });
  }
  if (!data?.totp) {
    throw new Error('Authenticator setup did not return a code to scan. Try again in a moment.');
  }
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/**
 * Challenges the factor and verifies the 6-digit code the user typed. A
 * wrong code rejects with the friendly refusal and changes nothing — the
 * caller stays on the code step and the user simply tries again.
 */
export async function verifyTotp(factorId: string, code: string): Promise<void> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error('Enter the 6-digit code from your authenticator app.');
  }
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error) {
    throw toFriendlyError(challenge.error, { prefix: 'Could not start the code check', context: 'auth' });
  }
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: trimmed,
  });
  if (error) {
    // A wrong code is a user typo, not a server fault: it gets one plain
    // sentence (and no error-log reference), so the person still standing on
    // the code step knows to simply try the next code. Anything else — an
    // expired challenge, a transport failure — keeps the mapped treatment.
    const shape = error as { code?: string; message?: string };
    if (
      shape.code === 'mfa_verification_failed' ||
      /invalid.*(totp|code)|(totp|code).*invalid/i.test(shape.message ?? '')
    ) {
      throw new Error('That code was not accepted. Check the code in your authenticator app and try again.');
    }
    throw toFriendlyError(error, { prefix: 'That code was not accepted', context: 'auth' });
  }
}

// ---------------------------------------------------------------------------
// TEMPORARY testing exemption (Batch 86) — remove with the mfa_exemptions
// table. While the owner tests the staff consoles, named accounts may be
// exempted from the second factor by inserting a row into
// `public.mfa_exemptions` (SQL editor / service role only — no client can
// write that table). The RPC below answers only about the CALLER, and every
// consumer treats a "yes" as satisfying the MFA requirements the way aal2 +
// a fresh step-up proof would. The check fails CLOSED on purpose: an RPC
// error, a missing migration, or a client without the rpc surface all read
// as NOT exempt, so this code deployed before (or after the removal of)
// the migration changes nothing.
// ---------------------------------------------------------------------------

/** True only when the signed-in account holds a testing exemption row. */
export async function isMfaExempt(): Promise<boolean> {
  try {
    if (typeof supabase.rpc !== 'function') return false;
    const { data, error } = await supabase.rpc('is_mfa_exempt');
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/** Removes a factor. The caller decides when this is allowed (see the settings card). */
export async function unenrollTotp(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    throw toFriendlyError(error, { prefix: 'Could not remove the authenticator', context: 'auth' });
  }
}

// ---------------------------------------------------------------------------
// Step-up freshness (Batch 64)
//
// Entering a staff console proves the second factor once (the AAL2 gate).
// Sensitive actions inside the console — suspending an account, moving a
// commission rate, issuing a refund — ask again when the last proof is
// older than this window, so a console left open on a shared machine cannot
// be used to move money or lock accounts hours later. The marker is a
// convenience timestamp in sessionStorage (per tab session, gone when the
// browser session ends); it grants nothing by itself — the verify it gates
// is a real TOTP challenge against the account's factor.
// ---------------------------------------------------------------------------

export const STEP_UP_MAX_AGE_MS = 10 * 60 * 1000;
const STEP_UP_KEY = 'vendora:mfa-verified-at';

export function markStepUpVerified(at: number = Date.now()): void {
  try {
    window.sessionStorage.setItem(STEP_UP_KEY, String(at));
  } catch {
    // Storage unavailable: the next sensitive action simply asks again.
  }
}

export function getStepUpVerifiedAt(): number | null {
  try {
    const raw = window.sessionStorage.getItem(STEP_UP_KEY);
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function needsStepUp(now: number = Date.now()): boolean {
  const at = getStepUpVerifiedAt();
  return at === null || now - at > STEP_UP_MAX_AGE_MS;
}

export function clearStepUp(): void {
  try {
    window.sessionStorage.removeItem(STEP_UP_KEY);
  } catch {
    // Nothing to clear where storage is unavailable.
  }
}
