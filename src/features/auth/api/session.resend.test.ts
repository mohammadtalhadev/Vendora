import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as session from './session';
import { supabaseDouble } from '../../../test/supabase-double';

describe('session.resendSignupConfirmation', () => {
  beforeEach(() => supabaseDouble.reset());

  it('asks Supabase to resend the signup confirmation to the given address', async () => {
    await session.resendSignupConfirmation('  ayesha@example.com  ');

    expect(supabaseDouble.resendCalls).toHaveLength(1);
    expect(supabaseDouble.resendCalls[0]).toMatchObject({
      type: 'signup',
      email: 'ayesha@example.com',
    });
  });

  it('surfaces a provider refusal instead of pretending the email went out', async () => {
    supabaseDouble.authState.resendError = { message: 'rate limited' };

    await expect(session.resendSignupConfirmation('ayesha@example.com')).rejects.toThrow(
      /Could not resend the confirmation email: Too many attempts/,
    );
  });
});
