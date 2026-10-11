import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchCouponByCode, fetchLiveCoupons } from './promotions';
import { promotionRow, supabaseDouble } from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
});

describe('fetchCouponByCode', () => {
  it('reads the code case-insensitively and maps it to a coupon', async () => {
    supabaseDouble.seedPromotion(promotionRow({ code: 'SAVE10', discount_value: 10, minimum_order: 50 }));

    const coupon = await fetchCouponByCode(' save10 ', 120);

    expect(coupon).toMatchObject({ code: 'SAVE10', type: 'percent', value: 10, minSpend: 50, sellerScope: 'platform' });
  });

  it('scopes a vendor promotion to that store', async () => {
    supabaseDouble.seedPromotion(promotionRow({ code: 'TECH20', vendor_id: 'store-9' }));

    expect((await fetchCouponByCode('TECH20', 120)).sellerScope).toBe('store-9');
  });

  it('rejects a code that is not on the shelf', async () => {
    await expect(fetchCouponByCode('NOPE', 120)).rejects.toThrow(/"NOPE" is not a live promotion code/);
  });

  it('rejects an empty code before asking the server', async () => {
    await expect(fetchCouponByCode('   ', 120)).rejects.toThrow(/Enter a promotion code/);
    expect(supabaseDouble.from).not.toHaveBeenCalled();
  });

  it('rejects a promotion that has not started or already ended', async () => {
    supabaseDouble.seedPromotion(
      promotionRow({ code: 'FUTURE', starts_at: '2027-01-01T00:00:00.000Z', ends_at: null }),
    );
    supabaseDouble.seedPromotion(promotionRow({ code: 'PAST', starts_at: null, ends_at: '2026-01-01T00:00:00.000Z' }));

    await expect(fetchCouponByCode('FUTURE', 120)).rejects.toThrow(/not active yet/);
    await expect(fetchCouponByCode('PAST', 120)).rejects.toThrow(/has expired/);
  });

  it('rejects a fully claimed promotion', async () => {
    supabaseDouble.seedPromotion(promotionRow({ code: 'GONE', usage_count: 10, usage_limit: 10 }));
    await expect(fetchCouponByCode('GONE', 120)).rejects.toThrow(/claimed too many times/);
  });

  it('rejects a basket below the minimum with the amount still to spend', async () => {
    supabaseDouble.seedPromotion(promotionRow({ code: 'SAVE10', minimum_order: 150 }));
    await expect(fetchCouponByCode('SAVE10', 120)).rejects.toThrow(/Spend at least \$150\.00/);
  });

  it('surfaces a read failure rather than pretending the code is dead', async () => {
    supabaseDouble.failures.promotions = 'permission denied for table promotions';
    await expect(fetchCouponByCode('SAVE10', 120)).rejects.toThrow(/Could not check that code/);
  });
});

describe('fetchLiveCoupons', () => {
  it('lists only codes a customer can still use right now', async () => {
    supabaseDouble.seedPromotion(promotionRow({ code: 'SAVE10', created_at: '2026-10-01T00:00:00.000Z' }));
    supabaseDouble.seedPromotion(
      promotionRow({ code: 'EXPIRED', ends_at: '2026-01-01T00:00:00.000Z', created_at: '2026-10-02T00:00:00.000Z' }),
    );
    supabaseDouble.seedPromotion(
      promotionRow({ code: 'SOLDOUT', usage_count: 5, usage_limit: 5, created_at: '2026-10-03T00:00:00.000Z' }),
    );

    const coupons = await fetchLiveCoupons();

    expect(coupons.map((coupon) => coupon.code)).toEqual(['SAVE10']);
  });

  it('reads newest first so a busy shopper sees the current campaign', async () => {
    supabaseDouble.seedPromotion(promotionRow({ code: 'OLD', created_at: '2026-09-01T00:00:00.000Z' }));
    supabaseDouble.seedPromotion(promotionRow({ code: 'NEW', created_at: '2026-10-01T00:00:00.000Z' }));

    expect((await fetchLiveCoupons()).map((coupon) => coupon.code)).toEqual(['NEW', 'OLD']);
  });
});
