import type { CartItem, SellerCartGroup, CartTotals } from '../../../types/domain';

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // e.g. 10 for 10% or 15 for $15 off
  minSpend?: number;
  sellerScope?: string; // 'platform' for all or specific sellerId
}

/**
 * Groups flat cart items by their seller (platform or independent vendor).
 * Derives subtotal and shipping estimates per seller group.
 */
export function groupCartBySeller(items: CartItem[]): SellerCartGroup[] {
  const groupMap = new Map<string, SellerCartGroup>();

  for (const item of items) {
    const isPlatform =
      item.sellerType === 'platform' ||
      item.sellerId === 'platform' ||
      item.sellerName?.toLowerCase() === 'vendora';
    const groupId = isPlatform ? 'platform' : item.sellerId;

    let group = groupMap.get(groupId);
    if (!group) {
      group = {
        sellerId: groupId,
        sellerName: isPlatform ? 'Vendora' : item.sellerName,
        sellerType: isPlatform ? 'platform' : item.sellerType,
        items: [],
        subtotal: 0,
        estimatedShipping: 0,
        fulfilmentNote: isPlatform
          ? 'Fulfilled directly by Vendora · Prime Express Shipping'
          : `Ships from ${item.sellerName} warehouse`,
      };
      groupMap.set(groupId, group);
    }

    group.items.push(item);
    group.subtotal += item.price * item.quantity;
  }

  // Calculate shipping per group
  for (const group of groupMap.values()) {
    // If all items in this group are digital, shipping is $0
    const hasPhysicalItems = group.items.some((i) => i.type === 'physical');
    if (!hasPhysicalItems) {
      group.estimatedShipping = 0;
      group.fulfilmentNote = 'Instant Digital Download · No shipping required';
    } else {
      // Standard rule: orders over $100 get free shipping, otherwise $8.50 per vendor
      group.estimatedShipping = group.subtotal >= 100 ? 0 : 8.5;
    }
  }

  return Array.from(groupMap.values());
}

/**
 * Calculates derived cart totals: itemCount, subtotal, shippingTotal, discount, grandTotal.
 * Invariant: Never stored in database; always computed dynamically.
 */
export function calculateCartTotals(
  items: CartItem[],
  appliedCoupon?: Coupon | null,
): CartTotals {
  const sellerGroups = groupCartBySeller(items);

  let itemCount = 0;
  let subtotal = 0;
  let shippingTotal = 0;

  for (const item of items) {
    itemCount += item.quantity;
    subtotal += item.price * item.quantity;
  }

  for (const group of sellerGroups) {
    shippingTotal += group.estimatedShipping;
  }

  let discountTotal = 0;
  if (appliedCoupon) {
    const isEligible = !appliedCoupon.minSpend || subtotal >= appliedCoupon.minSpend;
    if (isEligible) {
      if (appliedCoupon.sellerScope && appliedCoupon.sellerScope !== 'platform') {
        // Scope limited to specific vendor
        const targetGroup = sellerGroups.find((g) => g.sellerId === appliedCoupon.sellerScope);
        if (targetGroup) {
          if (appliedCoupon.type === 'percentage') {
            discountTotal = (targetGroup.subtotal * appliedCoupon.value) / 100;
          } else {
            discountTotal = Math.min(appliedCoupon.value, targetGroup.subtotal);
          }
        }
      } else {
        // Platform-wide coupon
        if (appliedCoupon.type === 'percentage') {
          discountTotal = (subtotal * appliedCoupon.value) / 100;
        } else {
          discountTotal = Math.min(appliedCoupon.value, subtotal);
        }
      }
    }
  }

  const grandTotal = Math.max(0, subtotal + shippingTotal - discountTotal);

  return {
    itemCount,
    subtotal: Math.round(subtotal * 100) / 100,
    shippingTotal: Math.round(shippingTotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}
