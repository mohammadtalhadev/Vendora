import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hand-rolled rpc stub: the shared supabase double only implements the RPCs
// that existed when it was written; broadcast_email came later.
const stub = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: stub.rpc },
  isSupabaseConfigured: true,
  TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
}));

import { broadcastEmail } from './notifications';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('broadcastEmail', () => {
  it('calls broadcast_email with the audience, title and message, and returns the queued count', async () => {
    stub.rpc.mockResolvedValue({ data: 7, error: null });

    const queued = await broadcastEmail({
      audience: 'vendor',
      title: 'Payout schedule change',
      message: 'Payouts now settle on Fridays.',
    });

    expect(queued).toBe(7);
    expect(stub.rpc).toHaveBeenCalledWith('broadcast_email', {
      p_role_target: 'vendor',
      p_title: 'Payout schedule change',
      p_message: 'Payouts now settle on Fridays.',
    });
  });

  it("surfaces the RPC's refusal instead of reporting a queue that never happened", async () => {
    stub.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Only staff can broadcast an email' },
    });

    await expect(
      broadcastEmail({ audience: 'all', title: 'x', message: 'y' }),
    ).rejects.toThrow('Only staff can broadcast an email');
  });
});
