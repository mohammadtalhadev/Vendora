import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Percent,
  Wallet,
  Clock,
  AlertTriangle,
  Plus,
  Package,
  ClipboardList,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import {
  DEFAULT_VENDOR_KPIS,
  getVendorSubOrders,
  advanceSubOrderStatus,
  getVendorProducts,
} from '../features/vendor/vendorData';
import type { SubOrder, SubOrderStatus, Product } from '../types/domain';
import { useAuthStore } from '../store/auth-store';

// ─── Chart data per range ────────────────────────────────────────────────────
const CHART_DATA: Record<
  '7D' | '30D' | '90D' | '1Y',
  { label: string; gross: number; net: number }[]
> = {
  '7D': [
    { label: 'Mon', gross: 1200, net: 1116 },
    { label: 'Tue', gross: 980, net: 911 },
    { label: 'Wed', gross: 1540, net: 1432 },
    { label: 'Thu', gross: 1380, net: 1283 },
    { label: 'Fri', gross: 2100, net: 1953 },
    { label: 'Sat', gross: 2600, net: 2418 },
    { label: 'Sun', gross: 1900, net: 1767 },
  ],
  '30D': [
    { label: 'W1', gross: 5800, net: 5394 },
    { label: 'W2', gross: 7200, net: 6696 },
    { label: 'W3', gross: 6400, net: 5952 },
    { label: 'W4', gross: 9100, net: 8463 },
    { label: 'W5', gross: 10200, net: 9486 },
  ],
  '90D': [
    { label: 'M1', gross: 22000, net: 20460 },
    { label: 'M2', gross: 28000, net: 26040 },
    { label: 'M3', gross: 35400, net: 32922 },
  ],
  '1Y': [
    { label: 'Q1', gross: 68000, net: 63240 },
    { label: 'Q2', gross: 82000, net: 76260 },
    { label: 'Q3', gross: 91000, net: 84630 },
    { label: 'Q4', gross: 104000, net: 96720 },
  ],
};

// ─── Sample Recent Orders ────────────────────────────────────────────────────
const SAMPLE_ORDERS = [
  { id: 'SO-8821', customer: 'Liam Torres', status: 'delivered', amount: 149.99 },
  { id: 'SO-8820', customer: 'Mia Patel', status: 'packed', amount: 89.5 },
  { id: 'SO-8819', customer: 'Noah Kim', status: 'confirmed', amount: 214.0 },
  { id: 'SO-8818', customer: 'Ava Johnson', status: 'placed', amount: 59.95 },
  { id: 'SO-8817', customer: 'Ethan Brown', status: 'cancelled', amount: 34.0 },
] as const;

type SampleStatus = (typeof SAMPLE_ORDERS)[number]['status'];

// ─── Top Products ────────────────────────────────────────────────────────────
const TOP_PRODUCTS = [
  { rank: 1, name: 'SoundWave Pro Headphones', sales: 342, revenue: 51300 },
  { rank: 2, name: 'BassBoost Wireless Earbuds', sales: 278, revenue: 27800 },
  { rank: 3, name: 'Studio Monitor Speakers', sales: 194, revenue: 38800 },
];

// ─── SVG Line Chart ──────────────────────────────────────────────────────────
const W = 600;
const H = 160;
const PAD = { top: 16, right: 16, bottom: 4, left: 8 };

function buildPath(
  points: { gross: number; net: number }[],
  key: 'gross' | 'net',
  maxVal: number,
): string {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = points.length;
  const xs = points.map((_, i) => PAD.left + (i / Math.max(n - 1, 1)) * innerW);
  const ys = points.map(
    (pt) => PAD.top + innerH - (pt[key] / maxVal) * innerH,
  );
  if (n === 0) return '';
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < n; i++) {
    const cpx = (xs[i - 1] + xs[i]) / 2;
    d += ` C ${cpx} ${ys[i - 1]}, ${cpx} ${ys[i]}, ${xs[i]} ${ys[i]}`;
  }
  return d;
}

