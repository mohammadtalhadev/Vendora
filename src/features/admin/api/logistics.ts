import { supabase } from '../../../lib/supabase';
import { toFriendlyError } from '../../../lib/friendly-error';
import { asRecord, asRows, num, rpcFailed, text } from './admin-client';
import { readShippingAddress, type AdminOrderAddress } from './orders';

/**
 * The dispatch board: every rider the platform has, the packages still moving, and
 * the counts the board's tiles show. Nothing here is remembered from a previous
 * render - `admin_logistics_board` reads the delivery rows on each call.
 */

export interface LogisticsRider {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  status: string;
  /** Deliveries currently assigned to the rider rather than finished. */
  active: number;
  completed: number;
}

/** The `deliveries` row attached to a package; `null` until one is opened. */
export interface LogisticsDelivery {
  id: string;
  status: string;
  riderId: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
}

export interface LogisticsQueueRow {
  id: string;
  status: string;
  type: string;
  storeName: string;
  gross: number;
  carrierName: string | null;
  trackingNumber: string | null;
  riderId: string | null;
  createdAt: string;
  updatedAt: string;
  delivery: LogisticsDelivery | null;
  address: AdminOrderAddress | null;
}

export interface LogisticsCounts {
  awaitingPickup: number;
  inTransit: number;
  failed: number;
  delivered: number;
  ridersAvailable: number;
}

export interface LogisticsBoard {
  fleet: LogisticsRider[];
  queue: LogisticsQueueRow[];
  counts: LogisticsCounts;
}

const nullableText = (value: unknown): string | null =>
  value === null || value === undefined ? null : text(value);

function mapBoard(value: unknown): LogisticsBoard {
  const root = asRecord(value);
  const counts = asRecord(root.counts);
  return {
    fleet: asRows(root.fleet).map((row) => ({
      id: text(row.id),
      name: text(row.name),
      phone: text(row.phone),
      vehicle: text(row.vehicle),
      status: text(row.status),
      active: num(row.active),
      completed: num(row.completed),
    })),
    queue: asRows(root.queue).map((row) => {
      const delivery = asRecord(row.delivery);
      return {
        id: text(row.id),
        status: text(row.status),
        type: text(row.type),
        storeName: text(row.storeName),
        gross: num(row.gross),
        carrierName: nullableText(row.carrierName),
        trackingNumber: nullableText(row.trackingNumber),
        riderId: nullableText(row.riderId),
        createdAt: text(row.createdAt),
        updatedAt: text(row.updatedAt),
        delivery:
          row.delivery === null || row.delivery === undefined
            ? null
            : {
                id: text(delivery.id),
                status: text(delivery.status),
                riderId: nullableText(delivery.riderId),
                assignedAt: nullableText(delivery.assignedAt),
                pickedUpAt: nullableText(delivery.pickedUpAt),
                deliveredAt: nullableText(delivery.deliveredAt),
              },
        address: readShippingAddress(row.address),
      };
    }),
    counts: {
      awaitingPickup: num(counts.awaitingPickup),
      inTransit: num(counts.inTransit),
      failed: num(counts.failed),
      delivered: num(counts.delivered),
      ridersAvailable: num(counts.ridersAvailable),
    },
  };
}

export async function fetchLogisticsBoard(signal?: AbortSignal): Promise<LogisticsBoard> {
  let query = supabase.rpc('admin_logistics_board');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the dispatch board', error.message);
  return mapBoard(data);
}

/**
 * COD cash settlements (Batch 42). The cash trail lives on the delivery row:
 * the rider stamps what they collected, an admin stamps the handover. Admins
 * read every delivery (`deliveries_write_admin`), so this is a direct table
 * read - the store and rider names are joined client-side from the same rows
 * the dispatch board uses. `pending` is money still on the road; `handedOver`
 * is the desk-confirmed history.
 */
export interface CodSettlementRow {
  deliveryId: string;
  orderId: string;
  storeName: string;
  riderName: string;
  amount: number;
  collectedAt: string | null;
  handedOverAt: string | null;
}

