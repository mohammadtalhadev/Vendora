import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchUserQueue, setUserRoles, setUserStatus } from './users';
import { orderRow, profileRow, riderRow, storeRow, subOrderRow, supabaseDouble } from '../../../test/supabase-double';

const BUYER = 'user-1';
const SELLER = 'seller-1';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
  supabaseDouble.seedProfile(profileRow({ id: BUYER, email: 'alex@demo.test', name: 'Alex Buyer', roles: ['customer'] }));
  supabaseDouble.seedProfile(profileRow({
    id: SELLER, email: 'marcus@demo.test', name: 'Marcus Seller', roles: ['customer', 'vendor'], vendor_status: 'approved',
  }));
});

describe('fetchUserQueue', () => {
  it('maps an account with the volume it actually bought', async () => {
    supabaseDouble.seedOrder(orderRow({ id: 'order-1', customer_id: BUYER, customer_email: 'alex@demo.test' }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: 'pkg-1', order_group_id: 'order-1', subtotal: 60, shipping_fee: 6, status: 'delivered' }));
    // `orders` is a counted join; `volume` is a SUM, which stays Postgres' work (db:check covers it).
    supabaseDouble.setAdminQueue('admin_user_queue', { rows: { [BUYER]: { volume: 66 } } });

    const queue = await fetchUserQueue({ search: 'alex' });
    const row = queue.rows.find((account) => account.id === BUYER);

    expect(row).toMatchObject({
      id: BUYER,
      name: 'Alex Buyer',
      email: 'alex@demo.test',
      roles: ['customer'],
      accountStatus: 'active',
      accountStatusReason: null,
      orders: 1,
      volume: 66,
    });
  });

  it('links a seller account to the store it owns', async () => {
    supabaseDouble.seedVendorProfile(storeRow({ id: 'store-9', user_id: SELLER, store_name: 'Nova Tech' }));

    const queue = await fetchUserQueue({ role: 'vendor' });

    expect(queue.rows.map((row) => row.id)).toEqual([SELLER]);
    expect(queue.rows[0].linkedId).toBe('store-9');
  });

  it('links a rider account to its rider profile', async () => {
    supabaseDouble.seedProfile(profileRow({ id: 'rider-1', email: 'sam@demo.test', roles: ['rider'] }));
    supabaseDouble.seedRider(riderRow({ id: 'rider-profile-9', user_id: 'rider-1' }));

    const queue = await fetchUserQueue({ role: 'rider' });

    expect(queue.rows[0]).toMatchObject({ id: 'rider-1', linkedId: 'rider-profile-9' });
  });

  it('counts each role once over every account, not over the page', async () => {
    supabaseDouble.seedProfile(profileRow({ id: 'support-9', email: 'z@demo.test', roles: ['support'] }));
    supabaseDouble.seedProfile(profileRow({ id: 'admin-2', email: 'a2@demo.test', roles: ['admin'] }));

    const { counts } = await fetchUserQueue();

    // admin (seedAdmin) + admin-2, so 5 accounts in total.
    expect(counts).toMatchObject({ all: 5, admins: 2, vendors: 1, support: 1 });
  });

  it('passes the filters and the page to the RPC', async () => {
    await fetchUserQueue({ role: 'vendor', status: 'suspended', search: 'nova', page: 2, pageSize: 5 });

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toMatchObject({
      p_role: 'vendor', p_status: 'suspended', p_search: 'nova', p_page: 2, p_page_size: 5,
    });
  });

  it('rejects for anyone who is not the platform team', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: BUYER, email: 'alex@demo.test' } };

    await expect(fetchUserQueue()).rejects.toThrow(/only the platform team can read the accounts queue/i);
  });

  it('throws rather than showing an empty book of accounts', async () => {
    supabaseDouble.failRpc('permission denied for function admin_user_queue');

    await expect(fetchUserQueue()).rejects.toThrow(/failed to load accounts/i);
  });
});

describe('setUserStatus', () => {
  it('writes the status and the reason onto the account', async () => {
    const result = await setUserStatus(BUYER, 'suspended', 'Chargeback pattern');

    expect(result).toEqual({ id: BUYER, status: 'suspended' });
    expect(supabaseDouble.tables.profiles.find((row) => row.id === BUYER)).toMatchObject({
      account_status: 'suspended', account_status_reason: 'Chargeback pattern',
    });
  });

  it('restores an account to active', async () => {
    await setUserStatus(BUYER, 'suspended', 'Hold');
    await setUserStatus(BUYER, 'active');

    expect(supabaseDouble.tables.profiles.find((row) => row.id === BUYER)?.account_status).toBe('active');
  });

  it('refuses to let an admin suspend their own account', async () => {
    await expect(setUserStatus('admin-1', 'banned', 'test')).rejects.toThrow(/your own account/i);
  });

  it('surfaces the database’s reason when the write is refused', async () => {
    supabaseDouble.failRpc('unknown status');

    await expect(setUserStatus(BUYER, 'banned')).rejects.toThrow(/could not mark this account banned: unknown status/i);
  });
});

describe('setUserRoles', () => {
  it('replaces the role list the account carries', async () => {
    const result = await setUserRoles(BUYER, ['customer', 'support']);

    expect(result).toEqual({ id: BUYER, roles: ['customer', 'support'] });
    expect(supabaseDouble.tables.profiles.find((row) => row.id === BUYER)?.roles).toEqual(['customer', 'support']);
  });

  it('refuses an unknown role rather than storing one no check recognises', async () => {
    await expect(setUserRoles(BUYER, ['wizard'])).rejects.toThrow(/unknown role/i);
  });

  it('refuses to rewrite the caller’s own roles', async () => {
    await expect(setUserRoles('admin-1', ['customer'])).rejects.toThrow(/your own roles/i);
  });
});
