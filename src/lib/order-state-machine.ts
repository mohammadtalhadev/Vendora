import type { PhysicalSubOrderStatus, DigitalSubOrderStatus, SubOrderStatus, UserRole } from '../types/domain';
export type { SubOrderStatus, PhysicalSubOrderStatus, DigitalSubOrderStatus };

// Valid transitions for physical goods
export const PHYSICAL_TRANSITIONS: Record<PhysicalSubOrderStatus, PhysicalSubOrderStatus[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered', 'delivery_failed'],
  delivery_failed: ['out_for_delivery', 'cancelled'], // Retry delivery or return
  delivered: ['return_requested'],
  return_requested: ['return_approved'],
  return_approved: ['refunded'],
  cancelled: [],
  refunded: [],
};

// Valid transitions for digital assets
export const DIGITAL_TRANSITIONS: Record<DigitalSubOrderStatus, DigitalSubOrderStatus[]> = {
  placed: ['paid'],
  paid: ['available'],
  available: ['refunded'],
  refunded: [],
};

// Allowed roles for specific transitions
interface TransitionRule {
  allowedRoles: UserRole[];
  description: string;
}

export const TRANSITION_PERMISSIONS: Partial<Record<string, TransitionRule>> = {
  'placed->confirmed': { allowedRoles: ['vendor', 'admin'], description: 'Vendor confirms order' },
  'confirmed->packed': { allowedRoles: ['vendor', 'admin'], description: 'Vendor packs order' },
  'packed->ready_for_pickup': { allowedRoles: ['vendor', 'admin'], description: 'Vendor marks ready for pickup' },
  'ready_for_pickup->shipped': { allowedRoles: ['rider', 'admin'], description: 'Rider picks up package' },
  'shipped->out_for_delivery': { allowedRoles: ['rider', 'admin'], description: 'Rider starts delivery route' },
  'out_for_delivery->delivered': { allowedRoles: ['rider', 'admin'], description: 'Rider completes delivery' },
  'out_for_delivery->delivery_failed': { allowedRoles: ['rider', 'admin'], description: 'Rider marks failed attempt' },
  'placed->cancelled': { allowedRoles: ['customer', 'admin', 'vendor'], description: 'Cancel order before shipment' },
  'confirmed->cancelled': { allowedRoles: ['customer', 'admin', 'vendor'], description: 'Cancel order before shipment' },
  'packed->cancelled': { allowedRoles: ['admin', 'vendor'], description: 'Cancel packed order' },
  'delivered->return_requested': { allowedRoles: ['customer', 'admin'], description: 'Customer requests return' },
  'return_requested->return_approved': { allowedRoles: ['vendor', 'admin'], description: 'Vendor approves return' },
  'return_approved->refunded': { allowedRoles: ['admin'], description: 'Admin authorizes refund' },
  'placed->paid': { allowedRoles: ['customer', 'admin'], description: 'Payment successful' },
  'paid->available': { allowedRoles: ['admin', 'vendor'], description: 'License key unlocked' },
  'available->refunded': { allowedRoles: ['admin'], description: 'Admin refunds digital license' },
};

/**
 * Validates whether a sub-order can transition from currentStatus to nextStatus given an actor role.
 */
export function canTransitionSubOrder(
  currentStatus: SubOrderStatus,
  nextStatus: SubOrderStatus,
  type: 'physical' | 'digital',
  actorRole: UserRole,
): { allowed: boolean; reason?: string } {
  if (currentStatus === nextStatus) {
    return { allowed: false, reason: 'Sub-order is already in this status' };
  }

  // 1. Verify state graph validity
  if (type === 'physical') {
    const allowedNext = PHYSICAL_TRANSITIONS[currentStatus as PhysicalSubOrderStatus] || [];
    if (!allowedNext.includes(nextStatus as PhysicalSubOrderStatus)) {
      return {
        allowed: false,
        reason: `Invalid state transition from '${currentStatus}' to '${nextStatus}' for physical goods`,
      };
    }
  } else {
    const allowedNext = DIGITAL_TRANSITIONS[currentStatus as DigitalSubOrderStatus] || [];
    if (!allowedNext.includes(nextStatus as DigitalSubOrderStatus)) {
      return {
        allowed: false,
        reason: `Invalid state transition from '${currentStatus}' to '${nextStatus}' for digital assets`,
      };
    }
  }

  // 2. Verify actor permission
  const transitionKey = `${currentStatus}->${nextStatus}`;
  const rule = TRANSITION_PERMISSIONS[transitionKey];
  if (rule && !rule.allowedRoles.includes(actorRole)) {
    return {
      allowed: false,
      reason: `Role '${actorRole}' is not authorized to perform '${transitionKey}'. Allowed: ${rule.allowedRoles.join(', ')}`,
    };
  }

  return { allowed: true };
}

export type OrderGroupDerivedStatus =
  | 'pending'
  | 'processing'
  | 'in_transit'
  | 'partially_delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

/**
 * Derives the overarching Order Group status from its constituent sub-orders.
 * Invariant: Never stored separately in database; always computed deterministically.
 */
export function deriveOrderGroupStatus(statuses: SubOrderStatus[]): OrderGroupDerivedStatus {
  if (statuses.length === 0) return 'pending';

  const allCancelled = statuses.every((s) => s === 'cancelled');
  if (allCancelled) return 'cancelled';

  const allRefunded = statuses.every((s) => s === 'refunded');
  if (allRefunded) return 'refunded';

  const allDeliveredOrAvailable = statuses.every(
    (s) => s === 'delivered' || s === 'available',
  );
  if (allDeliveredOrAvailable) return 'completed';

  const anyInTransit = statuses.some(
    (s) => s === 'shipped' || s === 'out_for_delivery',
  );
  if (anyInTransit) return 'in_transit';

  const anyDelivered = statuses.some(
    (s) => s === 'delivered' || s === 'available',
  );
  if (anyDelivered) return 'partially_delivered';

  return 'processing';
}
