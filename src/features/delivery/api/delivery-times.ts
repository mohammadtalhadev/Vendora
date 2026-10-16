import { supabase } from '../../../lib/supabase';
import {
  parseSellerDeliveryTimes,
  type SellerDeliveryTimes,
} from '../../../lib/delivery-estimate';

/**
 * What a buyer surface may know about a seller's delivery times: the tier
 * ranges the seller published and the origin city/state a buyer's address
 * is tiered against. Read from the public `store_delivery_times` view
 * — the settings row itself stays owner-only, and the view
 * carries none of its rates, street or phone.
 */
export interface SellerDeliveryProfile {
  vendorId: string;
  times: SellerDeliveryTimes;
  originCity: string;
  originState: string;
}

const place = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Delivery profiles for a set of stores, as a vendor_id → profile map.
 * Stores that never saved shipping settings have no row in the view and so
 * no entry in the map; callers resolve those to the standard quote.
 *
 * This NEVER rejects. The view exists only once the migration has
 * run on the hosted database; until then PostgREST answers with a
 * relation-missing error, and the honest outcome is "no seller times" —
 * every surface quotes the platform standard, exactly as it did before the
 * view existed. Any other failure (network, abort) takes the same path.
 */
export async function fetchSellerDeliveryTimes(
  vendorIds: string[],
  signal?: AbortSignal,
): Promise<Map<string, SellerDeliveryProfile>> {
  const profiles = new Map<string, SellerDeliveryProfile>();
  const ids = [...new Set(vendorIds.filter(Boolean))];
  if (ids.length === 0) return profiles;
  try {
    let query = supabase
      .from('store_delivery_times')
      .select('vendor_id, delivery_times, origin_city, origin_state')
      .in('vendor_id', ids);
    if (signal) query = query.abortSignal(signal);

    const { data, error } = await query;
    if (error) return profiles;
    for (const row of data ?? []) {
      if (!row.vendor_id) continue;
      profiles.set(row.vendor_id, {
        vendorId: row.vendor_id,
        times: parseSellerDeliveryTimes(row.delivery_times),
        originCity: place(row.origin_city),
        originState: place(row.origin_state),
      });
    }
  } catch {
    return profiles;
  }
  return profiles;
}
