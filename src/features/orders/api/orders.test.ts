import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as orders from './orders';
import {
  orderRow,
  orderedItemRow,
  productRow,
  storeRow,
  subOrderRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const USER = 'user-1';
const ORDER = '00000000-0000-4000-8000-000000000401';
const SUB = '00000000-0000-4000-8000-000000000501';
const HEADPHONES = '00000000-0000-4000-8000-000000000101';
const EBOOK = '00000000-0000-4000-8000-000000000102';

function signIn() {
  supabaseDouble.authState.session = { access_token: 't', user: { id: USER, email: 'buyer@demo.test' } };
}

/** A shipped package with a handover code, plus the order it belongs to. */
function seedOrder(overrides: Partial<Record<string, unknown>> = {}) {
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech', seller_type: 'vendor' }));
  supabaseDouble.seedOrder(orderRow({ id: ORDER, customer_id: USER, ...overrides }));
  supabaseDouble.seedSubOrder(subOrderRow({ id: SUB, order_group_id: ORDER }));
}

beforeEach(() => {
  supabaseDouble.reset();
  signIn();
});

describe('fetchOrders', () => {
  it('needs a session before it will read anything', async () => {
    supabaseDouble.authState.session = null;
    await expect(orders.fetchOrders()).rejects.toThrow(/Sign in/i);
  });

  it('maps the order and its embedded packages onto domain objects', async () => {
    seedOrder();

    const { orderGroups, subOrders } = await orders.fetchOrders();

    expect(orderGroups).toHaveLength(1);
    expect(orderGroups[0]).toMatchObject({
      id: ORDER,
      customerId: USER,
      customerEmail: 'buyer@demo.test',
      paymentMethod: 'card',
      paymentStatus: 'succeeded',
      subOrderIds: [SUB],
    });
    expect(orderGroups[0].shippingAddress).toMatchObject({ street: '1 Elm Street', city: 'Columbus' });

    expect(subOrders).toHaveLength(1);
    expect(subOrders[0]).toMatchObject({
      id: SUB,
      orderGroupId: ORDER,
      sellerId: 'store-1',
      sellerName: 'Nova Tech',
      sellerType: 'vendor',
      status: 'placed',
      subtotal: 199.99,
      shippingFee: 8.5,
      commissionAmount: 20,
      netPayout: 179.99,
    });
    expect(subOrders[0].items[0]).toMatchObject({
      productId: HEADPHONES,
      title: 'Reference Headphones',
      price: 199.99,
      quantity: 1,
      // A booked line records what was ordered, so its own quantity is the ceiling.
      maxStock: 1,
      sellerName: 'Nova Tech',
      type: 'physical',
    });
    expect(subOrders[0].history[0]).toMatchObject({ status: 'placed', actor: 'Customer' });
  });

  it('keeps a card that was never captured as absent digits, not as a made-up number', async () => {
    supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1' }));
    supabaseDouble.seedOrder(orderRow({ id: ORDER, customer_id: USER, payment_details: {} }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: SUB, order_group_id: ORDER }));

    const { orderGroups } = await orders.fetchOrders();
    expect(orderGroups[0].paymentDetails).toEqual({ brand: undefined, last4: undefined });
  });

  it('drops the empty address a digital-only order books', async () => {
    supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1' }));
    supabaseDouble.seedOrder(orderRow({ id: ORDER, customer_id: USER, shipping_address: {} }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: SUB, order_group_id: ORDER, type: 'digital' }));

    const { orderGroups } = await orders.fetchOrders();
    expect(orderGroups[0].shippingAddress).toBeUndefined();
  });

  it('reads only the signed-in customer, because the filters mirror RLS', async () => {
    supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1' }));
    supabaseDouble.seedOrder(orderRow({ id: ORDER, customer_id: 'other-user' }));

    const { orderGroups } = await orders.fetchOrders();
    expect(orderGroups).toHaveLength(0);
  });

  it('surfaces a failed read instead of falling back to demo data', async () => {
    supabaseDouble.failures.orders = 'permission denied for table orders';
    await expect(orders.fetchOrders()).rejects.toThrow(/Failed to load your orders/);
  });
});

