import { supabase } from '../../../lib/supabase';
import type { Database, Json } from '../../../types/database';
import {
  parseSellerDeliveryTimes,
  serializeSellerDeliveryTimes,
  type SellerDeliveryTimes,
} from '../../../lib/delivery-estimate';
import { asRecord, bool, json, num, requireVendorId, text } from './vendor-client';

type ShippingRow = Database['public']['Tables']['vendor_shipping_settings']['Row'];
type ShippingInsert = Database['public']['Tables']['vendor_shipping_settings']['Insert'];
type PrefsRow = Database['public']['Tables']['vendor_notification_prefs']['Row'];

/**
 * Where a store ships from and what it charges for freight. These are the store's own
 * logistics facts; checkout prices freight from each product's `shipping_settings`, so
 * changing a rate here does not silently change a live cart total. The delivery times
 * are the exception: they are the store's published estimate, quoted to buyers through
 * the public `store_delivery_times` view (Batch 91).
 */
export interface VendorShippingSettings {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  standardRate: number;
  expressRate: number;
  warehouseName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  operatingHours: string;
  gateCode: string;
  slaWindow: string;
  /** Per-tier delivery-day ranges the seller publishes; absent tier = not set. */
  deliveryTimes: SellerDeliveryTimes;
}

export type ShippingSettingsUpdate = Partial<VendorShippingSettings>;

/** A store that has never saved the form still needs to render it. */
const BLANK_SHIPPING: VendorShippingSettings = {
  freeShippingEnabled: false,
  freeShippingThreshold: 0,
  standardRate: 0,
  expressRate: 0,
  warehouseName: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  operatingHours: '',
  gateCode: '',
  slaWindow: '',
  deliveryTimes: {},
};

/** The switches the Support page offers; keys match the seeded prefs jsonb. */
export interface VendorNotificationPrefs {
  smsDispatch: boolean;
  lowInventoryAlert: boolean;
  rmaPushAlert: boolean;
  dailyDigest: boolean;
}

const DEFAULT_PREFS: VendorNotificationPrefs = {
  smsDispatch: false,
  lowInventoryAlert: true,
  rmaPushAlert: true,
  dailyDigest: false,
};

const SHIPPING_SELECT =
  'vendor_id, free_shipping_enabled, free_shipping_threshold, standard_rate, express_rate, ' +
  'warehouse_name, street, city, state, zip_code, phone, operating_hours, gate_code, sla_window';

/** The form's camelCase fields onto the row's columns, keeping the row's own types. */
function toShippingRow(vendorId: string, updates: ShippingSettingsUpdate): ShippingInsert {
  const row: ShippingInsert = { vendor_id: vendorId };
  if (updates.freeShippingEnabled !== undefined) row.free_shipping_enabled = updates.freeShippingEnabled;
  if (updates.freeShippingThreshold !== undefined) row.free_shipping_threshold = updates.freeShippingThreshold;
  if (updates.standardRate !== undefined) row.standard_rate = updates.standardRate;
  if (updates.expressRate !== undefined) row.express_rate = updates.expressRate;
  if (updates.warehouseName !== undefined) row.warehouse_name = updates.warehouseName;
  if (updates.street !== undefined) row.street = updates.street;
  if (updates.city !== undefined) row.city = updates.city;
  if (updates.state !== undefined) row.state = updates.state;
  if (updates.zipCode !== undefined) row.zip_code = updates.zipCode;
  if (updates.phone !== undefined) row.phone = updates.phone;
  if (updates.operatingHours !== undefined) row.operating_hours = updates.operatingHours;
  if (updates.gateCode !== undefined) row.gate_code = updates.gateCode;
  if (updates.slaWindow !== undefined) row.sla_window = updates.slaWindow;
  return row;
}

function mapShipping(row: ShippingRow): Omit<VendorShippingSettings, 'deliveryTimes'> {
  return {
    freeShippingEnabled: row.free_shipping_enabled,
    freeShippingThreshold: num(row.free_shipping_threshold),
    standardRate: num(row.standard_rate),
    expressRate: num(row.express_rate),
    warehouseName: row.warehouse_name,
    street: row.street,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    phone: row.phone,
    operatingHours: row.operating_hours,
    gateCode: row.gate_code,
    slaWindow: row.sla_window,
  };
}

