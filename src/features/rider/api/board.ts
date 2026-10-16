import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, num, rpcFailed, text } from './rider-client';

/**
 * The rider's own workspace. Everything here is scoped by Postgres to the signed-in rider:
 * the board returns their parcels and nobody else's, and a parcel only moves if it is theirs.
 * A delivery is never closed by the rider's own say-so - only by the buyer's handover code.
 */

export interface RiderProfile {
  id: string;
  fullName: string;
  phone: string;
  vehicleType: string;
  status: string;
  slaCeilingHours: number;
}

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface RiderDrop {
  id: string;
  subOrderId: string;
  status: string;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  /** True when the buyer holds a code that has to be read back before the parcel closes. */
  needsHandoverCode: boolean;
  gross: number;
  customerNotes: string;
  address: ShippingAddress;
  customerEmail: string;
  storeName: string;
}

export interface RiderBoard {
  rider: RiderProfile | null;
  drops: RiderDrop[];
  counts: { assigned: number; inFlight: number; deliveredToday: number; completedAllTime: number };
}

export type RiderMove = 'shipped' | 'out_for_delivery' | 'delivery_failed';

/** `rider_availability` in Postgres: whether this rider can take work right now. */
export type RiderAvailability = 'available' | 'busy' | 'offline';

const addressOf = (value: unknown): ShippingAddress => {
  const raw = asRecord(value);
  return {
    fullName: text(raw.fullName),
    street: text(raw.street),
    city: text(raw.city),
    state: text(raw.state),
    zipCode: text(raw.zipCode),
    country: text(raw.country),
    phone: text(raw.phone),
  };
};

function mapBoard(value: unknown): RiderBoard {
  const root = asRecord(value);
  const profile = asRecord(root.rider);
  const counts = asRecord(root.counts);
  return {
    rider: profile.id
      ? {
          id: text(profile.id),
          fullName: text(profile.full_name),
          phone: text(profile.phone),
          vehicleType: text(profile.vehicle_type),
          status: text(profile.status),
          slaCeilingHours: num(profile.sla_ceiling_hours),
        }
      : null,
    drops: asRows(root.deliveries).map((row) => ({
      id: text(row.id),
      subOrderId: text(row.subOrderId),
      status: text(row.status),
      assignedAt: row.assignedAt === null || row.assignedAt === undefined ? null : text(row.assignedAt),
      pickedUpAt: row.pickedUpAt === null || row.pickedUpAt === undefined ? null : text(row.pickedUpAt),
      deliveredAt: row.deliveredAt === null || row.deliveredAt === undefined ? null : text(row.deliveredAt),
      needsHandoverCode: row.needsHandoverCode === true,
      gross: num(row.gross),
      customerNotes: text(row.customerNotes),
      address: addressOf(row.address),
      customerEmail: text(row.customerEmail),
      storeName: text(row.storeName),
    })),
    counts: {
      assigned: num(counts.assigned),
      inFlight: num(counts.inFlight),
      deliveredToday: num(counts.deliveredToday),
      completedAllTime: num(counts.completedAllTime),
    },
  };
}

/**
 * True when a board read failed because the account has no rider profile at
 * all (`rider_delivery_board` raises 42501 'Not a rider'), as opposed to a
 * read that merely failed. The distinction matters on screen: retrying can
 * fix a failed read, but no retry creates a profile.
 */
export function isNotARiderError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as { vendoraCode?: string }).vendoraCode === 'not-a-rider'
  );
}

export async function fetchRiderBoard(signal?: AbortSignal): Promise<RiderBoard> {
  let query = supabase.rpc('rider_delivery_board');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) {
    const failed = rpcFailed('Could not load your route', error.message);
    if (error.code === '42501' || /not a rider/i.test(error.message)) {
      (failed as { vendoraCode?: string }).vendoraCode = 'not-a-rider';
    }
    throw failed;
  }
  return mapBoard(data);
}

/**
 * The package state machine owns the route: `shipped` means the rider has the parcel,
 * `out_for_delivery` means they are at the door, `delivery_failed` is the report. Postgres
 * refuses a move this rider is not assigned to and keeps the delivery row in step.
 */
export async function advanceDrop(subOrderId: string, next: RiderMove, note?: string): Promise<string> {
  const { error } = await supabase.rpc('advance_sub_order_status', {
    p_sub_order_id: subOrderId,
    p_next: next,
    p_note: note ?? null,
  });
  if (error) throw rpcFailed('Could not update that parcel', error.message);
  return subOrderId;
}

/**
 * The only path to `delivered`: the buyer's code, checked in Postgres against a sha256 hash.
 *
 * Since a wrong code is a returned `invalid_code` payload, not an RPC error:
 * `verify_delivery` counts the attempt on the delivery row before answering, and a raised
 * error would roll that counter back with the rest of the transaction - the ten-attempt
 * lockout could never engage. The refusal the rider sees is unchanged.
 */
export async function verifyHandover(deliveryId: string, code: string): Promise<{ deliveryId: string; status: string }> {
  const { data, error } = await supabase.rpc('verify_delivery', {
    p_delivery_id: deliveryId,
    p_code: code,
  });
  if (error) throw rpcFailed('That code did not match', error.message);
  const root = asRecord(data);
  const result = { deliveryId: text(root.deliveryId), status: text(root.status) };
  if (result.status !== 'delivered') {
    throw rpcFailed('That code did not match', 'Invalid handover code');
  }
  return result;
}

/**
 * A rider sets their own availability. There is no RPC for this because the table policy
 * `riders_update_self` already restricts the write to the rider's own row.
 */
export async function setAvailability(status: RiderAvailability): Promise<RiderAvailability> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (sessionError || !userId) throw rpcFailed('Could not update your status', sessionError?.message ?? 'not signed in');

  const { error } = await supabase.from('rider_profiles').update({ status }).eq('user_id', userId);
  if (error) throw rpcFailed('Could not update your status', error.message);
  return status;
}
