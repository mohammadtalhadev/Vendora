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
 * Derives each group's subtotal. Shipping is deliberately NOT estimated
 * here: the only honest shipping figure is the server quote
 * (`checkout_quote`, the same function checkout books with), so a group
 * carries no shipping number of its own — the cart UI reads the quote,
 * and without one it says shipping is calculated at checkout. (This
 * replaces a legacy client rule — "over $100 free, otherwise $8.50 per
 * vendor" — that priced every PKR cart as free shipping while checkout
 * charged the real per-seller fees.)
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
        fulfilmentNote: isPlatform
          ? 'Fulfilled directly by Vendora · Prime Express Shipping'
          : `Ships from ${item.sellerName} warehouse`,
      };
      groupMap.set(groupId, group);
    }

    group.items.push(item);
    group.subtotal += item.price * item.quantity;
  }

  for (const group of groupMap.values()) {
    if (group.items.every((i) => i.type !== 'physical')) {
      group.fulfilmentNote = 'Instant Digital Download · No shipping required';
    }
  }

  return Array.from(groupMap.values());
}

/**
 * Calculates the cart totals the browser can know on its own: itemCount,
 * subtotal and the coupon discount. Shipping is NOT one of them — pricing
 * it is the server quote's job (`checkout_quote`), so `shippingTotal`
 * stays 0 here and `grandTotal` is the total BEFORE shipping. Surfaces
 * that can make the quote (a signed-in cart) display the quote's own
 * shipping and grand total; the rest say shipping is calculated at
 * checkout rather than inventing a figure.
 * Invariant: Never stored in database; always computed dynamically.
 */
export function calculateCartTotals(
  items: CartItem[],
  appliedCoupon?: Coupon | null,
): CartTotals {
  const sellerGroups = groupCartBySeller(items);

  let itemCount = 0;
  let subtotal = 0;
  const shippingTotal = 0;

  for (const item of items) {
    itemCount += item.quantity;
    subtotal += item.price * item.quantity;
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
