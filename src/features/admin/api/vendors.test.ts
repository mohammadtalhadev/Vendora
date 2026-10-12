import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as vendors from './vendors';
import {
  applicationRow,
  bankAccountRow,
  payoutRow,
  profileRow,
  storeRow,
  strikeRow,
  subOrderRow,
  disputeRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const STORE = 'store-1';
const OTHER = 'store-2';
const OWNER = 'user-1';
const APP = '00000000-0000-4000-8000-000000001301';
const PACKAGE = '00000000-0000-4000-8000-000000000501';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
  supabaseDouble.seedProfile(profileRow({ id: OWNER, email: 'marcus@demo.test', name: 'Marcus Seller' }));
  supabaseDouble.seedVendorProfile(storeRow({
    id: STORE, user_id: OWNER, store_name: 'Nova Tech', slug: 'nova-tech', seller_type: 'vendor',
  }));
  supabaseDouble.seedVendorProfile(storeRow({ id: OTHER, store_name: 'Old Shop', slug: 'old-shop' }));
});

describe('fetchVendorQueue', () => {
  it('maps the stores the queue returned, richest first', async () => {
    // The sums are `vendor_earned_net_payout(...)` and friends - Postgres' work, asserted in
    // db:check - so the queue hands them over and this test checks the mapping.
    supabaseDouble.setAdminVendors({
      [STORE]: { gross: 210, commission: 21, net: 189, balance: 189, paidOut: 0, tier: 'gold' },
      [OTHER]: { gross: 5, commission: 0.5, net: 4.5, balance: 4.5, paidOut: 0, tier: 'bronze' },
    });

    const queue = await vendors.fetchVendorQueue();

    expect(queue.rows.map((row) => row.storeName)).toEqual(['Nova Tech', 'Old Shop']);
    expect(queue.rows[0]).toMatchObject({
      id: STORE, slug: 'nova-tech', sellerType: 'vendor', status: 'active', gross: 210, commission: 21, tier: 'gold',
    });
    expect(queue.total).toBe(2);
  });

  it('maps the platform-wide header money the queue sums, and the store counts with it', async () => {
    supabaseDouble.setAdminQueue('admin_vendor_queue', {
      volume: { gross: 4400, commission: 440, net: 3960, stores: 2, active: 1 },
    });

    const queue = await vendors.fetchVendorQueue();

    expect(queue.volume).toEqual({ gross: 4400, commission: 440, net: 3960, stores: 2, active: 1 });
  });

  it('separates the applicants from the stores, because an applicant has no store yet', async () => {    supabaseDouble.seedApplication(applicationRow({
      id: APP, user_id: 'applicant-9', proposed_store_name: 'Atlas Gadgets', status: 'pending',
      created_at: '2026-10-05T00:00:00.000Z',
    }));

    const queue = await vendors.fetchVendorQueue();

    expect(queue.pending).toBe(1);
    expect(queue.applicants).toHaveLength(1);
    expect(queue.applicants[0]).toMatchObject({
      id: APP, storeName: 'Atlas Gadgets', status: 'pending', hasStore: false, policyAccepted: true,
    });
    expect(queue.rows.map((row) => row.id)).not.toContain('applicant-9');
  });

  it('asks the database for the filter and the page rather than trimming a page locally', async () => {
    await vendors.fetchVendorQueue({ status: 'suspended', search: 'nova', page: 3, pageSize: 5 });

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toMatchObject({
      p_status: 'suspended', p_search: 'nova', p_page: 3, p_page_size: 5,
    });
  });

  it('refuses an account that is not the platform team, and says why', async () => {
    supabaseDouble.authState.session = {
      access_token: 't', user: { id: OWNER, email: 'marcus@demo.test' },
    };

    await expect(vendors.fetchVendorQueue()).rejects.toThrow(/only the platform team can list merchants/i);
  });

  it('throws on a failed read instead of returning an empty merchant list', async () => {
    supabaseDouble.failRpc('permission denied for function admin_vendor_queue');

    await expect(vendors.fetchVendorQueue()).rejects.toThrow(/permission denied/i);
  });
});

