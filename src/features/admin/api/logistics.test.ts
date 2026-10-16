import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import {
  fetchLogisticsBoard,
  fetchPendingRiderApplications,
  setRiderApproval,
} from './logistics';
import {
  adminLogisticsJson,
  profileRow,
  riderRow,
  supabaseDouble,
} from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
});

describe('fetchLogisticsBoard', () => {
  it('calls the one RPC the board is built from', async () => {
    await fetchLogisticsBoard();

    expect(supabaseDouble.rpcCalls.at(-1)).toMatchObject({ fn: 'admin_logistics_board', args: {} });
  });

  it('maps the fleet with the load each rider carries', async () => {
    supabaseDouble.setAdminLogistics(adminLogisticsJson({
      fleet: [{
        id: 'rider-1', name: 'Nadia Rider', phone: '614-555-0199', vehicle: 'Motorcycle',
        status: 'available', active: 3, completed: 41,
      }],
    }));

    const board = await fetchLogisticsBoard();

    expect(board.fleet[0]).toEqual({
      id: 'rider-1', name: 'Nadia Rider', phone: '614-555-0199', vehicle: 'Motorcycle',
      status: 'available', active: 3, completed: 41,
    });
  });

  it('maps a queue row with the delivery record and the address on the order', async () => {
    supabaseDouble.setAdminLogistics(adminLogisticsJson({
      queue: [{
        id: 'pkg-1', status: 'shipped', type: 'physical', storeName: 'Nova Tech', gross: 34,
        carrierName: 'Vendora Logistics', trackingNumber: 'VL-8891', riderId: 'rider-1',
        createdAt: '2026-10-09T00:00:00.000Z', updatedAt: '2026-10-10T00:00:00.000Z',
        delivery: {
          id: 'del-1', status: 'in_transit', riderId: 'rider-1',
          assignedAt: '2026-10-10T00:00:00.000Z', pickedUpAt: '2026-10-10T01:00:00.000Z', deliveredAt: null,
        },
        address: {
          fullName: 'Alex Buyer', street: '18 Harbour Road', city: 'Boston', state: 'MA',
          zipCode: '02110', country: 'United States', phone: '+1 555 0100',
        },
      }],
    }));

    const board = await fetchLogisticsBoard();
    const row = board.queue[0];

    expect(row).toMatchObject({
      id: 'pkg-1', status: 'shipped', storeName: 'Nova Tech', gross: 34,
      carrierName: 'Vendora Logistics', trackingNumber: 'VL-8891',
    });
    expect(row.delivery).toMatchObject({ id: 'del-1', status: 'in_transit', deliveredAt: null });
    expect(row.address).toMatchObject({ street: '18 Harbour Road', city: 'Boston' });
  });

  it('reads a package with no delivery record as null rather than an invented one', async () => {
    supabaseDouble.setAdminLogistics(adminLogisticsJson({
      queue: [{
        id: 'pkg-2', status: 'ready_for_pickup', type: 'physical', storeName: 'Nova Tech', gross: 10,
        carrierName: null, trackingNumber: null, riderId: null,
        createdAt: '2026-10-10T00:00:00.000Z', updatedAt: '2026-10-10T00:00:00.000Z',
        delivery: null, address: null,
      }],
    }));

    const board = await fetchLogisticsBoard();

    expect(board.queue[0].delivery).toBeNull();
    expect(board.queue[0].address).toBeNull();
    expect(board.queue[0].carrierName).toBeNull();
  });

  it('carries the counts the SQL produced, including a zero where nothing has happened', async () => {
    supabaseDouble.setAdminLogistics(adminLogisticsJson({
      counts: { awaitingPickup: 4, inTransit: 2, failed: 1, delivered: 0, ridersAvailable: 3 },
    }));

    const { counts } = await fetchLogisticsBoard();

    expect(counts).toEqual({ awaitingPickup: 4, inTransit: 2, failed: 1, delivered: 0, ridersAvailable: 3 });
  });

  it('shows an empty board as empty', async () => {
    const board = await fetchLogisticsBoard();

    expect(board.fleet).toEqual([]);
    expect(board.queue).toEqual([]);
    expect(board.counts.delivered).toBe(0);
  });

  it('rejects for an account that is not the platform team', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'shopper', email: 's@demo.test' } };

    await expect(fetchLogisticsBoard()).rejects.toThrow(/only the platform team can read the dispatch board/i);
  });

  it('throws on a failed read rather than showing a fleet that is standing idle', async () => {
    supabaseDouble.failRpc('permission denied for function admin_logistics_board');

    await expect(fetchLogisticsBoard()).rejects.toThrow(/failed to load the dispatch board/i);
  });
});

describe('rider applications', () => {
  const APPLICANT = 'applicant-1';
  const PROFILE = '00000000-0000-4000-8000-000000001601';

  const seedPending = () => {
    supabaseDouble.seedProfile(
      profileRow({ id: APPLICANT, email: 'new@demo.test', name: 'New Rider', roles: ['customer', 'rider'] }),
    );
    supabaseDouble.seedRider(
      riderRow({
        id: PROFILE,
        user_id: APPLICANT,
        full_name: 'New Rider',
        status: 'pending',
        city: 'Lahore',
        vehicle_plate: 'LEA-100',
      }),
    );
  };

  it('lists only pending rows, with the account name and email joined in', async () => {
    seedPending();
    supabaseDouble.seedRider(
      riderRow({ id: 'active-1', user_id: 'someone-else', full_name: 'Active Rider', status: 'available' }),
    );

    const rows = await fetchPendingRiderApplications();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      profileId: PROFILE,
      userId: APPLICANT,
      name: 'New Rider',
      email: 'new@demo.test',
      city: 'Lahore',
      vehiclePlate: 'LEA-100',
    });
  });

  it('returns an empty list when nobody is waiting', async () => {
    await expect(fetchPendingRiderApplications()).resolves.toEqual([]);
  });

  it('approves through the RPC and the rider joins the fleet as available', async () => {
    seedPending();
    await setRiderApproval(APPLICANT, true);

    const call = supabaseDouble.rpcCalls.find((entry) => entry.fn === 'admin_set_rider_approval');
    expect(call?.args).toEqual({ p_user_id: APPLICANT, p_approve: true });
    const row = supabaseDouble.tables.rider_profiles.find((entry) => entry.user_id === APPLICANT);
    expect(row?.status).toBe('available');
  });

  it('rejects through the RPC and the application row is removed', async () => {
    seedPending();
    await setRiderApproval(APPLICANT, false);

    expect(
      supabaseDouble.tables.rider_profiles.find((entry) => entry.user_id === APPLICANT),
    ).toBeUndefined();
  });

  it('fails soft with an honest sentence while the migration is not yet run', async () => {
    supabaseDouble.failRpc(
      'Could not find the function public.admin_set_rider_approval(p_user_id, p_approve) in the schema cache',
    );
    await expect(setRiderApproval(APPLICANT, true)).rejects.toThrow(/not switched on/);
  });
});