export interface CodSettlements {
  pending: CodSettlementRow[];
  handedOver: CodSettlementRow[];
}

export async function fetchCodSettlements(signal?: AbortSignal): Promise<CodSettlements> {
  let query = supabase
    .from('deliveries')
    .select(
      'id, sub_order_id, rider_id, cod_collected_amount, cod_collected_at, cod_handed_over_at',
    )
    .not('cod_collected_at', 'is', null)
    .order('cod_collected_at', { ascending: false })
    .limit(200);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load COD settlements', error.message);
  const deliveries = asRows(data);
  if (deliveries.length === 0) return { pending: [], handedOver: [] };

  const subOrderIds = [...new Set(deliveries.map((row) => text(row.sub_order_id)).filter(Boolean))];
  const { data: subData, error: subError } = await supabase
    .from('sub_orders')
    .select('id, seller_id, order_group_id')
    .in('id', subOrderIds);
  if (subError) throw rpcFailed('Failed to load COD settlements', subError.message);
  const subs = asRows(subData);
  const subById = new Map(subs.map((row) => [text(row.id), row] as const));

  const sellerIds = [...new Set(subs.map((row) => text(row.seller_id)).filter(Boolean))];
  const storeById = new Map<string, string>();
  if (sellerIds.length > 0) {
    const { data: storeData, error: storeError } = await supabase
      .from('vendor_profiles')
      .select('id, store_name')
      .in('id', sellerIds);
    if (storeError) throw rpcFailed('Failed to load COD settlements', storeError.message);
    for (const row of asRows(storeData)) storeById.set(text(row.id), text(row.store_name));
  }

  const riderIds = [...new Set(deliveries.map((row) => text(row.rider_id)).filter(Boolean))];
  const riderById = new Map<string, string>();
  if (riderIds.length > 0) {
    const { data: riderData, error: riderError } = await supabase
      .from('rider_profiles')
      .select('id, full_name')
      .in('id', riderIds);
    if (riderError) throw rpcFailed('Failed to load COD settlements', riderError.message);
    for (const row of asRows(riderData)) riderById.set(text(row.id), text(row.full_name));
  }

  const rows: CodSettlementRow[] = deliveries.map((row) => {
    const sub = subById.get(text(row.sub_order_id));
    return {
      deliveryId: text(row.id),
      orderId: sub ? text(sub.order_group_id) : '',
      storeName: sub ? (storeById.get(text(sub.seller_id)) ?? '') : '',
      riderName: riderById.get(text(row.rider_id)) ?? '',
      amount: num(row.cod_collected_amount),
      collectedAt: nullableText(row.cod_collected_at),
      handedOverAt: nullableText(row.cod_handed_over_at),
    };
  });

  return {
    pending: rows.filter((row) => row.handedOverAt === null),
    handedOver: rows.filter((row) => row.handedOverAt !== null),
  };
}

/** The desk confirms it physically received a rider's collected cash. */
export async function confirmCodHandover(deliveryId: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_cod_handover', { p_delivery_id: deliveryId });
  if (error) throw rpcFailed('Could not confirm the cash handover', error.message);
}

/** Vehicle labels the fleet roster already carries (vehicle_type is free text). */
export const RIDER_VEHICLE_TYPES = ['Motorcycle', 'Bicycle', 'Car', 'Cargo Van', 'Truck'] as const;

export interface RiderInviteInput {
  email: string;
  name: string;
  phone?: string;
  vehicle?: string;
}

