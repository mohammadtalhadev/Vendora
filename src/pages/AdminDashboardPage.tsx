import React, { useState } from 'react';
import { useDarkMode, chartTheme } from '../hooks/useDarkMode';
import { Toast } from '../components/common/Toast';
import { useToast } from '../hooks/useToast';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Percent,
  Store,
  TrendingUp,
  ChevronDown,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Coins,
  ShoppingBag,
  ArrowRight,
  Settings,
  Scale,
  Download,
  Package,
  Activity,
  RotateCw,
  AlertCircle,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useAdminDashboard } from '../features/admin/hooks/useAdminQueries';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { UpdatedAgo } from '../components/common/UpdatedAgo';
import { useAdminLive } from '../features/admin/hooks/useLive';
import { exportToCsv } from '../lib/export-csv';
import { formatPrice } from '../store/currency-store';

const PERIOD_DAYS: Record<'30d' | '3m' | '6m' | '1y', number> = {
  '30d': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

/** Money renders through the site's PKR formatter — no local $ strings. */
const money = (value: number) => formatPrice(value);

/** Compact axis tick (Batch 49 pattern): 12k, not 12,000. Full values live in the tooltip. */
const axisMoney = (value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`);

/** `round(gmv / nullif(orders, 0))` is NULL until the window has orders: say that, do not print a zero amount. */
const aov = (value: number | null) => (value === null ? 'No orders in this window' : money(value));

const deltaLabel = (pct: number | null) =>
  pct === null
    ? 'no previous window to compare'
    : `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}% vs previous window`;

const stageLabel = (status: string) => status.replace(/_/g, ' ');

export const AdminDashboardPage: React.FC = () => {
  const dark = useDarkMode();
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '3m' | '6m' | '1y'>('3m');
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);

  const days = PERIOD_DAYS[selectedPeriod];
  useAdminLive();
  const dashboard = useAdminDashboard(days);
  const data = dashboard.data;

  const { toast, showToast, hideToast } = useToast(3500);

  const handleExportReport = () => {
    if (!data) {
      showToast('No platform numbers are available to export yet.');
      return;
    }
    const windowNote = `${data.days}-day window`;
    exportToCsv({
      filename: `vendora_platform_executive_report_${new Date().toISOString().slice(0, 10)}.csv`,
      data: [
        { metric: 'Gross Merchandise Value (booked)', value: money(data.kpis.gmvBooked), window: windowNote },
        { metric: 'Platform Commission Earned', value: money(data.kpis.commission), window: windowNote },
        { metric: 'Net To Sellers', value: money(data.kpis.netToSellers), window: windowNote },
        { metric: 'GMV Change vs Previous Window', value: data.growth.deltaPct === null ? 'no previous window to compare' : `${data.growth.deltaPct >= 0 ? '+' : '-'}${Math.abs(data.growth.deltaPct).toFixed(1)}%`, window: windowNote },
        { metric: 'Orders', value: `${data.kpis.orders}`, window: windowNote },
        { metric: 'Packages', value: `${data.kpis.packages}`, window: windowNote },
        { metric: 'Open Packages', value: `${data.kpis.openPackages}`, window: windowNote },
        { metric: 'Average Order Value', value: aov(data.kpis.averageOrderValue), window: windowNote },
        { metric: 'Refund Amount', value: money(data.kpis.refundAmount), window: `${data.kpis.refundCount} refunds, ${windowNote}` },
        { metric: 'Payouts Paid', value: money(data.kpis.payoutsPaid), window: windowNote },
        { metric: 'Payouts Pending', value: money(data.kpis.payoutsPending), window: `${data.kpis.payoutsPendingCount} pending payouts, ${windowNote}` },
        { metric: 'Active Merchant Stores', value: `${data.sellers.active}`, window: 'Current state' },
        { metric: 'Suspended Merchant Stores', value: `${data.sellers.suspended}`, window: 'Current state' },
        { metric: 'Vendors Awaiting Review', value: `${data.sellers.awaitingReview}`, window: 'Current state' },
        { metric: 'Approved Catalog Listings', value: `${data.catalog.approved}`, window: 'Current state' },
        { metric: 'Listings Pending Review', value: `${data.catalog.pendingReview}`, window: 'Current state' },
        { metric: 'Open Disputes', value: `${data.trust.openDisputes}`, window: `Escalated: ${data.trust.escalatedDisputes}, Pending returns: ${data.trust.pendingReturns}, Strikes: ${data.trust.strikes}` },
      ],
      columns: [
        { header: 'Platform Metric', key: 'metric' },
        { header: 'Value', key: 'value' },
        { header: 'Window', key: 'window' },
      ],
    });
    showToast('Platform Executive Summary exported to CSV.');
  };

  const errorBanner = dashboard.isError && (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800 flex items-center gap-2"
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
      <span>{dashboard.error.message}</span>
      <button
        type="button"
        onClick={() => void dashboard.refetch()}
        className="ml-auto shrink-0 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
      >
        Retry
      </button>
    </div>
  );

  // Monthly series from `admin_dashboard`; Recharts scales it (Batch 49).
  const monthly = data?.monthly ?? [];

  const commissionMax = Math.max(1, ...monthly.map((m) => m.commission));

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Dashboard"
      subtitle="Real-time marketplace performance, settlement health, and moderation metrics."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        {/* =====================================================================
            1. Dashboard Page Title & Refresh
            ===================================================================== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">
              Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Real-time marketplace performance, settlement health, and moderation metrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* The numbers re-read themselves every 30 seconds (see useAdminDashboard);
                this only says how fresh they are, with a small manual re-read beside it. */}
            <UpdatedAgo
              updatedAt={dashboard.dataUpdatedAt}
              className="text-xs font-medium text-slate-500"
            />
            <button
              type="button"
              onClick={() => void dashboard.refetch()}
              disabled={dashboard.isFetching}
              aria-label="Refresh Numbers"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
              title="Re-read the platform numbers from the database"
            >
              <RotateCw className={`h-3.5 w-3.5 text-sun-orange ${dashboard.isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {/* Shared toast (Batch 47) — replaces this page's private pill. */}
        <Toast toast={toast} onDismiss={hideToast} />

        {errorBanner}

        {dashboard.isPending && !data && (
          <div className="rounded-xl border border-slate-200/90 bg-white p-10 shadow-2xs text-center">
            <Activity className="h-6 w-6 mx-auto mb-2 text-slate-400 opacity-40 animate-pulse" />
            <p className="text-xs font-semibold text-slate-500">Reading the platform numbers…</p>
          </div>
        )}

        {data && (
          <>
            {/* Quick Actions Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Link
                to="/admin/vendors"
                className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Store className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">Approve Vendors</p>
                    <p className="text-xs text-slate-500 truncate">Merchant onboarding</p>
                  </div>
                </div>
                {data.sellers.awaitingReview > 0 && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                    {data.sellers.awaitingReview}
                  </span>
                )}
              </Link>

              <Link
                to="/admin/products"
                className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">Product Moderation</p>
                    <p className="text-xs text-slate-500 truncate">Catalog verification</p>
                  </div>
                </div>
                {data.catalog.pendingReview > 0 && (
                  <span className="shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                    {data.catalog.pendingReview}
                  </span>
                )}
              </Link>

              <Link
                to="/admin/disputes"
                className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">Resolve Disputes</p>
                    <p className="text-xs text-slate-500 truncate">Resolution center</p>
                  </div>
                </div>
                {data.trust.openDisputes > 0 && (
                  <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                    {data.trust.openDisputes}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={handleExportReport}
                className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Download className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">Export Report</p>
                    <p className="text-xs text-slate-500 truncate">Executive CSV</p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  CSV
                </span>
              </button>

              <Link
                to="/admin/settings"
                className="group col-span-2 sm:col-span-1 flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">System Settings</p>
                    <p className="text-xs text-slate-500 truncate">Global controls</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>

            {/* =====================================================================
                2. Top 4 KPI Cards (from `admin_dashboard`)
                ===================================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">
                    Gross Merchandise Value
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-slate-900">
                    {money(data.kpis.gmvBooked)}
                  </div>
                  <div
                    className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
                      data.growth.deltaPct === null
                        ? 'text-slate-400 font-normal'
                        : data.growth.deltaPct >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                    }`}
                  >
                    {data.growth.deltaPct !== null && (
                      <TrendingUp className={`h-3.5 w-3.5 ${data.growth.deltaPct < 0 ? 'rotate-180' : ''}`} />
                    )}
                    <span>{deltaLabel(data.growth.deltaPct)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">
                    Commission Earned
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                    <Percent className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-slate-900">
                    {money(data.kpis.commission)}
                  </div>
                  <div className="mt-1 text-xs font-normal text-slate-500">
                    from booked volume in the last {data.days} days
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">
                    Active Brand Stores
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                    <Store className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-slate-900">
                    {data.sellers.active}
                  </div>
                  <div className="mt-1 text-xs font-normal text-slate-500">
                    {data.sellers.suspended} suspended, {data.sellers.awaitingReview} awaiting review
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">
                    Approved Catalog Listings
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-slate-900">
                    {data.catalog.approved}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 truncate">
                    ({data.catalog.pendingReview} in moderation)
                  </div>
                </div>
              </div>
            </div>

            {/* =====================================================================
                3. Orders, Total Revenue, Commission Overview (3 Columns)
                ===================================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Orders</span>
                    <span className="rounded border border-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                      Last {data.days} days
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                      {data.kpis.orders.toLocaleString()}
                    </span>
                    <span className="text-xs font-normal text-slate-400">orders</span>
                  </div>
                </div>

                <div className="mt-5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Packages</span>
                    <span className="font-semibold text-slate-900">{data.kpis.packages.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Open packages</span>
                    <span className="font-semibold text-slate-900">{data.kpis.openPackages.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Average order value</span>
                    <span className="font-semibold text-slate-900">{aov(data.kpis.averageOrderValue)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Total Revenue</span>
                    <span className="rounded border border-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                      Monthly booked
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                      {money(data.kpis.gmvBooked)}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        data.growth.deltaPct === null
                          ? 'text-slate-400 font-normal'
                          : data.growth.deltaPct >= 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                      }`}
                    >
                      {deltaLabel(data.growth.deltaPct)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 h-28 w-full">
                  {monthly.length === 0 ? (
                    <p className="text-xs text-slate-500 pt-10 text-center">
                      No monthly history in this window.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                        <CartesianGrid vertical={false} stroke={chartTheme.gridStroke(dark)} strokeDasharray="4 4" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: chartTheme.tickFill(dark) }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis hide domain={[0, 'dataMax']} />
                        <Tooltip contentStyle={chartTheme.tooltipStyle(dark)} formatter={(value) => [money(Number(value)), 'Gross booked']} />
                        <Area
                          type="monotone"
                          dataKey="gross"
                          stroke={chartTheme.inkStroke(dark)}
                          strokeWidth={2.5}
                          fill={dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Commission Overview</span>
                    <span className="text-xs font-bold text-slate-900">{money(data.kpis.commission)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>Commission from booked volume</span>
                    <span className="font-medium text-slate-600">Net to sellers {money(data.kpis.netToSellers)}</span>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {monthly.length === 0 ? (
                    <p className="text-xs text-slate-500">No monthly commission history in this window.</p>
                  ) : (
                    monthly.map((m) => (
                      <div key={m.month}>
                        <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                          <span>{m.label}</span>
                          <span className="font-semibold text-slate-900">{money(m.commission)}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-slate-900 rounded-full"
                            style={{ width: `${Math.min(100, (m.commission / commissionMax) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* =====================================================================
                4. Marketplace Sales (Full-Width Dual Line Chart, from `monthly`)
                ===================================================================== */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Marketplace Sales</h2>
                  <p className="text-xs text-slate-400">
                    Showing booked volume and seller net per month over the last {data.days} days
                  </p>
                </div>
                <div className="relative self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <span>
                      {selectedPeriod === '30d'
                        ? 'Last 30 days'
                        : selectedPeriod === '3m'
                        ? 'Last 3 months'
                        : selectedPeriod === '6m'
                        ? 'Last 6 months'
                        : 'This year'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>

                  {isPeriodMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95">
                      {[
                        { id: '30d', label: 'Last 30 days' },
                        { id: '3m', label: 'Last 3 months' },
                        { id: '6m', label: 'Last 6 months' },
                        { id: '1y', label: 'This year' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPeriod(p.id as '30d' | '3m' | '6m' | '1y');
                            setIsPeriodMenuOpen(false);
                            showToast(`Sales chart timeframe updated to ${p.label}`);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                            selectedPeriod === p.id
                              ? 'bg-slate-50 font-bold text-slate-900'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {monthly.length === 0 ? (
                <div className="py-12 text-center">
                  <Activity className="h-6 w-6 mx-auto mb-2 text-slate-400 opacity-40" />
                  <p className="text-xs text-slate-400">No sales months recorded in this window.</p>
                </div>
              ) : (
                <div className="mt-6 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthly} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                      <defs>
                        <linearGradient id="grossSalesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartTheme.inkStroke(dark)} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={chartTheme.inkStroke(dark)} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="netSalesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={dark ? '#8e8e96' : '#94A3B8'} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={dark ? '#8e8e96' : '#94A3B8'} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke={chartTheme.gridStroke(dark)} strokeDasharray="4 4" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: chartTheme.tickFill(dark) }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: chartTheme.tickFill(dark) }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={axisMoney}
                        width={48}
                      />
                      <Tooltip
                        contentStyle={chartTheme.tooltipStyle(dark)}
                        formatter={(value, name) => [
                          money(Number(value)),
                          name === 'gross' ? 'Gross booked' : 'Net to sellers',
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="net"
                        stroke={dark ? '#a1a1aa' : '#64748B'}
                        strokeWidth={2}
                        fill="url(#netSalesGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="gross"
                        stroke={chartTheme.inkStroke(dark)}
                        strokeWidth={2.5}
                        fill="url(#grossSalesGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-4 flex items-center justify-center gap-6 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-xs bg-slate-900" />
                  <span className="font-semibold text-slate-800">Gross booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-xs bg-slate-400" />
                  <span className="font-medium text-slate-500">Net to sellers</span>
                </div>
              </div>
            </div>

            {/* =====================================================================
                5. Queues Needing Decisions
                ===================================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Store className="h-4 w-4" />
                    </div>
                    {data.sellers.awaitingReview > 0 && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                        Needs Review
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-slate-900">Vendor Review Queue</h3>
                    <p className="text-xs text-slate-400">Applications awaiting a decision</p>
                  </div>
                  <div className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
                    {data.sellers.awaitingReview}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {data.sellers.active} active, {data.sellers.suspended} suspended
                  </span>
                  <Link
                    to="/admin/vendors"
                    className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
                  >
                    <span>Open Queue</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    {data.catalog.pendingReview > 0 && (
                      <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-slate-900">Catalog Moderation</h3>
                    <p className="text-xs text-slate-400">Listings awaiting a decision</p>
                  </div>
                  <div className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
                    {data.catalog.pendingReview}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {data.catalog.approved} approved, {data.catalog.rejected} rejected
                  </span>
                  <Link
                    to="/admin/products"
                    className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
                  >
                    <span>Open Queue</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                      <Scale className="h-4 w-4" />
                    </div>
                    {data.trust.openDisputes > 0 && (
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                        Open
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-slate-900">Disputes & Trust</h3>
                    <p className="text-xs text-slate-400">Cases in arbitration</p>
                  </div>
                  <div className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
                    {data.trust.openDisputes}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {data.trust.escalatedDisputes} escalated, {data.trust.pendingReturns} returns, {data.trust.strikes} strikes
                  </span>
                  <Link
                    to="/admin/disputes"
                    className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
                  >
                    <span>Open Queue</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* =====================================================================
                6. Top Vendors (Left) & Order Stages (Right)
                ===================================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Top Vendors</h2>
                      <p className="text-xs text-slate-400">
                        Ranked by booked volume over the last {data.days} days
                      </p>
                    </div>
                    <Link
                      to="/admin/vendors"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
                    >
                      <span>View All</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500">
                        TOTAL PAYOUTS PENDING
                      </span>
                      <div className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                        {money(data.kpis.payoutsPending)}
                      </div>
                    </div>
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-2xs">
                      {data.kpis.payoutsPendingCount} payouts
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {data.topVendors.length === 0 ? (
                      <div className="py-8 text-center text-slate-400">
                        <Store className="h-6 w-6 mx-auto mb-2 opacity-40" />
                        <p className="text-xs">No vendor has booked volume in this window yet.</p>
                      </div>
                    ) : (
                      data.topVendors.map((vendor) => (
                        <Link
                          key={vendor.id}
                          to={`/admin/vendors/${vendor.id}`}
                          className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                              <Store className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                                {vendor.storeName}
                              </p>
                              <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">
                                {vendor.packages} packages
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                              {money(vendor.gross)}
                            </p>
                            <p className="text-xs font-semibold leading-tight mt-0.5 text-slate-500">
                              {money(vendor.commission)} commission
                            </p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Order Stages</h2>
                      <p className="text-xs text-slate-400">Packages by current status</p>
                    </div>
                    <span className="rounded border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Last {data.days} days
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {Object.entries(data.stages).length === 0 ? (
                      <div className="py-8 text-center text-slate-400">
                        <Package className="h-6 w-6 mx-auto mb-2 opacity-40" />
                        <p className="text-xs">No packages recorded in this window yet.</p>
                      </div>
                    ) : (
                      Object.entries(data.stages).map(([status, count]) => (
                        <div
                          key={status}
                          className="flex items-center justify-between gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-orange-200 bg-orange-50 text-sun-orange">
                              <Package className="h-3.5 w-3.5" />
                            </div>
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {stageLabel(status)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-slate-900">{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* =====================================================================
                7. Settlement & Refund Health
                ===================================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                      <Coins className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-slate-900">Payouts Paid</h3>
                    <p className="text-xs text-slate-400">Settled to sellers in the last {data.days} days</p>
                  </div>
                  <div className="mt-4 flex justify-between text-xs">
                    <span className="text-slate-500">Paid</span>
                    <span className="font-semibold text-slate-900">{money(data.kpis.payoutsPaid)}</span>
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs">
                    <span className="text-slate-500">Pending</span>
                    <span className="font-semibold text-slate-900">{money(data.kpis.payoutsPending)}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {data.kpis.payoutsPendingCount} payouts pending
                  </span>
                  <Link
                    to="/admin/commission"
                    className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
                  >
                    <span>View Details</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-slate-900">Refunds</h3>
                    <p className="text-xs text-slate-400">Refunded volume in the last {data.days} days</p>
                  </div>
                  <div className="mt-4 flex justify-between text-xs">
                    <span className="text-slate-500">Refund amount</span>
                    <span className="font-semibold text-slate-900">{money(data.kpis.refundAmount)}</span>
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs">
                    <span className="text-slate-500">Refund count</span>
                    <span className="font-semibold text-slate-900">{data.kpis.refundCount}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {data.trust.pendingReturns} returns pending
                  </span>
                  <Link
                    to="/admin/disputes"
                    className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
                  >
                    <span>View Details</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-slate-900">Order Flow</h3>
                    <p className="text-xs text-slate-400">Booked volume and basket size</p>
                  </div>
                  <div className="mt-4 flex justify-between text-xs">
                    <span className="text-slate-500">Orders</span>
                    <span className="font-semibold text-slate-900">{data.kpis.orders}</span>
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs">
                    <span className="text-slate-500">Average order value</span>
                    <span className="font-semibold text-slate-900">{aov(data.kpis.averageOrderValue)}</span>
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs">
                    <span className="text-slate-500">7-day revenue</span>
                    <span className="font-semibold text-slate-900">{money(data.growth.revenue7d)}</span>
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs">
                    <span className="text-slate-500">30-day revenue</span>
                    <span className="font-semibold text-slate-900">{money(data.growth.revenue30d)}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Previous window GMV {money(data.growth.previousGmv)}
                  </span>
                  <Link
                    to="/admin/orders"
                    className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
                  >
                    <span>View Details</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
};
