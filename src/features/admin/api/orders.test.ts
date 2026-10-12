import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as orders from './orders';
import {
  deliveryRow,
  disputeRow,
  orderRow,
  refundRow,
  storeRow,
  subOrderRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const GROUP = '00000000-0000-4000-8000-000000000401';
const PKG = '00000000-0000-4000-8000-000000000501';
const STORE = 'store-1';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
  supabaseDouble.seedVendorProfile(storeRow({ id: STORE, store_name: 'Nova Tech', slug: 'nova-tech' }));
});

describe('readShippingAddress', () => {
  it('reads the address snapshot into camelCase keys', () => {
    const address = orders.readShippingAddress(orderRow().shipping_address);

    expect(address).toMatchObject({
      fullName: 'Alex Buyer',
      street: '1 Elm Street',
      city: 'Columbus',
      state: 'OH',
      zipCode: '43004',
      country: 'USA',
      phone: '614-555-0100',
    });
  });

  it('treats a digital-only empty address, and an absent one, as no address at all', () => {
    expect(orders.readShippingAddress({})).toBeNull();
    expect(orders.readShippingAddress(undefined)).toBeNull();
    expect(orders.readShippingAddress({ street: '' })).toBeNull();
  });
});

describe('fetchAdminOrderQueue', () => {
  it('maps the queue the database returned, trusting the money it summed', async () => {
    supabaseDouble.seedOrder(orderRow({ id: GROUP }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: PKG, order_group_id: GROUP, seller_id: STORE, status: 'placed' }));
    // `gross`/`commission`/`paidToSellers` are SQL sums, so a fixture hands them over and this
    // test only checks the mapping. `booked` and `total` are likewise Postgres', pinned here.
    supabaseDouble.setAdminOrders({ [GROUP]: { gross: 208.49, commission: 20.85, paidToSellers: 0, leadStatus: 'placed' } });
    supabaseDouble.setAdminQueue('admin_order_queue', { booked: 12500, total: 40 });

    const queue = await orders.fetchAdminOrderQueue();

    expect(queue).toMatchObject({ page: 1, pageSize: 12, total: 40, booked: 12500 });
    expect(queue.rows).toHaveLength(1);
    expect(queue.rows[0]).toMatchObject({
      id: GROUP, customerEmail: 'buyer@demo.test', paymentMethod: 'card', paymentStatus: 'succeeded',
      gross: 208.49, commission: 20.85, paidToSellers: 0, leadStatus: 'placed', packages: 1,
    });
    // The line’s gross is this package’s own subtotal + shipping, so it maps straight from the row.
    expect(queue.rows[0]!.lines[0]).toMatchObject({ id: PKG, sellerId: STORE, status: 'placed', gross: 208.49 });
  });

  it('asks the database for the filter and the page rather than trimming a page locally', async () => {
    await orders.fetchAdminOrderQueue({ status: 'shipped', payment: 'pending', search: 'buyer', page: 3, pageSize: 5 });

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toMatchObject({
      p_status: 'shipped', p_payment: 'pending', p_search: 'buyer', p_page: 3, p_page_size: 5,
    });
  });

  it('falls back to "all" and the first page when the caller asks for nothing', async () => {
    await orders.fetchAdminOrderQueue();

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toMatchObject({
      p_status: 'all', p_payment: 'all', p_search: '', p_page: 1, p_page_size: 12,
    });
  });

  it('returns only the orders the status filter kept', async () => {
    supabaseDouble.seedOrder(orderRow({ id: GROUP, created_at: '2026-10-06T00:00:00.000Z' }));
    supabaseDouble.seedOrder(orderRow({ id: 'order-old', created_at: '2026-10-01T00:00:00.000Z' }));
    supabaseDouble.setAdminOrders({
      [GROUP]: { leadStatus: 'delivered' },
      'order-old': { leadStatus: 'cancelled' },
    });

    const queue = await orders.fetchAdminOrderQueue({ status: 'delivered' });

    expect(queue.rows.map((row) => row.id)).toEqual([GROUP]);
  });

  it('refuses an account that is not the platform team, and says why', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'shopper', email: 's@demo.test' } };

    await expect(orders.fetchAdminOrderQueue()).rejects.toThrow(/only the platform team can read the order queue/i);
  });

  it('throws on a failed read instead of returning an empty queue', async () => {
    supabaseDouble.failRpc('permission denied for function admin_order_queue');

    await expect(orders.fetchAdminOrderQueue()).rejects.toThrow(/permission denied/i);
  });

  it('maps an empty result to no rows and honest zeros, not an invented order', async () => {
    const queue = await orders.fetchAdminOrderQueue();

    expect(queue.rows).toEqual([]);
    expect(queue.total).toBe(0);
    expect(queue.booked).toBe(0);
  });
});