function buildArea(
  points: { gross: number; net: number }[],
  key: 'gross' | 'net',
  maxVal: number,
): string {
  const linePath = buildPath(points, key, maxVal);
  if (!linePath) return '';
  const innerW = W - PAD.left - PAD.right;
  const lastX = PAD.left + innerW;
  const firstX = PAD.left;
  const bottomY = H - PAD.bottom;
  return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
}

interface LineChartProps {
  data: { label: string; gross: number; net: number }[];
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const maxVal = Math.max(...data.map((d) => d.gross)) * 1.1;
  const innerW = W - PAD.left - PAD.right;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 160 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Gross area fill */}
      <path d={buildArea(data, 'gross', maxVal)} fill="url(#grossGrad)" />
      {/* Net area fill */}
      <path d={buildArea(data, 'net', maxVal)} fill="url(#netGrad)" />

      {/* Gross line */}
      <path
        d={buildPath(data, 'gross', maxVal)}
        fill="none"
        stroke="#f97316"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Net line */}
      <path
        d={buildPath(data, 'net', maxVal)}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="5 3"
      />

      {/* Dots on gross line */}
      {data.map((pt, i) => {
        const x =
          PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
        const innerH = H - PAD.top - PAD.bottom;
        const y = PAD.top + innerH - (pt.gross / maxVal) * innerH;
        return (
          <circle key={i} cx={x} cy={y} r={3.5} fill="#f97316" stroke="#fff" strokeWidth={1.5}>
            <title>${(pt.gross / 1000).toFixed(1)}k</title>
          </circle>
        );
      })}
    </svg>
  );
};

