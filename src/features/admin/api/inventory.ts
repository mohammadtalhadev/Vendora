import { supabase } from '../../../lib/supabase';
import { num, rpcFailed, text } from './admin-client';

/**
 * Platform stock console. Until this batch the admin panel had no
 * inventory surface at all: a seller could see and edit their own stock on
 * /vendor/inventory, but staff had no cross-seller view of what the platform
 * holds. This module is the read side of that console — it reads the same
 * `products.stock` column of record the vendor page writes (stock lives on
 * the product row; `variants` is a jsonb list whose first entry carries the
 * display SKU, per the catalog canon that Product itself has no sku).
 *
 * The console is MONITORING-ONLY. No admin stock-adjust RPC exists today:
 * every other audited admin write (categories, brands, media) goes through a
 * SECURITY DEFINER RPC that checks `is_admin()` and writes an audit row,
 * while a bare PostgREST update under `products_update_admin` would leave no
 * audit trail. Rather than fake an adjust control, the page links each row
 * to the moderation queue and the missing RPC is specced for a later batch:
 * `admin_set_product_stock(p_product_id uuid, p_stock integer)` — definer,
 * admin guard, stock >= 0 check, audit entry, returns the updated row.
 */

/**
 * What this console calls low stock. The vendor inventory page uses the same
 * threshold and `vendor_dashboard(p_low_stock)` counts with the same default,
 * so a listing flagged here is flagged in the seller's workspace too. It is a
 * platform view rule, not a per-listing minimum the database stores.
 */
export const LOW_STOCK_AT = 5;

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export const stockStatusOf = (stock: number): StockStatus =>
  stock <= 0 ? 'out_of_stock' : stock <= LOW_STOCK_AT ? 'low_stock' : 'in_stock';

export interface AdminInventoryRow {
  id: string;
  title: string;
  /** First variant's SKU, or the id-derived display code the vendor page uses. */
  sku: string;
  sellerId: string;
  storeName: string;
  price: number;
  stock: number;
  stockStatus: StockStatus;
  /** Moderation status of the listing (draft / pending_review / approved / …). */
  listingStatus: string;
  imageUrl: string | null;
}

interface RawProductRow {
  id: string;
  title: string;
  price: number;
  stock: number;
  status: string;
  seller_id: string;
  variants: unknown;
  images: unknown;
}

const firstVariantSku = (variants: unknown): string | null => {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const first = variants[0] as { sku?: unknown } | null;
  const sku = text(first?.sku).trim();
  return sku || null;
};

const firstImage = (images: unknown): string | null => {
  if (!Array.isArray(images) || images.length === 0) return null;
  const url = text(images[0]).trim();
  return url || null;
};

/** Pure row mapping so the console's derivations are unit-testable. */
export function mapInventoryRow(
  raw: RawProductRow,
  storeNames: ReadonlyMap<string, string>,
): AdminInventoryRow {
  const stock = Math.max(0, Math.trunc(num(raw.stock)));
  return {
    id: text(raw.id),
    title: text(raw.title),
    sku: firstVariantSku(raw.variants) ?? `SKU-${text(raw.id).slice(-6).toUpperCase()}`,
    sellerId: text(raw.seller_id),
    storeName: storeNames.get(text(raw.seller_id)) ?? 'Unknown store',
    price: num(raw.price),
    stock,
    stockStatus: stockStatusOf(stock),
    listingStatus: text(raw.status),
    imageUrl: firstImage(raw.images),
  };
}

export interface InventorySummary {
  tracked: number;
  outOfStock: number;
  lowStock: number;
  totalUnits: number;
}

/** Stat cards, computed from the same rows the table renders. */
export function summarizeInventory(rows: readonly AdminInventoryRow[]): InventorySummary {
  return {
    tracked: rows.length,
    outOfStock: rows.filter((r) => r.stockStatus === 'out_of_stock').length,
    lowStock: rows.filter((r) => r.stockStatus === 'low_stock').length,
    totalUnits: rows.reduce((acc, r) => acc + r.stock, 0),
  };
}

export interface InventoryFilters {
  query: string;
  sellerId: string | null;
  lowOnly: boolean;
}

/** Search (title / SKU / store), one-store filter, and the low-stock lens. */
export function filterInventoryRows(
  rows: readonly AdminInventoryRow[],
  { query, sellerId, lowOnly }: InventoryFilters,
): AdminInventoryRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (sellerId && row.sellerId !== sellerId) return false;
    if (lowOnly && row.stockStatus === 'in_stock') return false;
    if (!q) return true;
    return (
      row.title.toLowerCase().includes(q) ||
      row.sku.toLowerCase().includes(q) ||
      row.storeName.toLowerCase().includes(q)
    );
  });
}

const PAGE = 500;

/**
 * Every physical listing on the platform with its stock of record. Physical
 * only: digital listings carry no stock a console could count (the vendor
 * page splits them the same way). Reads page the whole table in 500-row
 * windows, the pattern the payouts ledger read uses, so a growing catalog
 * never silently truncates at PostgREST's default cap.
 */
export async function fetchAdminInventory(signal?: AbortSignal): Promise<AdminInventoryRow[]> {
  const storesQuery = supabase.from('vendor_profiles').select('id, store_name');
  if (signal) storesQuery.abortSignal(signal);
  const { data: storeData, error: storeError } = await storesQuery;
  if (storeError) throw rpcFailed('Failed to load the inventory console', storeError.message);
  const storeNames = new Map<string, string>(
    ((storeData ?? []) as Array<{ id: string; store_name: string }>).map((s) => [
      text(s.id),
      text(s.store_name),
    ]),
  );

  const rows: AdminInventoryRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from('products')
      .select('id, title, price, stock, status, seller_id, variants, images')
      .eq('type', 'physical')
      .order('title', { ascending: true })
      .range(from, from + PAGE - 1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw rpcFailed('Failed to load the inventory console', error.message);
    const batch = (data ?? []) as unknown as RawProductRow[];
    rows.push(...batch.map((raw) => mapInventoryRow(raw, storeNames)));
    if (batch.length < PAGE) break;
  }
  return rows;
}