export interface RiderInviteResult {
  userId: string;
  /** True when the email already had an account: role + fleet row re-asserted, no new email sent by the invite call. */
  alreadyInvited: boolean;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The desk-side validation for the invite form, shared by the dialog and
 * its tests so what the form refuses is exactly what the API refuses.
 * Returns the refusal sentence, or null when the input is sendable.
 */
export function validateRiderInvite(input: RiderInviteInput): string | null {
  if (!input.name.trim()) return "Enter the rider's full name.";
  if (!EMAIL_SHAPE.test(input.email.trim())) return 'Enter a valid email address for the rider.';
  return null;
}

/**
 * Invites a rider through the `invite-rider` Edge Function (Batch 65).
 * The function — never this client — holds the service role: it sends
 * the Supabase invite email, grants the rider role on the profile and
 * creates the fleet row. The rider follows the email link and sets
 * their own password; no password exists anywhere in this flow.
 */
export async function inviteRider(input: RiderInviteInput): Promise<RiderInviteResult> {
  const refusal = validateRiderInvite(input);
  if (refusal) throw new Error(refusal);

  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; userId?: string; alreadyInvited?: boolean; error?: string }>(
    'invite-rider',
    {
      body: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        phone: input.phone?.trim() ?? '',
        vehicle: input.vehicle?.trim() || 'Motorcycle',
      },
    },
  );
  if (!error && data?.ok) {
    return { userId: data.userId ?? '', alreadyInvited: data.alreadyInvited === true };
  }

  // Same contract as deleteAccount(): a non-2xx surfaces as a generic
  // FunctionsHttpError, and the function's own `{ error }` sentence rides
  // on its context response — that sentence is the one the desk deserves.
  let message = error?.message ?? data?.error ?? 'The invite could not be sent.';
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.clone === 'function') {
    try {
      const body = (await context.clone().json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // Body was not JSON (e.g. a 404 from an undeployed function) — keep
      // the transport message rather than inventing one.
    }
  }
  throw toFriendlyError(new Error(message), {
    prefix: 'Could not send the rider invite',
    staff: true,
  });
}
/**
 * Rider applications awaiting the desk's decision (Batch 77). A rider row
 * filed by `apply_as_rider` sits at status 'pending' until an admin approves
 * or refuses it here. The read is a direct table read — the staff policy on
 * `rider_profiles` already covers it — with the applicant's account name and
 * email joined from `profiles` client-side, the way the COD section joins
 * its names. A database that has not run the onboarding migration cannot
 * hold a 'pending' row (the enum refuses the filter), so this read errors
 * there and the Fleet page simply shows no section yet.
 */
export interface RiderApplicationRow {
  /** The rider_profiles row id. */
  profileId: string;
  /** The applicant's account id — the key the approval RPC decides on. */
  userId: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: string;
  city: string;
  vehiclePlate: string;
  appliedAt: string;
}

export async function fetchPendingRiderApplications(
  signal?: AbortSignal,
): Promise<RiderApplicationRow[]> {
  let query = supabase
    .from('rider_profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load rider applications', error.message);
  const rows = asRows(data);
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row) => text(row.user_id)).filter(Boolean))];
  const profileById = new Map<string, Record<string, unknown>>();
  if (userIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds);
    if (profileError) throw rpcFailed('Failed to load rider applications', profileError.message);
    for (const profile of asRows(profileData)) profileById.set(text(profile.id), profile);
  }

  return rows.map((row) => {
    const profile = profileById.get(text(row.user_id));
    return {
      profileId: text(row.id),
      userId: text(row.user_id),
      name: text(row.full_name) || (profile ? text(profile.name) : ''),
      email: profile ? text(profile.email) : '',
      phone: text(row.phone),
      vehicleType: text(row.vehicle_type),
      city: text(row.city),
      vehiclePlate: text(row.vehicle_plate),
      appliedAt: text(row.created_at),
    };
  });
}

/**
 * The desk's decision on one application. Approval promotes the rider to
 * 'available'; rejection removes the application row. Both are the RPC's
 * audit-writing job — this wrapper only fails honestly, including before the
 * onboarding migration exists in the database at all.
 */
export async function setRiderApproval(userId: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_rider_approval', {
    p_user_id: userId,
    p_approve: approve,
  });
  if (error) {
    if (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) {
      throw new Error('Rider approvals are not switched on in this database yet.');
    }
    throw rpcFailed('Could not record that decision', error.message);
  }
}
