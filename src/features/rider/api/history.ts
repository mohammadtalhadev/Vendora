import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, num, rpcFailed, text } from './rider-client';

/**
 * The rider's closed work: parcels that already left the board.
 *
 * `rider_delivery_board` deliberately returns only open parcels (`status <> 'delivered'`),
 * so history reads the tables the rider's own policies already open:
 * `deliveries_select_rider` scopes `deliveries` to the assigned rider, the staff policy
 * on `sub_orders` includes the rider role, and active `vendor_profiles` are publicly
 * readable. The drop-off city comes from `deliveries.dropoff_details` - the address copy
 * `place_order` stored on the delivery row itself - because `orders` (which holds the
 * original) has no rider policy at all.
 */

export interface RiderHistoryRow {
  id: string;
  subOrderId: string;
  /** `deliveries.status` for a closed parcel: `delivered` or `failed`. */
  status: string;
  assignedAt: string | null;
  deliveredAt: string | null;
  createdAt: string | null;
  /** The parcel's booked value: `sub_orders.subtotal + shipping_fee`, as the board shows it. */
  gross: number;
  storeName: string;
  city: string;
  /** COD cash stamps: what the rider recorded at the door, and when. */
  codCollectedAmount: number | null;
  codCollectedAt: string | null;
  /** Set once an admin confirms the desk received the cash; the figure is then frozen. */
  codHandedOverAt: string | null;
  /** Storage path of the photo proof inside `delivery-proofs`, once attached. */
  proofPhotoUrl: string | null;
}

export interface RiderLedgerRow {
  deliveryId: string;
  deliveredAt: string | null;
  gross: number;
  /** `orders.payment_method`: `cod` or `card`. */
  paymentMethod: string;
}

export interface RiderLedgerSummary {
  today: { count: number; value: number };
  week: { count: number; value: number };
  allTime: { count: number; value: number };
  /** Parcels the buyer paid for in cash at the door, and the cash that totals. */
  cod: { count: number; value: number };
}

const nullableText = (value: unknown): string | null =>
  value === null || value === undefined ? null : text(value);

/** The signed-in account's rider profile id, or the board's own refusal when there is none. */
async function ownRiderId(operation: string): Promise<string> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (sessionError || !userId) {
    throw rpcFailed(operation, sessionError?.message ?? 'not signed in');
  }
  const { data: profile, error } = await supabase
    .from('rider_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw rpcFailed(operation, error.message);
  const id = text(asRecord(profile).id);
  if (!id) throw rpcFailed(operation, 'Not a rider');
  return id;
}

export async function fetchRiderHistory(signal?: AbortSignal): Promise<RiderHistoryRow[]> {
  const riderId = await ownRiderId('Could not load your delivery history');

  let deliveriesQuery = supabase
    .from('deliveries')
    .select(
      'id, sub_order_id, status, assigned_at, delivered_at, created_at, dropoff_details, cod_collected_amount, cod_collected_at, cod_handed_over_at, proof_photo_url',
    )
    .eq('rider_id', riderId)
    .in('status', ['delivered', 'failed'])
    .order('created_at', { ascending: false });
  if (signal) deliveriesQuery = deliveriesQuery.abortSignal(signal);
  const { data: deliveryData, error: deliveryError } = await deliveriesQuery;
  if (deliveryError) throw rpcFailed('Could not load your delivery history', deliveryError.message);
  const deliveries = asRows(deliveryData);
  if (deliveries.length === 0) return [];

  const subOrderIds = deliveries.map((row) => text(row.sub_order_id)).filter(Boolean);
  const { data: subData, error: subError } = await supabase
    .from('sub_orders')
    .select('id, subtotal, shipping_fee, seller_id')
    .in('id', subOrderIds);
  if (subError) throw rpcFailed('Could not load your delivery history', subError.message);
  const subs = asRows(subData);
  const subById = new Map(subs.map((row) => [text(row.id), row]));

  const sellerIds = [...new Set(subs.map((row) => text(row.seller_id)).filter(Boolean))];
  const storeById = new Map<string, string>();
  if (sellerIds.length > 0) {
    const { data: storeData, error: storeError } = await supabase
      .from('vendor_profiles')
      .select('id, store_name')
      .in('id', sellerIds);
    if (storeError) throw rpcFailed('Could not load your delivery history', storeError.message);
    for (const row of asRows(storeData)) storeById.set(text(row.id), text(row.store_name));
  }

  return deliveries.map((row) => {
    const sub = subById.get(text(row.sub_order_id));
    const dropoff = asRecord(row.dropoff_details);
    return {
      id: text(row.id),
      subOrderId: text(row.sub_order_id),
      status: text(row.status),
      assignedAt: nullableText(row.assigned_at),
      deliveredAt: nullableText(row.delivered_at),
      createdAt: nullableText(row.created_at),
      gross: sub ? num(sub.subtotal) + num(sub.shipping_fee) : 0,
      storeName: sub ? (storeById.get(text(sub.seller_id)) ?? '') : '',
      city: text(dropoff.city),
      codCollectedAmount:
        row.cod_collected_amount === null || row.cod_collected_amount === undefined
          ? null
          : num(row.cod_collected_amount),
      codCollectedAt: nullableText(row.cod_collected_at),
      codHandedOverAt: nullableText(row.cod_handed_over_at),
      proofPhotoUrl: nullableText(row.proof_photo_url),
    };
  });
}

