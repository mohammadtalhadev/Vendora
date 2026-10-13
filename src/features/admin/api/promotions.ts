import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { bool, num, rpcFailed } from './admin-client';

/**
 * Sitewide coupons are rows of `promotions` with no `vendor_id`: the platform's own codes,
 * which checkout (`checkout_pricing`) and the cart both read. This module writes exactly the
 * columns those reads key on - code, discount type/value, minimum order, window, usage cap and
 * the active flag. `usage_count` is written by the order path, never here, so a code always
 * reports how many times it was actually claimed.
 */

const COUPON_SELECT =
  'id, code, title, description, discount_type, discount_value, minimum_order, max_discount, usage_limit, usage_count, active, starts_at, ends_at, created_at, updated_at';

type CouponRow = Database['public']['Tables']['promotions']['Row'];
type CouponInsert = Database['public']['Tables']['promotions']['Insert'];
type CouponUpdate = Database['public']['Tables']['promotions']['Update'];

export interface AdminCoupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrder: number;
  maxDiscount: number | null;
  usageLimit: number;
  usageCount: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface CouponDraft {
  code: string;
  title?: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrder?: number;
  maxDiscount?: number | null;
  usageLimit?: number;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export type CouponUpdateDraft = Partial<CouponDraft>;

async function requireAdmin(operation: string): Promise<void> {
  const { error } = await supabase.rpc('admin_require_admin', { p_operation: operation });
  if (error) throw rpcFailed(operation, error.message);
}

function mapCoupon(row: CouponRow): AdminCoupon {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    discountType: row.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discountValue: num(row.discount_value),
    minimumOrder: num(row.minimum_order),
    maxDiscount: row.max_discount === null ? null : num(row.max_discount),
    usageLimit: num(row.usage_limit),
    usageCount: num(row.usage_count),
    active: bool(row.active),
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    createdAt: row.created_at,
  };
}

function toInsert(draft: CouponDraft): CouponInsert {
  return {
    vendor_id: null,
    code: draft.code.trim().toUpperCase(),
    title: draft.title ?? draft.code.trim().toUpperCase(),
    description: draft.description ?? '',
    discount_type: draft.discountType,
    discount_value: draft.discountValue,
    minimum_order: draft.minimumOrder ?? 0,
    max_discount: draft.maxDiscount ?? null,
    usage_limit: draft.usageLimit ?? 1000,
    active: draft.active ?? true,
    starts_at: draft.startsAt ?? null,
    ends_at: draft.endsAt ?? null,
  };
}

function toUpdate(draft: CouponUpdateDraft): CouponUpdate {
  const row: CouponUpdate = {};
  if (draft.code !== undefined) row.code = draft.code.trim().toUpperCase();
  if (draft.title !== undefined) row.title = draft.title;
  if (draft.description !== undefined) row.description = draft.description;
  if (draft.discountType !== undefined) row.discount_type = draft.discountType;
  if (draft.discountValue !== undefined) row.discount_value = draft.discountValue;
  if (draft.minimumOrder !== undefined) row.minimum_order = draft.minimumOrder;
  if (draft.maxDiscount !== undefined) row.max_discount = draft.maxDiscount;
  if (draft.usageLimit !== undefined) row.usage_limit = draft.usageLimit;
  if (draft.active !== undefined) row.active = draft.active;
  if (draft.startsAt !== undefined) row.starts_at = draft.startsAt;
  if (draft.endsAt !== undefined) row.ends_at = draft.endsAt;
  return row;
}

/** Platform codes only - a store's own campaigns belong to the vendor workspace. */
export async function fetchCoupons(signal?: AbortSignal): Promise<AdminCoupon[]> {
  let query = supabase
    .from('promotions')
    .select(COUPON_SELECT)
    .is('vendor_id', null)
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the coupon codes', error.message);
  return (data ?? []).map((row) => mapCoupon(row as unknown as CouponRow));
}

export async function createCoupon(draft: CouponDraft): Promise<AdminCoupon> {
  await requireAdmin('create a sitewide coupon');

  const { data, error } = await supabase
    .from('promotions')
    .insert(toInsert(draft))
    .select(COUPON_SELECT)
    .single();
  if (error) throw rpcFailed('Could not create the coupon', error.message);
  return mapCoupon(data as unknown as CouponRow);
}

export async function updateCoupon(
  id: string,
  updates: CouponUpdateDraft,
): Promise<AdminCoupon> {
  await requireAdmin('edit a sitewide coupon');

  const row = toUpdate(updates);
  if (Object.keys(row).length === 0) throw new Error('Nothing to change.');

  const { data, error } = await supabase
    .from('promotions')
    .update(row)
    .eq('id', id)
    .is('vendor_id', null)
    .select(COUPON_SELECT)
    .maybeSingle();
  if (error) throw rpcFailed('Could not save the coupon', error.message);
  if (!data) throw rpcFailed('Could not save the coupon', 'that is not a platform coupon');
  return mapCoupon(data as unknown as CouponRow);
}

export async function setCouponActive(id: string, active: boolean): Promise<AdminCoupon> {
  return updateCoupon(id, { active });
}

/** Destructive: the caller is expected to confirm before invoking this. */
export async function deleteCoupon(id: string): Promise<void> {
  await requireAdmin('delete a sitewide coupon');

  const { data, error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', id)
    .is('vendor_id', null)
    .select('id');
  if (error) throw rpcFailed('Could not delete the coupon', error.message);
  if (!data || data.length === 0) {
    throw rpcFailed('Could not delete the coupon', 'that is not a platform coupon');
  }
}