/**
 * The store's delivery-times bag, read on its own so a database that has not
 * run the Batch 91 migration yet (no `delivery_times` column) still loads
 * every other setting: the read simply reports "nothing set" and buyers keep
 * the standard quote. Any failure takes the same path — delivery times are
 * an enhancement to this row, never a reason to fail the whole form.
 */
async function fetchDeliveryTimes(vendorId: string): Promise<SellerDeliveryTimes> {
  try {
    const { data, error } = await supabase
      .from('vendor_shipping_settings')
      .select('delivery_times')
      .eq('vendor_id', vendorId)
      .maybeSingle();
    if (error) return {};
    return parseSellerDeliveryTimes(
      (data as unknown as { delivery_times?: Json } | null)?.delivery_times,
    );
  } catch {
    return {};
  }
}

/** True when a write failed only because the Batch 91 column is not there yet. */
function isMissingDeliveryTimesColumn(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  return (error.message ?? '').includes('delivery_times');
}

export async function fetchShippingSettings(signal?: AbortSignal): Promise<VendorShippingSettings> {
  const vendorId = await requireVendorId();
  let query = supabase.from('vendor_shipping_settings').select(SHIPPING_SELECT).eq('vendor_id', vendorId);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Failed to load your shipping settings: ${error.message}`);
  const base = data ? mapShipping(data as unknown as ShippingRow) : BLANK_SHIPPING;
  return { ...base, deliveryTimes: await fetchDeliveryTimes(vendorId) };
}

/** Upserts the single row per store, then re-reads it so the page shows the stored numbers. */
export async function saveShippingSettings(
  updates: ShippingSettingsUpdate,
): Promise<VendorShippingSettings> {
  const vendorId = await requireVendorId();

  const { error } = await supabase
    .from('vendor_shipping_settings')
    .upsert(toShippingRow(vendorId, updates), { onConflict: 'vendor_id' });
  if (error) throw new Error(`Failed to save your shipping settings: ${error.message}`);

  if (updates.deliveryTimes !== undefined) {
    // Written separately from the upsert so a database without the Batch 91
    // column still saves every other setting; only the missing-column
    // failure is swallowed — a refused write (RLS, outage) still surfaces.
    const { error: timesError } = await supabase
      .from('vendor_shipping_settings')
      .update({ delivery_times: serializeSellerDeliveryTimes(updates.deliveryTimes) as unknown as Json })
      .eq('vendor_id', vendorId);
    if (timesError && !isMissingDeliveryTimesColumn(timesError)) {
      throw new Error(`Failed to save your shipping settings: ${timesError.message}`);
    }
  }
  return fetchShippingSettings();
}

export async function fetchNotificationPrefs(signal?: AbortSignal): Promise<VendorNotificationPrefs> {
  const vendorId = await requireVendorId();
  let query = supabase.from('vendor_notification_prefs').select('*').eq('vendor_id', vendorId);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Failed to load your notification settings: ${error.message}`);
  const prefs = asRecord((data as unknown as PrefsRow | null)?.prefs);
  return {
    smsDispatch: bool(prefs.smsDispatch),
    lowInventoryAlert: prefs.lowInventoryAlert === undefined ? DEFAULT_PREFS.lowInventoryAlert : bool(prefs.lowInventoryAlert),
    rmaPushAlert: prefs.rmaPushAlert === undefined ? DEFAULT_PREFS.rmaPushAlert : bool(prefs.rmaPushAlert),
    dailyDigest: bool(prefs.dailyDigest),
  };
}

export async function saveNotificationPrefs(
  updates: Partial<VendorNotificationPrefs>,
): Promise<VendorNotificationPrefs> {
  const vendorId = await requireVendorId();
  const current = await fetchNotificationPrefs();
  const next = { ...current, ...updates };

  const { error } = await supabase
    .from('vendor_notification_prefs')
    .upsert({ vendor_id: vendorId, prefs: json(next) }, { onConflict: 'vendor_id' });
  if (error) throw new Error(`Failed to save your notification settings: ${error.message}`);
  return fetchNotificationPrefs();
}

/** The store's shipping origin, rendered as the address a return is sent to. */
export function shippingAddressOf(settings: VendorShippingSettings): string {
  return [settings.warehouseName, settings.street, settings.city, settings.state, settings.zipCode]
    .map(text)
    .filter(Boolean)
    .join(', ');
}