/**
 * The delivered ledger behind the earnings screen. The payment method lives on
 * `orders`, which no rider policy opens, so the read goes through the
 * `rider_delivery_ledger` RPC: SECURITY DEFINER, scoped to the caller's own
 * rider profile, the same shape as `rider_delivery_board`.
 */
export async function fetchRiderLedger(signal?: AbortSignal): Promise<RiderLedgerRow[]> {
  let query = supabase.rpc('rider_delivery_ledger');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Could not load your delivery totals', error.message);
  return asRows(data).map((row) => ({
    deliveryId: text(row.deliveryId),
    deliveredAt: nullableText(row.deliveredAt),
    gross: num(row.gross),
    paymentMethod: text(row.paymentMethod),
  }));
}

/**
 * Buckets the ledger the way the earnings screen names them: today, this week
 * (from Monday, local time), and all time. Every figure is a count or a sum of
 * the rows Postgres returned - nothing is estimated, and no pay rate is applied,
 * because no table records what a rider earns per delivery.
 */
export function summariseLedger(rows: RiderLedgerRow[], now = new Date()): RiderLedgerSummary {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

  const empty = () => ({ count: 0, value: 0 });
  const summary: RiderLedgerSummary = { today: empty(), week: empty(), allTime: empty(), cod: empty() };
  for (const row of rows) {
    summary.allTime.count += 1;
    summary.allTime.value += row.gross;
    if (row.paymentMethod === 'cod') {
      summary.cod.count += 1;
      summary.cod.value += row.gross;
    }
    const deliveredAt = row.deliveredAt ? new Date(row.deliveredAt) : null;
    if (!deliveredAt || Number.isNaN(deliveredAt.getTime())) continue;
    if (deliveredAt >= startOfWeek) {
      summary.week.count += 1;
      summary.week.value += row.gross;
    }
    if (deliveredAt >= startOfDay) {
      summary.today.count += 1;
      summary.today.value += row.gross;
    }
  }
  return summary;
}

/**
 * Phone and vehicle are the rider's own contact facts. `riders_update_self`
 * already permits a rider to update their own `rider_profiles` row - the same
 * policy `setAvailability` writes through - so this is a direct table write,
 * not a new RPC.
 */
export async function updateRiderContact(input: { phone: string; vehicleType: string }): Promise<void> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (sessionError || !userId) {
    throw rpcFailed('Could not save your profile', sessionError?.message ?? 'not signed in');
  }
  const { error } = await supabase
    .from('rider_profiles')
    .update({ phone: input.phone, vehicle_type: input.vehicleType })
    .eq('user_id', userId);
  if (error) throw rpcFailed('Could not save your profile', error.message);
}
