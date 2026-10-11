import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import type { Coupon } from '../utils/totals';

type PromotionRow = Database['public']['Tables']['promotions']['Row'];

const PROMOTION_SELECT =
  'code, discount_type, discount_value, minimum_order, vendor_id, starts_at, ends_at, usage_count, usage_limit';

/**
 * A promotion the customer may actually still use, read from `promotions` (RLS already
 * hides inactive rows) and checked against the same rules `checkout_pricing` applies, so a
 * code accepted here is a code that changes the bill.
 */
export async function fetchCouponByCode(code: string, subtotal: number): Promise<Coupon> {
  const wanted = code.trim().toUpperCase();
  if (!wanted) throw new Error('Enter a promotion code.');

  const { data, error } = await supabase
    .from('promotions')
    .select(PROMOTION_SELECT)
    .eq('code', wanted)
    .maybeSingle();
  if (error) throw new Error(`Could not check that code: ${error.message}`);
  if (!data) throw new Error(`"${wanted}" is not a live promotion code.`);

  const row = data as unknown as PromotionRow;
  const now = Date.now();
  if (row.starts_at && new Date(row.starts_at).getTime() > now) {
    throw new Error(`"${wanted}" is not active yet.`);
  }
  if (row.ends_at && new Date(row.ends_at).getTime() < now) {
    throw new Error(`"${wanted}" has expired.`);
  }
  if (row.usage_count >= row.usage_limit) {
    throw new Error(`"${wanted}" has been claimed too many times.`);
  }
  const minimum = Number(row.minimum_order);
  if (subtotal < minimum) {
    throw new Error(`Spend at least $${minimum.toFixed(2)} to use "${wanted}".`);
  }

  return {
    code: row.code,
    type: row.discount_type as Coupon['type'],
    value: Number(row.discount_value),
    minSpend: Number(row.minimum_order) || undefined,
    sellerScope: row.vendor_id ?? 'platform',
  };
}

/** The codes a customer can see and try, so the cart never advertises a dead promotion. */
export async function fetchLiveCoupons(signal?: AbortSignal): Promise<Coupon[]> {
  let query = supabase
    .from('promotions')
    .select(PROMOTION_SELECT)
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load promotions: ${error.message}`);

  const now = Date.now();
  return ((data ?? []) as unknown as PromotionRow[])
    .filter(
      (row) =>
        row.usage_count < row.usage_limit &&
        (!row.starts_at || new Date(row.starts_at).getTime() <= now) &&
        (!row.ends_at || new Date(row.ends_at).getTime() >= now),
    )
    .map((row) => ({
      code: row.code,
      type: row.discount_type as Coupon['type'],
      value: Number(row.discount_value),
      minSpend: Number(row.minimum_order) || undefined,
      sellerScope: row.vendor_id ?? 'platform',
    }));
}
