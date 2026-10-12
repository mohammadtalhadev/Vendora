import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, num, rpcFailed, text } from './support-client';

/**
 * One row of the queue the desk works. Every field is what Postgres computed in
 * `support_dispute_queue`; nothing here is derived in the browser.
 */
export interface SupportDisputeRow {
  id: string;
  reason: string;
  status: 'open' | 'under_review' | 'escalated' | 'resolved_refund' | 'resolved_denied';
  urgency: 'standard' | 'urgent';
  customerId: string | null;
  customerName: string;
  vendorId: string | null;
  vendorName: string;
  subOrderId: string | null;
  orderGroupId: string | null;
  evidencePhotos: string[];
  resolutionNote: string | null;
  resolutionAmount: number | null;
  agentName: string | null;
  assignedAgentId: string | null;
  messages: number;
  packageGross: number;
  refundedAmount: number;
  remainingGross: number;
  packageStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportDisputeQueue {
  page: number;
  pageSize: number;
  total: number;
  counts: Record<
    'open' | 'underReview' | 'escalated' | 'resolved' | 'urgent' | 'unassigned' | 'mine' | 'awaitingStaff',
    number
  >;
  exposure: number;
  rows: SupportDisputeRow[];
}

export interface SupportAgent {
  id: string;
  name: string;
  email: string;
  isMe: boolean;
  openCases: number;
}

/** A message in the case thread, read from `dispute_messages` under its own RLS policy. */
export interface DisputeThreadMessage {
  id: string;
  content: string;
  senderRole: 'customer' | 'vendor' | 'support';
  senderName: string;
  senderAvatar: string | null;
  attachments: string[];
  internalNote: boolean;
  createdAt: string;
}

const STATUSES = ['open', 'under_review', 'escalated', 'resolved_refund', 'resolved_denied'] as const;

function nullable(value: unknown): string | null {
  return value === null || value === undefined ? null : text(value);
}

function mapRow(row: Record<string, unknown>): SupportDisputeRow {
  return {
    id: text(row.id),
    reason: text(row.reason),
    status: (STATUSES as readonly string[]).includes(text(row.status))
      ? (text(row.status) as SupportDisputeRow['status'])
      : 'open',
    urgency: row.urgency === 'urgent' ? 'urgent' : 'standard',
    customerId: nullable(row.customerId),
    customerName: text(row.customerName),
    vendorId: nullable(row.vendorId),
    vendorName: text(row.vendorName),
    subOrderId: nullable(row.subOrderId),
    orderGroupId: nullable(row.orderGroupId),
    evidencePhotos: Array.isArray(row.evidencePhotos) ? row.evidencePhotos.map(text) : [],
    resolutionNote: nullable(row.resolutionNote),
    resolutionAmount: row.resolutionAmount === null || row.resolutionAmount === undefined
      ? null
      : num(row.resolutionAmount),
    agentName: nullable(row.agentName),
    assignedAgentId: nullable(row.assignedAgentId),
    messages: num(row.messages),
    packageGross: num(row.packageGross),
    refundedAmount: num(row.refundedAmount),
    remainingGross: num(row.remainingGross),
    packageStatus: text(row.packageStatus),
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
  };
}

function mapQueue(value: unknown): SupportDisputeQueue {
  const root = asRecord(value);
  const counts = asRecord(root.counts);
  return {
    page: num(root.page),
    pageSize: num(root.pageSize),
    total: num(root.total),
    counts: {
      open: num(counts.open),
      underReview: num(counts.underReview),
      escalated: num(counts.escalated),
      resolved: num(counts.resolved),
      urgent: num(counts.urgent),
      unassigned: num(counts.unassigned),
      mine: num(counts.mine),
      awaitingStaff: num(counts.awaitingStaff),
    },
    exposure: num(root.exposure),
    rows: asRows(root.rows).map(mapRow),
  };
}

/**
 * `status` is the queue filter the SQL owns: 'all', 'awaiting_staff', or a dispute status.
 * `unassigned` and `assignedTo` choose the pool - the triage tabs are server-side, so a page
 * of twelve is twelve cases of that pool rather than a slice of one page.
 */
export async function fetchDisputeQueue(
  params: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    unassigned?: boolean;
    assignedTo?: string | null;
  } = {},
  signal?: AbortSignal,
): Promise<SupportDisputeQueue> {
  let query = supabase.rpc('support_dispute_queue', {
    p_status: params.status ?? 'all',
    p_search: params.search ?? '',
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 12,
    p_unassigned: params.unassigned ?? false,
    p_assigned_to: params.assignedTo ?? undefined,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Could not load the dispute queue', error.message);
  return mapQueue(data);
}

export async function fetchDisputeThread(disputeId: string, signal?: AbortSignal): Promise<DisputeThreadMessage[]> {
  let query = supabase
    .from('dispute_messages')
    .select('id, content, sender_role, sender_name, sender_avatar, attachments, is_internal_note, created_at')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Could not load this conversation', error.message);
  return (data ?? []).map((row) => ({
    id: text(row.id),
    content: text(row.content),
    senderRole: (['customer', 'vendor', 'support'] as const).includes(row.sender_role as never)
      ? (row.sender_role as DisputeThreadMessage['senderRole'])
      : 'support',
    senderName: text(row.sender_name),
    senderAvatar: row.sender_avatar === null || row.sender_avatar === undefined
      ? null
      : text(row.sender_avatar),
    attachments: Array.isArray(row.attachments) ? row.attachments.map(text) : [],
    internalNote: row.is_internal_note === true,
    createdAt: text(row.created_at),
  }));
}

export async function fetchSupportAgents(signal?: AbortSignal): Promise<SupportAgent[]> {
  let query = supabase.rpc('support_staff_directory');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Could not load the agent list', error.message);
  return asRows(asRecord(data).agents).map((row) => ({
    id: text(row.id),
    name: text(row.name),
    email: text(row.email),
    isMe: row.isMe === true,
    openCases: num(row.openCases),
  }));
}

/** Handing a case over is a staff decision; the RPC refuses self-assignment and non-staff. */
export async function assignDispute(disputeId: string, agentId: string): Promise<SupportDisputeRow['id']> {
  const { error } = await supabase.rpc('assign_dispute', {
    p_dispute_id: disputeId,
    p_agent_id: agentId,
  });
  if (error) throw rpcFailed('Could not hand this case over', error.message);
  return disputeId;
}

export async function escalateDispute(disputeId: string, note: string): Promise<SupportDisputeRow['id']> {
  const { error } = await supabase.rpc('escalate_to_support', { p_dispute_id: disputeId, p_note: note });
  if (error) throw rpcFailed('Could not escalate this case', error.message);
  return disputeId;
}

/** `internalNote` is stored as a note: the buyer never sees it in their thread. */
export async function postDisputeMessage(
  disputeId: string,
  content: string,
  internalNote = false,
): Promise<string> {
  const { data, error } = await supabase.rpc('add_dispute_message', {
    p_dispute_id: disputeId,
    p_content: content,
    p_is_internal_note: internalNote,
  });
  if (error) throw rpcFailed('Could not post to this case', error.message);
  return text(data);
}

/**
 * Money leaving the platform. `remainingGross` is what the buyer is still owed on the
 * package; the package itself only reads `refunded` once that reaches zero.
 */
export async function refundPackage(subOrderId: string, amount: number, reason: string): Promise<{
  subOrderId: string;
  amount: number;
  remainingGross: number;
  fullyRefunded: boolean;
}> {
  const { data, error } = await supabase.rpc('support_refund_sub_order', {
    p_sub_order_id: subOrderId,
    p_amount: amount,
    p_reason: reason,
    p_actor_role: 'Support',
  });
  if (error) throw rpcFailed('Could not issue this refund', error.message);
  const root = asRecord(data);
  return {
    subOrderId: text(root.subOrderId),
    amount: num(root.amount),
    remainingGross: num(root.remainingGross),
    fullyRefunded: root.fullyRefunded === true,
  };
}

/** The ruling on the case. `outcome` is one of the dispute's resolved statuses. */
export async function resolveDispute(
  disputeId: string,
  outcome: 'resolved_refund' | 'resolved_denied',
  note?: string,
  amount?: number,
): Promise<SupportDisputeRow['id']> {
  const { error } = await supabase.rpc('resolve_dispute', {
    p_dispute_id: disputeId,
    p_outcome: outcome,
    p_note: note ?? null,
    p_amount: amount ?? null,
  });
  if (error) throw rpcFailed('Could not record this decision', error.message);
  return disputeId;
}

export interface SupportOrderLookup {
  id: string;
  customerEmail: string;
  createdAt: string;
  paymentMethod: string;
  paymentStatus: string;
  packages: {
    id: string;
    sellerId: string;
    status: string;
    type: string;
    gross: number;
    carrierName: string;
    trackingNumber: string;
  }[];
  hasOpenReturn: boolean;
}

/** Order history for the email the buyer gave, recent window only. */
export async function lookupOrders(customerEmail: string, days = 30, signal?: AbortSignal): Promise<SupportOrderLookup[]> {
  let query = supabase.rpc('support_lookup_orders', { p_customer_email: customerEmail, p_days: days });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Could not look that order up', error.message);
  return asRows(data).map((row) => ({
    id: text(row.id),
    customerEmail: text(row.customer_email),
    createdAt: text(row.created_at),
    paymentMethod: text(row.payment_method),
    paymentStatus: text(row.payment_status),
    packages: asRows(row.packages).map((pkg) => ({
      id: text(pkg.id),
      sellerId: text(pkg.sellerId),
      status: text(pkg.status),
      type: text(pkg.type),
      gross: num(pkg.gross),
      carrierName: text(pkg.carrierName),
      trackingNumber: text(pkg.trackingNumber),
    })),
    hasOpenReturn: row.has_open_return === true,
  }));
}

export async function notifyAccount(
  userId: string,
  title: string,
  message: string,
  href?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('send_support_notification', {
    p_user_id: userId,
    p_title: title,
    p_message: message,
    p_href: href ?? null,
  });
  if (error) throw rpcFailed('Could not send that notice', error.message);
  return text(data);
}
