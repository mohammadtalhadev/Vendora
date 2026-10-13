import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Download,
  DollarSign,
  Percent,
  PieChart,
  RotateCw,
  Search,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { QueryState, Skeleton } from '../components/common/QueryState';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { useReportSummary } from '../features/admin/hooks/useAdminQueries';
import type {
  ReportBySeller,
  ReportSeriesPoint,
} from '../features/admin/api/reports';
import { formatPrice } from '../store/currency-store';
import { exportToCsv } from '../lib/export-csv';

/**
 * Reports & analytics, read from the `admin_report_summary` RPC.
 *
 * This replaces the legacy page wholesale: it rendered a hardcoded "$1,489,200
 * GMV", growth chips against periods it never measured, a weekly chart with
 * literal bar heights, a tax-escrow balance, preset CSV downloads whose rows
 * were written inline, and a "generated reports" archive of files that never
 * existed (invented names, authors and file sizes). None of that had a backend.
 * What the schema does have — the booked ledger bucketed over a window — is
 * exactly what this page now shows, and every export is generated from the
 * rows currently on screen.
 */

type RangeKey = '7d' | '30d' | '90d' | 'ytd';
type Bucket = 'day' | 'week' | 'month';

const RANGE_OPTIONS: { value: RangeKey; label: string; bucket: Bucket }[] = [
  { value: '7d', label: 'Date Range: Last 7 Days', bucket: 'day' },
  { value: '30d', label: 'Date Range: Last 30 Days', bucket: 'week' },
  { value: '90d', label: 'Date Range: Last 90 Days', bucket: 'week' },
  { value: 'ytd', label: 'Date Range: Year to Date', bucket: 'month' },
];

function daysForRange(range: RangeKey): number {
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  if (range === '90d') return 90;
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.max(1, Math.floor((now.getTime() - jan1.getTime()) / 86_400_000) + 1);
}

