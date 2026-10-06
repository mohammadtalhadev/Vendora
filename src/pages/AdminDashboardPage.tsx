import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Percent,
  Users,
  Activity,
  TrendingUp,
  RefreshCcw,
  CheckSquare,
  Scale,
  FileDown,
  Settings2,
  Eye,
  Building,
  Car,
  Zap,
  Film,
  Target,
  ExternalLink,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';

export const AdminDashboardPage: React.FC = () => {
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // ── Monthly Subscriptions & Volume Bar Chart (Catmin Section 2) ─────────────
  const monthlyVolume = [
    { month: 'Jan', orders: 1200, revenue: 64000, height: '42%' },
    { month: 'Feb', orders: 1450, revenue: 78000, height: '52%' },
    { month: 'Mar', orders: 1350, revenue: 72000, height: '48%' },
    { month: 'Apr', orders: 1800, revenue: 98000, height: '65%' },
    { month: 'May', orders: 2100, revenue: 114000, height: '76%' },
    { month: 'Jun', orders: 1950, revenue: 105000, height: '70%' },
    { month: 'Jul', orders: 2250, revenue: 122000, height: '82%' },
    { month: 'Aug', orders: 2350, revenue: 126950, height: '90%' },
  ];

  // ── Budget Overview Progress Categories (Catmin Section 2) ──────────────────
  const budgetCategories = [
    { label: 'Vendor Payouts (Housing)', current: 1200, total: 1500, pct: 80, icon: <Building className="h-4 w-4 text-blue-500" /> },
    { label: 'Platform Reserves (Transportation)', current: 450, total: 500, pct: 90, icon: <Car className="h-4 w-4 text-purple-500" /> },
    { label: 'Escrow Reserves (Utilities)', current: 300, total: 350, pct: 86, icon: <Zap className="h-4 w-4 text-amber-500" /> },
    { label: 'Dispute Buffer (Entertainment)', current: 250, total: 300, pct: 83, icon: <Film className="h-4 w-4 text-rose-500" /> },
  ];

  // ── Treasury Accounts List (Catmin Section 3) ───────────────────────────────
  const treasuryAccounts = [
    { name: 'Main Escrow Reserve', type: 'Settlement Escrow', balance: '$12,450.80', change: '+2.4%', isPositive: true },
    { name: 'Operating Checking Account', type: 'Fee Collection', balance: '$3,820.50', change: '+5.1%', isPositive: true },
    { name: 'Platform Investment Portfolio', type: 'Yield Treasury', balance: '$45,210.00', change: '+12.8%', isPositive: true },
    { name: 'Settlement Credit Line', type: 'Instant Float', balance: '-$1,240.25', change: '-1.2%', isPositive: false },
    { name: 'Dispute Contingency Savings', type: 'Buyer Protection', balance: '$8,500.00', change: '0.0%', isPositive: true },
  ];

  // ── Financial Goals / Milestones (Catmin Section 5) ─────────────────────────
  const financialGoals = [
    {
      title: 'Emergency Fund',
      subtitle: '3 months of expenses saved',
      target: '$15,000',
      deadline: 'Dec 2024',
      pct: 65,
      color: 'bg-emerald-500',
    },
    {
      title: 'Stock Portfolio',
      subtitle: 'Tech sector investment plan',
      target: '$50,000',
      deadline: 'Jun 2024',
      pct: 30,
      color: 'bg-blue-500',
    },
    {
      title: 'Debt Repayment',
      subtitle: 'Student loan payoff plan',
      target: '$25,000',
      deadline: 'Mar 2025',
      pct: 45,
      color: 'bg-amber-500',
    },
  ];

  // ── Recent Activity / Transactions (Catmin Section 4) ──────────────────────
  const recentTransactions = [
    {
      id: 'VEN-98421',
      customer: 'Sarah Jenkins',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
      vendor: 'SoundWave Direct',
      date: 'Today, 14:22',
      method: 'Mastercard •••• 4242',
      amount: 189.0,
      fee: 13.23,
      status: 'confirmed',
    },
    {
      id: 'VEN-98420',
      customer: 'David Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
      vendor: 'Vendora Direct',
      date: 'Today, 13:10',
      method: 'Visa •••• 1010',
      amount: 328.0,
      fee: 32.8,
      status: 'placed',
    },
    {
      id: 'VEN-98418',
      customer: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
      vendor: 'StudioCraft Assets',
      date: 'Yesterday, 19:45',
      method: 'Visa •••• 8821',
      amount: 59.0,
      fee: 8.85,
      status: 'delivered',
    },
    {
      id: 'VEN-98415',
      customer: 'Michael Scott',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80',
      vendor: 'SoundWave Direct',
      date: 'Yesterday, 11:05',
      method: 'Cash on Delivery',
      amount: 159.0,
      fee: 11.13,
      status: 'in_transit',
    },
    {
      id: 'VEN-98410',
      customer: 'Amina Tariq',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&q=80',
      vendor: 'Nordic Woodworks',
      date: 'Oct 4, 18:30',
      method: 'Visa •••• 4949',
      amount: 450.0,
      fee: 45.0,
      status: 'delivered',
    },
  ];

  // ── Quick Governance Actions (Catmin Section 6) ────────────────────────────
  const quickActions = [
    {
      label: 'Approve Vendors',
      icon: <CheckSquare className="h-5 w-5" />,
      href: '/admin/vendors',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    },
    {
      label: 'Resolve Disputes',
      icon: <Scale className="h-5 w-5" />,
      href: '/admin/disputes',
      color: 'text-rose-600',
      bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
    },
    {
      label: 'Export Report',
      icon: <FileDown className="h-5 w-5" />,
      href: '/admin/reports',
      color: 'text-blue-600',
      bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      label: 'Commission Governance',
      icon: <Settings2 className="h-5 w-5" />,
      href: '/admin/commission',
      color: 'text-slate-700',
      bg: 'bg-slate-100 hover:bg-slate-200 border-slate-200',
    },
  ];

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Platform Governance & Control"
      subtitle="Catmin-styled multi-vendor oversight, revenue reconciliation, and vendor approvals."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6">
        {/* =====================================================================
            Top Catmin Page Title Row + Refresh
            ===================================================================== */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-xs text-slate-500">
              Platform overview, multi-vendor commission reconciliation, and store operations.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-xs hover:bg-slate-50 transition-colors text-slate-600"
              title="Refresh dashboard data"
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* =====================================================================
            1. Catmin 4-Card Executive KPI Grid
            ===================================================================== */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Card 1: Total Revenue */}
          <div className="rounded-xl border border-slate-200/80 bg-white text-slate-900 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex flex-row items-center justify-between p-6 pb-2">
              <span className="text-sm font-medium tracking-tight text-slate-600">Total Revenue</span>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold tracking-tight text-slate-900">$15.231,89</div>
              <p className="text-xs text-slate-400 mt-0.5">+20.1% from last month</p>
              <div className="mt-2 flex items-center text-xs font-semibold text-emerald-600">
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                <span>+20.1%</span>
              </div>
            </div>
          </div>

          {/* Card 2: New Customers / Active Vendors */}
          <div className="rounded-xl border border-slate-200/80 bg-white text-slate-900 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex flex-row items-center justify-between p-6 pb-2">
              <span className="text-sm font-medium tracking-tight text-slate-600">New Customers</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold tracking-tight text-slate-900">2,350</div>
              <p className="text-xs text-slate-400 mt-0.5">+180.1% from last month</p>
              <div className="mt-2 flex items-center text-xs font-semibold text-emerald-600">
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                <span>+180.1%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Active Accounts / Commission */}
          <div className="rounded-xl border border-slate-200/80 bg-white text-slate-900 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex flex-row items-center justify-between p-6 pb-2">
              <span className="text-sm font-medium tracking-tight text-slate-600">Active Accounts</span>
              <Percent className="h-4 w-4 text-slate-400" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold tracking-tight text-slate-900">12,234</div>
              <p className="text-xs text-slate-400 mt-0.5">+19% from last month</p>
              <div className="mt-2 flex items-center text-xs font-semibold text-emerald-600">
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                <span>+19%</span>
              </div>
            </div>
          </div>

          {/* Card 4: Growth Rate */}
          <div className="rounded-xl border border-slate-200/80 bg-white text-slate-900 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex flex-row items-center justify-between p-6 pb-2">
              <span className="text-sm font-medium tracking-tight text-slate-600">Growth Rate</span>
              <Activity className="h-4 w-4 text-slate-400" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold tracking-tight text-slate-900">18.6%</div>
              <p className="text-xs text-slate-400 mt-0.5">+5.4% from last month</p>
              <div className="mt-2 flex items-center text-xs font-semibold text-emerald-600">
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                <span>+5.4%</span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            2. Catmin Section 2: Subscriptions Chart (2 cols) + Budget Overview (1 col)
            ===================================================================== */}
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Subscriptions Bar Chart (xl:col-span-2) */}
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs p-6 xl:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-base font-semibold text-slate-900">Subscriptions</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-slate-900">+2350</h3>
                  <span className="text-xs text-slate-500">+80.1% from last month</span>
                </div>
              </div>

              {/* Range Selector */}
              <div className="flex items-center rounded-lg bg-slate-100 p-1">
                {(['7D', '30D', '90D', '1Y'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                      chartRange === r
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly Bar Chart */}
            <div className="mt-6 flex h-48 items-end justify-between gap-2 px-2 sm:px-6">
              {monthlyVolume.map((pt, idx) => (
                <div key={idx} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                  <div className="text-[10px] font-bold text-slate-400">
                    ${(pt.revenue / 1000).toFixed(0)}k
                  </div>
                  <div className="flex items-end gap-1.5 w-full justify-center h-32">
                    <div
                      className="w-4 sm:w-8 rounded-t-md bg-blue-600 transition-all duration-500 hover:bg-blue-700"
                      style={{ height: pt.height }}
                      title={`${pt.month}: ${pt.orders} orders ($${pt.revenue.toLocaleString()})`}
                    />
                    <div
                      className="w-2.5 sm:w-4 rounded-t-md bg-emerald-500 transition-all duration-500 hover:bg-emerald-600"
                      style={{ height: `${parseInt(pt.height) * 0.35}%` }}
                      title={`Commission: $${(pt.revenue * 0.1).toFixed(0)}`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{pt.month}</span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-6 border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="font-medium text-slate-600">Gross Marketplace Sales</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-slate-600">Platform Commission (10%)</span>
              </div>
            </div>
          </div>

          {/* Budget Overview Card (1 col) */}
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Budget Overview</h3>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                  Active Period
                </span>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-500">Total Spent</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">3,000</span>
                  <span className="text-sm text-slate-400">/ $3,650</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-emerald-600">82.2% of budget used</p>
              </div>

              {/* Category Breakdown */}
              <div className="mt-6 space-y-4">
                {budgetCategories.map((cat, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium text-slate-700">
                        {cat.icon}
                        <span>{cat.label}</span>
                      </div>
                      <span className="font-bold text-slate-900">{cat.pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-700"
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 text-center">
              Settlement reserves reviewed weekly
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. Catmin Section 3: Visitors Area Chart (1 col) + Your Accounts (1 col)
            ===================================================================== */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Visitors Area Chart */}
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Visitors</h3>
                <p className="text-xs text-slate-500">Showing total visitors for the last 3 months</p>
              </div>
              <span className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Last 3 months
              </span>
            </div>

            {/* SVG Area Chart Graphic */}
            <div className="mt-6 h-48 w-full">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 400 160">
                <defs>
                  <linearGradient id="desktopGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="mobileGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Desktop Area & Line */}
                <path
                  d="M 20 120 Q 80 40, 140 80 T 260 50 T 380 30 L 380 150 L 20 150 Z"
                  fill="url(#desktopGrad)"
                />
                <path
                  d="M 20 120 Q 80 40, 140 80 T 260 50 T 380 30"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Mobile Area & Line */}
                <path
                  d="M 20 140 Q 80 90, 140 110 T 260 85 T 380 60 L 380 150 L 20 150 Z"
                  fill="url(#mobileGrad)"
                />
                <path
                  d="M 20 140 Q 80 90, 140 110 T 260 85 T 380 60"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="4 3"
                />
              </svg>
            </div>

            {/* X Axis Labels */}
            <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-400 px-2">
              <span>Apr 3</span>
              <span>Apr 28</span>
              <span>May 16</span>
              <span>Jun 3</span>
              <span>Jun 30</span>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-6 border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="font-medium text-slate-600">Desktop</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-slate-600">Mobile</span>
              </div>
            </div>
          </div>

          {/* Your Accounts (Treasury Card) */}
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs p-6">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-xs text-slate-500">Total Balance</p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">$26,540.25</h2>
            </div>

            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Your Accounts
              </h3>
              <div className="space-y-3">
                {treasuryAccounts.map((acc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{acc.name}</div>
                      <div className="text-[11px] text-slate-400">{acc.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">{acc.balance}</div>
                      <div
                        className={`text-[10px] font-semibold ${
                          acc.isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {acc.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            4. Catmin Section 4: Recent Activity Table (23 transactions)
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Activity (23 transactions)</h3>
              <p className="text-xs text-slate-500">
                Split orders across multi-vendor marketplace with automated take-rate deduction
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-1 rounded-lg text-xs">
              <Link to="/admin/reports">
                <span>View Full Audit Log</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Vendor / Store</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Gross Total</th>
                  <th className="px-5 py-3">Platform Fee</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{tx.id}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={tx.avatar}
                          alt={tx.customer}
                          className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">{tx.customer}</div>
                          <div className="text-[10px] text-slate-400">{tx.date}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{tx.vendor}</td>
                    <td className="px-5 py-3.5 text-slate-500">{tx.method}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">${tx.amount.toFixed(2)}</td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600">+${tx.fee.toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      {tx.status === 'confirmed' && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                          Confirmed
                        </span>
                      )}
                      {tx.status === 'placed' && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          Placed
                        </span>
                      )}
                      {tx.status === 'delivered' && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Delivered
                        </span>
                      )}
                      {tx.status === 'in_transit' && (
                        <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                          In Transit
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button variant="outline" size="sm" asChild className="h-7 px-2.5 text-[11px] gap-1 rounded-md">
                        <Link to={`/admin/reports`}>
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* =====================================================================
            5. Catmin Section 5: Financial Goals & Governance Targets
            ===================================================================== */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {financialGoals.map((g, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{g.title}</h4>
                  <p className="text-[11px] text-slate-400">{g.subtitle}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Target className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-black text-slate-900">{g.target}</div>
                  <div className="text-[10px] text-slate-400">Target by {g.deadline}</div>
                </div>
                <span className="text-xs font-bold text-emerald-600">{g.pct}% complete</span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${g.color} transition-all duration-700`}
                  style={{ width: `${g.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* =====================================================================
            6. Catmin Quick Actions Governance Row
            ===================================================================== */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              to={action.href}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-xs font-bold transition-all shadow-xs hover:shadow-md ${action.bg}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs ${action.color}`}>
                {action.icon}
              </span>
              <span className="text-slate-800">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </WorkspaceLayout>
  );
};
