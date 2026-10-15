import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { asStringList, json, num, optionalNum, requireUserId } from './vendor-client';

type StoreRow = Database['public']['Tables']['vendor_profiles']['Row'];
type StoreUpdate = Database['public']['Tables']['vendor_profiles']['Update'];

/**
 * The store record the vendor workspace edits. `rating`, `reviewCount`, `status` and
 * `commissionRateOverride` are read for display only: `vendor_profiles_update_owner`
 * freezes the last two against a seller write, and the rollups belong to the review
 * triggers.
 */
export interface VendorStore {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  sellerType: 'platform' | 'vendor';
  status: 'active' | 'suspended';
  description: string;
  logo: string;
  banner?: string;
  tagline: string;
  supportEmail?: string;
  supportPhone?: string;
  rating: number;
  reviewCount: number;
  commissionRateOverride?: number;
  vacationMode: boolean;
  vacationMessage: string;
  freeShippingThreshold?: number;
  returnWindowDays: number;
  restockingFee: number;
  returnShippingPayer: string;
  warrantyPeriod: string;
  autoApproveReturns: boolean;
  payoutSchedule: string;
  payoutReservePct: number;
  carriers: string[];
  createdAt: string;
}

/** The columns a seller owns; a write of anything else is rejected by RLS. */
export type VendorStoreUpdate = Partial<
  Pick<
    VendorStore,
    | 'storeName'
    | 'slug'
    | 'description'
    | 'logo'
    | 'banner'
    | 'tagline'
    | 'supportEmail'
    | 'supportPhone'
    | 'vacationMode'
    | 'vacationMessage'
    | 'freeShippingThreshold'
    | 'returnWindowDays'
    | 'restockingFee'
    | 'returnShippingPayer'
    | 'warrantyPeriod'
    | 'autoApproveReturns'
    | 'payoutSchedule'
    | 'payoutReservePct'
    | 'carriers'
  >
>;

const STORE_SELECT =
  'id, user_id, store_name, slug, seller_type, status, description, logo, banner, tagline, ' +
  'support_email, support_phone, rating, review_count, commission_rate_override, vacation_mode, ' +
  'vacation_message, free_shipping_threshold, return_window_days, restocking_fee, ' +
  'return_shipping_payer, warranty_period, auto_approve_returns, payout_schedule, ' +
  'payout_reserve_pct, carriers, created_at';

function mapStore(row: StoreRow): VendorStore {
  return {
    id: row.id,
    userId: row.user_id ?? row.id,
    storeName: row.store_name,
    slug: row.slug,
    sellerType: row.seller_type,
    status: row.status,
    description: row.description ?? '',
    logo: row.logo ?? '',
    banner: row.banner ?? undefined,
    tagline: row.tagline,
    supportEmail: row.support_email ?? undefined,
    supportPhone: row.support_phone ?? undefined,
    rating: num(row.rating),
    reviewCount: row.review_count,
    commissionRateOverride: optionalNum(row.commission_rate_override),
    vacationMode: row.vacation_mode,
    vacationMessage: row.vacation_message,
    freeShippingThreshold: optionalNum(row.free_shipping_threshold),
    returnWindowDays: row.return_window_days,
    restockingFee: num(row.restocking_fee),
    returnShippingPayer: row.return_shipping_payer,
    warrantyPeriod: row.warranty_period,
    autoApproveReturns: row.auto_approve_returns,
    payoutSchedule: row.payout_schedule,
    payoutReservePct: num(row.payout_reserve_pct),
    carriers: asStringList(row.carriers),
    createdAt: row.created_at,
  };
}

/** The store this account owns - the workspace's identity for every other read. */
export async function fetchVendorStore(signal?: AbortSignal): Promise<VendorStore> {
  const userId = await requireUserId();
  let query = supabase.from('vendor_profiles').select(STORE_SELECT).eq('user_id', userId);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Failed to load your store: ${error.message}`);
  if (!data) throw new Error('This account has no store. Apply to sell, then sign in again.');
  return mapStore(data as unknown as StoreRow);
}

/** Any public storefront, addressed by its slug or id - the buyer-facing store page. */
export async function fetchStoreByHandle(handle: string, signal?: AbortSignal): Promise<VendorStore> {
  // PostgREST types the whole `or` filter from the uuid column, so a slug reaching
  // `id.eq.<slug>` fails the request outright (22P02) instead of simply not matching.
  // One clause, chosen by what the handle actually is, keeps it a single round trip.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(handle);
  let query = supabase
    .from('vendor_profiles')
    .select(STORE_SELECT)
    .eq(isUuid ? 'id' : 'slug', handle);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Failed to load this store: ${error.message}`);
  if (!data) throw new Error('Store not found.');
  return mapStore(data as unknown as StoreRow);
}

