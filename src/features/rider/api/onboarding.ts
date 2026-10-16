import { supabase } from '../../../lib/supabase';
import { asRecord, rpcFailed, text } from './rider-client';

/**
 * Rider self-serve onboarding. An account the desk has not given a
 * rider profile can apply from the rider workspace itself: `apply_as_rider`
 * files the row as 'pending' and grants the role, `rider_delivery_board`
 * keeps refusing until an admin approves on the Fleet page, and the panel
 * reads the caller's own row (the `riders_select_self` policy) to know which
 * state to show — the form, or the application under review.
 */

export interface RiderApplication {
  id: string;
  fullName: string;
  phone: string;
  vehicleType: string;
  city: string;
  vehiclePlate: string;
  status: string;
  createdAt: string;
}

export interface RiderApplicationInput {
  vehicleType: string;
  phone: string;
  city: string;
  vehiclePlate: string;
}

/** The vehicle classes the fleet runs; the column itself stays a free-text label. */
export const RIDER_VEHICLE_TYPES = ['Motorcycle', 'Bicycle', 'Car', 'Van'] as const;

const NOT_OPEN_YET =
  'Rider applications are not open yet — the Vendora team is still switching them on. Please check back soon.';

/**
 * True when the onboarding migration has not reached this database yet:
 * PostgREST answers a call to a missing function with PGRST202. The client
 * fails soft with an honest sentence instead of the mapper's server text,
 * because "not switched on yet" is a state the applicant can act on (wait),
 * not a fault.
 */
export function isFunctionMissing(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? '');
}

function mapApplication(value: unknown): RiderApplication | null {
  const row = asRecord(value);
  if (!row.id) return null;
  return {
    id: text(row.id),
    fullName: text(row.full_name),
    phone: text(row.phone),
    vehicleType: text(row.vehicle_type),
    // The city/plate columns arrive with the migration; a database
    // that has not run it simply has nothing to show for them yet.
    city: text(row.city),
    vehiclePlate: text(row.vehicle_plate),
    status: text(row.status),
    createdAt: text(row.created_at),
  };
}

/** The caller's own rider row, whatever state it is in; `null` when none exists. */
export async function fetchOwnRiderApplication(): Promise<RiderApplication | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (sessionError || !userId) {
    throw rpcFailed(
      'Could not read your rider application',
      sessionError?.message ?? 'not signed in',
    );
  }
  const { data, error } = await supabase
    .from('rider_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw rpcFailed('Could not read your rider application', error.message);
  return mapApplication(data);
}

/**
 * Files (or, while still pending, corrects) the caller's application. The
 * database validates the four fields and answers with prose written for the
 * applicant; the P0001 passthrough in the friendly-error mapper keeps it.
 */
export async function applyAsRider(input: RiderApplicationInput): Promise<RiderApplication> {
  const { data, error } = await supabase.rpc('apply_as_rider', {
    p_vehicle_type: input.vehicleType,
    p_phone: input.phone,
    p_city: input.city,
    p_vehicle_plate: input.vehiclePlate,
  });
  if (error) {
    if (isFunctionMissing(error)) throw new Error(NOT_OPEN_YET);
    throw rpcFailed('Could not submit your application', error.message);
  }
  const application = mapApplication(data);
  if (!application) {
    throw rpcFailed('Could not submit your application', 'the database returned no application');
  }
  return application;
}
