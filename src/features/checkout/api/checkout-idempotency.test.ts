import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as checkout from './checkout';
import { supabaseDouble } from '../../../test/supabase-double';

const placedFixture = {
  orderId: 'order-1',
  subOrders: [],
  subtotal: 10,
  discountTotal: 0,
  shippingTotal: 0,
  grandTotal: 10,
  paymentStatus: 'pending',
  paymentDetails: { method: 'cod' },
};

beforeEach(() => {
  supabaseDouble.reset();
  checkout.resetOrderAttemptKey();
});

describe('placeOrder idempotency key', () => {
  it('reuses one key across a failed attempt and its retry, then starts fresh after success', async () => {
    supabaseDouble.failRpc('network dropped');
    await expect(checkout.placeOrder({ paymentMethod: 'cod', deliveryOptions: {} })).rejects.toThrow(
      /network dropped/,
    );
    const failedKey = supabaseDouble.rpcCalls.at(-1)?.args.p_idempotency_key;
    expect(typeof failedKey).toBe('string');
    expect(failedKey).toBeTruthy();

    supabaseDouble.reset();
    supabaseDouble.setPlacedOrder(placedFixture);
    await checkout.placeOrder({ paymentMethod: 'cod', deliveryOptions: {} });
    expect(supabaseDouble.rpcCalls.at(-1)?.args.p_idempotency_key).toBe(failedKey);

    await checkout.placeOrder({ paymentMethod: 'cod', deliveryOptions: {} });
    const nextKey = supabaseDouble.rpcCalls.at(-1)?.args.p_idempotency_key;
    expect(typeof nextKey).toBe('string');
    expect(nextKey).not.toBe(failedKey);
  });

  it('passes an optional gift-card code through, trimmed', async () => {
    supabaseDouble.setPlacedOrder(placedFixture);
    await checkout.placeOrder({
      paymentMethod: 'cod',
      deliveryOptions: {},
      giftCardCode: '  GIFT-42  ',
    });
    expect(supabaseDouble.rpcCalls.at(-1)?.args.p_gift_card_code).toBe('GIFT-42');
  });
});