describe('fetchAdminOrderDetail', () => {
  it('maps the order header and the money the database summed', async () => {
    supabaseDouble.seedOrder(orderRow({ id: GROUP }));
    supabaseDouble.setAdminOrders({ [GROUP]: { gross: 208.49, commission: 20.85, refunded: 0 } });

    const detail = await orders.fetchAdminOrderDetail(GROUP);

    expect(detail).toMatchObject({
      id: GROUP, customerEmail: 'buyer@demo.test', customerId: 'user-1',
      paymentMethod: 'card', paymentStatus: 'succeeded', createdAt: '2026-10-06T14:30:00.000Z',
      gross: 208.49, commission: 20.85, refunded: 0,
    });
    expect(detail.paymentDetails).toEqual({ brand: 'Visa', last4: '0000', method: null });
    expect(detail.shippingAddress).toMatchObject({ street: '1 Elm Street', city: 'Columbus' });
    expect(detail.packages).toEqual([]);
  });

  it('maps the packages the order carries, joined to their store and delivery', async () => {
    supabaseDouble.seedOrder(orderRow({ id: GROUP }));
    supabaseDouble.seedSubOrder(subOrderRow({
      id: PKG, order_group_id: GROUP, seller_id: STORE, status: 'shipped',
      items: [{ productId: 'prod-1', variantId: null, title: 'Mechanical Keyboard', price: 59.5, quantity: 2, image: 'https://example.test/kb.png' }],
      subtotal: 119, shipping_fee: 0, commission_rate: 0.1, commission_amount: 11.9, net_payout: 107.1,
      carrier_name: 'UPS', tracking_number: '1Z999',
      history: [
        { status: 'placed', timestamp: '2026-10-06T14:30:00.000Z', actor: 'Customer', note: null },
        { status: 'shipped', timestamp: '2026-10-07T09:00:00.000Z', actor: 'Admin', note: 'Handed to UPS' },
      ],
    }));
    supabaseDouble.seedDelivery(deliveryRow({
      sub_order_id: PKG, status: 'out_for_delivery', rider_id: 'rider-1',
      picked_up_at: '2026-10-07T10:00:00.000Z', delivered_at: null,
    }));

    const detail = await orders.fetchAdminOrderDetail(GROUP);
    const pkg = detail.packages[0]!;

    expect(detail.packages).toHaveLength(1);
    expect(pkg).toMatchObject({
      id: PKG, sellerId: STORE, storeName: 'Nova Tech', type: 'physical', status: 'shipped',
      subtotal: 119, shippingFee: 0, commissionRate: 0.1, commissionAmount: 11.9, netPayout: 107.1,
      carrierName: 'UPS', trackingNumber: '1Z999',
    });
    expect(pkg.licenseKey).toBeNull();
    expect(pkg.items[0]).toMatchObject({ productId: 'prod-1', variantId: null, title: 'Mechanical Keyboard', price: 59.5, quantity: 2 });
    expect(pkg.history.map((event) => event.note)).toEqual([null, 'Handed to UPS']);
    expect(pkg.delivery).toMatchObject({ status: 'out_for_delivery', riderId: 'rider-1', pickedUpAt: '2026-10-07T10:00:00.000Z', deliveredAt: null });
  });

  it('leaves delivery null when the package has none', async () => {
    supabaseDouble.seedOrder(orderRow({ id: GROUP }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: PKG, order_group_id: GROUP }));

    const detail = await orders.fetchAdminOrderDetail(GROUP);

    expect(detail.packages[0]!.delivery).toBeNull();
  });

  it('shows a refund and a dispute because their rows exist, with the processor resolved by name', async () => {
    supabaseDouble.seedOrder(orderRow({ id: GROUP }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: PKG, order_group_id: GROUP }));
    supabaseDouble.seedRefund(refundRow({
      id: 'refund-1', order_group_id: GROUP, sub_order_id: PKG, amount: 25,
      reason: 'Damaged on arrival', processed_by: 'admin-1',
    }));
    supabaseDouble.seedDispute(disputeRow({
      id: 'case-1', order_group_id: GROUP, sub_order_id: PKG, reason: 'Not what I ordered', status: 'open',
    }));

    const detail = await orders.fetchAdminOrderDetail(GROUP);

    expect(detail.refunds).toHaveLength(1);
    expect(detail.refunds[0]).toMatchObject({ id: 'refund-1', amount: 25, reason: 'Damaged on arrival', processedBy: 'Platform Admin' });
    expect(detail.disputes[0]).toMatchObject({ id: 'case-1', reason: 'Not what I ordered', status: 'open', vendorName: 'Demo Store' });
    expect(detail.disputes[0]!.resolutionAmount).toBeNull();
  });

  it('reads a cash-on-delivery payment detail as a method, not a card', async () => {
    supabaseDouble.seedOrder(orderRow({ id: GROUP, payment_method: 'cod', payment_details: { method: 'cod' } }));

    const detail = await orders.fetchAdminOrderDetail(GROUP);

    expect(detail.paymentDetails).toEqual({ brand: null, last4: null, method: 'cod' });
  });

  it('reports an unknown order reference as a failure, not a blank dossier', async () => {
    await expect(orders.fetchAdminOrderDetail('order-missing')).rejects.toThrow(/no order with that reference/i);
  });

  it('refuses an account that is not the platform team', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'shopper', email: 's@demo.test' } };

    await expect(orders.fetchAdminOrderDetail(GROUP)).rejects.toThrow(/only the platform team can read an order/i);
  });

  it('throws on a failed read rather than fabricating an order', async () => {
    supabaseDouble.failRpc('permission denied for function admin_order_detail');

    await expect(orders.fetchAdminOrderDetail(GROUP)).rejects.toThrow(/permission denied/i);
  });
});
