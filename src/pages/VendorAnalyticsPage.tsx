import React, { useMemo } from 'react';
import { useDarkMode, chartTheme } from '../hooks/useDarkMode';
import { BarChart3, Package, TrendingUp, Wallet } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { useVendorBalance, useVendorEarnings } from '../features/vendor/hooks/useVendorEarnings';
import { useVendorPackages } from '../features/vendor/hooks/useVendorPackages';
import { StatusBadge } from '../components/ui/status-badge';
import { formatPrice } from '../store/currency-store';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const MONTHS = 12;

/** 'YYYY-MM' from the earnings RPC to the month's short name. */
const monthLabel = (month: string) => {
  const [year, number] = month.split('-');
  const date = new Date(Number(year), Number(number) - 1, 1);
  return Number.isNaN(date.getTime())
    ? month
    : date.toLocaleDateString('en-US', { month: 'short' });
};

/** Compact axis tick: 12k, not 12,000. Full values live in the tooltip. */
const axisPrice = (value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`);

/**
 * Vendor Analytics (/vendor/analytics). A read-only roll-up of the same
 * numbers the Earnings and Orders pages work from — the `vendor_earnings`
 * monthly series, the `vendor_balance` wallet, and the store's own package
 * list — so the chart can never disagree with the ledger.
 */
export const VendorAnalyticsPage: React.FC = () => {
  const dark = useDarkMode();
  const earnings = useVendorEarnings(MONTHS);
  const balance = useVendorBalance();
  const packagesQuery = useVendorPackages();

  const series = earnings.data?.months ?? [];
  const totals = earnings.data?.totals;
  const wallet = balance.data;
  const packages = useMemo(() => packagesQuery.data ?? [], [packagesQuery.data]);

  const maxGross = series.reduce((max, m) => Math.max(max, m.gross), 0);
  const peak = series.reduce(
    (best, m) => (m.gross > (best?.gross ?? 0) ? m : best),
    null as null | (typeof series)[number],
  );

  const topProducts = useMemo(() => {
    const byTitle = new Map<string, { revenue: number; units: number }>();
    for (const pkg of packages) {
      if (pkg.status === 'cancelled') continue;
      for (const item of pkg.items) {
        const entry = byTitle.get(item.title) ?? { revenue: 0, units: 0 };
        entry.revenue += item.price * item.quantity;
        entry.units += item.quantity;
        byTitle.set(item.title, entry);
      }
    }
    return Array.from(byTitle.entries())
      .map(([title, v]) => ({ title, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [packages]);

  const statusMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pkg of packages) counts.set(pkg.status, (counts.get(pkg.status) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [packages]);

  const topRevenue = topProducts[0]?.revenue ?? 0;
  const loading = earnings.isPending || balance.isPending || packagesQuery.isPending;
  const failed = earnings.isError && balance.isError && packagesQuery.isError;

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="font-outfit text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Analytics
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Your last {MONTHS} months, rolled up from the same earnings ledger and order
            list your other pages use.
          </p>
        </div>

        {failed && (
          <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
            Analytics could not be loaded — your Earnings page holds the underlying
            numbers.
          </p>
        )}

        {loading && !failed ? (
          <p className="text-xs text-slate-500">Crunching your numbers…</p>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  icon: Wallet,
                  label: 'Available balance',
                  value: wallet ? formatPrice(wallet.available) : '—',
                  sub: wallet ? `${formatPrice(wallet.pendingPayouts)} in payouts on the way` : '',
                },
                {
                  icon: TrendingUp,
                  label: `Net earnings (${MONTHS} mo)`,
                  value: totals ? formatPrice(totals.net) : '—',
                  sub: totals ? `${formatPrice(totals.fees)} commission in the window` : '',
                },
                {
                  icon: Package,
                  label: 'Packages',
                  value: totals ? String(totals.packages) : '—',
                  sub: totals
                    ? `${totals.settled} settled · ${totals.processing} still open`
                    : '',
                },
                {
                  icon: BarChart3,
                  label: 'Best month',
                  value: peak ? formatPrice(peak.gross) : '—',
                  sub: peak ? `${peak.month} · ${peak.packages} packages` : '',
                },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
                    <card.icon className="h-3.5 w-3.5" aria-hidden="true" /> {card.label}
                  </span>
                  <p className="mt-1.5 font-outfit text-2xl font-black text-slate-900">{card.value}</p>
                  {card.sub && <p className="mt-0.5 text-[11px] text-slate-500">{card.sub}</p>}
                </div>
              ))}
            </div>

            {/* Monthly chart */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-outfit text-base font-black text-slate-900">
                  Gross vs net, month by month
                </h2>
                <p className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" /> Gross
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-sun-orange" /> Net after commission
                  </span>
                </p>
              </div>
              {series.length === 0 || maxGross === 0 ? (
                <p className="mt-6 text-xs text-slate-500">
                  No settled sales in this window yet — the chart fills in as orders
                  complete.
                </p>
              ) : (
                <div className="mt-6 h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={series.map((m) => ({ ...m, label: monthLabel(m.month) }))}
                      margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
                    >
                      <CartesianGrid vertical={false} stroke={chartTheme.gridStroke(dark)} strokeDasharray="4 4" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: chartTheme.tickFill(dark) }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: chartTheme.tickFill(dark) }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={axisPrice}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={chartTheme.tooltipStyle(dark)}
                        formatter={(value, name) => [
                          formatPrice(Number(value)),
                          name === 'gross' ? 'Gross' : 'Net after commission',
                        ]}
                      />
                      <Bar dataKey="gross" fill={dark ? '#3f3f46' : '#cbd5e1'} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="net" fill="#FF7A1A" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Top products */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <h2 className="font-outfit text-base font-black text-slate-900">
                  Top products by revenue
                </h2>
                {topProducts.length === 0 ? (
                  <p className="mt-4 text-xs text-slate-500">No sales yet.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {topProducts.map((p) => (
                      <li key={p.title}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-xs font-bold text-slate-800">{p.title}</span>
                          <span className="shrink-0 text-xs font-black text-slate-900">
                            {formatPrice(p.revenue)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-sun-orange"
                            style={{ width: `${topRevenue > 0 ? (p.revenue / topRevenue) * 100 : 0}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">{p.units} units sold</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Status mix */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <h2 className="font-outfit text-base font-black text-slate-900">
                  Where your packages stand
                </h2>
                {statusMix.length === 0 ? (
                  <p className="mt-4 text-xs text-slate-500">No packages yet.</p>
                ) : (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {statusMix.map(([status, count]) => (
                      <li
                        key={status}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-1.5"
                      >
                        <StatusBadge status={status} />
                        <span className="text-xs font-black text-slate-900">{count}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
                  Counted from your full package list, all time. Cancelled packages are
                  excluded from the product revenue above.
                </p>
              </section>
            </div>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
};

export default VendorAnalyticsPage;
