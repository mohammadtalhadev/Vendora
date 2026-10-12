import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, bool, num, optionalNum, rpcFailed, text } from './admin-client';

/**
 * A case in the arbitration queue. `packageGross` is what the buyer was actually
 * charged for the package in dispute - the exposure the platform is carrying.
 */
export interface AdminDisputeRow {
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
  /** What the refund ledger already returned on this package, summed in Postgres. */
  refundedAmount: number;
  /** `packageGross - refundedAmount`, floored at zero: the most a ruling can still move. */
  remainingGross: number;
  packageStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDisputeQueue {
  page: number;
  pageSize: number;
  total: number;
  counts: Record<
    'open' | 'underReview' | 'escalated' | 'resolved' | 'urgent' | 'unassigned' | 'mine' | 'awaitingStaff',
    number
  >;
  /** Sum of the packages still under dispute, so a ruling can be weighed against it. */
  exposure: number;
  rows: AdminDisputeRow[];
}

function mapRow(row: Record<string, unknown>): AdminDisputeRow {
  return {
    id: text(row.id),
    reason: text(row.reason),
    status: (['open', 'under_review', 'escalated', 'resolved_refund', 'resolved_denied'] as const)
      .includes(row.status as never)
      ? (row.status as AdminDisputeRow['status'])
      : 'open',
    urgency: row.urgency === 'urgent' ? 'urgent' : 'standard',
    customerId: row.customerId === null || row.customerId === undefined ? null : text(row.customerId),
    customerName: text(row.customerName),
    vendorId: row.vendorId === null || row.vendorId === undefined ? null : text(row.vendorId),
    vendorName: text(row.vendorName),
    subOrderId: row.subOrderId === null || row.subOrderId === undefined ? null : text(row.subOrderId),
    orderGroupId:
      row.orderGroupId === null || row.orderGroupId === undefined ? null : text(row.orderGroupId),
    evidencePhotos: Array.isArray(row.evidencePhotos) ? row.evidencePhotos.map(text) : [],
    resolutionNote:
      row.resolutionNote === null || row.resolutionNote === undefined ? null : text(row.resolutionNote),
    resolutionAmount: optionalNum(row.resolutionAmount),
    agentName: row.agentName === null || row.agentName === undefined ? null : text(row.agentName),
    assignedAgentId:
      row.assignedAgentId === null || row.assignedAgentId === undefined ? null : text(row.assignedAgentId),
    messages: num(row.messages),
    packageGross: num(row.packageGross),
    refundedAmount: num(row.refundedAmount),
    remainingGross: num(row.remainingGross),
    packageStatus: text(row.packageStatus),
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
  };
}

function mapQueue(value: unknown): AdminDisputeQueue {
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

export async function fetchDisputeQueue(
  params: { status?: string; search?: string; page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<AdminDisputeQueue> {
  let query = supabase.rpc('admin_dispute_queue', {
    p_status: params.status ?? 'all',
    p_search: params.search ?? '',
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 12,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load disputes', error.message);
  return mapQueue(data);
}

/**
 * Hands the case to the platform with a reason. The note is stored on the case as an
 * internal message, because a justification that only lives in a toast decides nothing.
 */
export async function escalateDispute(
  disputeId: string,
  note?: string,
): Promise<{ id: string; status: string }> {
  const { data, error } = await supabase.rpc('admin_escalate_dispute', {
    p_dispute_id: disputeId,
    p_note: note ?? null,
  });
  if (error) throw rpcFailed('Could not escalate this dispute', error.message);
  const root = asRecord(data);
  return { id: text(root.id), status: text(root.status) };
}

/** The ruling. A denied claim records the note without moving any money. */
export async function resolveDispute(
  disputeId: string,
  outcome: 'resolved_refund' | 'resolved_denied',
  note: string,
  amount?: number | null,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('resolve_dispute', {
    p_dispute_id: disputeId,
    p_outcome: outcome,
    p_note: note,
    p_amount: amount ?? null,
  });
  if (error) throw rpcFailed(`Could not record this ${outcome === 'resolved_refund' ? 'refund' : 'denial'}`, error.message);
  return bool(data);
}

/**
 * A refund is a row, not a status flip: the RPC refuses a second refund on the same
 * package and refuses to refund more than the buyer was charged for it.
 */
export async function refundSubOrder(
  subOrderId: string,
  amount: number,
  reason: string,
): Promise<{ subOrderId: string; amount: number; reason: string }> {
  const { data, error } = await supabase.rpc('admin_refund_sub_order', {
    p_sub_order_id: subOrderId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) throw rpcFailed('Could not refund this package', error.message);
  const root = asRecord(data);
  return {
    subOrderId: text(root.subOrderId),
    amount: num(root.amount),
    reason: text(root.reason),
  };
}
