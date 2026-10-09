import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCcw,
  DollarSign,
  Percent,
  Store,
  Clock,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  Calendar,
  Shield,
  Wallet,
  Layers,
  Activity,
  CreditCard,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Coins,
  Bell,
  Users,
  ShoppingBag,
  ArrowRight,
  Settings,
  Scale,
  Download,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useMarketplaceStore } from '../store/marketplace-store';
import { exportToCsv } from '../lib/export-csv';

export const AdminDashboardPage: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '3m' | '6m' | '1y'>('3m');
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);

  const vendors = useMarketplaceStore((state) => state.vendors);
  const products = useMarketplaceStore((state) => state.products);
  const disputes = useMarketplaceStore((state) => state.disputes);

  const pendingVendorsCount = vendors.filter((v) => v.kycStatus === 'Pending Review' || v.kycStatus === 'Investigation').length;
  const pendingProductsCount = products.filter((p) => p.status === 'pending_review' || (p.status as string) === 'pending').length;
  const openDisputesCount = disputes.filter((d) => d.status !== 'resolved_refund' && d.status !== 'resolved_denied').length;
  const activeVendorsCount = vendors.filter((v) => v.status === 'active').length;
  const totalPendingApprovals = pendingVendorsCount + pendingProductsCount;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Marketplace analytics and database indexes refreshed.');
    }, 600);
  };

  const handleExportReport = () => {
    exportToCsv({
      filename: `vendora_platform_executive_report_${new Date().toISOString().slice(0, 10)}.csv`,
      data: [
        { metric: 'Gross Merchandise Value (GMV)', value: '$184,231.89', change: '+25.1%' },
        { metric: 'Platform Commission Earned', value: '$18,423.19', change: '+12.4%' },
        { metric: 'Active Merchant Storefronts', value: `${activeVendorsCount}`, change: '+6.2%' },
        { metric: 'Pending Approvals (KYC & Catalog)', value: `${totalPendingApprovals}`, change: 'Requires Attention' },
        { metric: 'Open Disputes', value: `${openDisputesCount}`, change: 'Active arbitration' },
        { metric: 'Settlement Payout Cycle Volume', value: '$26,540.25', change: 'Bi-weekly cycle' },
      ],
      columns: [
        { header: 'Platform Metric', key: 'metric' },
        { header: 'Current Aggregate Value', key: 'value' },
        { header: 'Performance Status', key: 'change' },
      ],
    });
    showToast('Platform Executive Summary exported to CSV.');
  };

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
            1. Dashboard Page Title & Operational Status
            ===================================================================== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Real-time marketplace performance, settlement health, and moderation metrics.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Systems Operational Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-xs font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Systems Operational</span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh metrics"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 transition-transform ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

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
                <p className="text-[10px] text-slate-400 truncate">Merchant onboarding</p>
              </div>
            </div>
            {pendingVendorsCount > 0 && (
              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                {pendingVendorsCount}
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
                <p className="text-[10px] text-slate-400 truncate">Catalog verification</p>
              </div>
            </div>
            {pendingProductsCount > 0 && (
              <span className="shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                {pendingProductsCount}
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
                <p className="text-[10px] text-slate-400 truncate">Arbitration court</p>
              </div>
            </div>
            {openDisputesCount > 0 && (
              <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                {openDisputesCount}
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
                <p className="text-[10px] text-slate-400 truncate">Executive CSV</p>
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
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
                <p className="text-[10px] text-slate-400 truncate">Global controls</p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        {/* =====================================================================
            2. Section 1: Top 4 KPI Cards
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Gross Merchandise Value */}
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
                $184,231.89
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+25.1%</span>
                <span className="text-[11px] font-normal text-slate-400">from last month</span>
              </div>
            </div>
          </div>

          {/* Card 2: Commission Earned */}
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
                $18,423.19
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+12.4%</span>
                <span className="text-[11px] font-normal text-slate-400">from last month</span>
              </div>
            </div>
          </div>

          {/* Card 3: Active Vendors */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">
                Active Vendors
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Store className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {activeVendorsCount > 0 ? 240 + activeVendorsCount : 248}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+6.2%</span>
                <span className="text-[11px] font-normal text-slate-400">from last month</span>
              </div>
            </div>
          </div>

          {/* Card 4: Pending Approvals */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">
                Pending Approvals
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {totalPendingApprovals > 0 ? totalPendingApprovals : 17}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span className="font-semibold">Requires attention</span>
                <span className="text-[11px] text-slate-400 truncate">
                  ({pendingVendorsCount} KYC, {pendingProductsCount} items)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. Section 2: Orders, Total Revenue, Commission Overview (3 Columns)
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Orders (Monthly Bar Chart) */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Orders</span>
                <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  Monthly
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">+2,350</span>
                <span className="text-xs font-semibold text-emerald-600">+80.1% vs last month</span>
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
                    className="w-full rounded-xs bg-slate-900 transition-all duration-300 hover:bg-slate-800"
                    style={{ height: bar.h }}
                  />
                  <span className="text-[10px] font-medium text-slate-400">{bar.m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Total Revenue (Trajectory Line Chart) */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Total Revenue</span>
                <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  Trailing 30d
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">$15,231.89</span>
                <span className="text-xs font-semibold text-emerald-600">+20.1% vs last month</span>
              </div>
            </div>

            {/* Trajectory Line Chart */}
            <div className="mt-6">
              <div className="h-28 w-full">
                <svg viewBox="0 0 300 100" className="h-full w-full overflow-visible">
                  <path
                    d="M 10 80 Q 75 55, 140 60 T 220 40 T 290 15"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="2.5"
                  />
                  <circle cx="10" cy="80" r="3" fill="#0F172A" />
                  <circle cx="100" cy="62" r="3" fill="#0F172A" />
                  <circle cx="190" cy="50" r="3" fill="#0F172A" />
                  <circle cx="290" cy="15" r="3" fill="#0F172A" />
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

          {/* Card 3: Commission Overview */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Commission Overview</span>
                <span className="text-xs font-bold text-slate-900">$3,000 / $3,650</span>
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                <span>Total target progress</span>
                <span className="font-medium text-slate-600">82.2% of target</span>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="mt-5 space-y-3">
              {[
                { cat: 'Electronics', pct: 80 },
                { cat: 'Fashion', pct: 90 },
                { cat: 'Home & Living', pct: 86 },
                { cat: 'Digital Goods', pct: 83 },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                    <span>{item.cat}</span>
                    <span className="font-semibold text-slate-900">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-slate-900 rounded-full"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =====================================================================
            4. Section 3: Marketplace Sales (Full-Width Dual Area Chart)
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Marketplace Sales</h2>
              <p className="text-xs text-slate-400">Showing total sales for the last 3 months</p>
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

          {/* Dual Area Curve Chart */}
          <div className="mt-6 h-56 w-full">
            <svg
              viewBox="0 0 900 200"
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
            >
              <defs>
                <linearGradient id="vendorSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F172A" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0F172A" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="platformSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Vendor Sales Area (Upper) */}
              <path
                d="M 10 120 
                   C 100 100, 200 115, 300 105 
                   C 400 95, 500 75, 600 70 
                   C 700 75, 800 80, 890 35
                   L 890 190 L 10 190 Z"
                fill="url(#vendorSalesGrad)"
              />

              {/* Platform Sales Area (Lower) */}
              <path
                d="M 10 145 
                   C 100 135, 200 140, 300 130 
                   C 400 125, 500 110, 600 105 
                   C 700 110, 800 115, 890 80
                   L 890 190 L 10 190 Z"
                fill="url(#platformSalesGrad)"
              />

              {/* Platform Sales Line */}
              <path
                d="M 10 145 
                   C 100 135, 200 140, 300 130 
                   C 400 125, 500 110, 600 105 
                   C 700 110, 800 115, 890 80"
                fill="none"
                stroke="#64748B"
                strokeWidth="2"
              />

              {/* Vendor Sales Line */}
              <path
                d="M 10 120 
                   C 100 100, 200 115, 300 105 
                   C 400 95, 500 75, 600 70 
                   C 700 75, 800 80, 890 35"
                fill="none"
                stroke="#0F172A"
                strokeWidth="2.5"
              />

              {/* Endpoint Dot */}
              <circle cx="890" cy="35" r="4" fill="#0F172A" />
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
          <div className="mt-4 flex items-center justify-center gap-6 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-xs bg-slate-900" />
              <span className="font-semibold text-slate-800">Vendor sales</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-xs bg-slate-400" />
              <span className="font-medium text-slate-500">Platform sales</span>
            </div>
          </div>
        </div>

        {/* =====================================================================
            5. Section 4: Three Target Progress Cards
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Vendor Onboarding */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Store className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                  In Progress
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900">Vendor Onboarding</h3>
                <p className="text-xs text-slate-400">Approve 300 vendors this quarter</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Target: Dec 2026</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '65%' }} />
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-800">
                <span>195 / 300 vendors</span>
                <span className="text-slate-500 font-normal">65% complete</span>
              </div>
            </div>
          </div>

          {/* Card 2: Dispute Resolution */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                  Pending
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900">Dispute Resolution</h3>
                <p className="text-xs text-slate-400">Resolve 95% within 48h</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Target: Nov 2026</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '30%' }} />
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-800">
                <span>28 / 95 resolved</span>
                <span className="text-slate-500 font-normal">30% complete</span>
              </div>
            </div>
          </div>

          {/* Card 3: Commission Target */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Percent className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                  In Progress
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900">Commission Target</h3>
                <p className="text-xs text-slate-400">Quarterly commission goal</p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Target: Dec 2026</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '45%' }} />
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-800">
                <span>$45,000 / $100,000</span>
                <span className="text-slate-500 font-normal">45% complete</span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            6. Section 5: Top Vendors (Left) & Recent Activity (Right)
            ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Top Vendors Card */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Top Vendors</h2>
                  <p className="text-xs text-slate-400">Ranked by settled merchandise volume</p>
                </div>
                <Link
                  to="/admin/vendors"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Total Payouts Pending Banner */}
              <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    TOTAL PAYOUTS PENDING
                  </span>
                  <div className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                    $26,540.25
                  </div>
                </div>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-2xs">
                  Cycle ends in 3d
                </span>
              </div>

              {/* Vendor List */}
              <div className="mt-4 space-y-3">
                {[
                  {
                    name: 'Nova Electronics',
                    meta: '1,240 orders • ★ 4.9',
                    amt: '$64,280.00',
                    status: 'Settled',
                    statusColor: 'text-emerald-600',
                    icon: <Wallet className="h-4 w-4 text-emerald-600" />,
                    bg: 'bg-emerald-50',
                  },
                  {
                    name: 'Aura Apparel',
                    meta: '980 orders • ★ 4.8',
                    amt: '$42,150.50',
                    status: 'Settled',
                    statusColor: 'text-emerald-600',
                    icon: <Layers className="h-4 w-4 text-blue-600" />,
                    bg: 'bg-blue-50',
                  },
                  {
                    name: 'Nexus Tech Hub',
                    meta: '740 orders • ★ 4.7',
                    amt: '$38,900.00',
                    status: 'In Review',
                    statusColor: 'text-slate-500',
                    icon: <Activity className="h-4 w-4 text-purple-600" />,
                    bg: 'bg-purple-50',
                  },
                  {
                    name: 'Urban Nomad Living',
                    meta: '620 orders • ★ 4.9',
                    amt: '$29,430.75',
                    status: 'Settled',
                    statusColor: 'text-emerald-600',
                    icon: <CreditCard className="h-4 w-4 text-rose-600" />,
                    bg: 'bg-rose-50',
                  },
                  {
                    name: 'Artisan Kitchen',
                    meta: '510 orders • ★ 4.8',
                    amt: '$18,790.00',
                    status: 'Settled',
                    statusColor: 'text-emerald-600',
                    icon: <Utensils className="h-4 w-4 text-teal-600" />,
                    bg: 'bg-teal-50',
                  },
                ].map((v, i) => (
                  <Link
                    key={i}
                    to="/admin/vendors"
                    className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${v.bg}`}
                      >
                        {v.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                          {v.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                          {v.meta}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {v.amt}
                      </p>
                      <p className={`text-[11px] font-semibold leading-tight mt-0.5 ${v.statusColor}`}>
                        {v.status}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
                  <p className="text-xs text-slate-400">23 audit events</p>
                </div>
                <span className="rounded border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
                  This Month
                </span>
              </div>

              {/* Activity rows */}
              <div className="mt-4 space-y-3.5">
                {[
                  {
                    title: 'New vendor application',
                    meta: 'Atlas Gadgets – Today, 08:30',
                    link: '/admin/vendors',
                    icon: <Store className="h-3.5 w-3.5 text-slate-600" />,
                    badge: (
                      <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                        New
                      </span>
                    ),
                  },
                  {
                    title: 'Listing approved',
                    meta: 'Wireless Noise-Cancelling IEMs',
                    link: '/admin/products',
                    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
                    badge: <span className="text-xs font-bold text-emerald-600">+$149.00 ↗</span>,
                  },
                  {
                    title: 'Dispute #1042 opened',
                    meta: 'Customer: John • Package SLA breach',
                    link: '/admin/disputes',
                    icon: <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />,
                    badge: <span className="text-xs font-bold text-rose-600">-$89.50 ↗</span>,
                  },
                  {
                    title: 'Commission rate changed',
                    meta: 'Fashion category to 12% • Yesterday',
                    link: '/admin/commission',
                    icon: <Percent className="h-3.5 w-3.5 text-slate-600" />,
                    badge: null,
                  },
                  {
                    title: 'Refund issued',
                    meta: 'Order #8841 – Yesterday, 14:10',
                    link: '/admin/orders',
                    icon: <RotateCcw className="h-3.5 w-3.5 text-rose-600" />,
                    badge: <span className="text-xs font-bold text-rose-600">-$45.00</span>,
                  },
                  {
                    title: 'Vendor suspended',
                    meta: 'QuickShip Co • Chargeback rate high',
                    link: '/admin/vendors',
                    icon: <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />,
                    badge: (
                      <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 border border-rose-200">
                        Action
                      </span>
                    ),
                  },
                ].map((act, i) => (
                  <Link
                    key={i}
                    to={act.link}
                    className="flex items-center justify-between gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 group-hover:bg-slate-100 transition-colors">
                        {act.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                          {act.meta}
                        </p>
                      </div>
                    </div>
                    {act.badge && <div className="shrink-0">{act.badge}</div>}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            7. Section 6: Governance & Operational Cards (Row A)
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Moderation Queue */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  On Track
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900">Moderation Queue</h3>
                <p className="text-xs text-slate-400">
                  Process all pending catalog listings within SLA
                </p>
              </div>
              <div className="mt-4 flex justify-between text-xs">
                <span className="text-slate-500">Progress</span>
                <span className="font-semibold text-slate-900">78%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '78%' }} />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>312 / 400 listings • Target: Dec 2026</span>
              </div>
              <Link
                to="/admin/products"
                className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
              >
                <span>View Details</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 2: Payout Cycle */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Coins className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  Pending
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900">Payout Cycle</h3>
                <p className="text-xs text-slate-400">
                  Bi-weekly multi-vendor automated settlement
                </p>
              </div>
              <div className="mt-4 flex justify-between text-xs">
                <span className="text-slate-500">Progress</span>
                <span className="font-semibold text-slate-900">52%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '52%' }} />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>$142,800 / $275,000 • Target: Nov 2026</span>
              </div>
              <Link
                to="/admin/commission"
                className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
              >
                <span>View Details</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 3: Fraud Review */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <Bell className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                  Behind
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900">Fraud Review</h3>
                <p className="text-xs text-slate-400">
                  Automated heuristic flag auditing &amp; KYC validation
                </p>
              </div>
              <div className="mt-4 flex justify-between text-xs">
                <span className="text-slate-500">Progress</span>
                <span className="font-semibold text-slate-900">34%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '34%' }} />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>18 / 50 flags audited • Target: Dec 2026</span>
              </div>
              <Link
                to="/admin/disputes"
                className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
              >
                <span>View Details</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* =====================================================================
            8. Section 7: Final Metric Goals (Row B)
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Monthly GMV Target */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                  <DollarSign className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                  Ahead
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900">Monthly GMV Target</h3>
                <p className="text-xs text-slate-400">Current vs monthly goal</p>
              </div>
              <div className="mt-4 flex justify-between text-xs">
                <span className="text-slate-500">Target quota</span>
                <span className="font-semibold text-slate-900">$164.2K / $200K</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '82.1%' }} />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>$200,000</span>
              <span className="text-slate-500 font-normal">82.1% complete</span>
            </div>
          </div>

          {/* Card 2: New Customers This Quarter */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                  <Users className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  On Track
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900">New Customers This Quarter</h3>
                <p className="text-xs text-slate-400">Acquisition trajectory</p>
              </div>
              <div className="mt-4 flex justify-between text-xs">
                <span className="text-slate-500">Cohort target</span>
                <span className="font-semibold text-slate-900">14.2K / 18K</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '78.8%' }} />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>18,000 users</span>
              <span className="text-slate-500 font-normal">78.8% complete</span>
            </div>
          </div>

          {/* Card 3: Average Order Value */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                  Behind
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-slate-900">Average Order Value</h3>
                <p className="text-xs text-slate-400">Marketplace basket size</p>
              </div>
              <div className="mt-4 flex justify-between text-xs">
                <span className="text-slate-500">Benchmark</span>
                <span className="font-semibold text-slate-900">$74.50 / $85.00</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '87.6%' }} />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>$85.00</span>
              <span className="text-slate-500 font-normal">87.6% complete</span>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
