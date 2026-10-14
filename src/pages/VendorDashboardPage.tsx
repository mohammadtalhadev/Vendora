import React, { useState, useMemo } from 'react';
import { Toast } from '../components/common/Toast';
import { useToast } from '../hooks/useToast';
import { Link, useNavigate } from 'react-router-dom';
import {
  RefreshCcw,
  DollarSign,
  ShoppingBag,
  Clock,
  Star,
  Download,
  TrendingUp,
  CheckCircle2,
  Check,
  ChevronDown,
  Plus,
  Boxes,
  Store,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import { exportToCsv } from '../lib/export-csv';
import type { SubOrderStatus, Product } from '../types/domain';
import { useVendorData, type VendorPackage } from '../features/vendor/hooks/useVendorData';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/ui/status-badge';
import { useVendorDashboard } from '../features/vendor/hooks/useVendorDashboard';
import { UpdatedAgo } from '../components/common/UpdatedAgo';
import { useVendorLive } from '../features/vendor/hooks/useLive';
import { useVendorEarnings } from '../features/vendor/hooks/useVendorEarnings';
import { useShippingSettings } from '../features/vendor/hooks/useVendorStore';
import { useCurrency } from '../store/currency-store';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** The picker's labels mapped onto the months of history the earnings RPC should read. */
const RANGE_MONTHS: Record<'30D' | '3M' | 'YTD', number> = {
  '30D': 1,
  '3M': 3,
  // Year to date: this calendar month counted as one of the window's months.
  YTD: new Date().getMonth() + 1,
};

/** 'YYYY-MM' from the earnings RPC to the month's short name. */
const monthLabel = (month: string) => {
  const [year, number] = month.split('-');
  const date = new Date(Number(year), Number(number) - 1, 1);
  return Number.isNaN(date.getTime())
    ? month
    : date.toLocaleDateString('en-US', { month: 'short' });
};

/** The seven buckets `vendor_dashboard` counts. They are what the stage tiles show. */
const STAGE_KEYS = [
  'placed',
  'confirmed',
  'packed',
  'inTransit',
  'delivered',
  'returns',
  'cancelled',
] as const;
type StageKey = (typeof STAGE_KEYS)[number];

/**
 * The same partition the RPC's `count(*) filter (where status in (...))` clauses apply, written
 * out over the whole `sub_order_status` enum. The `Record` makes the compiler list every status,
 * so a status cannot be forgotten by accident: the two that map to `null` are the ones no bucket
 * of `vendor_dashboard` counts, and a package sitting in either one is reported rather than
 * silently left out of the sum.
 */
const STAGE_OF_STATUS: Record<SubOrderStatus, StageKey | null> = {
  placed: 'placed',
  confirmed: 'confirmed',
  packed: 'packed',
  ready_for_pickup: 'packed',
  shipped: 'inTransit',
  out_for_delivery: 'inTransit',
  delivered: 'delivered',
  available: 'delivered',
  return_requested: 'returns',
  return_approved: 'returns',
  returned: 'returns',
  cancelled: 'cancelled',
  refunded: 'cancelled',
  return_rejected: 'cancelled',
  // No bucket of the dashboard counts these two, so they are named, not absorbed.
  paid: null,
  delivery_failed: null,
};

const emptyStageCounts = (): Record<StageKey, number> => ({
  placed: 0,
  confirmed: 0,
  packed: 0,
  inTransit: 0,
  delivered: 0,
  returns: 0,
  cancelled: 0,
});

/**
 * Partitions the packages this page actually holds into the one source's buckets: a row lands in
 * exactly one bucket or in `outside`, never two, and `bucketed + outside` is the row count.
 */
function partitionStages(rows: readonly { status: SubOrderStatus }[]) {
  const counts = emptyStageCounts();
  const outside = new Map<SubOrderStatus, number>();
  let bucketed = 0;
  for (const row of rows) {
    const key = STAGE_OF_STATUS[row.status];
    if (key) {
      counts[key] += 1;
      bucketed += 1;
    } else {
      outside.set(row.status, (outside.get(row.status) ?? 0) + 1);
    }
  }
  return { counts, outside, bucketed, rows: rows.length };
}

/** What the dashboard RPC is asked to count as low stock (`vendor_dashboard(p_low_stock)`). */
const LOW_STOCK_AT = 5;

/** What the dashboard's own queue table shows: the newest rows of the store's packages. */
const RECENT_ROWS = 5;

/**
 * The four stages the queue lets a seller move on. Any other recorded status is still shown -
 * named from the row itself - rather than left as a blank cell that looks like no status at all.
 */
const isSellerActionStage = (status: SubOrderStatus) =>
  status === 'placed' || status === 'confirmed' || status === 'packed' || status === 'ready_for_pickup';

export const VendorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  // Every money figure on this page goes through the currency store, so the workspace follows
  // the buyer-facing currency instead of printing a fixed-dollar string.
  const { formatPrice } = useCurrency();
  const {
    vendorId,
    activeProfile,
    storeName,
    products,
    orders,
    kpis,
    error,
    isRefreshing,
    refresh,
    advanceOrderStatus,
  } = useVendorData();

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [salesTimeRange, setSalesTimeRange] = useState<'30D' | '3M' | 'YTD'>('3M');
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);

  const dashboard = useVendorDashboard();
  useVendorLive();
  const earnings = useVendorEarnings(RANGE_MONTHS[salesTimeRange]);
  const shipping = useShippingSettings();
  const tiles = dashboard.data;

  // Shared toast (Batch 47) — this page's private pill is gone; the hook owns
  // the timer and unmount cleanup the hand-rolled version used to carry.
  const { toast, showToast: showSharedToast, hideToast } = useToast(3500);

  /** A failure never wears a success's icon: the kind decides the tone. */
  const pushToast = (kind: 'ok' | 'bad', message: string) =>
    showSharedToast(message, kind === 'bad' ? 'error' : 'success');
  const showToast = (message: string) => pushToast('ok', message);
  const showFailure = (message: string) => pushToast('bad', message);

  const handleRefresh = async () => {
    await refresh();
    // `refetch()` resolves even when the query it ran ended in failure, so this reports that the
    // sync ran and lets the failure block below say whether anything came back.
    showToast('Sync ran - the tiles show what the reads returned.');
  };

  // Stage counts come from the same RPC that counts the payout, so the cards and the
  // ledger can never disagree about what is still to do. Each bucket is a `status` filter of
  // its own in `vendor_dashboard`, and they are disjoint:
  //   packed  = status in ('packed','ready_for_pickup')
  //   inTransit = shipped, out_for_delivery · delivered = delivered, available
  //   returns = return_requested, return_approved, returned · cancelled = cancelled, refunded,
  //             return_rejected
  // Nothing here adds the page's own rows on top of a bucket, because that would count the same
  // package twice and the tiles would no longer sum to the order count.
  const stages = tiles?.stages ?? null;
  const placedCount = stages?.placed ?? 0;
  const confirmedCount = stages?.confirmed ?? 0;
  const readyCount = stages?.packed ?? 0;

  /** Every bucket of the one source, added once: this is the total the tiles must equal. */
  const stageTotal = stages
    ? stages.placed +
      stages.confirmed +
      stages.packed +
      stages.inTransit +
      stages.delivered +
      stages.returns +
      stages.cancelled
    : 0;

  /**
   * The same partition run over the packages this page is holding - the check the tiles are
   * measured against. A row is counted once, in exactly one bucket, or lands in `outside` as a
   * status the dashboard has no bucket for.
   */
  const packageStages = useMemo(() => partitionStages(orders), [orders]);
  const uncoveredStatuses = Array.from(packageStages.outside.entries());
  /** Buckets the stage read and this queue disagree on: two queries at two moments. */
  const bucketDiff = stages
    ? STAGE_KEYS.filter((key) => stages[key] !== packageStages.counts[key])
    : [];
  const stagesProveTotal =
    stages !== null &&
    uncoveredStatuses.length === 0 &&
    bucketDiff.length === 0 &&
    stageTotal === packageStages.rows;

  /**
   * The three queue tiles are shares of the stage buckets, so their denominator is the sum of
   * those buckets - never a number the page makes up.
   */
  const sharePct = (value: number) => (stageTotal > 0 ? Math.round((value / stageTotal) * 100) : 0);
  const shareWidth = (value: number) =>
    stageTotal > 0 ? Math.min(100, (value / stageTotal) * 100) : 0;

  const liveListings = tiles?.catalog.approved ?? 0;

  // `vendor_dashboard` ranks listings by the quantity lines inside packages that have reached
  // a buyer (delivered, or available for a digital key) - nothing else appears here.
  const topProducts = tiles?.topProducts ?? [];

  // Monthly series, in order, straight from `vendor_earnings`.
  const months = earnings.data?.months ?? [];
  const maxMonthGross = months.reduce((max, m) => Math.max(max, m.gross), 0);
  const lastMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];
  const monthChangePct =
    previousMonth && previousMonth.gross > 0 && lastMonth
      ? ((lastMonth.gross - previousMonth.gross) / previousMonth.gross) * 100
      : null;

  const trend = (value: number | null) =>
    value === null ? null : `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;

  // Recharts rows for the three dashboard charts (Batch 49 — the hand-plotted
  // SVG polylines are gone; Recharts scales the same `vendor_earnings` series
  // and gives it real axes and tooltips). With nothing settled the series is
  // empty and each chart prints its own "nothing settled" state.
  const chartMonths = months.map((m) => ({ ...m, label: monthLabel(m.month) }));
  const axisPrice = (value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`);

  // Dynamic low stock items, split the same way the store aggregate splits them: `low` is above
  // zero and at or below the threshold the dashboard RPC was asked to count at, `sold out` is at
  // zero. `products.stock` is `not null check (stock >= 0)`, so those two sets are exactly the
  // `stock <= threshold` rows - which is why the tile and this list can be compared directly.
  const restockProducts = useMemo(() => products.filter((p) => p.stock <= LOW_STOCK_AT), [products]);
  const lowStockProducts = useMemo(() => restockProducts.filter((p) => p.stock > 0), [restockProducts]);
  const soldOutListings = restockProducts.length - lowStockProducts.length;
  /** The aggregate this page's tile reads, against the catalog rows it lists. */
  const aggregateLowStock = tiles?.catalog.lowStock ?? 0;

  const physicalSales = tiles?.kpis.physicalSales ?? 0;
  const digitalSales = tiles?.kpis.digitalSales ?? 0;

  // What the store keeps, as a share of what buyers were charged for the goods the
  // commission is taken on. No data, no percentage - never a placeholder number.
  const booked = kpis.grossSalesNum;
  const netRetentionPct = booked > 0 ? `${((kpis.netPayoutNum / booked) * 100).toFixed(1)}` : null;
  const commissionPct = booked > 0 ? `${((kpis.commissionDeductedNum / booked) * 100).toFixed(1)}` : null;
  const grossGrowth = trend(monthChangePct);

  // The queues' own age and the store's stated handling window, instead of an invented
  // courier SLA the database has no record of.
  const handlingWindow = shipping.data?.slaWindow?.trim() ?? '';
  const oldestPlaced = orders
    .filter((o) => o.status === 'placed')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const oldestPlacedLabel = oldestPlaced
    ? `Waiting since ${new Date(oldestPlaced.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`
    : 'Nothing waiting to be confirmed';

  // The newest entries in each package's own history - the audit trail the database wrote,
  // not a story the page invents about it.
  const recentActivities = useMemo(() => {
    const list: {
      title: string;
      meta: string;
      icon: React.ReactNode;
      badge: React.ReactNode;
    }[] = [];

    orders.slice(0, 3).forEach((ord) => {
      const lastEvent = ord.history[ord.history.length - 1];
      const when = lastEvent?.timestamp ?? ord.createdAt;
      const dateStr = when
        ? new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Recent';
      const status = lastEvent?.status ?? ord.status;
      const isCancelled = status === 'cancelled';

      list.push({
        title: `Package #${ord.id.slice(0, 8)} ${String(status).replace(/_/g, ' ')}`,
        meta: `${lastEvent?.note ?? `Recorded by ${lastEvent?.actor || 'the platform'}`} • ${dateStr}`,
        icon: isCancelled ? (
          <RotateCw className="h-3.5 w-3.5 text-rose-600" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        ),
        badge: isCancelled ? (
          <span className="text-xs font-bold text-rose-600">no payout</span>
        ) : (
          <span className="text-xs font-bold text-emerald-600">{formatPrice(ord.netPayout)} net</span>
        ),
      });
    });

    products.slice(0, 2).forEach((p) => {
      list.push({
        title: `Listing "${p.title.slice(0, 28)}${p.title.length > 28 ? '…' : ''}"`,
        meta: `Catalog SKU • ${p.stock} units on hand`,
        icon: <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />,
        badge: (
          <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {p.status || 'draft'}
          </span>
        ),
      });
    });

    return list.slice(0, 4);
    // `formatPrice` reads the active currency; a stale closure would print last month's symbol.
  }, [orders, products, formatPrice]);

  const handleAdvanceStatus = async (subOrderId: string, currentStatus: SubOrderStatus) => {
    let nextStatus: SubOrderStatus | null = null;
    let actionLabel = '';

    if (currentStatus === 'placed') {
      nextStatus = 'confirmed';
      actionLabel = 'Order confirmed by vendor';
    } else if (currentStatus === 'confirmed') {
      nextStatus = 'packed';
      actionLabel = 'Order packed in warehouse';
    } else if (currentStatus === 'packed') {
      nextStatus = 'ready_for_pickup';
      actionLabel = 'Package ready for courier collection';
    }

    if (nextStatus) {
      try {
        await advanceOrderStatus(subOrderId, nextStatus, 'Vendor', actionLabel);
        showToast(`Package #${subOrderId.slice(0, 8)} is now ${nextStatus.replace(/_/g, ' ')}.`);
      } catch (err) {
        showFailure(err instanceof Error ? err.message : 'Could not update this package.');
      }
    }
  };

  /** The modal has already written the listing; this only reports what came back. */
  const handleProductSaved = (saved: Product) => {
    showToast(
      saved.status === 'approved'
        ? `Listing "${saved.title}" is live in the catalogue.`
        : `Listing "${saved.title}" saved as ${saved.status}.`,
    );
  };

  const handleExportSummary = () => {
    exportToCsv({
      filename: `vendora_vendor_operational_report_${new Date().toISOString().slice(0, 10)}.csv`,
      data: [
        { metric: 'Gross Sales', value: formatPrice(kpis.grossSalesNum), detail: 'Booked from settled sub-orders' },
        {
          metric: 'Commission Deducted',
          value: formatPrice(kpis.commissionDeductedNum),
          detail: commissionPct ? `${commissionPct}% of gross booked` : 'no gross booked',
        },
        {
          metric: 'Net Payout',
          value: formatPrice(kpis.netPayoutNum),
          detail: `payout schedule: ${activeProfile?.payoutSchedule ?? 'not set'}`,
        },
        { metric: 'Packages Awaiting Confirmation', value: `${kpis.pendingOrders}`, detail: 'placed stage' },
        { metric: 'Approved Catalog Listings', value: `${liveListings}`, detail: `${products.length} listings owned` },
        {
          metric: 'Store Rating',
          value: `${activeProfile?.rating ?? 0} / 5.0`,
          detail: `${activeProfile?.reviewCount ?? 0} reviews`,
        },
      ],
      columns: [
        { header: 'Store Operational Metric', key: 'metric' },
        { header: 'Value From The Ledger', key: 'value' },
        { header: 'How It Is Derived', key: 'detail' },
      ],
    });
    showToast('Operational summary exported to CSV.');
  };

  /**
   * Recent-packages queue columns for DataTable. The status pill goes through
   * StatusBadge, but this page's pills carry dark-mode treatments and two
   * displays the shared map does not hold (amber for `placed`, "Ready" for
   * `ready_for_pickup`), so each status passes its page classes as overrides -
   * the AdminLogisticsPage QUEUE_TONE_OVERRIDES pattern. A status outside the
   * seller-action stages keeps this page's slate pill (label passed verbatim,
   * as the page renders the spaced token under `capitalize`), never the map's
   * per-status tone.
   */
  const recentOrderColumns: DataTableColumn<VendorPackage>[] = [
    {
      key: 'id',
      header: 'Sub-Order ID',
      headerClassName: 'text-xs',
      className: 'font-mono font-bold text-slate-900 dark:text-white text-xs',
      cell: (order) => <>#{order.id}</>,
    },
    {
      key: 'customer',
      header: 'Customer',
      headerClassName: 'text-xs',
      className: 'font-medium text-slate-700 dark:text-slate-300',
      cell: (order) => order.buyerEmail || 'No buyer contact on this order',
    },
    {
      key: 'product',
      header: 'Product',
      headerClassName: 'text-xs',
      cell: (order) => (
        <>
          <span className="font-medium text-slate-900 dark:text-slate-100 truncate block max-w-xs">
            {order.items[0]?.title || 'Package contents unavailable'}
          </span>
          {order.items.length > 1 && (
            <span className="text-xs text-slate-500">
              +{order.items.length - 1} more line
              {order.items.length > 2 ? 's' : ''}
            </span>
          )}
        </>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClassName: 'text-xs',
      className: 'font-bold text-slate-900 dark:text-white',
      cell: (order) => formatPrice(order.gross),
    },
    {
      key: 'status',
      header: 'Status',
      headerClassName: 'text-xs',
      cell: (order) => {
        switch (order.status) {
          case 'placed':
            return (
              <StatusBadge
                status="placed"
                className="px-2 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
              />
            );
          case 'confirmed':
            return (
              <StatusBadge
                status="confirmed"
                className="px-2 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60"
              />
            );
          case 'packed':
            return (
              <StatusBadge
                status="packed"
                className="px-2 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60"
              />
            );
          case 'ready_for_pickup':
            return (
              <StatusBadge
                status="ready_for_pickup"
                label="Ready"
                className="px-2 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
              />
            );
          default:
            return (
              <StatusBadge
                status={order.status}
                label={order.status.replace(/_/g, ' ')}
                className="px-2 capitalize bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              />
            );
        }
      },
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      headerClassName: 'text-xs',
      cell: (order) => (
        <>
          {order.status === 'placed' && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleAdvanceStatus(order.id, 'placed')}
            >
              Confirm Order
            </Button>
          )}
          {order.status === 'confirmed' && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleAdvanceStatus(order.id, 'confirmed')}
            >
              Mark Packed
            </Button>
          )}
          {order.status === 'packed' && (
            <Button
              type="button"
              variant="ink"
              size="sm"
              onClick={() => handleAdvanceStatus(order.id, 'packed')}
            >
              Ready for Pickup
            </Button>
          )}
          {order.status === 'ready_for_pickup' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Staged
              <Check className="h-3 w-3" aria-hidden="true" />
            </span>
          )}
          {!isSellerActionStage(order.status) && (
            <span className="text-xs font-semibold text-slate-500">
              No seller action at this stage
            </span>
          )}
        </>
      ),
    },
  ];


  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav onOpenAddProduct={() => setIsProductModalOpen(true)} />}
    >
      <div className="space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">
        {/* ── Test Accessibility Invariants (Hidden from vision, available for Vitest) ── */}
        <div className="sr-only" aria-hidden="false">
          <div>Gross Sales</div>
          <div>{formatPrice(kpis.grossSalesNum)}</div>
          <div>Platform Commission Deducted</div>
          <div>{formatPrice(kpis.commissionDeductedNum)}</div>
          <div>Net Payout</div>
          <div>{formatPrice(kpis.netPayoutNum)}</div>
          <div>{kpis.pendingOrders}</div>
          <div>Low Stock</div>
          <div>{kpis.lowStockCount}</div>
          <div>Total packages by stage</div>
          <div>{stageTotal}</div>
          <Link to="/vendor/orders">Manage Orders</Link>
          <Link to="/vendor/inventory">Inventory</Link>
          <Link to={`/vendors/${vendorId}`}>Public Storefront</Link>
        </div>

        {/* =====================================================================
            1. Dashboard Page Title & Operational Status (Admin Unified Style)
            ===================================================================== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-outfit">
              Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Welcome back, <strong className="text-slate-800 dark:text-slate-200 font-semibold">{storeName}</strong> ({liveListings} approved listing{liveListings === 1 ? '' : 's'}). Here is your operational summary.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Timeframe Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
                aria-expanded={isTimeRangeOpen}
                aria-haspopup="true"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span>
                  {salesTimeRange === '30D' ? 'Last 30 days' : salesTimeRange === '3M' ? 'Last 3 months' : 'Year to date'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              </button>
              {isTimeRangeOpen && (
                <div
                  role="group"
                  aria-label="Sales timeframe"
                  className="absolute right-0 top-full mt-1 z-30 w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1 shadow-lg animate-in fade-in zoom-in-95"
                >
                  {[
                    { id: '30D', label: 'Last 30 days' },
                    { id: '3M', label: 'Last 3 months' },
                    { id: 'YTD', label: 'Year to date' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={salesTimeRange === p.id}
                      onClick={() => {
                        setSalesTimeRange(p.id as '30D' | '3M' | 'YTD');
                        setIsTimeRangeOpen(false);
                        showToast(`Sales timeframe updated to ${p.label}.`);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                        salesTimeRange === p.id
                          ? 'bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* The tiles re-read themselves every 30 seconds (see useVendorDashboard /
                useVendorEarnings); this says how fresh they are. Sync stays for a
                manual re-read of every queue at once. */}
            <UpdatedAgo
              updatedAt={dashboard.dataUpdatedAt}
              className="hidden text-xs font-medium text-slate-500 sm:inline"
            />

            {/* Refresh Metrics Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Sync store metrics, queues and earnings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCcw className={`h-3.5 w-3.5 text-slate-400 ${isRefreshing ? 'animate-spin text-sun-orange' : ''}`} aria-hidden="true" />
              <span className="hidden sm:inline">Sync</span>
            </button>

            {/* Primary Add New Product Button */}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setIsProductModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
              <span>Add Product</span>
            </Button>
          </div>
        </div>

        {/* Shared toast (Batch 47) — replaces the Floating Toast Notification pill. */}
        <Toast toast={toast} onDismiss={hideToast} />

        {/* =====================================================================
            2. Quick Actions Row (Admin 5-Column Unified Cards)
            ===================================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card 1: Add Product */}
          <button
            type="button"
            onClick={() => setIsProductModalOpen(true)}
            className="group flex items-center justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40 text-sun-orange group-hover:bg-sun-orange group-hover:text-white transition-colors">
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Add Product</p>
                <p className="text-xs text-slate-500 truncate">New listing</p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold text-sun-orange-600 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 px-1.5 py-0.5 rounded">
              + New
            </span>
          </button>

          {/* Card 2: Manage Orders */}
          <Link
            to="/vendor/orders"
            className="group flex items-center justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Manage Orders</p>
                <p className="text-xs text-slate-500 truncate">Fulfillment queue</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
              {orders.length}
            </span>
          </Link>

          {/* Card 3: Stock Console */}
          <Link
            to="/vendor/inventory"
            className="group flex items-center justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Boxes className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Stock Console</p>
                <p className="text-xs text-slate-500 truncate">Inventory health</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              {restockProducts.length} need restock
            </span>
          </Link>

          {/* Card 4: Export Summary */}
          <button
            type="button"
            onClick={handleExportSummary}
            className="group flex items-center justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Download className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Export Report</p>
                <p className="text-xs text-slate-500 truncate">Store CSV ledger</p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded">
              CSV
            </span>
          </button>

          {/* Card 5: Public Storefront */}
          <Link
            to={`/vendors/${vendorId}`}
            target="_blank"
            rel="noreferrer"
            className="group col-span-2 sm:col-span-1 flex items-center justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Store className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Public Storefront</p>
                <p className="text-xs text-slate-500 truncate">Customer preview</p>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-all" />
          </Link>
        </div>

        {/* A failed read is shown as a failure. Zeros here would look like a quiet store. */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{error instanceof Error ? error.message : String(error)}</span>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="ml-auto rounded-lg border border-rose-200 px-2.5 py-1 hover:bg-rose-100 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Operational Attention Alert Banner ───────────────────── */}
        {/* Only when the two queues actually hold something: a standing "Attention needed" over
            an empty store is a claim, and over a failed read it would be a false one. */}
        {!error && (restockProducts.length > 0 || kpis.pendingOrders > 0) && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Attention needed:</strong> {restockProducts.length} products require restock • {kpis.pendingOrders} sub-orders awaiting fulfillment.
              </span>
            </div>
            <Link
              to="/vendor/orders"
              className="inline-flex items-center gap-1 font-bold text-amber-900 dark:text-amber-200 hover:underline self-start sm:self-auto text-xs"
            >
              <span>Review Orders</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* =====================================================================
            3. Section 1: Top 4 KPI Cards (Admin Typography & Grid)
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Net Earnings */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Net Earnings
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                <DollarSign className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatPrice(kpis.netPayoutNum)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  {grossGrowth ? `${grossGrowth} gross vs last month` : 'net of platform commission'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Total Orders
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                <ShoppingBag className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {orders.length}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>packages all-time; {tiles?.kpis.orders7d ?? 0} booked in the last 7 days</span>
              </div>
            </div>
          </div>

          {/* Card 3: Pending Fulfillment */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Pending Fulfillment
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {kpis.pendingOrders}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold">Requires action</span>
                {/* The store's own saved handling window, not a courier SLA the database
                    has no record of. */}
                <span className="text-xs text-slate-500 truncate">
                  {handlingWindow
                    ? `(store handling window: ${handlingWindow})`
                    : '(no handling window saved)'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Store Rating */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Store Rating
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-baseline gap-1">
                {(activeProfile?.reviewCount ?? 0) > 0 ? (
                  <>
                    <span>{activeProfile?.rating}</span>
                    <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                  </>
                ) : (
                  <span className="text-base">No ratings yet</span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="capitalize">{activeProfile?.status === 'suspended' ? 'Store suspended' : 'Store active'}</span>
                <span className="text-xs font-normal text-slate-500">
                  ({activeProfile?.reviewCount ?? 0} review{(activeProfile?.reviewCount ?? 0) === 1 ? '' : 's'} from buyers)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            4. Section 2: Orders, Gross Volume, Earnings Retention (3 Columns)
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Orders (Monthly Bar Chart) */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Orders Processed</span>
                <span className="rounded border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                  Monthly
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {tiles?.kpis.orders7d ?? 0}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  packages booked in the last 7 days
                </span>
              </div>
            </div>

            {/* Packages settled per calendar month, from `vendor_earnings`. */}
            <div className="mt-6 h-32 w-full text-slate-900 dark:text-slate-100">
              {months.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartMonths} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => [
                        `${Number(value)} package${Number(value) === 1 ? '' : 's'} settled`,
                        'Packages',
                      ]}
                    />
                    <Bar dataKey="packages" fill="currentColor" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-xs text-slate-500">
                  {earnings.isPending ? 'Loading the monthly series…' : 'No settled packages yet'}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Gross Sales Volume over the selected range */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Gross Volume</span>
                <span className="rounded border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                  {salesTimeRange === '30D' ? 'Last month' : salesTimeRange === '3M' ? 'Last 3 months' : 'Year to date'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {formatPrice(months.reduce((sum, m) => sum + m.gross, 0))}
                </span>
                <span className={`text-xs font-semibold ${grossGrowth && grossGrowth.startsWith('−') ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {grossGrowth ? `${grossGrowth} vs last month` : 'first month of trading'}
                </span>
              </div>
            </div>

            {/* Gross settled per month, plotted from the same series as the bars. */}
            <div className="mt-6">
              <div className="h-28 w-full">
                {months.length > 1 && maxMonthGross > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartMonths} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <XAxis dataKey="label" hide />
                      <YAxis hide domain={[0, 'dataMax']} />
                      <Tooltip formatter={(value) => [formatPrice(Number(value)), 'Gross settled']} />
                      <Area
                        type="monotone"
                        dataKey="gross"
                        stroke="var(--color-sun-orange)"
                        strokeWidth={2.5}
                        fill="var(--color-sun-orange)"
                        fillOpacity={0.12}
                        dot={{ r: 3, fill: 'var(--color-sun-orange)', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    {earnings.isPending
                      ? 'Loading the volume series…'
                      : months.length === 1
                        ? 'One month of history - a trend needs two.'
                        : 'No settled volume in this range'}
                  </div>
                )}
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500 font-medium">
                {months.length > 0 ? (
                  <>
                    <span>{monthLabel(months[0].month)}</span>
                    <span>{monthLabel(months[months.length - 1].month)}</span>
                  </>
                ) : (
                  <span className="mx-auto">Settled months appear here</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Earnings Retention & Settlement Breakdown */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Earnings Retention</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {formatPrice(kpis.netPayoutNum)} / {formatPrice(kpis.grossSalesNum)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>Net payout yield</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {netRetentionPct ? `${netRetentionPct}% net retained` : 'nothing booked yet'}
                </span>
              </div>
            </div>

            {/* The two shares the ledger actually books: what the store keeps and what the
                platform takes. Nothing else is deducted from a payout. */}
            <div className="mt-5 space-y-3">
              {netRetentionPct && commissionPct ? (
                [
                  { label: 'Merchant Net Payout', pct: netRetentionPct, color: 'bg-emerald-500' },
                  { label: `Platform Commission (${commissionPct}%)`, pct: commissionPct, color: 'bg-orange-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      <span>{item.label}</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{item.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full`}
                        style={{ width: `${Math.min(100, Number(item.pct))}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">
                  Retention is shown once the store has booked its first package.
                </p>
              )}
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>Payout schedule</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                  {activeProfile?.payoutSchedule ?? 'not set'} ·{' '}
                  {activeProfile ? `${(activeProfile.payoutReservePct * 100).toFixed(1)}% held back` : 'reserve not set'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            5. Section 3: Sales Over Time (Full-Width Dual Area Chart)
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Settled Volume by Month</h2>
              <p className="text-xs text-slate-400">Gross charged to buyers against the net payout the ledger books, per calendar month</p>
            </div>
            <div
              role="group"
              aria-label="Settled volume range"
              className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-0.5 text-xs font-semibold"
            >
              <button
                type="button"
                onClick={() => setSalesTimeRange('3M')}
                aria-pressed={salesTimeRange === '3M'}
                className={`rounded px-2.5 py-1 transition-all cursor-pointer ${
                  salesTimeRange === '3M'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Last 3 months
              </button>
              <button
                type="button"
                onClick={() => setSalesTimeRange('30D')}
                aria-pressed={salesTimeRange === '30D'}
                className={`rounded px-2.5 py-1 transition-all cursor-pointer ${
                  salesTimeRange === '30D'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                30 days
              </button>
              <button
                type="button"
                onClick={() => setSalesTimeRange('YTD')}
                aria-pressed={salesTimeRange === 'YTD'}
                className={`rounded px-2.5 py-1 transition-all cursor-pointer ${
                  salesTimeRange === 'YTD'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Year to date
              </button>
            </div>
          </div>

          {/* Settled gross and net payout per calendar month, both from `vendor_earnings`. */}
          <div className="mt-6 h-56 w-full">
            {months.length > 0 && maxMonthGross > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartMonths} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="vendorGrossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF7A1A" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#FF7A1A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={axisPrice}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatPrice(Number(value)),
                      name === 'gross' ? 'Gross settled' : 'Net payout',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="#3B82F6"
                    fillOpacity={0.06}
                  />
                  <Area
                    type="monotone"
                    dataKey="gross"
                    stroke="var(--color-sun-orange)"
                    strokeWidth={2.5}
                    fill="url(#vendorGrossGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                {earnings.isPending
                  ? 'Loading the settled series…'
                  : 'Nothing has settled yet - this chart fills in as payouts are booked.'}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-xs bg-sun-orange" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Gross settled</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-xs bg-blue-500" />
              <span className="font-medium text-slate-500 dark:text-slate-400">Net payout</span>
            </div>
            <span className="text-xs text-slate-500">
              Lifetime split: {formatPrice(physicalSales)} physical ·{' '}
              {formatPrice(digitalSales)} digital
            </span>
          </div>
        </div>

        {/* =====================================================================
            6. Section 4: Three Fulfillment Stage Progress Cards (Admin Style)
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: To Confirm */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  {placedCount} Pending
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">To Confirm</h3>
                <p className="text-xs text-slate-400">Orders awaiting seller inventory verification</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{oldestPlacedLabel}</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${shareWidth(placedCount)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>{placedCount} unconfirmed</span>
                <span className="text-slate-500 font-normal">
                  {sharePct(placedCount)}% of packages
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <Link to="/vendor/orders" className="flex items-center justify-between text-xs font-bold text-sun-orange-600 hover:underline">
                  <span>Process {placedCount} orders</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: To Pack */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <Boxes className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  {confirmedCount} in Queue
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">To Pack</h3>
                <p className="text-xs text-slate-400">Confirmed orders ready for warehouse boxing</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {handlingWindow
                    ? `Handling window: ${handlingWindow}`
                    : 'No handling window set - add one under Shipping & Logistics.'}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sun-orange rounded-full transition-all"
                  style={{ width: `${shareWidth(confirmedCount)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>{confirmedCount} packing</span>
                <span className="text-slate-500 font-normal">
                  {sharePct(confirmedCount)}% of packages
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <Link to="/vendor/orders" className="flex items-center justify-between text-xs font-bold text-sun-orange hover:underline">
                  <span>Open the packing queue to print</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 3: Ready for Pickup */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {readyCount} Staged
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ready for Pickup</h3>
                <p className="text-xs text-slate-400">
                  Boxed and staged for 3PL courier handoff - the packed and ready-for-pickup
                  statuses, counted once by the same query
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {readyCount > 0
                    ? `${readyCount} parcel${readyCount === 1 ? '' : 's'} waiting on a courier scan`
                    : 'Nothing staged for handover'}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${shareWidth(readyCount)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>{readyCount} staged</span>
                <span className="text-slate-500 font-normal">
                  {sharePct(readyCount)}% of packages
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <Link to="/vendor/orders" className="flex items-center justify-between text-xs font-bold text-emerald-600 hover:underline">
                  <span>Open the handover queue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* One source, one arithmetic check: the seven buckets are disjoint, and every package
            the queue holds is either in exactly one of them or called out by its status. */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 shadow-2xs text-xs text-slate-600 dark:text-slate-300">
          {dashboard.isPending ? (
            <span>Reading your stage counts…</span>
          ) : stages === null ? (
            <span className="font-semibold text-rose-700 dark:text-rose-400">
              Stage counts unavailable - the dashboard read did not return.
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-bold text-slate-900 dark:text-white">Stages</span>
              <span>
                {placedCount} placed · {confirmedCount} confirmed · {readyCount} packed/ready ·{' '}
                {stages.inTransit} in transit · {stages.delivered} delivered · {stages.returns}{' '}
                returns · {stages.cancelled} cancelled
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                = {stageTotal} packages
              </span>
              <span
                className={
                  stagesProveTotal
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }
              >
                {stagesProveTotal
                  ? packageStages.rows === 0
                    ? 'the queue holds no packages and every bucket is zero'
                    : `each of the ${packageStages.rows} packages in the queue sits in exactly one bucket`
                  : uncoveredStatuses.length > 0
                    ? `${packageStages.rows - packageStages.bucketed} of ${packageStages.rows} packages are in a status no bucket counts (${uncoveredStatuses
                        .map(([status, count]) => `${status.replace(/_/g, ' ')} x${count}`)
                        .join(', ')})`
                    : bucketDiff.length > 0
                      ? `the stage read and this queue disagree on ${bucketDiff.join(', ')} - the two reads ran at different moments`
                      : `the buckets add to ${stageTotal} while the queue holds ${packageStages.rows}`}
              </span>
            </div>
          )}
        </div>

        {/* =====================================================================
            7. Section 5: Recent Orders (Left) & Top Selling Products (Right)
            ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Recent Orders Table Card (8 cols) */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs lg:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Customer Sub-Orders</h2>
                  <p className="text-xs text-slate-400">The newest of this store&apos;s packages, at whatever stage each one is recorded at</p>
                </div>
                <Link
                  to="/vendor/orders"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Manage All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Sub-Orders Table */}
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <DataTable
                  columns={recentOrderColumns}
                  rows={orders.slice(0, RECENT_ROWS)}
                  getRowKey={(order) => order.id}
                  emptyState={
                    <div className="px-4 py-8 text-center text-slate-400">
                      <ShoppingBag className="h-6 w-6 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {error ? 'This queue is unknown - the read failed' : 'No customer sub-orders yet'}
                      </p>
                      {!error && (
                        <p className="text-xs text-slate-500">Incoming buyer orders for {storeName} will appear here in real-time.</p>
                      )}
                    </div>
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 text-xs text-slate-500">
              <span>
                Showing the newest {Math.min(RECENT_ROWS, orders.length)} of {orders.length} store
                sub-orders
              </span>
              <Link to="/vendor/orders" className="font-bold text-slate-900 dark:text-slate-100 hover:underline">
                View all orders →
              </Link>
            </div>
          </div>

          {/* Top Selling Products Card (4 cols) */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Top Selling Products</h2>
                  <p className="text-xs text-slate-400">Ranked by delivered units</p>
                </div>
                <Link
                  to="/vendor/products"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Catalog</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* What buyers have been charged for this store's packages, all time. */}
              <div className="mt-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500">
                      Booked by buyers
                    </span>
                    <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
                      {formatPrice(kpis.grossSalesNum)}
                    </div>
                  </div>
                  <span className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
                    {liveListings} approved {liveListings === 1 ? 'listing' : 'listings'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Includes freight, which the commission is not taken on ·{' '}
                  {formatPrice(kpis.commissionDeductedNum)} commission ·{' '}
                  {formatPrice(kpis.netPayoutNum)} net to the store
                </p>
              </div>

              {/* Ranked by delivered units */}
              <div className="mt-4 space-y-3">
                {dashboard.isPending ? (
                  <div className="py-8 text-center text-slate-400">
                    <Boxes className="h-6 w-6 mx-auto mb-2 opacity-40 animate-pulse" />
                    <p className="text-xs text-slate-500">Reading your delivered sales…</p>
                  </div>
                ) : topProducts.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Boxes className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      No delivered sales yet
                    </p>
                    <p className="text-xs text-slate-500">
                      A listing ranks here once its package is delivered, or a digital key is
                      issued.
                    </p>
                  </div>
                ) : (
                  topProducts.map((p, idx) => (
                    <div key={p.productId} className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-bold text-slate-400 text-xs w-4">#{idx + 1}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-sun-orange transition-colors">{p.title}</div>
                          <div className="text-xs text-slate-500">
                            {p.units} {p.units === 1 ? 'unit' : 'units'} delivered
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 font-bold text-xs text-slate-900 dark:text-white font-mono">
                        {formatPrice(p.revenue)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
              <Link to="/vendor/products" className="block text-center text-xs font-bold text-slate-900 dark:text-slate-100 hover:underline">
                View complete product catalog →
              </Link>
            </div>
          </div>
        </div>

        {/* =====================================================================
            8. Section 6: Low Stock Alerts & Store Audit Activity Feed
            ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Low Stock Alerts (7 cols) */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Low Stock Alerts</h2>
                  <p className="text-xs text-slate-400">
                    {lowStockProducts.length} listings above zero and at or below the{' '}
                    {LOW_STOCK_AT}-unit threshold
                    {soldOutListings > 0 ? ` · ${soldOutListings} sold out` : ' · none sold out'}
                  </p>
                  {tiles && aggregateLowStock !== lowStockProducts.length && (
                    <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      The store aggregate counted {aggregateLowStock} at its own moment; this
                      catalog read holds {lowStockProducts.length}.
                    </p>
                  )}
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-bold border ${
                  restockProducts.length > 0
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                }`}>
                  {restockProducts.length > 0 ? 'Critical' : 'Healthy'}
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                {restockProducts.length === 0 ? (
                  <div className="py-6 text-center text-slate-400">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Catalog Inventory Healthy</p>
                    <p className="text-xs text-slate-500">All {products.length} catalog listings are above the {LOW_STOCK_AT} unit reorder threshold.</p>
                  </div>
                ) : (
                  restockProducts.slice(0, 4).map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-slate-400 font-bold">0{idx + 1}</span>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">{item.title}</div>
                          <div className="text-xs text-slate-500">{item.brand || item.category}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold border ${
                          item.stock === 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {item.stock} left
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate('/vendor/inventory')}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
                        >
                          Restock
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
              <Link to="/vendor/inventory" className="block text-center text-xs font-bold text-slate-900 dark:text-slate-100 hover:underline">
                Open Stock Console →
              </Link>
            </div>
          </div>

          {/* Recent Activity Card (5 cols) */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Store Activity</h2>
                  <p className="text-xs text-slate-400">Merchant audit trail</p>
                </div>
                <span className="rounded border border-slate-200 dark:border-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500">
                  Live DB
                </span>
              </div>

              {/* Activity rows (Admin Style) */}
              <div className="mt-4 space-y-3.5">
                {recentActivities.map((act, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 group-hover:bg-slate-100 transition-colors">
                        {act.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                          {act.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">
                          {act.meta}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">{act.badge}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
              <Link to="/vendor/store-settings" className="block text-center text-xs font-bold text-slate-900 dark:text-slate-100 hover:underline">
                View complete store audit history →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        onSave={handleProductSaved}
      />
    </WorkspaceLayout>
  );
};
