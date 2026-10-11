import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { requireUserId, requireVendorId, text } from './vendor-client';

type DisputeRow = Database['public']['Tables']['disputes']['Row'];
type DisputeMessageRow = Database['public']['Tables']['dispute_messages']['Row'];

export type DisputeStatus = DisputeRow['status'];
export type DisputeUrgency = DisputeRow['urgency'];

/**
 * An arbitration case the store is named in. The buyer, the reason and the order it points
 * at are fixed once opened: `disputes_update_staff` gives the update right to admin and
 * support only, so a seller reads the case and answers in its thread.
 */
export interface VendorDispute {
  id: string;
  reason: string;
  status: DisputeStatus;
  urgency: DisputeUrgency;
  customerName: string;
  orderGroupId?: string;
  createdAt: string;
  updatedAt: string;
  resolutionNote?: string;
  resolutionAmount?: number;
}

export interface VendorDisputeMessage {
  id: string;
  disputeId: string;
  senderRole: DisputeMessageRow['sender_role'];
  senderName: string;
  body: string;
  isInternalNote: boolean;
  createdAt: string;
}

const DISPUTE_SELECT =
  'id, reason, status, urgency, customer_name, order_group_id, resolution_note, ' +
  'resolution_amount, created_at, updated_at';

function mapDispute(row: DisputeRow): VendorDispute {
  return {
    id: row.id,
    reason: row.reason,
    status: row.status,
    urgency: row.urgency,
    customerName: row.customer_name,
    orderGroupId: row.order_group_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolutionNote: row.resolution_note ?? undefined,
    resolutionAmount: row.resolution_amount ?? undefined,
  };
}

function mapMessage(row: DisputeMessageRow): VendorDisputeMessage {
  return {
    id: row.id,
    disputeId: row.dispute_id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    body: row.content,
    isInternalNote: row.is_internal_note,
    createdAt: row.created_at,
  };
}

/**
 * Cases naming this store, most recently touched first. The `vendor_id` filter is a second
 * lock on top of `disputes_select_party`, which already hides rows the account is not a
 * party to; keeping it explicit means a page never renders a case the store was not named in.
 */
export async function fetchVendorDisputes(signal?: AbortSignal): Promise<VendorDispute[]> {
  const vendorId = await requireVendorId();

  let query = supabase
    .from('disputes')
    .select(DISPUTE_SELECT)
    .eq('vendor_id', vendorId)
    .order('updated_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your escalations: ${error.message}`);
  return ((data ?? []) as unknown as DisputeRow[]).map(mapDispute);
}

/** The whole exchange, oldest first - the case reads like the thread it is. */
export async function fetchDisputeMessages(
  disputeId: string,
  signal?: AbortSignal,
): Promise<VendorDisputeMessage[]> {
  let query = supabase
    .from('dispute_messages')
    .select('*')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load this case: ${error.message}`);
  return ((data ?? []) as unknown as DisputeMessageRow[]).map(mapMessage);
}

/**
 * Posts as the store into a case it is named in. `dispute_messages_insert` proves
 * participation through `is_dispute_party` and accepts a row carrying this account's id;
 * replying to someone else's case is refused by the policy, not by this function.
 * Staff internal notes are read through the same thread and stay labelled as such.
 */
export async function postDisputeMessage(
  disputeId: string,
  body: string,
): Promise<VendorDisputeMessage> {
  const [userId, vendorId] = [await requireUserId(), await requireVendorId()];

  const { data: store, error: storeError } = await supabase
    .from('vendor_profiles')
    .select('store_name')
    .eq('id', vendorId)
    .single();
  if (storeError) throw new Error(`Failed to load your store: ${storeError.message}`);

  const { data, error } = await supabase
    .from('dispute_messages')
    .insert({
      dispute_id: disputeId,
      sender_id: userId,
      sender_role: 'vendor',
      sender_name: text(store.store_name) || 'Store',
      content: body,
      is_internal_note: false,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to send the message: ${error.message}`);
  return mapMessage(data as unknown as DisputeMessageRow);
}
