import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchCommissionOverview, setGlobalCommission } from './commission';
import { adminCommissionJson, commissionConfigRow, storeRow, supabaseDouble } from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
});

describe('fetchCommissionOverview', () => {
  it('reads the default rate off the config row rather than a fixture', async () => {
    supabaseDouble.seedCommissionConfig(commissionConfigRow({ global_default_rate: 0.125 }));

    const overview = await fetchCommissionOverview(30);

    expect(overview.globalDefaultRate).toBe(0.125);
    expect(overview.days).toBe(30);
  });

  it('keeps a take rate that has no volume behind it as null, not as zero', async () => {
    supabaseDouble.setAdminCommission(adminCommissionJson({ earned: { commission: 0, gross: 0, packages: 0 } }));

    const overview = await fetchCommissionOverview();

    expect(overview.effectiveRatePct).toBeNull();
    expect(overview.byCategory).toEqual([]);
    expect(overview.byVendor).toEqual([]);
    expect(overview.changes).toEqual([]);
  });

  it('maps the ledger sections the RPC builds', async () => {
    supabaseDouble.setAdminCommission(adminCommissionJson({
      days: 7,
      earned: { commission: 420, gross: 4000, packages: 31 },
      effectiveRatePct: 10.5,
      byCategory: [{
        id: 'cat-1', name: 'Electronics', slug: 'electronics', override: null, effective: 0.1,
        gross: 3000, commission: 300, sellers: 4,
      }],
      byVendor: [{
        id: 'store-1', storeName: 'Nova Tech', override: 0.12, gross: 1000, commission: 120,
      }],
      changes: [{
        id: 'chg-1', action: 'commission.category.set', entityId: 'cat-1',
        before: { rate: 0.1 }, after: { rate: 0.12 },
        createdAt: '2026-10-09T00:00:00.000Z', actor: 'Platform Admin',
      }],
    }));

    const overview = await fetchCommissionOverview(7);

    expect(overview.earned).toEqual({ commission: 420, gross: 4000, packages: 31 });
    expect(overview.effectiveRatePct).toBe(10.5);
    expect(overview.byCategory[0]).toMatchObject({
      id: 'cat-1', name: 'Electronics', override: null, effective: 0.1, commission: 300, sellers: 4,
    });
    expect(overview.byVendor[0]).toMatchObject({ id: 'store-1', storeName: 'Nova Tech', override: 0.12 });
    expect(overview.changes[0]).toMatchObject({
      action: 'commission.category.set', before: { rate: 0.1 }, after: { rate: 0.12 }, actor: 'Platform Admin',
    });
  });

  it('passes the window it was asked for', async () => {
    await fetchCommissionOverview(90);

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_days: 90 });
  });

  it('rejects for an account that is not the platform team', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'shopper', email: 's@demo.test' } };

    await expect(fetchCommissionOverview()).rejects.toThrow(/only the platform team can read the commission ledger/i);
  });

  it('throws on a failed read rather than showing a ledger that earned nothing', async () => {
    supabaseDouble.failRpc('permission denied for function admin_commission_overview');

    await expect(fetchCommissionOverview()).rejects.toThrow(/failed to load the commission ledger/i);
  });
});

describe('setGlobalCommission', () => {
  it('sends the rate and returns the one the row now holds', async () => {
    const result = await setGlobalCommission(0.09);

    expect(result).toEqual({ rate: 0.09 });
    expect(supabaseDouble.tables.commission_config[0].global_default_rate).toBe(0.09);
  });

  it('audits the change with the rate it replaced', async () => {
    await setGlobalCommission(0.15);

    const entry = supabaseDouble.tables.audit_logs.at(-1);
    expect(entry).toMatchObject({ action: 'commission.global.set', entity_type: 'commission_config' });
    expect((entry?.before_data as Record<string, unknown>).rate).toBe(0.1);
    expect((entry?.after_data as Record<string, unknown>).rate).toBe(0.15);
  });

  it('refuses a rate outside the range the database allows', async () => {
    await expect(setGlobalCommission(0.8)).rejects.toThrow(/between 0% and 50%/i);
    expect(supabaseDouble.tables.commission_config[0].global_default_rate).toBe(0.1);
  });

  it('refuses a seller trying to set the platform rate', async () => {
    supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', user_id: 'seller-9' }));
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'seller-9', email: 's@demo.test' } };

    await expect(setGlobalCommission(0.01)).rejects.toThrow(/could not set the platform rate: only the platform team can change the platform commission/i);
  });
});
