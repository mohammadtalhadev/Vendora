import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as session from './session';
import { supabaseDouble } from '../../../test/supabase-double';

describe('session.verifySignupOtp', () => {
  beforeEach(() => supabaseDouble.reset());

  it('verifies the code against Supabase and returns the loaded profile', async () => {
    supabaseDouble.authState.confirmEmail = true;
    await session.signUp('Ayesha Khan', 'ayesha@example.com', 'ValidPass123!');

    const user = await session.verifySignupOtp('  ayesha@example.com ', ' 123456 ');

    expect(supabaseDouble.verifyOtpCalls).toHaveLength(1);
    expect(supabaseDouble.verifyOtpCalls[0]).toMatchObject({
      email: 'ayesha@example.com',
      token: '123456',
      type: 'signup',
    });
    expect(user).toMatchObject({ email: 'ayesha@example.com', roles: ['customer'] });
  });

  it('translates an expired/invalid token refusal into a readable message', async () => {
    supabaseDouble.authState.verifyOtpError = { message: 'Token has expired or is invalid' };

    await expect(session.verifySignupOtp('ayesha@example.com', '000000')).rejects.toThrow(
      /incorrect or has expired/i,
    );
  });

  it('maps unrelated provider failures instead of leaking their raw text', async () => {
    supabaseDouble.authState.verifyOtpError = { message: 'Network request failed' };

    await expect(session.verifySignupOtp('ayesha@example.com', '123456')).rejects.toThrow(
      /Can't reach Vendora/,
    );
  });

  it('refuses cleanly when the address never signed up', async () => {
    await expect(session.verifySignupOtp('ghost@example.com', '123456')).rejects.toThrow(
      /incorrect or has expired/i,
    );
  });
});
