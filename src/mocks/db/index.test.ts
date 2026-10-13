import { describe, it, expect, beforeEach } from 'vitest';
import { MockDatabase } from './index';
import type { CartItem } from '../../types/domain';

describe('Mock Database & Split-Order Engine', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
    db.resetToSeed();
  });

  it('calculates commissions following exact precedence rules', () => {
    // 1. Vendor override: 'vendor-tech-1' has 7% override
    const vendorRes = db.calculateCommission('vendor-tech-1', 'general', 100);
    expect(vendorRes.rate).toBe(0.07);
    expect(vendorRes.amount).toBe(7);
    expect(vendorRes.netPayout).toBe(93);

    // 2. Category override: 'cat-digital' has 15% override
    const catRes = db.calculateCommission('other-vendor', 'cat-digital', 100);
    expect(catRes.rate).toBe(0.15);
    expect(catRes.amount).toBe(15);
    expect(catRes.netPayout).toBe(85);

    // 3. Global default: 10%
    const defaultRes = db.calculateCommission('other-vendor', 'cat-audio', 100);
    expect(defaultRes.rate).toBe(0.10);
    expect(defaultRes.amount).toBe(10);
    expect(defaultRes.netPayout).toBe(90);
  });

  it('correctly splits cart into multiple sub-orders per vendor with frozen commissions', () => {
    const testItems: CartItem[] = [
      {
        id: 'item-1',
        productId: 'prod-v-1',
        title: 'Platform Headphones',
        price: 249,
        quantity: 1,
        maxStock: 10,
        image: '/img.jpg',
        sellerId: 'platform',
        sellerName: 'Vendora',
        sellerType: 'platform',
        type: 'physical',
      },
      {
        id: 'item-2',
        productId: 'prod-vend-1',
        title: 'Vendor IEMs',
        price: 189,
        quantity: 1,
        maxStock: 5,
        image: '/img2.jpg',
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
        type: 'physical',
      },
    ];

    const result = db.createOrderGroup({
      customerId: 'usr-customer-1',
      customerEmail: 'customer@demo.test',
      items: testItems,
      paymentMethod: 'card',
      paymentBrand: 'Mastercard',
      last4: '8812',
    });

    expect(result.orderGroup.subOrderIds).toHaveLength(2);
    expect(result.createdSubOrders).toHaveLength(2);

    const vendorSub = result.createdSubOrders.find((so) => so.sellerId === 'vendor-tech-1');
    expect(vendorSub).toBeDefined();
    expect(vendorSub?.commissionRate).toBe(0.07); // 7% override
    expect(vendorSub?.commissionAmount).toBe(13.23); // 7% of 189 = 13.23
    expect(vendorSub?.netPayout).toBe(175.77);
    expect(vendorSub?.status).toBe('placed');
  });

  it('updates sub-order status and logs audit history trail', () => {
    const testItems: CartItem[] = [
      {
        id: 'item-1',
        productId: 'prod-v-1',
        title: 'Item',
        price: 50,
        quantity: 1,
        maxStock: 10,
        image: '/img.jpg',
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave',
        sellerType: 'vendor',
        type: 'physical',
      },
    ];

    const { createdSubOrders } = db.createOrderGroup({
      customerId: 'usr-customer-1',
      customerEmail: 'customer@demo.test',
      items: testItems,
      paymentMethod: 'cod',
    });

    const subOrder = createdSubOrders[0];
    const updated = db.updateSubOrderStatus(subOrder.id, 'confirmed', 'Vendor', 'Confirmed stock');

    expect(updated.status).toBe('confirmed');
    expect(updated.history).toHaveLength(2);
    expect(updated.history[1].actor).toBe('Vendor');
  });
});