describe('fetchVendorDetail', () => {
  it('assembles the dossier from this store’s own rows', async () => {
    supabaseDouble.seedSubOrder(subOrderRow({ id: PACKAGE, seller_id: STORE, status: 'delivered' }));
    supabaseDouble.seedDispute(disputeRow({ id: 'case-1', vendor_id: STORE, reason: 'Never arrived' }));
    supabaseDouble.seedStrike(strikeRow({ vendor_id: STORE, reason: 'Counterfeit listing' }));
    supabaseDouble.seedPayout(payoutRow({ vendor_id: STORE, status: 'paid' }));
    supabaseDouble.seedBankAccount(bankAccountRow({ vendor_id: STORE, is_default: true }));

    const detail = await vendors.fetchVendorDetail(STORE);

    expect(detail).toMatchObject({
      id: STORE, storeName: 'Nova Tech', email: 'marcus@demo.test', name: 'Marcus Seller', sellerType: 'vendor',
    });
    expect(detail.packages.map((pkg) => pkg.id)).toEqual([PACKAGE]);
    expect(detail.disputes.map((row) => row.id)).toEqual(['case-1']);
    expect(detail.strikes.map((row) => row.reason)).toEqual(['Counterfeit listing']);
    expect(detail.payouts).toHaveLength(1);
    expect(detail.bankAccounts[0]).toMatchObject({ isDefault: true });
  });

  it('reports a store that does not exist as an error, not as a blank dossier', async () => {
    await expect(vendors.fetchVendorDetail('nope')).rejects.toThrow(/store not found/i);
  });
});

describe('setVendorStatus', () => {
  it('writes through the RPC and reports the status the row now holds', async () => {
    const result = await vendors.setVendorStatus(STORE, 'suspended', 'Counterfeit goods');

    expect(result).toEqual({ id: STORE, status: 'suspended' });
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toMatchObject({
      p_vendor_id: STORE,
      p_status: 'suspended',
      p_note: 'Counterfeit goods',
    });
    expect(supabaseDouble.tables.vendor_profiles.find((row) => row.id === STORE)?.status).toBe('suspended');
  });

  it('surfaces the database’s refusal', async () => {
    supabaseDouble.failRpc('Only the platform team can suspend a merchant');

    await expect(vendors.setVendorStatus(STORE, 'active')).rejects.toThrow(/could not suspend this merchant|only the platform team/i);
  });
});

describe('setVendorCommission', () => {
  it('sends a rate when the platform overrides the store', async () => {
    const result = await vendors.setVendorCommission(STORE, 0.17);

    expect(result.rate).toBe(0.17);
    expect(supabaseDouble.rpcCalls.at(-1)?.args.p_rate).toBe(0.17);
  });

  it('sends NULL - not a zero - when the override is cleared', async () => {
    const result = await vendors.setVendorCommission(STORE, null);

    expect(result.rate).toBeNull();
    expect(supabaseDouble.rpcCalls.at(-1)?.args.p_rate).toBeNull();
  });
});

describe('issueStrike', () => {
  it('returns the count the store now carries', async () => {
    supabaseDouble.seedStrike(strikeRow({ vendor_id: STORE }));

    const result = await vendors.issueStrike(STORE, 'Trademark violation', 'Third listing taken down');

    expect(result).toEqual({ vendorId: STORE, strikes: 2 });
    expect(supabaseDouble.tables.vendor_strikes).toHaveLength(2);
  });
});

describe('reviewApplication', () => {
  it('approves by creating the store the applicant proposed', async () => {
    supabaseDouble.seedApplication(applicationRow({ id: APP, user_id: 'applicant-9', status: 'pending' }));

    await expect(vendors.reviewApplication(APP, 'approved')).resolves.toBe(true);

    expect(supabaseDouble.tables.vendor_applications.find((row) => row.id === APP)?.status).toBe('approved');
  });

  it('records the reason on a rejection', async () => {
    supabaseDouble.seedApplication(applicationRow({ id: APP, user_id: 'applicant-9', status: 'pending' }));

    await vendors.reviewApplication(APP, 'rejected', 'Business address could not be verified');

    expect(supabaseDouble.tables.vendor_applications.find((row) => row.id === APP)).toMatchObject({
      status: 'rejected', review_note: 'Business address could not be verified',
    });
  });

  it('refuses a decision the RPC does not know', async () => {
    supabaseDouble.seedApplication(applicationRow({ id: APP, user_id: 'applicant-9' }));

    await expect(
      vendors.reviewApplication(APP, 'maybe' as 'approved'),
    ).rejects.toThrow(/invalid decision/i);
  });
});

describe('the queue’s count columns', () => {
  it('are the rows the store actually has', async () => {
    supabaseDouble.seedSubOrder(subOrderRow({ id: PACKAGE, seller_id: STORE, status: 'delivered' }));
    supabaseDouble.seedDispute(disputeRow({ id: 'case-1', vendor_id: STORE }));
    supabaseDouble.seedStrike(strikeRow({ vendor_id: STORE }));

    const queue = await vendors.fetchVendorQueue();
    const row = queue.rows.find((store) => store.id === STORE);

    expect(row).toMatchObject({ packages: 1, openDisputes: 1, strikes: 1, kyc: 'unverified' });
  });
});
