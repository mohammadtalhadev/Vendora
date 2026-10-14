import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { markCodCollected } from './cod';
import { supabaseDouble } from '../../../test/supabase-double';

/**
 * The test double does not emulate the Batch 42 COD RPCs, so these tests pin
 * the client's contract instead: the exact RPC name and arguments the
 * migration defines, and that a database refusal reaches the rider verbatim
 * rather than being swallowed as a success.
 */
describe('markCodCollected', () => {
  beforeEach(() => {
    supabaseDouble.reset();
  });

  it('calls mark_cod_collected with the delivery and the amount', async () => {
    await expect(markCodCollected('delivery-1', 1250)).rejects.toThrow(/could not record the cash/i);
    const call = supabaseDouble.rpcCalls.find((entry) => entry.fn === 'mark_cod_collected');
    expect(call?.args).toEqual({ p_delivery_id: 'delivery-1', p_amount: 1250 });
  });

  it('surfaces the database refusal instead of pretending the cash was recorded', async () => {
    supabaseDouble.failRpc('This order was not cash on delivery');
    await expect(markCodCollected('delivery-1', 500)).rejects.toThrow(/not cash on delivery/i);
  });
});
