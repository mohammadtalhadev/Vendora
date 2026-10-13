import { supabase } from '../../../lib/supabase';
import { num, rpcFailed, text } from './admin-client';

/**
 * There is no `brands` table and no authorization-request workflow in this schema, so the
 * brands console cannot gate anything. What it can honestly show is the set of brands that
 * actually exist in the live catalog: the distinct `products.brand` values across approved
 * listings, with how many listings and how many sellers carry each one. Only approved listings
 * count, matching how the storefront reads the catalog (`status = 'approved'`).
 */

export interface AdminBrandRow {
  brand: string;
  /** Approved listings carrying this brand. */
  listings: number;
  /** Distinct sellers who list something under this brand. */
  sellers: number;
  /** Lowest approved listing price, the only money figure the query can prove. */
  lowestPrice: number;
}

export async function fetchBrandDirectory(signal?: AbortSignal): Promise<AdminBrandRow[]> {
  let query = supabase
    .from('products')
    .select('brand, seller_id, price')
    .eq('status', 'approved');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the brand directory', error.message);

  const grouped = new Map<string, { sellers: Set<string>; listings: number; lowestPrice: number }>();

  for (const raw of data ?? []) {
    const row = raw as unknown as { brand: string | null; seller_id: string | null; price: number };
    const name = text(row.brand).trim();
    if (!name) continue;

    const price = num(row.price);
    const entry = grouped.get(name);
    if (entry) {
      entry.listings += 1;
      if (row.seller_id) entry.sellers.add(row.seller_id);
      if (price < entry.lowestPrice) entry.lowestPrice = price;
    } else {
      grouped.set(name, {
        sellers: new Set(row.seller_id ? [row.seller_id] : []),
        listings: 1,
        lowestPrice: price,
      });
    }
  }

  return [...grouped.entries()]
    .map(([brand, entry]) => ({
      brand,
      listings: entry.listings,
      sellers: entry.sellers.size,
      lowestPrice: entry.lowestPrice,
    }))
    .sort((a, b) => b.listings - a.listings || a.brand.localeCompare(b.brand));
}
