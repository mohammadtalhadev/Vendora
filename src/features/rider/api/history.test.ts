import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchRiderHistory, summariseLedger, updateRiderContact, type RiderLedgerRow } from './history';
import {
  deliveryRow,
  profileRow,
  riderRow,
  storeRow,
  subOrderRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const RIDER = 'rider-1';
const PROFILE = '00000000-0000-4000-8000-000000001601';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: RIDER, roles: ['rider'] }));
  supabaseDouble.authState.session = { access_token: 't', user: { id: RIDER, email: 'rider@demo.test' } };
  supabaseDouble.seedRider(riderRow({ id: PROFILE, user_id: RIDER, full_name: 'Nadia Rider' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech' }));
});

const seedClosed = () => {
  supabaseDouble.seedSubOrder(subOrderRow({ id: 'pkg-done', seller_id: 'store-1', subtotal: 30, shipping_fee: 4 }));
  supabaseDouble.seedSubOrder(subOrderRow({ id: 'pkg-failed', seller_id: 'store-1', subtotal: 10, shipping_fee: 2 }));
  supabaseDouble.seedSubOrder(subOrderRow({ id: 'pkg-open', seller_id: 'store-1', subtotal: 99, shipping_fee: 1 }));
  supabaseDouble.seedDelivery(deliveryRow({
    id: 'drop-done', sub_order_id: 'pkg-done', rider_id: PROFILE, status: 'delivered',
    delivered_at: '2026-10-13T10:00:00.000Z', created_at: '2026-10-13T08:00:00.000Z',
    dropoff_details: { fullName: 'Alex Buyer', street: '18 Harbour Road', city: 'Boston', state: 'MA' },
  }));
  supabaseDouble.seedDelivery(deliveryRow({
    id: 'drop-failed', sub_order_id: 'pkg-failed', rider_id: PROFILE, status: 'failed',
    created_at: '2026-10-12T08:00:00.000Z', dropoff_details: { city: 'Cambridge' },
  }));
  supabaseDouble.seedDelivery(deliveryRow({
    id: 'drop-open', sub_order_id: 'pkg-open', rider_id: PROFILE, status: 'assigned',
  }));
  supabaseDouble.seedDelivery(deliveryRow({
    id: 'drop-other', sub_order_id: 'pkg-done', rider_id: 'another-rider', status: 'delivered',
    delivered_at: '2026-10-13T11:00:00.000Z',
  }));
};

describe('fetchRiderHistory', () => {
  it('returns only this rider’s closed parcels, with store, city and booked value', async () => {
    seedClosed();

    const rows = await fetchRiderHistory();

    expect(rows.map((row) => row.id)).toEqual(['drop-done', 'drop-failed']);
    expect(rows[0]).toMatchObject({
      subOrderId: 'pkg-done',
      status: 'delivered',
      gross: 34,
      storeName: 'Nova Tech',
      city: 'Boston',
    });
    expect(rows[1]).toMatchObject({ status: 'failed', gross: 12, city: 'Cambridge' });
  });

  it('refuses an account that has no rider profile', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'shopper', email: 's@demo.test' } };

    await expect(fetchRiderHistory()).rejects.toThrow(/not a rider/i);
  });

  it('surfaces a failed read as an error', async () => {
    supabaseDouble.failures.deliveries = 'permission denied';

    await expect(fetchRiderHistory()).rejects.toThrow(/could not load your delivery history/i);
  });
});

describe('updateRiderContact', () => {
  it('writes phone and vehicle onto the rider’s own profile row', async () => {
    await updateRiderContact({ phone: '555-0100', vehicleType: 'Cargo Van' });

    expect(supabaseDouble.tables.rider_profiles[0]).toMatchObject({
      phone: '555-0100',
      vehicle_type: 'Cargo Van',
    });
  });
});

describe('summariseLedger', () => {
  const now = new Date('2026-10-14T12:00:00');
  const row = (deliveredAt: string, gross: number, paymentMethod: string): RiderLedgerRow => ({
    deliveryId: deliveredAt,
    deliveredAt,
    gross,
    paymentMethod,
  });

  it('buckets counts and values into today, this week, all time, and COD cash', () => {
    const summary = summariseLedger(
      [
        row('2026-10-14T09:00:00', 100, 'cod'),
        row('2026-10-12T09:00:00', 50, 'card'),
        row('2026-10-05T09:00:00', 30, 'cod'),
      ],
      now,
    );

    expect(summary.today).toEqual({ count: 1, value: 100 });
    expect(summary.week).toEqual({ count: 2, value: 150 });
    expect(summary.allTime).toEqual({ count: 3, value: 180 });
    expect(summary.cod).toEqual({ count: 2, value: 130 });
  });

  it('reports zeros for an empty ledger rather than inventing figures', () => {
    const summary = summariseLedger([], now);

    expect(summary.allTime).toEqual({ count: 0, value: 0 });
    expect(summary.cod).toEqual({ count: 0, value: 0 });
  });
});