/**
 * The columns a seller owns, mapped to the row's names. `status`, `rating`,
 * `review_count` and `commission_rate_override` are absent: the owner policy freezes
 * them, so a settings form cannot submit its way back from a suspension.
 */
function toStoreUpdate(updates: VendorStoreUpdate): StoreUpdate {
  const row: StoreUpdate = {};
  if (updates.storeName !== undefined) row.store_name = updates.storeName;
  if (updates.slug !== undefined) row.slug = updates.slug;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.logo !== undefined) row.logo = updates.logo;
  if (updates.banner !== undefined) row.banner = updates.banner;
  if (updates.tagline !== undefined) row.tagline = updates.tagline;
  if (updates.supportEmail !== undefined) row.support_email = updates.supportEmail;
  if (updates.supportPhone !== undefined) row.support_phone = updates.supportPhone;
  if (updates.vacationMode !== undefined) row.vacation_mode = updates.vacationMode;
  if (updates.vacationMessage !== undefined) row.vacation_message = updates.vacationMessage;
  if (updates.freeShippingThreshold !== undefined) row.free_shipping_threshold = updates.freeShippingThreshold;
  if (updates.returnWindowDays !== undefined) row.return_window_days = updates.returnWindowDays;
  if (updates.restockingFee !== undefined) row.restocking_fee = updates.restockingFee;
  if (updates.returnShippingPayer !== undefined) row.return_shipping_payer = updates.returnShippingPayer;
  if (updates.warrantyPeriod !== undefined) row.warranty_period = updates.warrantyPeriod;
  if (updates.autoApproveReturns !== undefined) row.auto_approve_returns = updates.autoApproveReturns;
  if (updates.payoutSchedule !== undefined) row.payout_schedule = updates.payoutSchedule;
  if (updates.payoutReservePct !== undefined) row.payout_reserve_pct = updates.payoutReservePct;
  // `carriers` is a jsonb array; the client sends the list, not a stringified one.
  if (updates.carriers !== undefined) row.carriers = json(updates.carriers);
  return row;
}

/**
 * Writes the store's own settings and reads the row back, so the page shows what the
 * database kept rather than what the form intended.
 */
export async function updateVendorStore(updates: VendorStoreUpdate): Promise<VendorStore> {
  const userId = await requireUserId();
  const row = toStoreUpdate(updates);
  if (Object.keys(row).length === 0) return fetchVendorStore();

  const { error } = await supabase.from('vendor_profiles').update(row).eq('user_id', userId);
  if (error) throw new Error(`Failed to save your store settings: ${error.message}`);
  return fetchVendorStore();
}

/** Every store the reader is allowed to see - one row for a seller, the directory for staff. */
export async function fetchStoreDirectory(signal?: AbortSignal): Promise<VendorStore[]> {
  let query = supabase.from('vendor_profiles').select(STORE_SELECT).order('store_name');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load stores: ${error.message}`);
  return ((data ?? []) as unknown as StoreRow[]).map(mapStore);
}

/**
 * Delivered-order counts for a set of stores, from the public
 * `store_order_stats` aggregate view (Batch 74) — one query for the whole
 * set, returned as a vendor_id → count map. Stores with no delivered orders
 * have no row in the view and so no entry in the map; callers render the
 * count only for ids the map contains.
 *
 * This NEVER rejects. The view exists only once the Batch 74 migration has
 * run on the hosted database; until then PostgREST answers with a
 * relation-missing error, and the honest outcome is "no stats" — the cards
 * simply omit the count, exactly as they did before the view existed. Any
 * other failure (network, abort) takes the same path.
 */
export async function fetchStoreOrderStats(
  vendorIds: string[],
  signal?: AbortSignal,
): Promise<Map<string, number>> {
  const stats = new Map<string, number>();
  if (vendorIds.length === 0) return stats;
  try {
    let query = supabase
      .from('store_order_stats')
      .select('vendor_id, orders_delivered')
      .in('vendor_id', vendorIds);
    if (signal) query = query.abortSignal(signal);

    const { data, error } = await query;
    if (error) return stats;
    for (const row of data ?? []) {
      if (row.vendor_id) stats.set(row.vendor_id, num(row.orders_delivered));
    }
  } catch {
    return stats;
  }
  return stats;
}
