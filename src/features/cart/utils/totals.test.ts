import { describe, it, expect } from 'vitest';
import { groupCartBySeller, calculateCartTotals } from './totals';
import type { Coupon } from './totals';
import type { CartItem } from '../../../types/domain';

const mockItems: CartItem[] = [
  {
    id: 'p1',
    productId: 'prod-1',
    title: 'Platform Headphones',
    price: 120,
    quantity: 1,
    maxStock: 10,
    image: '/img1.jpg',
    sellerId: 'platform',
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'physical',
  },
  {
    id: 'p2',
    productId: 'prod-2',
    title: 'Vendor Mouse',
    price: 40,
    quantity: 1,
    maxStock: 5,
    image: '/img2.jpg',
    sellerId: 'vendor-tech',
    sellerName: 'TechHub',
    sellerType: 'vendor',
    type: 'physical',
  },
  {
    id: 'p3',
    productId: 'prod-3',
    title: 'Digital UI Kit',
    price: 50,
    quantity: 1,
    maxStock: 999,
    image: '/img3.jpg',
    sellerId: 'vendor-design',
    sellerName: 'StudioCraft',
    sellerType: 'vendor',
    type: 'digital',
  },
];

describe('Multi-Vendor Cart Grouping & Calculations', () => {
  it('correctly partitions items into distinct seller groups', () => {
    const groups = groupCartBySeller(mockItems);
    expect(groups).toHaveLength(3);

    const platformGroup = groups.find((g) => g.sellerId === 'platform');
    expect(platformGroup).toBeDefined();
    expect(platformGroup?.items).toHaveLength(1);
    expect(platformGroup?.subtotal).toBe(120);

    const vendorGroup = groups.find((g) => g.sellerId === 'vendor-tech');
    expect(vendorGroup).toBeDefined();
    expect(vendorGroup?.subtotal).toBe(40);

    const digitalGroup = groups.find((g) => g.sellerId === 'vendor-design');
    expect(digitalGroup).toBeDefined();
    expect(digitalGroup?.fulfilmentNote).toContain('Instant Digital Download');

    // Groups carry no shipping figure of their own: shipping comes from the
    // server quote (`checkout_quote`), never from a client-side rule. The
    // old estimator ("over $100 free, otherwise $8.50 per vendor") priced
    // every PKR cart as free shipping while checkout charged real fees.
    for (const group of groups) {
      expect(group).not.toHaveProperty('estimatedShipping');
    }
  });

  it('calculates derived cart totals accurately without coupons', () => {
    const totals = calculateCartTotals(mockItems);
    expect(totals.itemCount).toBe(3);
    expect(totals.subtotal).toBe(210); // 120 + 40 + 50
    // Shipping is the server quote's job; the local total is before shipping.
    expect(totals.shippingTotal).toBe(0);
    expect(totals.discountTotal).toBe(0);
    expect(totals.grandTotal).toBe(210);
  });

  it('applies a platform-wide percentage coupon properly', () => {
    const coupon: Coupon = {
      code: 'PRO10',
      type: 'percentage',
      value: 10, // 10%
    };
    const totals = calculateCartTotals(mockItems, coupon);
    expect(totals.subtotal).toBe(210);
    expect(totals.discountTotal).toBe(21); // 10% of 210
    expect(totals.grandTotal).toBe(189); // 210 - 21, before shipping
  });

  it('honors minimum spend conditions for coupons', () => {
    const coupon: Coupon = {
      code: 'BIGSPEND',
      type: 'fixed',
      value: 50,
      minSpend: 500, // Not met
    };
    const totals = calculateCartTotals(mockItems, coupon);
    expect(totals.discountTotal).toBe(0);
    expect(totals.grandTotal).toBe(210);
  });

  it('restricts vendor-specific coupon to that vendor subtotal only', () => {
    const coupon: Coupon = {
      code: 'TECH20',
      type: 'percentage',
      value: 20, // 20% off TechHub only
      sellerScope: 'vendor-tech',
    };
    const totals = calculateCartTotals(mockItems, coupon);
    expect(totals.discountTotal).toBe(8); // 20% of 40 = 8
    expect(totals.grandTotal).toBe(202); // 210 - 8, before shipping
  });
});
