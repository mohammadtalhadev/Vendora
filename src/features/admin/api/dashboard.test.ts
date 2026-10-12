import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as dashboard from './dashboard';
import { adminDashboardJson, profileRow, supabaseDouble } from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
});

describe('fetchAdminDashboard', () => {
  it('rejects a failed read instead of inventing a platform with no sales', async () => {
    // A console that renders "0 GMV" out of a denied call looks like a dead platform,
    // so the api turns any error into a rejection and the screen shows the failure.
    supabaseDouble.failRpc('permission denied for function admin_dashboard');

    await expect(dashboard.fetchAdminDashboard()).rejects.toThrow(
      /Failed to load the platform overview.*permission denied/i,
    );
  });

  it('surfaces the database’s refusal to an account that is not the platform team', async () => {
    supabaseDouble.seedProfile(profileRow({ id: 'support-9', email: 'desk@vendora.market', roles: ['support'] }));
    supabaseDouble.authState.session = {
      access_token: 't', user: { id: 'support-9', email: 'desk@vendora.market' },
    };

    await expect(dashboard.fetchAdminDashboard()).rejects.toThrow(
      /only the platform team can read the platform overview/i,
    );
  });

  it('refuses a signed-out session the same way', async () => {
    supabaseDouble.authState.session = null;

    await expect(dashboard.fetchAdminDashboard()).rejects.toThrow(/not authenticated/i);
  });

  it('sends p_days and echoes back the window the database settled on', async () => {
    const twoWeeks = await dashboard.fetchAdminDashboard(14);
    expect(supabaseDouble.rpcCalls.at(-1)).toMatchObject({ fn: 'admin_dashboard', args: { p_days: 14 } });
    expect(twoWeeks.days).toBe(14);

    await dashboard.fetchAdminDashboard();
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_days: 30 });

    // `greatest(coalesce(p_days, 30), 1)` is SQL's clamp; the zero still reaches the call.
    const clamped = await dashboard.fetchAdminDashboard(0);
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_days: 0 });
    expect(clamped.days).toBe(1);
  });

  it('maps the kpis block, coercing the numerics that ride back as strings', async () => {
    supabaseDouble.setAdminDashboard(adminDashboardJson({
      kpis: {
        gmvBooked: '24860.40', commission: '2486.04', netToSellers: '22374.36',
        packages: 62, orders: 57, openPackages: '9',
        averageOrderValue: '436.15', refundAmount: '410.00', refundCount: 3,
        payoutsPaid: '1820.00', payoutsPending: '640.50', payoutsPendingCount: 2,
      },
    }));

    const dash = await dashboard.fetchAdminDashboard();

    expect(dash.kpis).toEqual({
      gmvBooked: 24860.4, commission: 2486.04, netToSellers: 22374.36,
      packages: 62, orders: 57, openPackages: 9,
      averageOrderValue: 436.15, refundAmount: 410, refundCount: 3,
      payoutsPaid: 1820, payoutsPending: 640.5, payoutsPendingCount: 2,
    });
  });

  it('keeps a null AOV and a null delta null - neither becomes a made-up number', async () => {
    // `round(x / nullif(y, 0))` is NULL on Postgres' side on an empty ledger, and the api
    // now guards both the way `deltaPct` always did.
    supabaseDouble.setAdminDashboard(adminDashboardJson({
      kpis: { ...adminDashboardJson().kpis, averageOrderValue: null },
      growth: { revenue7d: 500, revenue30d: 1800, orders7d: 4, orders30d: 12, previousGmv: 0, deltaPct: null },
    }));

    const dash = await dashboard.fetchAdminDashboard();

    expect(dash.growth.deltaPct).toBeNull();
    expect(dash.growth.previousGmv).toBe(0);
    expect(dash.kpis.averageOrderValue).toBeNull();

    // A `deltaPct` the jsonb never carried is null too - present-null and absent both refuse
    // to become a made-up number.
    supabaseDouble.setAdminDashboard(adminDashboardJson({
      growth: { revenue7d: 1, revenue30d: 2, orders7d: 1, orders30d: 2, previousGmv: 3 },
    }));
    expect((await dashboard.fetchAdminDashboard()).growth.deltaPct).toBeNull();
  });

  it('maps the growth window against the one before it', async () => {
    supabaseDouble.setAdminDashboard(adminDashboardJson({
      growth: { revenue7d: '5200.25', revenue30d: '18400.00', orders7d: 12, orders30d: 44, previousGmv: '4000.00', deltaPct: '30.1' },
    }));

    const dash = await dashboard.fetchAdminDashboard();

    expect(dash.growth).toEqual({
      revenue7d: 5200.25, revenue30d: 18400, orders7d: 12, orders30d: 44, previousGmv: 4000, deltaPct: 30.1,
    });
  });

  it('maps the seller and trust queues', async () => {
    supabaseDouble.setAdminDashboard(adminDashboardJson({
      sellers: { active: '34', suspended: 2, awaitingReview: 7 },
      trust: { openDisputes: 4, escalatedDisputes: '1', pendingReturns: 6, strikes: 11 },
    }));

    const dash = await dashboard.fetchAdminDashboard();

    expect(dash.sellers).toEqual({ active: 34, suspended: 2, awaitingReview: 7 });
    expect(dash.trust).toEqual({ openDisputes: 4, escalatedDisputes: 1, pendingReturns: 6, strikes: 11 });
  });

  it('maps the snake_case catalog section, because that is what `to_jsonb` returns', async () => {
    // `catalog` is `to_jsonb(c)` over the SQL CTE (admin_console migration), so the
    // multi-word keys really do arrive snake_case while every other section is
    // camelCase `jsonb_build_object`. The api reads the column spellings for these three.
    supabaseDouble.setAdminDashboard(adminDashboardJson({
      catalog: { approved: 320, pending_review: 14, rejected: 9, draft: 21, archived: 3, out_of_stock: 27, low_stock: 41 },
    }));

    const dash = await dashboard.fetchAdminDashboard();

    expect(dash.catalog).toMatchObject({ approved: 320, rejected: 9, draft: 21, archived: 3 });
    expect(dash.catalog).toMatchObject({ pendingReview: 14, outOfStock: 27, lowStock: 41 });
  });

  it('maps the stage histogram, the monthly series and the top stores', async () => {
    supabaseDouble.setAdminDashboard(adminDashboardJson({
      stages: { placed: '3', packed: 2, delivered: 40 },
      monthly: [
        { month: 'Sep', label: '2026-09', gross: '6400.00', commission: '640.00', net: '5760.00' },
        { month: 'Oct', label: '2026-10', gross: 1800, commission: 180, net: 1620 },
      ],
      topVendors: [
        { id: 'store-1', storeName: 'Nova Tech', gross: '9100.25', commission: '910.03', packages: 18 },
        { id: 'store-2', storeName: 'Old Shop', gross: 500, commission: 50, packages: '2' },
      ],
    }));

    const dash = await dashboard.fetchAdminDashboard();

    expect(dash.stages).toEqual({ placed: 3, packed: 2, delivered: 40 });
    expect(dash.monthly).toEqual([
      { month: 'Sep', label: '2026-09', gross: 6400, commission: 640, net: 5760 },
      { month: 'Oct', label: '2026-10', gross: 1800, commission: 180, net: 1620 },
    ]);
    expect(dash.topVendors).toEqual([
      { id: 'store-1', storeName: 'Nova Tech', gross: 9100.25, commission: 910.03, packages: 18 },
      { id: 'store-2', storeName: 'Old Shop', gross: 500, commission: 50, packages: 2 },
    ]);
  });

  it('maps absent jsonb arrays to empty lists, never null', async () => {
    supabaseDouble.setAdminDashboard({ days: 12 });

    const dash = await dashboard.fetchAdminDashboard();

    expect(dash.days).toBe(12);
    expect(dash.monthly).toEqual([]);
    expect(dash.topVendors).toEqual([]);
    expect(dash.stages).toEqual({});
  });

  it('reads an untouched platform as adminDashboardJson’s own zeros and nulls', async () => {
    const dash = await dashboard.fetchAdminDashboard();

    expect(dash).toEqual({
      days: 30,
      kpis: {
        gmvBooked: 0, commission: 0, netToSellers: 0, packages: 0, orders: 0, openPackages: 0,
        // `round(gmv / nullif(orders, 0))` on an empty ledger: no orders, so no average.
        averageOrderValue: null, refundAmount: 0, refundCount: 0,
        payoutsPaid: 0, payoutsPending: 0, payoutsPendingCount: 0,
      },
      growth: { revenue7d: 0, revenue30d: 0, orders7d: 0, orders30d: 0, previousGmv: 0, deltaPct: null },
      sellers: { active: 0, suspended: 0, awaitingReview: 0 },
      catalog: { approved: 0, pendingReview: 0, rejected: 0, draft: 0, archived: 0, outOfStock: 0, lowStock: 0 },
      trust: { openDisputes: 0, escalatedDisputes: 0, pendingReturns: 0, strikes: 0 },
      stages: {},
      monthly: [],
      topVendors: [],
    });
    // "No history" must stay distinguishable from "a flat trend": the growth delta is null,
    // and nothing on the api side conjures a series out of an empty ledger.
    expect(dash.growth.deltaPct).toBeNull();
    expect(dash.monthly).toEqual([]);
    expect(dash.topVendors).toEqual([]);
    // An empty ledger has no average order value, and the screen is told exactly that.
    expect(adminDashboardJson().kpis.averageOrderValue).toBeNull();
    expect(dash.kpis.averageOrderValue).toBeNull();
  });

  it('hands the abort signal to the request so a cancelled read rejects', async () => {
    const controller = new AbortController();
    controller.abort();

    let reason: unknown;
    await dashboard.fetchAdminDashboard(30, controller.signal).catch((error: unknown) => {
      reason = error;
    });

    expect((reason as { name?: string }).name).toBe('AbortError');
  });
});
