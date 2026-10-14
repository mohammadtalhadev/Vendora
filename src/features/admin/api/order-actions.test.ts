import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { assignRider } from './orders';
import {
  deliveryRow,
  orderRow,
  riderRow,
  storeRow,
  subOrderRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const GROUP = '00000000-0000-4000-8000-000000000401';
const PKG = '00000000-0000-4000-8000-000000000501';
const DELIVERY = '00000000-0000-4000-8000-000000000601';
const RIDER = '00000000-0000-4000-8000-000000000701';
const STORE = 'store-1';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
  supabaseDouble.seedVendorProfile(storeRow({ id: STORE, store_name: 'Nova Tech', slug: 'nova-tech' }));
  supabaseDouble.seedOrder(orderRow({ id: GROUP }));
  supabaseDouble.seedSubOrder(subOrderRow({ id: PKG, order_group_id: GROUP, seller_id: STORE, status: 'packed' }));
  supabaseDouble.seedRider(riderRow({ id: RIDER, full_name: 'Ravi Rider' }));
});

describe('assignRider', () => {
  it('calls assign_rider with the package and rider pair and returns them', async () => {
    const result = await assignRider(PKG, RIDER);

    expect(result).toEqual({ subOrderId: PKG, riderId: RIDER });
    expect(supabaseDouble.rpcCalls.at(-1)).toMatchObject({
      fn: 'assign_rider',
      args: { p_sub_order_id: PKG, p_rider_id: RIDER },
    });
  });

  it('moves the package and its delivery onto the rider, as the SQL does', async () => {
    supabaseDouble.seedDelivery(
      deliveryRow({ id: DELIVERY, sub_order_id: PKG, order_group_id: GROUP, rider_id: null, status: 'pending' }),
    );

    await assignRider(PKG, RIDER);

    const sub = supabaseDouble.tables.sub_orders.find((row) => row.id === PKG);
    const delivery = supabaseDouble.tables.deliveries.find((row) => row.id === DELIVERY);
    expect(sub?.rider_id).toBe(RIDER);
    expect(delivery?.rider_id).toBe(RIDER);
    expect(delivery?.status).toBe('assigned');
  });

  it('surfaces the database refusal for an unknown rider', async () => {
    await expect(assignRider(PKG, '00000000-0000-4000-8000-000000000799')).rejects.toThrow(
      'Rider not found',
    );
  });

  it('surfaces the database refusal for an unknown package', async () => {
    await expect(assignRider('00000000-0000-4000-8000-000000000599', RIDER)).rejects.toThrow(
      'Sub-order not found',
    );
  });
});