/** `2026-10-05` → `05 Oct` (or `Oct 2026` for monthly buckets), TZ-safe. */
function periodLabel(period: string, bucket: Bucket): string {
  const date = new Date(`${period}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    ...(bucket === 'month'
      ? { month: 'short', year: 'numeric' }
      : { day: '2-digit', month: 'short' }),
  }).format(date);
}

function pct(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

const SELLERS_PER_PAGE = 5;

export const AdminReportsPage: React.FC = () => {
  const [range, setRange] = useState<RangeKey>('30d');
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerPage, setSellerPage] = useState(1);

  const days = daysForRange(range);
  const bucket = RANGE_OPTIONS.find((o) => o.value === range)?.bucket ?? 'day';
  const report = useReportSummary(days, bucket);
  const data = report.data;

  const filteredSellers = useMemo(() => {
    const rows = data?.bySeller ?? [];
    const needle = sellerSearch.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.storeName.toLowerCase().includes(needle));
  }, [data, sellerSearch]);

  const paginatedSellers = filteredSellers.slice(
    (sellerPage - 1) * SELLERS_PER_PAGE,
    sellerPage * SELLERS_PER_PAGE,
  );

  const maxSeriesGross = useMemo(
    () => Math.max(0, ...(data?.series ?? []).map((p) => p.gross)),
    [data],
  );
  const maxCategoryCommission = useMemo(
    () => Math.max(0, ...(data?.byCategory ?? []).map((c) => c.commission)),
    [data],
  );

  const stamp = new Date().toISOString().slice(0, 10);

  const handleExportSeries = () => {
    if (!data) return;
    exportToCsv({
      filename: `vendora_period_summary_${range}_${stamp}.csv`,
      columns: [
        { header: 'Period', key: 'period' },
        { header: 'Gross (PKR)', key: 'gross' },
        { header: 'Commission (PKR)', key: 'commission' },
        { header: 'Net to Sellers (PKR)', key: 'net' },
        { header: 'Orders', key: 'orders' },
        { header: 'Packages', key: 'packages' },
      ],
      data: data.series.map((p) => ({ ...p })),
    });
  };

  const handleExportCategories = () => {
    if (!data) return;
    exportToCsv({
      filename: `vendora_commission_by_category_${range}_${stamp}.csv`,
      columns: [
        { header: 'Category', key: 'category' },
        { header: 'Gross (PKR)', key: 'gross' },
        { header: 'Commission (PKR)', key: 'commission' },
        { header: 'Listings', key: 'listings' },
      ],
      data: data.byCategory.map((c) => ({ ...c })),
    });
  };

  const handleExportSellers = () => {
    exportToCsv({
      filename: `vendora_seller_performance_${range}_${stamp}.csv`,
      columns: [
        { header: 'Store', key: 'storeName' },
        { header: 'Gross (PKR)', key: 'gross' },
        { header: 'Commission (PKR)', key: 'commission' },
        { header: 'Net to Seller (PKR)', key: 'net' },
        { header: 'Packages', key: 'packages' },
        { header: 'Payouts Paid (PKR)', key: 'payoutsPaid' },
      ],
      data: filteredSellers.map((s) => ({ ...s })),
    });
  };

  const sellerColumns: DataTableColumn<ReportBySeller>[] = [
    {
      key: 'store',
      header: 'Store',
      headerClassName: 'text-[11px]',
      cell: (seller) => (
        <span className="font-semibold text-slate-900">{seller.storeName}</span>
      ),
    },
    {
      key: 'gross',
      header: 'Gross',
      align: 'right',
      headerClassName: 'text-[11px]',
      className: 'font-mono text-slate-700',
      cell: (seller) => formatPrice(seller.gross),
    },
    {
      key: 'commission',
      header: 'Commission',
      align: 'right',
      headerClassName: 'text-[11px]',
      className: 'font-mono text-slate-700',
      cell: (seller) => formatPrice(seller.commission),
    },
    {
      key: 'net',
      header: 'Net to Seller',
      align: 'right',
      headerClassName: 'text-[11px]',
      className: 'font-mono font-semibold text-slate-900',
      cell: (seller) => formatPrice(seller.net),
    },
    {
      key: 'packages',
      header: 'Packages',
      align: 'right',
      headerClassName: 'text-[11px]',
      className: 'font-mono text-slate-700',
      cell: (seller) => seller.packages,
    },
    {
      key: 'payouts',
      header: 'Payouts Paid',
      align: 'right',
      headerClassName: 'text-[11px]',
      className: 'font-mono text-slate-700',
      cell: (seller) => formatPrice(seller.payoutsPaid),
    },
  ];

  const aov = data && data.totals.orders > 0 ? data.totals.gross / data.totals.orders : null;

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Reports & Analytics" sidebar={<AdminNav />}>
      <div className="space-y-6">

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">
              Reports & Marketplace Analytics
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Platform volume, commission and seller performance computed from live
              marketplace data over the selected window.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <select
                id="reports-preset-date-range"
                aria-label="Report date range"
                value={range}
                onChange={(e) => {
                  setRange(e.target.value as RangeKey);
                  setSellerPage(1);
                }}
                className="appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer focus:outline-hidden"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            </div>
            <button
              type="button"
              onClick={() => void report.refetch()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              title="Refresh report"
              aria-label="Refresh report"
            >
              <RotateCw className={`h-3.5 w-3.5 ${report.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleExportSeries}
              disabled={!data || data.series.length === 0}
            >
              <Download className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              <span className="text-white">Export Period CSV</span>
            </Button>
          </div>
        </div>

        <QueryState
          isLoading={report.isLoading}
          isError={report.isError}
          error={report.error}
          errorTitle="Unable to load the report"
          errorMessage={
            report.error instanceof Error
              ? report.error.message
              : 'Report data could not be loaded.'
          }
          onRetry={() => void report.refetch()}
          skeleton={
            <div className="space-y-6" aria-hidden="true">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          }
        >
          {data && (
            <>
              {/* KPI Cards — totals the RPC computed for this window */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>GROSS MARKETPLACE VOLUME</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-slate-900">
                    {formatPrice(data.totals.gross)}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Across {data.totals.orders} orders in the last {data.days} days
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>PLATFORM COMMISSION</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                      <Percent className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-slate-900">
                    {formatPrice(data.totals.commission)}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {data.totals.takeRatePct !== null
                      ? `Effective take rate ${pct(data.totals.takeRatePct)} of booked volume`
                      : 'No booked volume in this window'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>NET TO SELLERS</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-slate-900">
                    {formatPrice(data.totals.net)}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Across {data.totals.packages} packages
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>AVG ORDER VALUE (AOV)</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-slate-900">
                    {aov !== null ? formatPrice(aov) : '—'}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {aov !== null
                      ? `Refunds issued ${formatPrice(data.totals.refunds)} in this window`
                      : 'No orders in this window'}
                  </p>
                </div>
              </div>

              {/* Flow Chart & Take by Category */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Gross Sales Flow
                        </h2>
                        <p className="text-xs text-slate-500">
                          Booked volume per {data.bucket}, split between seller net and platform commission
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                          <span>Net to Sellers</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                          <span>Commission</span>
                        </div>
                      </div>
                    </div>

                    {data.series.length === 0 ? (
                      <p className="py-10 text-center text-xs text-slate-500" role="status">
                        No sales recorded in this window.
                      </p>
                    ) : (
                      <div className="pt-4">
                        <div
                          className="flex gap-3 items-end h-48 border-b border-slate-100 pb-3 overflow-x-auto"
                          role="img"
                          aria-label={`Gross sales by ${data.bucket} for the last ${data.days} days`}
                        >
                          {data.series.map((point: ReportSeriesPoint) => {
                            const heightPct = maxSeriesGross > 0 ? (point.gross / maxSeriesGross) * 100 : 0;
                            const commissionShare = point.gross > 0 ? (point.commission / point.gross) * 100 : 0;
                            return (
                              <div
                                key={point.period}
                                className="flex flex-col items-center gap-2 h-full justify-end min-w-10 flex-1"
                                title={`${periodLabel(point.period, data.bucket)}: ${formatPrice(point.gross)} gross, ${formatPrice(point.commission)} commission, ${point.orders} orders`}
                              >
                                <div
                                  className="w-12 flex flex-col-reverse rounded-t-sm overflow-hidden bg-slate-100"
                                  style={{ height: `${Math.max(heightPct, 1.5)}%` }}
                                >
                                  <div
                                    className="w-full bg-slate-900"
                                    style={{ height: `${100 - commissionShare}%` }}
                                  />
                                  <div
                                    className="w-full bg-slate-300"
                                    style={{ height: `${commissionShare}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                  {periodLabel(point.period, data.bucket)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Shipping Charged
                        </div>
                        <div className="mt-0.5 text-sm font-extrabold text-slate-900">
                          {formatPrice(data.totals.freight)}
                        </div>
                        <div className="text-slate-500">Physical packages only</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Digital Goods Volume
                        </div>
                        <div className="mt-0.5 text-sm font-extrabold text-slate-900">
                          {formatPrice(data.totals.digitalGross)}
                        </div>
                        <div className="text-slate-500">Gross of digital sub-orders</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Refunds Issued
                        </div>
                        <div className="mt-0.5 text-sm font-extrabold text-slate-900">
                          {formatPrice(data.totals.refunds)}
                        </div>
                        <div className="text-slate-500">Across the selected window</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Platform Take by Category
                        </h2>
                        <p className="text-xs text-slate-500">
                          Commission earned per category in this window
                        </p>
                      </div>
                      <PieChart className="h-4 w-4 text-slate-400" />
                    </div>

                    {data.byCategory.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-500" role="status">
                        No commission recorded in this window.
                      </p>
                    ) : (
                      <div className="space-y-3 text-xs">
                        {data.byCategory.map((category) => (
                          <div key={category.category}>
                            <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                              <span>
                                {category.category}
                                {category.gross > 0 && (
                                  <span className="text-slate-400">
                                    {' '}
                                    ({pct((category.commission / category.gross) * 100)})
                                  </span>
                                )}
                              </span>
                              <strong className="text-slate-900">
                                {formatPrice(category.commission)}
                              </strong>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-slate-900 rounded-full"
                                style={{
                                  width: `${maxCategoryCommission > 0 ? (category.commission / maxCategoryCommission) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <div className="pt-1 text-[11px] text-slate-400">
                              {formatPrice(category.gross)} gross · {category.listings} listings
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={handleExportCategories}
                        disabled={data.byCategory.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        Export Category CSV
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller Performance — real rows from the same summary */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Seller Performance</h2>
                    <p className="text-xs text-slate-500">
                      Booked volume, commission and payouts per store in the selected window
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportSellers}
                    disabled={filteredSellers.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Export Seller CSV
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <div className="p-3 border-b border-slate-100">
                    <Input
                      id="reports-seller-search"
                      type="text"
                      aria-label="Filter sellers by store name"
                      value={sellerSearch}
                      onChange={(e) => {
                        setSellerSearch(e.target.value);
                        setSellerPage(1);
                      }}
                      placeholder="Filter stores..."
                      leftIcon={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
                      className="h-9 rounded-lg bg-slate-50/80 text-xs text-slate-800 focus:bg-white"
                    />
                  </div>

                  <DataTable
                    columns={sellerColumns}
                    rows={paginatedSellers}
                    getRowKey={(seller) => seller.storeName}
                    ariaLabel="Seller performance"
                    emptyState={
                      <div className="px-4 py-10 text-center text-xs text-slate-500">
                        {data.bySeller.length === 0
                          ? 'No seller sales in this window.'
                          : 'No stores match your filter.'}
                      </div>
                    }
                    pagination={{
                      page: sellerPage,
                      pageSize: SELLERS_PER_PAGE,
                      totalItems: filteredSellers.length,
                      onPageChange: setSellerPage,
                      noun: 'stores',
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </QueryState>
      </div>
    </WorkspaceLayout>
  );
};
