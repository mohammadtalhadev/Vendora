import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { advanceDrop, fetchRiderBoard, setAvailability, verifyHandover } from './board';
import {
  deliveryRow,
  orderRow,
  profileRow,
  riderRow,
  storeRow,
  subOrderRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const RIDER = 'rider-1';
const PROFILE = '00000000-0000-4000-8000-000000001601';
const PACKAGE = '00000000-0000-4000-8000-000000000501';
const DROP = '00000000-0000-4000-8000-000000001701';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: RIDER, roles: ['rider'] }));
  supabaseDouble.authState.session = { access_token: 't', user: { id: RIDER, email: 'rider@demo.test' } };
  supabaseDouble.seedRider(riderRow({ id: PROFILE, user_id: RIDER, full_name: 'Nadia Rider', sla_ceiling_hours: 3 }));
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech' }));
  supabaseDouble.seedOrder(orderRow({
    id: 'order-1',
    customer_email: 'alex@demo.test',
    shipping_address: { fullName: 'Alex Buyer', street: '18 Harbour Road', city: 'Boston', state: 'MA', zipCode: '02110' },
  }));
  supabaseDouble.seedSubOrder(subOrderRow({
    id: PACKAGE, order_group_id: 'order-1', seller_id: 'store-1', subtotal: 30, shipping_fee: 4,
    status: 'ready_for_pickup', customer_notes: 'Leave with the concierge.',
  }));
  supabaseDouble.seedDelivery(deliveryRow({
    id: DROP, sub_order_id: PACKAGE, rider_id: PROFILE, status: 'assigned', handover_code_hash: '4821',
  }));
});

describe('fetchRiderBoard', () => {
  it('maps the rider, their open parcels and the counts the SQL returned', async () => {
    const board = await fetchRiderBoard();

    expect(board.rider).toEqual({
      id: PROFILE,
      fullName: 'Nadia Rider',
      phone: '614-555-0199',
      vehicleType: 'Motorcycle',
      status: 'available',
      slaCeilingHours: 3,
    });
    expect(board.drops).toHaveLength(1);
    expect(board.drops[0]).toMatchObject({
      id: DROP,
      subOrderId: PACKAGE,
      status: 'assigned',
      needsHandoverCode: true,
      gross: 34,
      customerNotes: 'Leave with the concierge.',
      customerEmail: 'alex@demo.test',
      storeName: 'Nova Tech',
    });
    expect(board.drops[0].address).toMatchObject({ street: '18 Harbour Road', city: 'Boston' });
    expect(board.counts).toEqual({ assigned: 1, inFlight: 0, deliveredToday: 0, completedAllTime: 0 });
  });

  it('leaves a closed delivery off the route', async () => {
    supabaseDouble.seedDelivery(deliveryRow({
      id: 'done', sub_order_id: subOrderRow({ id: 'pkg-2', order_group_id: 'order-1', seller_id: 'store-1' }).id,
      rider_id: PROFILE, status: 'delivered', delivered_at: new Date().toISOString(),
    }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: 'pkg-2', order_group_id: 'order-1', seller_id: 'store-1' }));

    const board = await fetchRiderBoard();

    expect(board.drops.map((drop) => drop.id)).toEqual([DROP]);
    expect(board.counts.deliveredToday).toBe(1);
    expect(board.counts.completedAllTime).toBe(1);
  });

  it('refuses an account that has no rider profile, rather than showing an empty route', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'shopper', email: 's@demo.test' } };

    await expect(fetchRiderBoard()).rejects.toThrow(/could not load your route: not a rider/i);
  });

  it('surfaces a failed read as an error', async () => {
    supabaseDouble.failRpc('permission denied for function rider_delivery_board');

    await expect(fetchRiderBoard()).rejects.toThrow(/could not load your route/i);
  });
});

describe('advanceDrop', () => {
  it('asks the state machine for the exact status the button names', async () => {
    await expect(advanceDrop(PACKAGE, 'shipped')).resolves.toBe(PACKAGE);

    const [sub] = supabaseDouble.tables.sub_orders;
    expect(sub.status).toBe('shipped');
  });

  it('carries the rider’s own words into the package history as the note', async () => {
    await advanceDrop(PACKAGE, 'delivery_failed', 'Customer Unavailable — waited 20 minutes');

    const history = supabaseDouble.tables.sub_orders[0].history as Record<string, unknown>[];
    expect(history.at(-1)).toMatchObject({
      status: 'delivery_failed',
      note: 'Customer Unavailable — waited 20 minutes',
    });
  });

  it('throws with the database’s reason when the move is refused', async () => {
    supabaseDouble.failRpc('Role rider is not authorized for transition shipped -> delivered');

    await expect(advanceDrop(PACKAGE, 'out_for_delivery')).rejects.toThrow(/could not update that parcel/i);
  });
});

describe('verifyHandover', () => {
  it('closes the parcel with the code the buyer read out', async () => {
    const result = await verifyHandover(DROP, '4821');

    expect(result).toEqual({ deliveryId: DROP, status: 'delivered' });
    const delivery = supabaseDouble.tables.deliveries.find((row) => row.id === DROP);
    expect(delivery).toMatchObject({ status: 'delivered' });
    expect(delivery?.proof_of_delivery).toBeTruthy();
    expect(supabaseDouble.tables.sub_orders[0].status).toBe('delivered');
  });

  it('returns the database’s refusal when the code does not match', async () => {
    await expect(verifyHandover(DROP, '1111')).rejects.toThrow(/that code did not match: invalid handover code/i);

    expect(supabaseDouble.tables.deliveries.find((row) => row.id === DROP)?.status).toBe('assigned');
  });

  it('refuses a parcel that is not on this rider’s board', async () => {
    await expect(verifyHandover('other-drop', '4821')).rejects.toThrow(/delivery not assigned to this rider/i);
  });
});

describe('setAvailability', () => {
  it('writes the rider’s own profile row', async () => {
    await expect(setAvailability('busy')).resolves.toBe('busy');

    expect(supabaseDouble.tables.rider_profiles[0].status).toBe('busy');
  });

  it('throws when the write is refused', async () => {
    supabaseDouble.failures.rider_profiles = 'row-level security';

    await expect(setAvailability('offline')).rejects.toThrow(/could not update your status/i);
  });
});
