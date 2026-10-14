import type { SubOrderStatus } from '../../../types/domain';

/**
 * The transition graph of `advance_sub_order_status`, mirrored so the order
 * actions menu only offers moves the state machine would accept from each
 * package's current status. The RPC re-validates every move server-side —
 * including that an admin caller may take any of these — so this map is a
 * courtesy filter, never the authority.
 */
export const NEXT_STATUSES: Record<string, SubOrderStatus[]> = {
  placed: ['confirmed', 'paid', 'available', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered', 'delivery_failed'],
  delivery_failed: ['out_for_delivery', 'cancelled'],
  delivered: ['return_requested'],
  return_requested: ['return_approved', 'return_rejected'],
  return_approved: ['returned', 'refunded'],
  returned: ['refunded'],
  paid: ['available', 'refunded'],
  available: ['refunded'],
  cancelled: [],
  refunded: [],
};
