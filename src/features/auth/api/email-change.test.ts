import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { requestEmailChange } from './session';
import { profileRow, supabaseDouble } from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: 'user-1', email: 'old@example.pk', name: 'Alex Buyer' }));
  supabaseDouble.authState.session = {
    access_token: 'test-access-token',
    user: { id: 'user-1', email: 'old@example.pk' },
  };
});

describe('requestEmailChange', () => {
  it('asks Supabase to start the change at the NEW address (updateUser with the email)', async () => {
    await requestEmailChange('  new@example.pk  ');

    expect(supabaseDouble.updateUserCalls).toEqual([{ email: 'new@example.pk' }]);
  });

  it('leaves the current sign-in email untouched — the change is pending until the link is opened', async () => {
    await requestEmailChange('new@example.pk');

    // The double mirrors Supabase: updateUser({email}) does not move the
    // session's email. The credential changes only on confirmation.
    expect(supabaseDouble.authState.session?.user.email).toBe('old@example.pk');
  });

  it('refuses the address the account already signs in with', async () => {
    await expect(requestEmailChange('OLD@example.pk')).rejects.toThrow(/already your sign-in email/);
    expect(supabaseDouble.updateUserCalls).toEqual([]);
  });

  it('surfaces a Supabase refusal instead of pretending the link was sent', async () => {
    supabaseDouble.authState.updateUserError = { message: 'Email rate limit exceeded' };
    await expect(requestEmailChange('new@example.pk')).rejects.toThrow(/rate limit/);
  });
});
