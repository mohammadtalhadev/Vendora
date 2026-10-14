import { supabase } from '../../../lib/supabase';
import { num } from './vendor-client';

/**
 * The platform commission configuration (Seller Fees page). The
 * `commission_config` row is readable by any signed-in account
 * (`commission_select_authenticated`), so the fees page can show the rate
 * the platform actually charges right now instead of a marketing number.
 * Signed-out visitors get `null` and the page explains the structure
 * without inventing the figure.
 */
export interface CommissionRates {
  /** The platform-wide standard rate as a fraction (0.10 = 10%). */
  globalRate: number;
}

export async function fetchCommissionRates(signal?: AbortSignal): Promise<CommissionRates | null> {
  let query = supabase
    .from('commission_config')
    .select('global_default_rate')
    .limit(1);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error || !data || data.length === 0) return null;
  const row = data[0] as unknown as Record<string, unknown>;
  return { globalRate: num(row.global_default_rate) };
}

/** The instant payout rail's fee, as `request_payout` charges it. */
export const INSTANT_PAYOUT_FEE_RATE = 0.015;
