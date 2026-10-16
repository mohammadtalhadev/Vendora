import { supabase } from '../../../lib/supabase';
import { asRecord, num, rpcFailed } from './rider-client';

/**
 * The COD cash trail. Cash moves through three stamps on the
 * delivery row and nothing else: the rider records what they collected at the
 * door (`mark_cod_collected`), an admin confirms the desk received it
 * (`confirm_cod_handover`, admin side), and `rider_cod_summary` totals what
 * the calling rider is still holding. There is no client-side cash state -
 * a figure that is not on the row is not shown.
 */

export interface RiderCodSummary {
  /** Cash collected and still in the rider's hands (not yet handed over). */
  collectedPending: number;
  pendingCount: number;
  /** Cash the desk has confirmed receiving, all time. */
  handedOverTotal: number;
  /** Cash stamped collected today, handed over or not. */
  collectedToday: number;
}

export async function fetchRiderCodSummary(signal?: AbortSignal): Promise<RiderCodSummary> {
  let query = supabase.rpc('rider_cod_summary');
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw rpcFailed('Could not load your cash summary', error.message);
  const root = asRecord(data);
  return {
    collectedPending: num(root.collectedPending),
    pendingCount: num(root.pendingCount),
    handedOverTotal: num(root.handedOverTotal),
    collectedToday: num(root.collectedToday),
  };
}

export async function markCodCollected(deliveryId: string, amount: number): Promise<void> {
  const { error } = await supabase.rpc('mark_cod_collected', {
    p_delivery_id: deliveryId,
    p_amount: amount,
  });
  if (error) throw rpcFailed('Could not record the cash', error.message);
}
