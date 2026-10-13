import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import type { Dispute, DisputeMessage } from '../../../types/domain';
import { fetchOrders } from './orders';

/**
 * Customer-side dispute reads/writes against the real `disputes` /
 * `dispute_messages` tables. This replaces the old mock-backed claims centre,
 * which rendered seeded disputes to every visitor and "filed" claims into
 * local state (plus fire-and-forget POSTs to a non-existent /api/disputes).
 * Row-level security scopes every query to the signed-in customer's own cases;
 * the explicit customer_id filter is a second lock, matching AccountProfilePage.
 */

type DisputeRow = Database['public']['Tables']['disputes']['Row'];
type DisputeMessageRow = Database['public']['Tables']['dispute_messages']['Row'];
type DisputeInsert = Database['public']['Tables']['disputes']['Insert'];
type DisputeMessageInsert = Database['public']['Tables']['dispute_messages']['Insert'];

async function requireUser() {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not read your session: ${error.message}`);
  const user = sessionData.session?.user;
  if (!user) throw new Error('You need to sign in to manage disputes.');
  return user;
}

function mapMessage(row: DisputeMessageRow): DisputeMessage {
  return {
    id: row.id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar ?? undefined,
    content: row.content,
    isInternalNote: row.is_internal_note,
    timestamp: row.created_at,
    attachments: row.attachments,
  };
}

function mapDispute(row: DisputeRow, messages: DisputeMessage[]): Dispute {
  return {
    id: row.id,
    subOrderId: row.sub_order_id ?? '',
    orderGroupId: row.order_group_id ?? '',
    customerId: row.customer_id ?? '',
    customerName: row.customer_name,
    customerAvatar: row.customer_avatar ?? undefined,
    vendorId: row.vendor_id ?? '',
    vendorName: row.vendor_name,
    reason: row.reason,
    status: row.status,
    urgency: row.urgency,
    messages,
    assignedAgentId: row.assigned_agent_id ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
    resolutionAmount: row.resolution_amount ?? undefined,
    evidencePhotos: row.evidence_photos,
    createdAt: row.created_at,
  };
}

/** The signed-in customer's disputes, newest first, with their message threads. */
export async function fetchMyDisputes(signal?: AbortSignal): Promise<Dispute[]> {
  const user = await requireUser();

  let query = supabase
    .from('disputes')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your disputes: ${error.message}`);
  const rows = (data ?? []) as DisputeRow[];
  if (rows.length === 0) return [];

  const { data: messageData, error: messageError } = await supabase
    .from('dispute_messages')
    .select('*')
    .in(
      'dispute_id',
      rows.map((row) => row.id),
    )
    .order('created_at', { ascending: true });
  if (messageError) throw new Error(`Failed to load dispute messages: ${messageError.message}`);

  const byDispute = new Map<string, DisputeMessage[]>();
  for (const message of (messageData ?? []) as DisputeMessageRow[]) {
    const list = byDispute.get(message.dispute_id) ?? [];
    list.push(mapMessage(message));
    byDispute.set(message.dispute_id, list);
  }
  return rows.map((row) => mapDispute(row, byDispute.get(row.id) ?? []));
}

/** Appends a customer reply to a dispute thread. */
export async function postDisputeMessage(disputeId: string, content: string): Promise<DisputeMessage> {
  const user = await requireUser();
  const senderName =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
    user.email ||
    'Customer';

  const row: DisputeMessageInsert = {
    dispute_id: disputeId,
    sender_id: user.id,
    sender_role: 'customer',
    sender_name: senderName,
    content: content.trim(),
    is_internal_note: false,
  };
  const { data, error } = await supabase.from('dispute_messages').insert(row).select('*').single();
  if (error) throw new Error(`Failed to send your message: ${error.message}`);
  return mapMessage(data as DisputeMessageRow);
}

/**
 * Files a dispute against one of the customer's own packages. The vendor and
 * order references come from the customer's real order history — the caller
 * supplies only the package id, a reason and the opening message.
 */
export async function createDispute(input: {
  subOrderId: string;
  reason: string;
  notes: string;
}): Promise<Dispute> {
  const user = await requireUser();
  const { subOrders } = await fetchOrders();
  const pkg = subOrders.find((sub) => sub.id === input.subOrderId.trim());
  if (!pkg) {
    throw new Error('That package reference was not found in your order history.');
  }

  const customerName =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
    user.email ||
    'Customer';

  const row: DisputeInsert = {
    customer_id: user.id,
    customer_name: customerName,
    vendor_id: pkg.sellerId,
    vendor_name: pkg.sellerName || 'Seller',
    sub_order_id: pkg.id,
    order_group_id: pkg.orderGroupId,
    reason: input.reason,
    status: 'open',
    urgency: 'standard',
    evidence_photos: [],
  };
  const { data, error } = await supabase.from('disputes').insert(row).select('*').single();
  if (error) throw new Error(`Failed to file your dispute: ${error.message}`);
  const dispute = data as DisputeRow;

  const opening: DisputeMessageInsert = {
    dispute_id: dispute.id,
    sender_id: user.id,
    sender_role: 'customer',
    sender_name: customerName,
    content: input.notes.trim() || `Dispute opened for order ${pkg.id}: ${input.reason}`,
    is_internal_note: false,
  };
  const { data: messageData, error: messageError } = await supabase
    .from('dispute_messages')
    .insert(opening)
    .select('*')
    .single();
  if (messageError) throw new Error(`Dispute filed, but the opening message failed: ${messageError.message}`);

  return mapDispute(dispute, [mapMessage(messageData as DisputeMessageRow)]);
}
