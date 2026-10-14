import { supabase } from '../../../lib/supabase';
import { num, rpcFailed, text } from './admin-client';
import type { SubOrderStatus } from '../../../types/domain';

/**
 * Admin returns (Admin → Returns & Refunds). A return is a package
 * (sub_orders row) in a return state; this module reads every seller's
 * return queue in one place and drives the same governance RPCs the vendor
 * workspace uses — `decide_return` and `complete_return` both accept an
 * admin caller (`public.is_admin()`), so oversight actions here are the
 * platform's own, not a parallel implementation.
 */
export const ADMIN_RETURN_STATUSES: SubOrderStatus[] = [
  'return_requested',
  'return_approved',
  'return_rejected',
  'returned',
  'refunded',
];

export interface AdminReturnItem {
  title: string;
  quantity: number;
  image: string;
}

export interface AdminReturnCase {
  subOrderId: string;
  orderId: string;
  customerEmail: string;
  sellerName: string;
  sellerSlug: string;
  status: SubOrderStatus;
  items: AdminReturnItem[];
  subtotal: number;
  returnReason?: string;
  rmaCode?: string;
  refundAmount?: number;
  returnRejectReason?: string;
  createdAt: string;
}

interface ReturnRow {
  id: string;
  order_group_id: string;
  status: string;
  items: unknown;
  subtotal: number | string;
  return_reason: string | null;
  rma_code: string | null;
  refund_amount: number | string | null;
  return_reject_reason: string | null;
  created_at: string;
  seller?: { store_name?: string; slug?: string } | null;
  order?: { customer_email?: string } | null;
}

function readItems(value: unknown): AdminReturnItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      title: text(item.title) || 'Item',
      quantity: Math.max(1, num(item.quantity) || 1),
      image: text(item.image),
    };
  });
}

function mapCase(row: ReturnRow): AdminReturnCase {
  return {
    subOrderId: row.id,
    orderId: row.order_group_id,
    customerEmail: row.order?.customer_email ?? '',
    sellerName: row.seller?.store_name ?? 'Unknown store',
    sellerSlug: row.seller?.slug ?? '',
    status: row.status as SubOrderStatus,
    items: readItems(row.items),
    subtotal: num(row.subtotal),
    returnReason: row.return_reason ?? undefined,
    rmaCode: row.rma_code ?? undefined,
    refundAmount:
      row.refund_amount === null || row.refund_amount === undefined
        ? undefined
        : num(row.refund_amount),
    returnRejectReason: row.return_reject_reason ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchAdminReturns(signal?: AbortSignal): Promise<AdminReturnCase[]> {
  let query = supabase
    .from('sub_orders')
    .select(
      'id, order_group_id, status, items, subtotal, return_reason, rma_code, refund_amount, return_reject_reason, created_at, seller:vendor_profiles(store_name, slug), order:orders(customer_email)',
    )
    .in('status', ADMIN_RETURN_STATUSES)
    .order('created_at', { ascending: false })
    .limit(200);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load returns: ${error.message}`);
  return ((data ?? []) as unknown as ReturnRow[]).map(mapCase);
}

/** Approves a return (mints the RMA; refund defaults to the goods total). */
export async function adminApproveReturn(
  subOrderId: string,
  refundAmount?: number,
): Promise<void> {
  const { error } = await supabase.rpc('decide_return', {
    p_sub_order_id: subOrderId,
    p_decision: 'approve',
    p_refund_amount: refundAmount ?? null,
    p_reason: null,
  });
  if (error) throw rpcFailed('Could not approve this return', error.message);
}

/** Declines a return; the RPC refuses an empty reason. */
export async function adminDeclineReturn(subOrderId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('decide_return', {
    p_sub_order_id: subOrderId,
    p_decision: 'decline',
    p_refund_amount: null,
    p_reason: reason,
  });
  if (error) throw rpcFailed('Could not decline this return', error.message);
}

/** Closes an approved return once the goods are back (restocks via the RPC). */
export async function adminCompleteReturn(subOrderId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_return', { p_sub_order_id: subOrderId });
  if (error) throw rpcFailed('Could not close this return', error.message);
}