describe('fetchOrderDetail', () => {
  it('reads one order with its packages', async () => {
    seedOrder();

    const { orderGroup, subOrders } = await orders.fetchOrderDetail(ORDER);
    expect(orderGroup.id).toBe(ORDER);
    expect(subOrders.map((sub) => sub.id)).toEqual([SUB]);
  });

  it('reports an order RLS hides as not found', async () => {
    seedOrder();
    await expect(orders.fetchOrderDetail('00000000-0000-4000-8000-000000000999')).rejects.toThrow(/Order not found/);
  });
});

describe('advanceSubOrderStatus', () => {
  it('calls the RPC then re-reads the row rather than trusting the reply', async () => {
    seedOrder();

    const updated = await orders.advanceSubOrderStatus(SUB, 'cancelled', 'Ordered by mistake');

    expect(supabaseDouble.rpcCalls.at(-1)).toEqual({
      fn: 'advance_sub_order_status',
      args: { p_sub_order_id: SUB, p_next: 'cancelled', p_note: 'Ordered by mistake' },
    });
    expect(updated.status).toBe('cancelled');
    expect(updated.history.at(-1)).toMatchObject({ status: 'cancelled', note: 'Ordered by mistake' });
  });

  it('carries the database refusal through, word for word', async () => {
    seedOrder();
    supabaseDouble.failRpc('illegal transition from delivered to cancelled');

    await expect(orders.advanceSubOrderStatus(SUB, 'cancelled')).rejects.toThrow(/illegal transition/);
  });
});

describe('issueDeliveryCode', () => {
  it('returns the fresh code the RPC mints', async () => {
    seedOrder();

    await expect(orders.issueDeliveryCode(SUB)).resolves.toBe('4821');
    expect(supabaseDouble.tables.sub_orders[0].delivery_code_hash).toBe('sha256:rotated');
  });

  it('refuses a closed delivery with the server message', async () => {
    supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1' }));
    supabaseDouble.seedOrder(orderRow({ id: ORDER, customer_id: USER }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: SUB, order_group_id: ORDER, status: 'delivered' }));

    await expect(orders.issueDeliveryCode(SUB)).rejects.toThrow(/already closed/);
  });

  it('refuses a digital package, which never had a code', async () => {
    supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1' }));
    supabaseDouble.seedOrder(orderRow({ id: ORDER, customer_id: USER }));
    supabaseDouble.seedSubOrder(
      subOrderRow({ id: SUB, order_group_id: ORDER, type: 'digital', status: 'available', delivery_code_hash: null }),
    );

    await expect(orders.issueDeliveryCode(SUB)).rejects.toThrow(/no handover code/);
  });
});

describe('fetchDigitalDownloads', () => {
  it('joins each licence to the live product file metadata', async () => {
    supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Print Room' }));
    supabaseDouble.seedOrder(orderRow({ id: ORDER, customer_id: USER }));
    supabaseDouble.seedSubOrder(
      subOrderRow({
        id: SUB,
        order_group_id: ORDER,
        type: 'digital',
        status: 'available',
        license_key: 'VEND-ABC123DEF456',
        delivery_code_hash: null,
        items: [orderedItemRow({ productId: EBOOK, title: 'Clean Architecture e-Book' })],
      }),
    );
    supabaseDouble.seedProduct(
      productRow({
        id: EBOOK,
        type: 'digital',
        digital_asset_info: {
          fileSizeMb: 95,
          licenseType: 'Personal Learning License',
          downloadUrl: 'https://example.test/clean-architecture.epub',
        },
      }),
    );

    const downloads = await orders.fetchDigitalDownloads();

    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatchObject({
      id: SUB,
      orderGroupId: ORDER,
      title: 'Clean Architecture e-Book',
      licenseKey: 'VEND-ABC123DEF456',
      sellerName: 'Print Room',
      fileSizeMb: 95,
      licenseType: 'Personal Learning License',
      downloadUrl: 'https://example.test/clean-architecture.epub',
      // The seed records no format, so the file name supplies it.
      fileFormat: 'EPUB',
    });
  });

  it('ignores physical packages, which have a courier rather than a licence', async () => {
    seedOrder();
    expect(await orders.fetchDigitalDownloads()).toEqual([]);
  });
});
