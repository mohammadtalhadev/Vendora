import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchReportSummary } from './reports';
import { adminReportJson, supabaseDouble } from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
});

describe('fetchReportSummary', () => {
  it('sends the window and the bucket it was asked for', async () => {
    await fetchReportSummary(90, 'month');

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_days: 90, p_bucket: 'month' });
  });

  it('passes an unknown bucket straight through and lets SQL decide the period', async () => {
    await fetchReportSummary(30, 'hour' as 'day');

    // `case when p_bucket in ('week','month') then p_bucket else 'day'`: the browser does not guess.
    expect(supabaseDouble.rpcCalls.at(-1)?.args.p_bucket).toBe('hour');
  });

  it('maps the totals, series and breakdowns the RPC built', async () => {
    supabaseDouble.setAdminReport(adminReportJson({
      days: 7,
      bucket: 'week',
      totals: {
        gross: 4200, commission: 420, net: 3780, freight: 140, digitalGross: 600,
        orders: 38, packages: 41, refunds: 65, takeRatePct: 10,
      },
      series: [{ period: '2026-10-05', gross: 1200, commission: 120, net: 1080, orders: 12, packages: 13 }],
      byCategory: [{ category: 'Electronics', gross: 3000, commission: 300, listings: 24 }],
      bySeller: [{
        storeName: 'Nova Tech', gross: 2000, commission: 200, net: 1800, packages: 19, payoutsPaid: 1500,
      }],
    }));

    const report = await fetchReportSummary(7, 'week');

    expect(report.days).toBe(7);
    expect(report.bucket).toBe('week');
    expect(report.totals).toMatchObject({ gross: 4200, freight: 140, refunds: 65, takeRatePct: 10 });
    expect(report.series[0]).toMatchObject({ period: '2026-10-05', gross: 1200 });
    expect(report.byCategory[0]).toMatchObject({ category: 'Electronics', listings: 24 });
    expect(report.bySeller[0]).toMatchObject({ storeName: 'Nova Tech', payoutsPaid: 1500 });
  });

  it('reports a period with nothing in it as zeros and a null take rate, not as a fabricated trend', async () => {
    const report = await fetchReportSummary(30);

    expect(report.totals.gross).toBe(0);
    expect(report.totals.takeRatePct).toBeNull();
    expect(report.series).toEqual([]);
    expect(report.byCategory).toEqual([]);
    expect(report.bySeller).toEqual([]);
  });

  it('rejects for an account that is not the platform team', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'shopper', email: 's@demo.test' } };

    await expect(fetchReportSummary()).rejects.toThrow(/failed to load the report: only the platform team/i);
  });

  it('throws on a failed read instead of rendering an empty revenue chart', async () => {
    supabaseDouble.failRpc('permission denied for function admin_report_summary');

    await expect(fetchReportSummary()).rejects.toThrow(/failed to load the reports|failed to load/i);
  });
});
