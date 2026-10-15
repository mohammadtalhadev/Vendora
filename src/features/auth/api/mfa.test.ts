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
