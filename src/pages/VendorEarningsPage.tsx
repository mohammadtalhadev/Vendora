import React, { useState, useMemo } from 'react';
import { useDarkMode, chartTheme } from '../hooks/useDarkMode';
import { Toast } from '../components/common/Toast';
import { useToast } from '../hooks/useToast';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Search,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { VendorNav } from '../features/vendor/components/VendorNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { exportToCsv } from '../lib/export-csv';
import { formatPrice } from '../store/currency-store';
import { useVendorBalance, useVendorEarnings } from '../features/vendor/hooks/useVendorEarnings';
import {
  Area,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** The picker's labels mapped onto the months of history `vendor_earnings` reads. */
const RANGE_MONTHS: Record<'30d' | '90d' | '1y' | 'ytd', number> = {
  '30d': 1,
  '90d': 3,
  '1y': 12,
  ytd: new Date().getMonth() + 1,
};

/** Money renders through the site's PKR formatter — no local $ strings. */
const money = (value: number) => formatPrice(value);

/** Compact axis tick (Batch 49 pattern): 12k, not 12,000. Full values live in the tooltip. */
const axisMoney = (value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`);

/** 'YYYY-MM' from the RPC to the month's short name. */
const monthLabel = (month: string) => {
  const [year, number] = month.split('-');
  const date = new Date(Number(year), Number(number) - 1, 1);
  return Number.isNaN(date.getTime())
    ? month
    : `${date.toLocaleDateString('en-US', { month: 'short' })} ${String(year).slice(2)}`;
};

const longMonth = (month: string) => {
  const [year, number] = month.split('-');
  const date = new Date(Number(year), Number(number) - 1, 1);
  return Number.isNaN(date.getTime())
    ? month
    : `${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
};

/** The statuses `vendor_earnings` counts as settled; anything else is still open. */
const isSettled = (status: string) => status === 'delivered' || status === 'available';

export const VendorEarningsPage: React.FC = () => {
  const dark = useDarkMode();
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y' | 'ytd'>('90d');
  const [activeTab, setActiveTab] = useState<'All' | 'Physical' | 'Digital'>('All');
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'settled' | 'open'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementMonth, setStatementMonth] = useState<string>('window');

  const months = RANGE_MONTHS[timeRange];
  const earnings = useVendorEarnings(months);
  const balance = useVendorBalance();

  const { toast, showToast, hideToast } = useToast(3000);

  const totals = earnings.data?.totals;
  const series = earnings.data?.months ?? [];
  const ledger = earnings.data?.ledger ?? [];
  const wallet = balance.data;

  const maxMonth = series.reduce((max, m) => Math.max(max, m.gross), 0);
  const peakMonth = series.reduce((peak, m) => (m.gross > (peak?.gross ?? 0) ? m : peak), null as null | (typeof series)[number]);

  /** Months that actually booked something, newest first: the only periods worth stating. */
  const monthsWithData = useMemo(
    () => series.filter((m) => m.gross > 0 || m.packages > 0).reverse(),
    [series],
  );

  // Recharts rows (Batch 49 — the hand-plotted SVG polylines are gone;
  // Recharts scales this same series and adds real axes and tooltips).
  const chartSeries = series.map((m) => ({ ...m, label: monthLabel(m.month) }));

  const filteredLedger = useMemo(
    () =>
      ledger.filter((r) => {
        if (activeTab === 'Physical' && r.type !== 'physical') return false;
        if (activeTab === 'Digital' && r.type !== 'digital') return false;
        if (settlementFilter === 'settled' && !isSettled(r.status)) return false;
        if (settlementFilter === 'open' && isSettled(r.status)) return false;
        if (searchQuery) {
          return r.id.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      }),
    [ledger, activeTab, settlementFilter, searchQuery],
  );

  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage) || 1;
  const pagedLedger = filteredLedger.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  /**
   * Settlement-ledger columns for DataTable. Two cells deliberately do NOT
   * go through StatusBadge: the TYPE chip is not a status (the AdminAuditLogs
   * precedent), and the settlement state is dot-and-text rather than a pill,
   * which StatusBadge cannot render without inventing a pill around it.
   */
  const ledgerColumns: DataTableColumn<(typeof ledger)[number]>[] = [
    {
      key: 'settled',
      header: 'SETTLED',
      headerClassName: 'text-xs',
      className: 'py-3.5 text-slate-600 font-medium',
      cell: (r) =>
        new Date(r.settledAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
    },
    {
      key: 'package',
      header: 'PACKAGE',
      headerClassName: 'text-xs',
      className: 'py-3.5 font-mono text-slate-900 font-bold text-xs',
      cell: (r) => (
        <Link to={`/vendor/orders/${r.id}`} className="hover:underline">
          #{r.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: 'type',
      header: 'TYPE',
      headerClassName: 'text-xs',
      className: 'py-3.5',
      cell: (r) => (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 capitalize">
          {r.type}
        </span>
      ),
    },
    {
      key: 'goods',
      header: 'GOODS',
      headerClassName: 'text-xs',
      className: 'py-3.5 font-semibold text-slate-900',
      cell: (r) => money(r.subtotal),
    },
    {
      key: 'freight',
      header: 'FREIGHT',
      headerClassName: 'text-xs',
      className: 'py-3.5 text-slate-500',
      cell: (r) => money(r.shipping),
    },
    {
      key: 'gross',
      header: 'GROSS',
      headerClassName: 'text-xs',
      className: 'py-3.5 font-semibold text-slate-900',
      cell: (r) => money(r.gross),
    },
    {
      key: 'commission',
      header: 'COMMISSION',
      headerClassName: 'text-xs',
      className: 'py-3.5 font-semibold text-rose-600',
      cell: (r) => (r.fees === 0 ? money(0) : `-${money(r.fees)}`),
    },
    {
      key: 'net',
      header: 'NET',
      headerClassName: 'text-xs',
      className: 'py-3.5 font-bold',
      cell: (r) => (
        <span className={r.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
          {r.net >= 0 ? `+${money(r.net)}` : `-${money(Math.abs(r.net))}`}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      align: 'right',
      headerClassName: 'text-xs',
      className: 'py-3.5',
      cell: (r) =>
        isSettled(r.status) ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Settled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            {r.status.replace(/_/g, ' ')}
          </span>
        ),
    },
  ];

  const statementRows = () =>
    statementMonth === 'window'
      ? filteredLedger
      : ledger.filter((r) => r.settledAt.slice(0, 7) === statementMonth);

  const exportStatement = () => {
    const rows = statementRows().map((r) => ({
      packageId: r.id,
      status: r.status,
      type: r.type,
      goodsSubtotal: r.subtotal.toFixed(2),
      freight: r.shipping.toFixed(2),
      gross: r.gross.toFixed(2),
      commission: r.fees.toFixed(2),
      netToStore: r.net.toFixed(2),
      settledAt: r.settledAt,
    }));
    exportToCsv(`vendor-statement-${statementMonth}-${new Date().toISOString().slice(0, 10)}.csv`, rows, {
      packageId: 'Package ID',
      status: 'Package Status',
      type: 'Fulfilment Type',
      goodsSubtotal: 'Goods Subtotal ($)',
      freight: 'Freight ($)',
      gross: 'Gross Booked ($)',
      commission: 'Commission ($)',
      netToStore: 'Net To Store ($)',
      settledAt: 'Settled At',
    });
    setIsStatementModalOpen(false);
    showToast(
      rows.length === 0
        ? 'That period booked nothing - the statement is an empty ledger.'
        : `Exported ${rows.length} ledger line${rows.length === 1 ? '' : 's'}.`,
    );
  };

  const isLoading = earnings.isPending;
  const loadError = earnings.error ?? balance.error;

  /** Shares of the goods subtotal, which is what the commission is taken on. */
  const netMarginPct = totals && totals.subtotal > 0 ? (totals.net / totals.subtotal) * 100 : null;
  const feePct = totals && totals.subtotal > 0 ? (totals.fees / totals.subtotal) * 100 : null;
  const avgMonthGross = series.length > 0 ? series.reduce((s, m) => s + m.gross, 0) / series.length : 0;
  const avgNetPerPackage = totals && totals.packages > 0 ? totals.net / totals.packages : 0;

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500">
              FINANCIAL MANAGEMENT <span className="text-slate-300">/</span> EARNINGS
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Earnings &amp; Settlement Ledger
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Every figure here is summed by Postgres from your packages, using the same columns a
              payout is settled against. Cancelled packages are excluded.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value as '30d' | '90d' | '1y' | 'ytd');
                setCurrentPage(1);
              }}
              className="native-select rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
            >
              <option value="30d">Last 1 month</option>
              <option value="90d">Last 3 months</option>
              <option value="1y">Last 12 months</option>
              <option value="ytd">Year to date</option>
            </select>

            <button
              onClick={() => setIsStatementModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Statement CSV
            </button>
          </div>
        </div>

        {loadError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />
            <span>{loadError instanceof Error ? loadError.message : String(loadError)}</span>
            <button
              type="button"
              onClick={() => {
                void earnings.refetch();
                void balance.refetch();
              }}
              className="ml-auto rounded-lg border border-rose-200 px-2.5 py-1 hover:bg-rose-100 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="text-xs font-bold text-slate-500">
              GROSS BOOKED
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {totals ? money(totals.gross) : '—'}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              {totals ? `${totals.packages} package${totals.packages === 1 ? '' : 's'} · freight included` : 'Reading your ledger…'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                NET TO YOUR STORE
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                goods − commission
              </span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {totals ? money(totals.net) : '—'}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              {netMarginPct === null
                ? 'No settled goods yet'
                : `${netMarginPct.toFixed(1)}% of your goods subtotal`}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="text-xs font-bold text-slate-500">
              MARKETPLACE COMMISSION
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {totals ? `-${money(totals.fees)}` : '—'}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              {feePct === null
                ? 'Taken per package at its category rate'
                : `${feePct.toFixed(1)}% of goods · never on freight`}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="text-xs font-bold text-slate-500">
              AVAILABLE TO WITHDRAW
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {wallet ? money(wallet.available) : '—'}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              {wallet
                ? `${money(wallet.reserve)} held in reserve · ${wallet.pendingPayouts} payout${wallet.pendingPayouts === 1 ? '' : 's'} pending`
                : 'Reading your balance…'}
            </div>
            <Link
              to="/vendor/payouts"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-slate-900 hover:underline"
            >
              Request a payout <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ── Monthly series & fee waterfall ────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Monthly Gross &amp; Net</h2>
              <p className="text-xs text-slate-500">
                One point per calendar month, bucketed by the date each package settled.
              </p>

              <div className="mt-6 h-56 w-full">
                {series.length === 0 || maxMonth === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <p className="text-xs font-semibold text-slate-600">
                      Nothing booked in this window
                    </p>
                    <p className="text-xs mt-0.5">
                      Widen the range, or the chart fills as packages settle.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartSeries} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                      <defs>
                        <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartTheme.inkStroke(dark)} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={chartTheme.inkStroke(dark)} stopOpacity={0.02} />
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
                          name === 'gross' ? 'Gross booked' : 'Net to store',
                        ]}
                      />
                      <Area type="monotone" dataKey="gross" stroke="none" fill="url(#grossGradient)" />
                      <Line type="monotone" dataKey="gross" stroke={chartTheme.inkStroke(dark)} strokeWidth={3} dot={false} />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke={dark ? '#a1a1aa' : '#64748b'}
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold mt-3">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <span className="h-2.5 w-2.5 rounded-xs bg-slate-900" /> Gross booked
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-2 w-2 rounded-full border border-slate-400 bg-slate-200" /> Net to store
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500">
                  Average Month (Gross)
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">{money(avgMonthGross)}</div>
                <div className="text-xs text-slate-500">across {series.length} months</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500">
                  Peak Month (Gross)
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {peakMonth ? money(peakMonth.gross) : '—'}
                </div>
                <div className="text-xs text-slate-500">
                  {peakMonth ? longMonth(peakMonth.month) : 'no month has booked yet'}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500">
                  Avg Net Per Package
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">{money(avgNetPerPackage)}</div>
                <div className="text-xs text-slate-500">
                  {totals ? `over ${totals.packages} package${totals.packages === 1 ? '' : 's'}` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Fee & cost breakdown, from the totals the RPC returned */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">How Gross Becomes Net</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                The commission is taken on goods only; freight the buyer paid is reported apart and
                never enters your payout.
              </p>

              <div className="mt-5 space-y-3.5 text-xs">
                <div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Goods subtotal</span>
                    <span>{totals ? money(totals.subtotal) : '—'}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Freight collected from buyers</span>
                    <span className="font-bold text-slate-500">
                      +{totals ? money(totals.shipping) : '—'}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-slate-300 rounded-full"
                      style={{
                        width: `${totals && totals.subtotal > 0 ? Math.min(100, (totals.shipping / totals.subtotal) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Marketplace commission</span>
                    <span className="font-bold text-rose-600">
                      -{totals ? money(totals.fees) : '—'}
                      {feePct === null ? '' : ` (${feePct.toFixed(1)}%)`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${feePct === null ? 0 : Math.min(100, feePct)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Settled into your balance</span>
                    <span className="font-bold text-emerald-700">
                      {totals ? money(totals.settled) : '—'}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${totals && totals.net > 0 ? Math.min(100, (totals.settled / totals.net) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Still awaiting settlement</span>
                    <span className="font-bold text-amber-700">
                      {totals ? money(totals.processing) : '—'}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${totals && totals.net > 0 ? Math.min(100, (totals.processing / totals.net) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    NET IN THIS WINDOW
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {totals ? money(totals.net) : '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-emerald-700">
                    Lifetime net across all windows
                  </div>
                  <span className="inline-block mt-0.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
                    {wallet ? money(wallet.lifetimeNet) : '—'}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-emerald-800/80">
                Settled {totals ? money(totals.settled) : '—'} of that is already in your balance;
                the rest waits on delivery.
              </p>
            </div>
          </div>
        </div>

        {/* ── Ledger ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Settlement Ledger</h2>
              <p className="text-xs text-slate-500">
                One line per package you have not cancelled, with the commission the database took
                on it.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="w-full sm:w-72">
                <Input
                  type="text"
                  placeholder="Filter by package id..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  leftIcon={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
                  className="h-9 rounded-lg text-xs text-slate-700 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                  {(['All', 'Physical', 'Digital'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                      className={`rounded-md px-3 py-1 transition-all ${
                        activeTab === tab
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <Select
                  value={settlementFilter}
                  onValueChange={(value) => setSettlementFilter(value as 'all' | 'settled' | 'open')}
                >
                  <SelectTrigger aria-label="Filter by settlement state" className="h-9 w-auto text-xs font-semibold text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Any settlement state</SelectItem>
                    <SelectItem value="settled" className="text-xs">Settled</SelectItem>
                    <SelectItem value="open" className="text-xs">Awaiting settlement</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  onClick={() => {
                    exportToCsv(`vendor-ledger-${new Date().toISOString().slice(0, 10)}.csv`, filteredLedger.map((r) => ({
                      packageId: r.id,
                      status: r.status,
                      type: r.type,
                      goodsSubtotal: r.subtotal.toFixed(2),
                      freight: r.shipping.toFixed(2),
                      gross: r.gross.toFixed(2),
                      commission: r.fees.toFixed(2),
                      netToStore: r.net.toFixed(2),
                      settledAt: r.settledAt,
                    })), {
                      packageId: 'Package ID',
                      status: 'Package Status',
                      type: 'Type',
                      goodsSubtotal: 'Goods Subtotal ($)',
                      freight: 'Freight ($)',
                      gross: 'Gross Booked ($)',
                      commission: 'Commission ($)',
                      netToStore: 'Net To Store ($)',
                      settledAt: 'Settled At',
                    });
                    showToast(`Exported ${filteredLedger.length} visible ledger lines.`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                  title="Export filtered records"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          <DataTable
            columns={ledgerColumns}
            rows={isLoading ? [] : pagedLedger}
            getRowKey={(r) => r.id}
            emptyState={
              <div className="px-4 py-10 text-center text-slate-500">
                {isLoading ? (
                  <p className="font-semibold text-slate-700">Reading your settlement ledger…</p>
                ) : (
                  <>
                    <p className="font-semibold text-slate-700">
                      {ledger.length === 0
                        ? 'No packages have booked earnings yet'
                        : 'Nothing matches these filters'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {ledger.length === 0
                        ? 'Every non-cancelled package lands here with its commission.'
                        : 'Clear the search or filters to see the rest.'}
                    </p>
                  </>
                )}
              </div>
            }
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500 gap-3">
            <span>
              Showing {filteredLedger.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredLedger.length)} of {filteredLedger.length}{' '}
              ledger lines · {ledger.length} in this window
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* ── Statement Modal ───────────────────────────────────── */}
        <Dialog open={isStatementModalOpen} onOpenChange={setIsStatementModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-700" />
                Download Your Statement
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Exports the settlement ledger for a calendar month, exactly as the database
                computed it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Statement Period</label>
                <select
                  value={statementMonth}
                  onChange={(e) => setStatementMonth(e.target.value)}
                  className="native-select w-full rounded-lg border border-slate-200 p-2 text-xs"
                >
                  <option value="window">
                    Whole selected window ({months} month{months === 1 ? '' : 's'})
                  </option>
                  {monthsWithData.map((m) => (
                    <option key={m.month} value={m.month}>
                      {longMonth(m.month)} · {money(m.gross)} gross · {m.packages} package
                      {m.packages === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
                {monthsWithData.length === 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    No month in this window has booked anything yet.
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-500">
                There is no PDF generator behind this screen: the CSV is the auditable statement, and
                your browser can print it to PDF from there.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsStatementModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={exportStatement}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Export {statementMonth === 'window' ? 'window' : longMonth(statementMonth)}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Toast ─────────────────────────────────────────────── */}
        {/* Shared toast (Batch 47) — replaces this page's private pill. */}
        <Toast toast={toast} onDismiss={hideToast} />
      </div>
    </WorkspaceLayout>
  );
};
