import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import {
  setAdminOrderPaymentStatus,
  updateAdminOrderAddress,
  updateAdminPackageTracking,
  type AdminOrderAddress,
} from './orders';
import {
  orderRow,
  storeRow,
  subOrderRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const GROUP = '00000000-0000-4000-8000-000000000401';
const PKG = '00000000-0000-4000-8000-000000000501';
const STORE = 'store-1';

const ADDRESS: AdminOrderAddress = {
  fullName: 'Alex Buyer',
  street: '42 Canal Road',
  city: 'Lahore',
  state: 'Punjab',
  zipCode: '54000',
  country: 'Pakistan',
  phone: '0300-1112233',
};

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
  supabaseDouble.seedVendorProfile(storeRow({ id: STORE, store_name: 'Nova Tech', slug: 'nova-tech' }));
  supabaseDouble.seedOrder(orderRow({ id: GROUP, payment_status: 'pending' }));
  supabaseDouble.seedSubOrder(subOrderRow({ id: PKG, order_group_id: GROUP, seller_id: STORE, status: 'packed' }));
});

describe('updateAdminPackageTracking', () => {
  it('calls update_sub_order_tracking with the carrier and number', async () => {
    await updateAdminPackageTracking(PKG, 'TCS', 'TCS-9911');

    expect(supabaseDouble.rpcCalls.at(-1)).toMatchObject({
      fn: 'update_sub_order_tracking',
      args: { p_sub_order_id: PKG, p_carrier_name: 'TCS', p_tracking_number: 'TCS-9911' },
    });
    const sub = supabaseDouble.tables.sub_orders.find((row) => row.id === PKG);
    expect(sub).toMatchObject({ carrier_name: 'TCS', tracking_number: 'TCS-9911' });
  });

  it('surfaces the refusal for a blank tracking number', async () => {
    await expect(updateAdminPackageTracking(PKG, 'TCS', '  ')).rejects.toThrow(
      'A tracking number is required',
    );
  });
});

describe('updateAdminOrderAddress', () => {
  it('writes the snapshot through admin_update_order_address and returns it', async () => {
    const result = await updateAdminOrderAddress(GROUP, ADDRESS);

    expect(result.orderGroupId).toBe(GROUP);
    expect(result.shippingAddress).toEqual(ADDRESS);
    expect(supabaseDouble.rpcCalls.at(-1)).toMatchObject({
      fn: 'admin_update_order_address',
      args: { p_order_group_id: GROUP, p_address: ADDRESS },
    });
    const order = supabaseDouble.tables.orders.find((row) => row.id === GROUP);
    expect(order?.shipping_address).toEqual(ADDRESS);
  });

  it('surfaces the refusal when the address has no street', async () => {
    await expect(
      updateAdminOrderAddress(GROUP, { ...ADDRESS, street: ' ' }),
    ).rejects.toThrow('A delivery address needs a street, a city and a phone number');
  });

  it('surfaces the refusal for an unknown order', async () => {
    await expect(
      updateAdminOrderAddress('00000000-0000-4000-8000-000000000499', ADDRESS),
    ).rejects.toThrow('Order not found');
  });
});

describe('setAdminOrderPaymentStatus', () => {
  it('settles a pending order through admin_set_payment_status', async () => {
    const result = await setAdminOrderPaymentStatus(GROUP, 'succeeded', 'Cash received at the desk');

    expect(result).toEqual({ orderGroupId: GROUP, paymentStatus: 'succeeded' });
    expect(supabaseDouble.rpcCalls.at(-1)).toMatchObject({
      fn: 'admin_set_payment_status',
      args: { p_order_group_id: GROUP, p_status: 'succeeded', p_reason: 'Cash received at the desk' },
    });
    const order = supabaseDouble.tables.orders.find((row) => row.id === GROUP);
    expect(order?.payment_status).toBe('succeeded');
  });

  it('refuses to touch an order that has already settled', async () => {
    const SETTLED = '00000000-0000-4000-8000-000000000402';
    supabaseDouble.seedOrder(orderRow({ id: SETTLED, payment_status: 'succeeded' }));

    await expect(setAdminOrderPaymentStatus(SETTLED, 'failed', 'tidying up')).rejects.toThrow(
      'Only a pending payment can be corrected (this order is succeeded)',
    );
  });
});