// ─── Status pill helpers ──────────────────────────────────────────────────────
function sampleStatusPill(status: SampleStatus) {
  const map: Record<SampleStatus, { label: string; cls: string }> = {
    placed: { label: 'Placed', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    confirmed: { label: 'Confirmed', cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
    packed: { label: 'Packed', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
    delivered: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${cls}`}>
      {label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const VendorDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const vendorId = user?.vendorId || 'vendor-tech-1';

  const [orders, setOrders] = useState<SubOrder[]>(() => getVendorSubOrders(vendorId));
  const [products, setProducts] = useState<Product[]>(() => getVendorProducts(vendorId));
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');

  const renderStatusBadge = (status: SubOrderStatus) => {
    switch (status) {
      case 'placed':
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">Placed</Badge>;
      case 'confirmed':
        return <Badge variant="secondary" className="bg-sky-50 text-sky-700 border-sky-200">Confirmed</Badge>;
      case 'packed':
        return <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">Packed</Badge>;
      case 'ready_for_pickup':
        return <Badge variant="vendora-platform">Ready for Pickup</Badge>;
      case 'delivered':
        return <Badge variant="in-stock">Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="discount-coral">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const handleAdvanceStatus = (subOrderId: string, currentStatus: SubOrderStatus) => {
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
      const updated = advanceSubOrderStatus(subOrderId, nextStatus, 'Vendor', actionLabel);
      setOrders((prev) => prev.map((o) => (o.id === subOrderId ? updated : o)));
    }
  };

  const handleProductSaved = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  const chartData = CHART_DATA[chartRange];

  // ─── KPI definitions ────────────────────────────────────────────────────────
  const kpis = [
    {
      testId: 'kpi-gross-sales',
      label: 'Gross Sales',
      value: DEFAULT_VENDOR_KPIS.grossSales,
      icon: <DollarSign className="h-4 w-4" />,
      iconBg: 'bg-emerald-100 text-emerald-600',
      cardBg: 'bg-white border-slate-200/80',
      trend: { up: true, label: '+14.2% vs last month' },
      progress: 78,
      progressColor: 'bg-emerald-500',
    },
    {
      testId: 'kpi-commission',
      label: 'Platform Commission Deducted',
      value: DEFAULT_VENDOR_KPIS.commissionDeducted,
      icon: <Percent className="h-4 w-4" />,
      iconBg: 'bg-amber-100 text-amber-600',
      cardBg: 'bg-white border-slate-200/80',
      trend: null,
      note: 'Standard 10% platform fee',
      progress: 10,
      progressColor: 'bg-amber-400',
    },
    {
      testId: 'kpi-net-payout',
      label: 'Net Payout',
      value: DEFAULT_VENDOR_KPIS.netPayout,
      icon: <Wallet className="h-4 w-4" />,
      iconBg: 'bg-orange-100 text-[#FF7A1A]',
      cardBg: 'bg-gradient-to-br from-white to-orange-50/40 border-orange-200/70',
      trend: { up: true, label: 'Weekly deposit' },
      progress: 70,
      progressColor: 'bg-orange-500',
    },
    {
      testId: 'kpi-pending-orders',
      label: 'Pending Orders',
      value: String(DEFAULT_VENDOR_KPIS.pendingOrders),
      icon: <Clock className="h-4 w-4" />,
      iconBg: 'bg-sky-100 text-sky-600',
      cardBg: 'bg-white border-slate-200/80',
      trend: { up: false, label: 'Needs action' },
      progress: 45,
      progressColor: 'bg-sky-500',
    },
    {
      testId: 'kpi-low-stock',
      label: 'Low Stock',
      value: String(DEFAULT_VENDOR_KPIS.lowStockCount),
      icon: <AlertTriangle className="h-4 w-4" />,
      iconBg: 'bg-rose-100 text-rose-600',
      cardBg: 'bg-rose-50/30 border-rose-200/70',
      trend: { up: false, label: 'Below threshold' },
      progress: 20,
      progressColor: 'bg-rose-500',
    },
  ] as const;

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      title="Vendor Dashboard"
      subtitle="Overview of your store earnings, recent sales, and order fulfillment pipeline."
      sidebar={<VendorNav />}
    >
      <div className="space-y-6">
        {/* ===================================================================
            Quick Actions Toolbar
            =================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#FF7A1A]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">SoundWave Direct Store Operations</h2>
              <p className="text-xs text-slate-500">
                All systems online • {products.length} catalog listings • Automatic order routing enabled
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="orange-cta"
              size="sm"
              onClick={() => setIsProductModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add New Product</span>
            </Button>

            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to="/vendor/orders">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                <span>Manage Orders</span>
              </Link>
            </Button>

            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to="/vendor/products">
                <Package className="h-4 w-4 text-slate-500" />
                <span>Inventory</span>
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link to={`/vendors/${vendorId}`} target="_blank" rel="noreferrer">
                <span>Public Storefront</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </Button>
          </div>
        </div>

        {/* ===================================================================
            KPI Cards — richer with trend pills & progress bars
            =================================================================== */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <div
              key={kpi.testId}
              data-testid={kpi.testId}
              className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-shadow hover:shadow-md ${kpi.cardBg}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  {kpi.label}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${kpi.iconBg}`}
                >
                  {kpi.icon}
                </span>
              </div>

              {/* Value */}
              <div className="mt-3">
                <div className="text-2xl font-black tracking-tight text-slate-900">
                  {kpi.value}
                </div>

                {/* Trend pill */}
                {kpi.trend && (
                  <div
                    className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      kpi.trend.up
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {kpi.trend.up ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {kpi.trend.label}
                  </div>
                )}
                {'note' in kpi && kpi.note && (
                  <p className="mt-2 text-[10px] font-medium text-slate-500">{kpi.note}</p>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${kpi.progressColor} transition-all duration-700`}
                    style={{ width: `${kpi.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ===================================================================
            Revenue Growth — gradient SVG line chart
            =================================================================== */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Store Revenue &amp; Net Payout Dynamics</h3>
              <p className="text-xs text-slate-500">Gross store revenue vs net weekly deposit</p>
            </div>

            {/* Range Tabs */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1">
              {(['7D', '30D', '90D', '1Y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setChartRange(range)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    chartRange === range
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="mt-5 px-1">
            <LineChart data={chartData} />

            {/* X-axis labels */}
            <div className="mt-1 flex justify-between px-2">
              {chartData.map((pt) => (
                <span key={pt.label} className="text-[10px] font-semibold text-slate-400">
                  {pt.label}
                </span>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-5 rounded-sm bg-orange-500" />
              <span className="font-medium text-slate-600">Gross Volume</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-5 rounded-sm bg-emerald-500 opacity-70"
                style={{ backgroundImage: 'repeating-linear-gradient(90deg,#10b981 0 5px,transparent 5px 8px)' }}
              />
              <span className="font-medium text-slate-600">Net Weekly Payout</span>
            </div>
          </div>
        </div>

        {/* ===================================================================
            Bottom row: Recent Orders + Top Products
            =================================================================== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ─── Recent Orders mini-table (spans 2 cols) ────────────────── */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Orders</h3>
                <p className="text-xs text-slate-500">Latest 5 incoming orders</p>
              </div>
              <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                <Link to="/vendor/orders">
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="py-2.5 px-4 rounded-l-xl text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Order ID
                    </th>
                    <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Customer
                    </th>
                    <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="py-2.5 px-4 rounded-r-xl text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {SAMPLE_ORDERS.map((o) => (
                    <tr key={o.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] font-bold text-slate-700 group-hover:text-orange-600 transition-colors">
                        #{o.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600">
                            {o.customer.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800">{o.customer}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{sampleStatusPill(o.status)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${o.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Top Products card ──────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Top Products</h3>
              <p className="text-xs text-slate-500">By revenue this period</p>
            </div>

            <ul className="mt-4 space-y-4">
              {TOP_PRODUCTS.map((p) => (
                <li key={p.rank} className="flex items-center gap-3">
                  {/* Rank badge */}
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      p.rank === 1
                        ? 'bg-amber-100 text-amber-700'
                        : p.rank === 2
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-orange-50 text-orange-600'
                    }`}
                  >
                    #{p.rank}
                  </span>

                  {/* Product info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {p.sales} sales •{' '}
                      <span className="font-bold text-emerald-600">
                        ${p.revenue.toLocaleString()}
                      </span>
                    </p>
                  </div>

                  {/* Icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                    <ShoppingBag className="h-3.5 w-3.5" />
                  </div>
                </li>
              ))}
            </ul>

            {/* Divider + CTA */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" asChild className="w-full gap-1.5 text-xs">
                <Link to="/vendor/products">
                  <span>View All Products</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ===================================================================
            Full Order Fulfillment Feed (existing live orders)
            =================================================================== */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Customer Sub-Orders</h3>
              <p className="text-xs text-slate-500">Live order stream split by multi-vendor checkout engine</p>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
              <Link to="/vendor/orders">
                <span>View All Orders</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Sub-Order ID</th>
                  <th className="py-3 px-4">Customer &amp; Date</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Subtotal</th>
                  <th className="py-3 px-4">Net Vendor Payout</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((order) => {
                  const firstItem = order.items[0];
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{order.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {order.history[0]?.note?.replace('Order placed by customer ', '') || 'Customer'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {firstItem && (
                            <img
                              src={firstItem.image}
                              alt={firstItem.title}
                              className="h-8 w-8 rounded-lg object-cover border border-slate-200"
                            />
                          )}
                          <div className="max-w-[200px] truncate font-medium text-slate-800">
                            {firstItem?.title || 'Vendor Product'}
                            {order.items.length > 1 && (
                              <span className="text-slate-400 ml-1">+{order.items.length - 1} more</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        ${order.subtotal.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        ${order.netPayout.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">{renderStatusBadge(order.status)}</td>
                      <td className="py-3 px-4 text-right">
                        {order.status === 'placed' && (
                          <Button
                            variant="orange-cta"
                            size="sm"
                            onClick={() => handleAdvanceStatus(order.id, order.status)}
                            className="text-xs h-8 px-3"
                          >
                            Confirm Order
                          </Button>
                        )}
                        {order.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdvanceStatus(order.id, order.status)}
                            className="text-xs h-8 px-3 border-orange-200 text-[#EA6C13] hover:bg-orange-50"
                          >
                            Mark Packed
                          </Button>
                        )}
                        {order.status === 'packed' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAdvanceStatus(order.id, order.status)}
                            className="text-xs h-8 px-3"
                          >
                            Ready for Rider Pickup
                          </Button>
                        )}
                        {order.status === 'ready_for_pickup' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600">
                            <Clock className="h-3 w-3" />
                            <span>Awaiting Rider</span>
                          </span>
                        )}
                        {order.status === 'delivered' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Completed</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Creation Modal */}
        <ProductFormModal
          open={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
          onSave={handleProductSaved}
        />
      </div>
    </WorkspaceLayout>
  );
};
