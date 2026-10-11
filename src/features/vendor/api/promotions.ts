import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { num, requireVendorId } from './vendor-client';

type PromoRow = Database['public']['Tables']['promotions']['Row'];
type PromoInsert = Database['public']['Tables']['promotions']['Insert'];
type PromoDbUpdate = Database['public']['Tables']['promotions']['Update'];

/**
 * A campaign the store runs. `usageCount` is reported by the database and is not
 * writable here: `promos_update_vendor` refuses a row whose count changed, which is how
 * a limited campaign keeps reporting the number of times it was actually claimed.
 */
export interface VendorPromotion {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrder: number;
  maxDiscount?: number;
  usageLimit: number;
  usageCount: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
}

export interface PromotionDraft {
  code: string;
  title?: string;
  description?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrder?: number;
  maxDiscount?: number | null;
  usageLimit?: number;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

/** What a seller may change. There is no `usageCount` in this type by design. */
export type PromotionUpdate = Partial<PromotionDraft>;

function mapPromotion(row: PromoRow): VendorPromotion {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    discountType: row.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discountValue: num(row.discount_value),
    minimumOrder: num(row.minimum_order),
    maxDiscount: row.max_discount === null ? undefined : num(row.max_discount),
    usageLimit: row.usage_limit,
    usageCount: row.usage_count,
    active: row.active,
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * Fields the seller filled in; anything omitted keeps its column default (a `1000`
 * usage cap, `active`, `minimum_order` 0). `usage_count` is never written, so a campaign
 * keeps reporting the redemptions the database actually recorded.
 */
function toInsert(draft: PromotionDraft, vendorId: string): PromoInsert {
  return {
    vendor_id: vendorId,
    code: draft.code,
    title: draft.title,
    description: draft.description,
    discount_type: draft.discountType,
    discount_value: draft.discountValue,
    minimum_order: draft.minimumOrder,
    max_discount: draft.maxDiscount ?? null,
    usage_limit: draft.usageLimit,
    active: draft.active,
    starts_at: draft.startsAt ?? null,
    ends_at: draft.endsAt ?? null,
  };
}

function toDbUpdate(updates: PromotionUpdate): PromoDbUpdate {
  const row: PromoDbUpdate = {};
  if (updates.code !== undefined) row.code = updates.code;
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.discountType !== undefined) row.discount_type = updates.discountType;
  if (updates.discountValue !== undefined) row.discount_value = updates.discountValue;
  if (updates.minimumOrder !== undefined) row.minimum_order = updates.minimumOrder;
  if (updates.maxDiscount !== undefined) row.max_discount = updates.maxDiscount;
  if (updates.usageLimit !== undefined) row.usage_limit = updates.usageLimit;
  if (updates.active !== undefined) row.active = updates.active;
  if (updates.startsAt !== undefined) row.starts_at = updates.startsAt;
  if (updates.endsAt !== undefined) row.ends_at = updates.endsAt;
  return row;
}

/** The store's own campaigns; platform-wide codes are a different page. */
export async function fetchVendorPromotions(signal?: AbortSignal): Promise<VendorPromotion[]> {
  const vendorId = await requireVendorId();
  let query = supabase
    .from('promotions')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your campaigns: ${error.message}`);
  return ((data ?? []) as unknown as PromoRow[]).map(mapPromotion);
}

export async function createPromotion(draft: PromotionDraft): Promise<VendorPromotion> {
  const vendorId = await requireVendorId();

  const { data, error } = await supabase
    .from('promotions')
    .insert(toInsert(draft, vendorId))
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create the campaign: ${error.message}`);
  return mapPromotion(data as unknown as PromoRow);
}

/**
 * Edits a campaign, then reads it back. Because RLS filters rather than raises, the
 * re-read is what proves the write landed on this store's row.
 */
export async function updatePromotion(
  promotionId: string,
  updates: PromotionUpdate,
): Promise<VendorPromotion> {
  const vendorId = await requireVendorId();
  const row = toDbUpdate(updates);
  if (Object.keys(row).length === 0) throw new Error('Nothing to change.');

  const { data, error } = await supabase
    .from('promotions')
    .update(row)
    .eq('id', promotionId)
    .eq('vendor_id', vendorId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`Failed to save the campaign: ${error.message}`);
  if (!data) throw new Error('This campaign is not yours to change.');
  return mapPromotion(data as unknown as PromoRow);
}

export async function setPromotionActive(
  promotionId: string,
  active: boolean,
): Promise<VendorPromotion> {
  return updatePromotion(promotionId, { active });
}

export async function deletePromotion(promotionId: string): Promise<void> {
  const vendorId = await requireVendorId();
  const { data, error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', promotionId)
    .eq('vendor_id', vendorId)
    .select('id');
  if (error) throw new Error(`Failed to delete the campaign: ${error.message}`);
  if (!data || data.length === 0) throw new Error('This campaign is not yours to delete.');
}
