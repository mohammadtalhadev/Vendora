import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as mfa from './mfa';
import { supabaseDouble } from '../../../test/supabase-double';

/**
 * Batch 64: the MFA API layer against the test double, whose TOTP surface
 * mirrors GoTrue (the one code it accepts is '123456'). These pin the
 * behaviours the staff portal is built on: enrollment activates a factor,
 * a verify raises the session to aal2, a stale unverified enrollment never
 * blocks a fresh one, and a wrong code changes nothing.
 */
describe('mfa api (Batch 64)', () => {
  beforeEach(() => {
    supabaseDouble.reset();
    supabaseDouble.seedAdmin();
    window.sessionStorage.clear();
  });

  it('starts at aal1 with no factors on a fresh account', async () => {
    expect(await mfa.getAalLevel()).toBe('aal1');
    const lists = await mfa.listTotpFactors();
    expect(lists?.verified).toHaveLength(0);
    expect(lists?.unverified).toHaveLength(0);
  });

  it('enrollment returns a QR + secret, and verifying the first code activates the factor at aal2', async () => {
    const enrollment = await mfa.enrollTotp();
    expect(enrollment.qrCode).toContain('data:image/svg+xml');
    expect(enrollment.secret.length).toBeGreaterThan(0);

    await mfa.verifyTotp(enrollment.factorId, '123456');

    const lists = await mfa.listTotpFactors();
    expect(lists?.verified).toHaveLength(1);
    expect(await mfa.getAalLevel()).toBe('aal2');
  });

  it('a stale unverified enrollment is cleaned up instead of blocking a fresh setup', async () => {
    supabaseDouble.seedMfaFactor('unverified');

    const enrollment = await mfa.enrollTotp();

    const lists = await mfa.listTotpFactors();
    expect(lists?.unverified).toHaveLength(1);
    expect(lists?.unverified[0].id).toBe(enrollment.factorId);
  });

  it('a wrong code is refused in plain words and the session stays at aal1', async () => {
    const factor = supabaseDouble.seedMfaFactor('verified');

    await expect(mfa.verifyTotp(factor.id, '000000')).rejects.toThrow(/not accepted/i);
    expect(await mfa.getAalLevel()).toBe('aal1');
  });

  it('a malformed code never reaches the service', async () => {
    const factor = supabaseDouble.seedMfaFactor('verified');
    await expect(mfa.verifyTotp(factor.id, '12 34')).rejects.toThrow(/6-digit/i);
  });

  it('unenrolling the only factor drops the account back to no-factor state', async () => {
    const factor = supabaseDouble.seedMfaFactor('verified');
    await mfa.verifyTotp(factor.id, '123456');
    expect(await mfa.getAalLevel()).toBe('aal2');

    await mfa.unenrollTotp(factor.id);

    const lists = await mfa.listTotpFactors();
    expect(lists?.verified).toHaveLength(0);
    expect(lists?.unverified).toHaveLength(0);
  });

  it('isStaffRoles names exactly the staff pair', () => {
    expect(mfa.isStaffRoles(['admin'])).toBe(true);
    expect(mfa.isStaffRoles(['support', 'customer'])).toBe(true);
    expect(mfa.isStaffRoles(['customer', 'vendor', 'rider'])).toBe(false);
    expect(mfa.isStaffRoles([])).toBe(false);
    expect(mfa.isStaffRoles(null)).toBe(false);
  });
});

describe('step-up freshness (Batch 64)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('no recorded proof means a step-up is needed', () => {
    expect(mfa.needsStepUp()).toBe(true);
  });

  it('a proof inside the 10-minute window is fresh', () => {
    const now = Date.now();
    mfa.markStepUpVerified(now - 5 * 60 * 1000);
    expect(mfa.needsStepUp(now)).toBe(false);
    expect(mfa.getStepUpVerifiedAt()).toBe(now - 5 * 60 * 1000);
  });

  it('a proof older than the window is stale', () => {
    const now = Date.now();
    mfa.markStepUpVerified(now - (mfa.STEP_UP_MAX_AGE_MS + 1));
    expect(mfa.needsStepUp(now)).toBe(true);
  });

  it('clearing the proof (sign-out) makes the next action ask again', () => {
    mfa.markStepUpVerified();
    expect(mfa.needsStepUp()).toBe(false);
    mfa.clearStepUp();
    expect(mfa.needsStepUp()).toBe(true);
  });
});

/**
 * Batch 86 (TEMPORARY — remove with the mfa_exemptions table): the exemption
 * check the staff flows consult. It must answer only about the signed-in
 * caller and fail closed: false is the default, the seeded row is the only
 * way to true, and an RPC failure reads as not exempt.
 */
