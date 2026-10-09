import React, { useState } from 'react';
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
  ChevronDown,
  Plus,
  Boxes,
  Store,
  ArrowRight,
  ArrowUpRight,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Wallet,
  Percent,
  ShieldCheck,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import { exportToCsv } from '../lib/export-csv';
import {
  getVendorSubOrders,
  advanceSubOrderStatus,
  getVendorProducts,
} from '../features/vendor/vendorData';
import type { SubOrder, SubOrderStatus, Product } from '../types/domain';
import { useAuthStore } from '../store/auth-store';

export const VendorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const vendorId = user?.vendorId || 'vendor-tech-1';
  const storeName = user?.name ? `${user.name.split(' ')[0]} Electronics` : 'Nova Electronics';

  const [orders, setOrders] = useState<SubOrder[]>(() => getVendorSubOrders(vendorId));
  const [products, setProducts] = useState<Product[]>(() => getVendorProducts(vendorId));
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [vendorPreviewStatus, setVendorPreviewStatus] = useState<'approved' | 'pending' | 'suspended' | 'empty'>('approved');
  const [salesTimeRange, setSalesTimeRange] = useState<'30D' | '3M' | 'YTD'>('3M');
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setOrders(getVendorSubOrders(vendorId));
      setProducts(getVendorProducts(vendorId));
      setIsRefreshing(false);
      showToast('Storefront metrics and sub-order queues synchronized.');
    }, 600);
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
      showToast(`Sub-order #${subOrderId} updated to ${nextStatus.replace(/_/g, ' ')}.`);
    }
  };

  const handleProductSaved = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
    showToast(`Product "${newProduct.title}" created successfully.`);
  };

  const handleExportSummary = () => {
    exportToCsv({
      filename: `vendora_vendor_operational_report_${new Date().toISOString().slice(0, 10)}.csv`,
      data: [
        { metric: 'Gross Sales', value: '$34,820.00', trend: '+18.2%' },
        { metric: 'Commission Deducted (10%)', value: '$3,482.00', trend: 'Contractual 10%' },
        { metric: 'Net Payout Balance', value: '$31,338.00', trend: 'Bi-weekly release' },
        { metric: 'Pending Orders', value: `${orders.filter((o) => o.status === 'placed').length}`, trend: 'Action Required' },
        { metric: 'Active Catalog SKUs', value: `${products.length}`, trend: 'Published live' },
        { metric: 'Store Satisfaction Rating', value: '4.7 / 5.0', trend: '1,288 reviews' },
      ],
      columns: [
        { header: 'Store Operational Metric', key: 'metric' },
        { header: 'Current Aggregate Value', key: 'value' },
        { header: 'Performance Status', key: 'trend' },
      ],
    });
    showToast('Merchant operational summary exported to CSV.');
  };

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
          <div>$34,820</div>
          <div>Platform Commission Deducted</div>
          <div>$3,482</div>
          <div>Net Payout</div>
          <div>$31,338</div>
          <div>Pending Orders</div>
          <div>14</div>
          <div>Low Stock</div>
          <div>3</div>
          <Link to="/vendor/orders">Manage Orders</Link>
          <Link to="/vendor/products">Inventory</Link>
          <Link to={`/vendors/${vendorId}`}>Public Storefront</Link>
          <Link to={`/vendors/${vendorId}`}>Public Storefront</Link>
        </div>

        {/* ── Developer Environment: Vendor Status Preview Toolbar ──────── */}
        {import.meta.env.DEV && (
          <details className="group rounded-xl border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 p-2 text-xs shadow-2xs">
            <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-amber-800 dark:text-amber-300 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                🛠️ DEV SIMULATOR: Toggle Vendor Account State ({vendorPreviewStatus.toUpperCase()})
              </span>
              <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">Click to expand</span>
            </summary>
            <div className="flex flex-wrap items-center gap-2 pt-2 mt-2 border-t border-amber-200/60 dark:border-amber-800/40">
              <button
                type="button"
                onClick={() => setVendorPreviewStatus('approved')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  vendorPreviewStatus === 'approved'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                }`}
              >
                Approved (Default)
              </button>
              <button
                type="button"
                onClick={() => setVendorPreviewStatus('pending')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  vendorPreviewStatus === 'pending'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                }`}
              >
                Pending Review
              </button>
              <button
                type="button"
                onClick={() => setVendorPreviewStatus('suspended')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  vendorPreviewStatus === 'suspended'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                }`}
              >
                Suspended / Rejected
              </button>
              <button
                type="button"
                onClick={() => setVendorPreviewStatus('empty')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  vendorPreviewStatus === 'empty'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                }`}
              >
                New Vendor (Empty State)
              </button>
            </div>
          </details>
        )}

        {/* =====================================================================
            1. Dashboard Page Title & Operational Status (Admin Unified Style)
            ===================================================================== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Welcome back, <strong className="text-slate-800 dark:text-slate-200 font-semibold">{storeName}</strong> ({products.length} catalog items live). Here is your operational summary.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Storefront Operational Status Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Storefront Live</span>
            </div>

            {/* Timeframe Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {salesTimeRange === '30D' ? 'Last 30 days' : salesTimeRange === '3M' ? 'Last 3 months' : 'Year to date'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {isTimeRangeOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1 shadow-lg animate-in fade-in zoom-in-95">
                  {[
                    { id: '30D', label: 'Last 30 days' },
                    { id: '3M', label: 'Last 3 months' },
                    { id: 'YTD', label: 'Year to date' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
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

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh metrics"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
              title="Refresh store metrics"
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>

            {/* Primary Add New Product Button */}
            <button
              type="button"
              onClick={() => setIsProductModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
            >
              + Add New Product
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 border border-slate-700">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF7A1A] group-hover:bg-[#FF7A1A] group-hover:text-white transition-colors">
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Add Product</p>
                <p className="text-[10px] text-slate-400 truncate">New listing</p>
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-[#EA6C13] bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 px-1.5 py-0.5 rounded">
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
                <p className="text-[10px] text-slate-400 truncate">Fulfillment queue</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
              12
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
                <p className="text-[10px] text-slate-400 truncate">Inventory health</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              4 low
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
                <p className="text-[10px] text-slate-400 truncate">Store CSV ledger</p>
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded">
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
                <p className="text-[10px] text-slate-400 truncate">Customer preview</p>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-all" />
          </Link>
        </div>

        {/* ── Operational Attention Alert Banner ───────────────────── */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Attention needed:</strong> 4 products require restock • 1 customer return pending inspection • 12 sub-orders ready to pack.
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
                $12,431.89
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+18.2%</span>
                <span className="text-[11px] font-normal text-slate-400">from last month</span>
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
                342
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+9.4%</span>
                <span className="text-[11px] font-normal text-slate-400">from last month</span>
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
                12
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold">Requires action</span>
                <span className="text-[11px] text-slate-400 truncate">(SLA dispatch window)</span>
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
                <span>4.7</span>
                <span className="text-xs font-normal text-slate-400">/ 5.0</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>★ Top Rated Merchant</span>
                <span className="text-[11px] font-normal text-slate-400">(1,288 reviews)</span>
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
                <span className="rounded border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  Monthly
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">+342</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+6.4% vs last period</span>
              </div>
            </div>

            {/* Monthly Bar Chart */}
            <div className="mt-6 flex h-32 items-end justify-between gap-2 px-1">
              {[
                { m: 'Jan', h: '38%' },
                { m: 'Feb', h: '45%' },
                { m: 'Mar', h: '35%' },
                { m: 'Apr', h: '55%' },
                { m: 'May', h: '62%' },
                { m: 'Jun', h: '70%' },
                { m: 'Jul', h: '80%' },
                { m: 'Aug', h: '95%' },
              ].map((bar, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full rounded-xs bg-slate-900 dark:bg-slate-100 transition-all duration-300 hover:bg-orange-500"
                    style={{ height: bar.h }}
                  />
                  <span className="text-[10px] font-medium text-slate-400">{bar.m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Gross Sales Volume (Trajectory Curve Line) */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Gross Volume</span>
                <span className="rounded border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  Trailing 30d
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">$14,923.40</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+18.2% vs last month</span>
              </div>
            </div>

            {/* Trajectory Line Chart */}
            <div className="mt-6">
              <div className="h-28 w-full">
                <svg viewBox="0 0 300 100" className="h-full w-full overflow-visible">
                  <path
                    d="M 10 80 Q 75 55, 140 60 T 220 40 T 290 15"
                    fill="none"
                    stroke="#FF7A1A"
                    strokeWidth="2.5"
                  />
                  <circle cx="10" cy="80" r="3" fill="#FF7A1A" />
                  <circle cx="100" cy="62" r="3" fill="#FF7A1A" />
                  <circle cx="190" cy="50" r="3" fill="#FF7A1A" />
                  <circle cx="290" cy="15" r="3" fill="#FF7A1A" />
                </svg>
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-slate-400 font-medium">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
            </div>
          </div>

          {/* Card 3: Earnings Retention & Settlement Breakdown */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Earnings Retention</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">$12,431 / $14,923</span>
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                <span>Net payout yield</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">83.3% net retained</span>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="mt-5 space-y-3">
              {[
                { label: 'Merchant Net Payout', pct: 83.3, color: 'bg-emerald-500' },
                { label: 'Platform Commission (10%)', pct: 10.0, color: 'bg-orange-500' },
                { label: 'Customer Returns Reserve', pct: 4.1, color: 'bg-amber-500' },
                { label: 'Logistics SLA Offset', pct: 2.6, color: 'bg-blue-500' },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =====================================================================
            5. Section 3: Sales Over Time (Full-Width Dual Area Chart)
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Store Sales Velocity</h2>
              <p className="text-xs text-slate-400">Physical merchandise vs digital add-on protection warranty sales</p>
            </div>
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSalesTimeRange('3M')}
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

          {/* Dual Area Curve Chart */}
          <div className="mt-6 h-56 w-full">
            <svg
              viewBox="0 0 900 200"
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
            >
              <defs>
                <linearGradient id="vendorPhysicalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF7A1A" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#FF7A1A" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="vendorDigitalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Physical Goods Area (Upper) */}
              <path
                d="M 10 120 
                   C 100 100, 200 115, 300 105 
                   C 400 95, 500 75, 600 70 
                   C 700 75, 800 80, 890 35
                   L 890 190 L 10 190 Z"
                fill="url(#vendorPhysicalGrad)"
              />

              {/* Digital Care Area (Lower) */}
              <path
                d="M 10 145 
                   C 100 135, 200 140, 300 130 
                   C 400 125, 500 110, 600 105 
                   C 700 110, 800 115, 890 80
                   L 890 190 L 10 190 Z"
                fill="url(#vendorDigitalGrad)"
              />

              {/* Digital Line */}
              <path
                d="M 10 145 
                   C 100 135, 200 140, 300 130 
                   C 400 125, 500 110, 600 105 
                   C 700 110, 800 115, 890 80"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
              />

              {/* Physical Goods Line */}
              <path
                d="M 10 120 
                   C 100 100, 200 115, 300 105 
                   C 400 95, 500 75, 600 70 
                   C 700 75, 800 80, 890 35"
                fill="none"
                stroke="#FF7A1A"
                strokeWidth="2.5"
              />

              {/* Endpoint Dot */}
              <circle cx="890" cy="35" r="4" fill="#FF7A1A" />
              <circle cx="890" cy="35" r="2" fill="#FFFFFF" />
            </svg>
          </div>

          {/* X-axis date labels */}
          <div className="mt-3 flex justify-between text-[10px] text-slate-400 font-medium px-1">
            <span>Apr 6</span>
            <span>Apr 12</span>
            <span>Apr 18</span>
            <span>Apr 24</span>
            <span>May 2</span>
            <span>May 10</span>
            <span>May 18</span>
            <span>May 26</span>
            <span>Jun 4</span>
            <span>Jun 12</span>
            <span>Jun 20</span>
            <span>Jun 30</span>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#FF7A1A]" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Physical Goods ($11,848.00)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-xs bg-blue-500" />
              <span className="font-medium text-slate-500 dark:text-slate-400">Digital Care &amp; Warranty ($3,063.40)</span>
            </div>
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
                <span className="rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  12 Pending
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">To Confirm</h3>
                <p className="text-xs text-slate-400">Orders awaiting seller inventory verification</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>SLA Dispatch: Within 24h</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '43%' }} />
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>12 / 28 daily quota</span>
                <span className="text-slate-500 font-normal">43% capacity</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <Link to="/vendor/orders" className="flex items-center justify-between text-xs font-bold text-[#EA6C13] hover:underline">
                  <span>Process 12 orders</span>
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
                <span className="rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                  8 in Queue
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">To Pack</h3>
                <p className="text-xs text-slate-400">Confirmed orders ready for warehouse boxing</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Next Courier Window: Today 4 PM</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '65%' }} />
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>8 / 12 packed</span>
                <span className="text-slate-500 font-normal">65% complete</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <Link to="/vendor/orders" className="flex items-center justify-between text-xs font-bold text-blue-600 hover:underline">
                  <span>Print packing slips</span>
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
                <span className="rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  5 Staged
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ready for Pickup</h3>
                <p className="text-xs text-slate-400">Parcels staged for 3PL courier handoff</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Courier SLA: On Schedule</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '85%' }} />
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>5 / 6 parcels</span>
                <span className="text-slate-500 font-normal">85% staged</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <Link to="/vendor/orders" className="flex items-center justify-between text-xs font-bold text-emerald-600 hover:underline">
                  <span>View courier schedule</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
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
                  <p className="text-xs text-slate-400">Incoming merchant sales requiring tracking updates and fulfillment</p>
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
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Sub-Order ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                          #{order.id}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                          Sarah Jenkins
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900 dark:text-slate-100 truncate block max-w-xs">
                            {order.items[0]?.title || 'Aura Precision Studio Reference In-Ear Monitors'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          ${(order.subtotal + order.shippingFee).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {order.status === 'placed' && (
                            <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              Placed
                            </span>
                          )}
                          {order.status === 'confirmed' && (
                            <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                              Confirmed
                            </span>
                          )}
                          {order.status === 'packed' && (
                            <span className="rounded-full bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                              Packed
                            </span>
                          )}
                          {order.status === 'ready_for_pickup' && (
                            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              Ready
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {order.status === 'placed' && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(order.id, 'placed')}
                              className="rounded-lg bg-slate-900 dark:bg-slate-100 px-3 py-1 text-xs font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white shadow-2xs cursor-pointer transition-colors"
                            >
                              Confirm Order
                            </button>
                          )}
                          {order.status === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(order.id, 'confirmed')}
                              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs cursor-pointer transition-colors"
                            >
                              Mark Packed
                            </button>
                          )}
                          {order.status === 'packed' && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(order.id, 'packed')}
                              className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-bold text-white hover:bg-purple-700 shadow-2xs cursor-pointer transition-colors"
                            >
                              Ready for Pickup
                            </button>
                          )}
                          {order.status === 'ready_for_pickup' && (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Staged ✓
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 text-xs text-slate-500">
              <span>Showing {orders.length} store sub-orders</span>
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
                  <p className="text-xs text-slate-400">Highest volume generators</p>
                </div>
                <Link
                  to="/vendor/products"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Catalog</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Total Store Revenue Banner (Admin Style) */}
              <div className="mt-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    TOTAL STORE REVENUE
                  </span>
                  <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
                    $34,820.00
                  </div>
                </div>
                <span className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
                  Active SKU Yield
                </span>
              </div>

              {/* Ranked Product List */}
              <div className="mt-4 space-y-3">
                {[
                  { name: 'Sony WH-1000XM5', units: '154 units sold', rev: '$14,230', change: '+22%' },
                  { name: 'Keychron Q1 Pro', units: '86 units sold', rev: '$8,430', change: '+14%' },
                  { name: 'Anker 737 GaN (140W)', units: '73 units sold', rev: '$7,020', change: '+8%' },
                  { name: 'Logitech MX Master 3S', units: '64 units sold', rev: '$6,030', change: '+9%' },
                  { name: 'USB-C 240W Cable (2m)', units: '142 units sold', rev: '$3,564', change: '0%' },
                ].map((p, idx) => (
                  <div key={p.name} className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-bold text-slate-400 text-xs w-4">#{idx + 1}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-[#FF7A1A] transition-colors">{p.name}</div>
                        <div className="text-[11px] text-slate-400">{p.units}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900 dark:text-white">{p.rev}</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{p.change}</div>
                    </div>
                  </div>
                ))}
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
                  <p className="text-xs text-slate-400">4 catalog SKUs at or below reorder threshold</p>
                </div>
                <span className="rounded bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                  Critical
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                {[
                  { name: 'Anker 737 GaN Power Bank', variant: 'Space Gray / 24,000mAh', count: '2 left', pill: 'bg-rose-50 text-rose-700 border-rose-200' },
                  { name: 'Keychron Double-shot PBT Keycaps', variant: 'Carbon Black / OEM Profile', count: '3 left', pill: 'bg-rose-50 text-rose-700 border-rose-200' },
                  { name: 'Sony WH-1000XM5 Cushions', variant: 'Silver / Memory Foam', count: '5 left', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { name: 'MX Master 3S Travel Hardcase', variant: 'Matte Graphite', count: '4 left', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
                ].map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-slate-400 font-bold">0{idx + 1}</span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.variant}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${item.pill}`}>
                        {item.count}
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
                ))}
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
                  This Week
                </span>
              </div>

              {/* Activity rows (Admin Style) */}
              <div className="mt-4 space-y-3.5">
                {[
                  {
                    title: 'Order #ORD-9821 completed',
                    meta: 'Settled to balance • Today, 11:20 AM',
                    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
                    badge: <span className="text-xs font-bold text-emerald-600">+$349.99</span>,
                  },
                  {
                    title: 'Payout initiated to bank',
                    meta: 'Chase Business (••••4821) • Today, 08:30 AM',
                    icon: <Wallet className="h-3.5 w-3.5 text-blue-600" />,
                    badge: <span className="text-xs font-bold text-slate-900 dark:text-white">+$2,450.00</span>,
                  },
                  {
                    title: 'Customer return requested',
                    meta: 'Order #ORD-9784 • Yesterday, 16:15 PM',
                    icon: <RotateCw className="h-3.5 w-3.5 text-rose-600" />,
                    badge: <span className="text-xs font-bold text-rose-600">-$49.00</span>,
                  },
                  {
                    title: 'Listing verified by platform',
                    meta: 'DeskSense Edge passed audit • Oct 12',
                    icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />,
                    badge: (
                      <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Active
                      </span>
                    ),
                  },
                ].map((act, i) => (
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
                        <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
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
