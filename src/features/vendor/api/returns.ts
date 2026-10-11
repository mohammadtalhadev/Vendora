import { supabase } from '../../../lib/supabase';
import type { SubOrderStatus } from '../../../types/domain';
import { asRows, num, rpcFailed, text } from './vendor-client';
import { fetchVendorPackage, fetchVendorPackages, type VendorPackage } from './packages';

/** The store's return queue: whatever the state machine currently leaves waiting. */
const QUEUE: SubOrderStatus[] = ['return_requested', 'return_approved', 'returned', 'return_rejected'];

export async function fetchReturnQueue(signal?: AbortSignal): Promise<VendorPackage[]> {
  const packages = await fetchVendorPackages(signal);
  return packages.filter((pkg) => QUEUE.includes(pkg.status));
}

export interface ReturnDecision {
  id: string;
  decision: 'approve' | 'decline';
  status: 'return_approved' | 'return_rejected';
  /** Only an approval mints an RMA; a decline records the reason instead. */
  rmaCode?: string;
  refundAmount?: number;
}

function mapDecision(payload: unknown): ReturnDecision {
  const row = (payload ?? {}) as Record<string, unknown>;
  return {
    id: text(row.id),
    decision: row.decision === 'decline' ? 'decline' : 'approve',
    status: row.status === 'return_rejected' ? 'return_rejected' : 'return_approved',
    rmaCode: row.rmaCode == null ? undefined : text(row.rmaCode),
    refundAmount: row.refundAmount == null ? undefined : num(row.refundAmount),
  };
}

/**
 * Approving gives the buyer the RMA they must quote and defaults the refund to the
 * goods total; `p_refund_amount` lets a partial refund be agreed instead.
 */
export async function approveReturn(
  subOrderId: string,
  refundAmount?: number,
): Promise<{ decision: ReturnDecision; pkg: VendorPackage }> {
  const { data, error } = await supabase.rpc('decide_return', {
    p_sub_order_id: subOrderId,
    p_decision: 'approve',
    p_refund_amount: refundAmount ?? null,
    p_reason: null,
  });
  if (error) throw rpcFailed('Could not approve this return', error.message);
  return { decision: mapDecision(data), pkg: await fetchVendorPackage(subOrderId) };
}

/** A decline needs a reason for the buyer; the RPC refuses an empty one. */
export async function declineReturn(
  subOrderId: string,
  reason: string,
): Promise<{ decision: ReturnDecision; pkg: VendorPackage }> {
  const { data, error } = await supabase.rpc('decide_return', {
    p_sub_order_id: subOrderId,
    p_decision: 'decline',
    p_refund_amount: null,
    p_reason: reason,
  });
  if (error) throw rpcFailed('Could not decline this return', error.message);
  return { decision: mapDecision(data), pkg: await fetchVendorPackage(subOrderId) };
}

export interface RestockedLine {
  productId: string;
  returned: number;
  /** The shelf count after the units went back - the database's number, not a guess. */
  stock: number;
}

/**
 * Closes an approved return. The units are put back on the shelf in the same
 * transaction, which is why restocking is an RPC and not something a reducer can do.
 */
export async function completeReturn(subOrderId: string): Promise<{ restocked: RestockedLine[]; pkg: VendorPackage }> {
  const { data, error } = await supabase.rpc('complete_return', { p_sub_order_id: subOrderId });
  if (error) throw rpcFailed('Could not close this return', error.message);

  const restocked = asRows((data as Record<string, unknown> | null)?.restocked).map((row) => ({
    productId: text(row.productId),
    returned: num(row.returned),
    stock: num(row.stock),
  }));
  return { restocked, pkg: await fetchVendorPackage(subOrderId) };
}
