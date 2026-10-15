import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { inviteRider, validateRiderInvite } from './logistics';
import { supabaseDouble } from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
});

describe('validateRiderInvite', () => {
  it('refuses a missing name and a malformed email before anything is sent', () => {
    expect(validateRiderInvite({ email: 'rider@example.com', name: '  ' })).toMatch(/full name/i);
    expect(validateRiderInvite({ email: 'not-an-email', name: 'Ravi Rider' })).toMatch(/valid email/i);
    expect(validateRiderInvite({ email: 'ravi@example.com', name: 'Ravi Rider' })).toBeNull();
  });
});

describe('inviteRider', () => {
  it('invokes the invite-rider function with a trimmed, lowercased payload', async () => {
    supabaseDouble.functionsState.result = {
      data: { ok: true, userId: 'rider-1', alreadyInvited: false },
      error: null,
    };
    const result = await inviteRider({
      email: '  Ravi@Example.COM ',
      name: '  Ravi Rider ',
      phone: ' 0300 5550143 ',
      vehicle: 'Cargo Van',
    });
    expect(result).toEqual({ userId: 'rider-1', alreadyInvited: false });
    expect(supabaseDouble.functionsState.calls).toEqual([
      {
        name: 'invite-rider',
        body: { email: 'ravi@example.com', name: 'Ravi Rider', phone: '0300 5550143', vehicle: 'Cargo Van' },
      },
    ]);
  });

  it('defaults the vehicle to Motorcycle when none is picked', async () => {
    supabaseDouble.functionsState.result = {
      data: { ok: true, userId: 'rider-2', alreadyInvited: true },
      error: null,
    };
    const result = await inviteRider({ email: 'a@b.co', name: 'A Rider' });
    expect(result.alreadyInvited).toBe(true);
    expect(supabaseDouble.functionsState.calls[0].body).toMatchObject({ vehicle: 'Motorcycle', phone: '' });
  });

  it('refuses invalid input without invoking the function', async () => {
    await expect(inviteRider({ email: 'nope', name: 'Ravi' })).rejects.toThrow(/valid email/i);
    expect(supabaseDouble.functionsState.calls).toEqual([]);
  });

  it('surfaces the function’s own refusal sentence (non-admin) through the friendly mapper', async () => {
    // Mirrors a real FunctionsHttpError: generic transport message, the
    // function's `{ error }` body riding on the context response.
    supabaseDouble.functionsState.result = {
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          clone: () => ({ json: async () => ({ error: 'Only administrators can invite riders' }) }),
        },
      },
    };
    await expect(inviteRider({ email: 'a@b.co', name: 'A Rider' })).rejects.toThrow(/Only administrators can invite riders/);
  });

  it('surfaces an undeployed function as a send failure, never as success', async () => {
    // Default double outcome: transport-style refusal, no result set.
    await expect(inviteRider({ email: 'a@b.co', name: 'A Rider' })).rejects.toThrow(/Could not send the rider invite/);
  });
});