describe('mfa testing exemption (Batch 86)', () => {
  beforeEach(() => {
    supabaseDouble.reset();
    supabaseDouble.seedAdmin();
    window.sessionStorage.clear();
  });

  it('is false by default — an empty exemption list exempts nobody', async () => {
    expect(await mfa.isMfaExempt()).toBe(false);
  });

  it('is true once the caller holds an exemption row', async () => {
    supabaseDouble.seedMfaExemption('admin-1');
    expect(await mfa.isMfaExempt()).toBe(true);
  });

  it("another account's exemption row does not exempt this caller", async () => {
    supabaseDouble.seedMfaExemption('someone-else');
    expect(await mfa.isMfaExempt()).toBe(false);
  });

  it('fails closed: an RPC failure reads as not exempt', async () => {
    supabaseDouble.seedMfaExemption('admin-1');
    supabaseDouble.failRpc('boom');
    try {
      expect(await mfa.isMfaExempt()).toBe(false);
    } finally {
      supabaseDouble.failRpc(null);
    }
  });
});

/**
 * Batch 88: the already-set-up dead end. An account that already holds a
 * VERIFIED factor must never be walked into a fresh enrollment (GoTrue
 * refuses the duplicate friendly name, and that refusal once surfaced as
 * the sign-up "email already exists" sentence). enrollTotp answers with
 * the typed MfaAlreadyEnrolledError instead, and a stale factor that
 * refuses removal degrades to the same honest error — never a lockout,
 * never a misleading one.
 */
describe('enrollTotp already-set-up handling (Batch 88)', () => {
  beforeEach(() => {
    supabaseDouble.reset();
    supabaseDouble.seedAdmin();
    window.sessionStorage.clear();
  });

  it('refuses up front when a verified factor already exists — no enroll is attempted', async () => {
    supabaseDouble.seedMfaFactor('verified');

    const failure: unknown = await mfa.enrollTotp().then(
      () => null,
      (cause: unknown) => cause,
    );

    expect(failure).toBeInstanceOf(mfa.MfaAlreadyEnrolledError);
    expect(mfa.isMfaAlreadyEnrolledError(failure)).toBe(true);
    expect((failure as Error).message).toMatch(/authenticator is already set up/i);
    expect((failure as Error).message).not.toMatch(/sign in instead/i);
    expect(supabaseDouble.auth.mfa.enroll).not.toHaveBeenCalled();
  });

  it('unenrolls a stale unverified factor before enrolling', async () => {
    const stale = supabaseDouble.seedMfaFactor('unverified');

    await mfa.enrollTotp();

    expect(supabaseDouble.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: stale.id });
    expect(supabaseDouble.auth.mfa.enroll).toHaveBeenCalledTimes(1);
  });

  it('a stale factor that will not remove, plus an enroll conflict, surfaces the honest typed error', async () => {
    supabaseDouble.seedMfaFactor('unverified');
    // The stale factor refuses removal (it keeps the friendly name)…
    supabaseDouble.auth.mfa.unenroll.mockResolvedValueOnce({
      data: null,
      error: { message: 'Factor not found', code: 'factor_not_found' },
    });
    // …so GoTrue refuses the enroll with its factor-name conflict.
    supabaseDouble.auth.mfa.enroll.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'A factor with the friendly name "Vendora authenticator" already exists',
        code: 'mfa_factor_name_conflict',
        status: 422,
      },
    });

    const failure: unknown = await mfa.enrollTotp().then(
      () => null,
      (cause: unknown) => cause,
    );

    expect(failure).toBeInstanceOf(mfa.MfaAlreadyEnrolledError);
    expect((failure as Error).message).toMatch(/authenticator is already set up/i);
    expect((failure as Error).message).not.toMatch(/email already exists/i);
    expect(supabaseDouble.auth.mfa.enroll).toHaveBeenCalledTimes(1);
  });

  it('an enroll conflict that arrives by wording alone (no code) is translated the same way', async () => {
    supabaseDouble.auth.mfa.enroll.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'A factor with the friendly name "Vendora authenticator" already exists',
      },
    });

    await expect(mfa.enrollTotp()).rejects.toBeInstanceOf(mfa.MfaAlreadyEnrolledError);
  });

  it('a non-conflict enroll failure keeps the friendly mapping, not the typed error', async () => {
    supabaseDouble.auth.mfa.enroll.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error querying schema', status: 500 },
    });

    const failure: unknown = await mfa.enrollTotp().then(
      () => null,
      (cause: unknown) => cause,
    );

    expect(failure).not.toBeInstanceOf(mfa.MfaAlreadyEnrolledError);
    expect((failure as Error).message).toMatch(/Could not start authenticator setup/i);
  });
});
