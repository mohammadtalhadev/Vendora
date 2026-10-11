import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { asRecord, json, num, rpcFailed, text } from './admin-client';

/**
 * The one row of `platform_settings`. It is read straight from the table rather than
 * through an RPC because the storefront needs the currency and payout cadence too,
 * and RLS lets any signed-in - or anonymous - client select it.
 *
 * What the settings page used to edit for tax providers, API rate limits, retry
 * policies and webhooks has no storage anywhere in this schema, so it is not modelled
 * here: there is nothing for a form to change.
 */
export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  payoutSchedule: string;
  minPayoutFloor: number;
  reserveRetentionDays: number;
  newListingReview: string;
  slaCeilingHours: number;
}

type SettingsRow = Database['public']['Tables']['platform_settings']['Row'];

/** The keys `admin_save_platform_settings` reads; an absent or blank one leaves the column alone. */
export interface PlatformSettingsPatch {
  platformName?: string;
  supportEmail?: string;
  /** The RPC's own spelling for `default_currency`. */
  currency?: string;
  payoutSchedule?: string;
  minPayoutFloor?: number;
  reserveRetentionDays?: number;
  newListingReview?: string;
  slaCeilingHours?: number;
}

/** Both the typed row and the jsonb the save RPC returns are keyed by column name. */
function mapSettings(row: SettingsRow | Record<string, unknown>): PlatformSettings {
  return {
    platformName: text(row.platform_name),
    supportEmail: text(row.support_email),
    defaultCurrency: text(row.default_currency),
    payoutSchedule: text(row.payout_schedule),
    minPayoutFloor: num(row.min_payout_floor),
    reserveRetentionDays: num(row.reserve_retention_days),
    newListingReview: text(row.new_listing_review),
    slaCeilingHours: num(row.sla_ceiling_hours),
  };
}

export async function fetchPlatformSettings(signal?: AbortSignal): Promise<PlatformSettings> {
  // The signal is attached before `maybeSingle()`, which closes the builder.
  let query = supabase.from('platform_settings').select('*').eq('id', true);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query.maybeSingle();
  if (error) throw rpcFailed('Failed to load platform settings', error.message);
  if (data === null) {
    throw rpcFailed('Failed to load platform settings', 'the single settings row is missing');
  }
  return mapSettings(data);
}

/**
 * Writes through the RPC, which stamps the editor, records the before and after images
 * in the audit trail, and returns the row as the database now holds it.
 */
export async function savePlatformSettings(
  patch: PlatformSettingsPatch,
): Promise<PlatformSettings> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) payload[key] = value;
  }

  const { data, error } = await supabase.rpc('admin_save_platform_settings', {
    p_settings: json(payload),
  });
  if (error) throw rpcFailed('Could not save the platform settings', error.message);
  return mapSettings(asRecord(data));
}
