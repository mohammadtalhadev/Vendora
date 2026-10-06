import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Percent,
  Users,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ChevronRight,
  CheckSquare,
  Scale,
  FileDown,
  Settings2,
  Eye,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';

// ─── KPI card data type ──────────────────────────────────────────────────────
type KpiCard = {
  label: string;
  value: string;
  trendValue: string;
  trendLabel: string;
  trendPositive: boolean;
  progressPct: number;
  iconBg: string;
  iconColor: string;
  progressColor: string;
  icon: React.ReactNode;
  extra?: React.ReactNode;
};

export const AdminDashboardPage: React.FC = () => {
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');

  // ── Revenue bar chart data ──────────────────────────────────────────────────
  const revenuePoints = [
    { label: 'W1', sales: 68000, commission: 6800 },
    { label: 'W2', sales: 94000, commission: 9400 },
    { label: 'W3', sales: 82000, commission: 8200 },
    { label: 'W4', sales: 112000, commission: 11200 },
    { label: 'W5', sales: 126950, commission: 12695 },
  ];

  const maxSales = Math.max(...revenuePoints.map((p) => p.sales));

  // ── KPI cards ───────────────────────────────────────────────────────────────
  const kpiCards: KpiCard[] = [
    {
      label: 'Gross Marketplace Value',
      value: '$482,950',
      trendValue: '+18.2%',
      trendLabel: 'vs last month',
      trendPositive: true,
      progressPct: 82,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      progressColor: 'bg-emerald-500',
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      label: 'Platform Commission Earned',
      value: '$48,295',
      trendValue: '+10.0%',
      trendLabel: 'effective avg',
      trendPositive: true,
      progressPct: 68,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      progressColor: 'bg-blue-500',
      icon: <Percent className="h-5 w-5" />,
    },
    {
      label: 'Active Storefronts',
      value: '142 Active',
      trendValue: '4 Pending',
      trendLabel: 'approvals',
      trendPositive: false,
      progressPct: 55,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      progressColor: 'bg-purple-500',
      icon: <Users className="h-5 w-5" />,
      extra: (
        <Link to="/admin/vendors" className="text-[10px] font-bold text-blue-600 hover:underline">
          Review →
        </Link>
      ),
    },
    {
      label: 'Open Disputes',
      value: '6 Open',
      trendValue: '−12.5%',
      trendLabel: 'vs last month',
      trendPositive: true,
      progressPct: 30,
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      progressColor: 'bg-rose-500',
      icon: <AlertCircle className="h-5 w-5" />,
      extra: (
        <Link to="/admin/disputes" className="text-[10px] font-bold text-blue-600 hover:underline">
          Triage →
        </Link>
      ),
    },
  ];

  // ── Transactions ─────────────────────────────────────────────────────────────
  const recentTransactions = [
    {
      id: 'VEN-98421',
      customer: 'Sarah Jenkins',
      customerAvatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
      vendor: 'SoundWave Direct',
      date: 'Today, 14:22',
      paymentMethod: 'Card (Mastercard)',
      amount: 189.0,
      fee: 13.23,
      status: 'confirmed' as const,
    },
    {
      id: 'VEN-98420',
      customer: 'David Chen',
      customerAvatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
      vendor: 'Vendora Direct',
      date: 'Today, 13:10',
      paymentMethod: 'Card (Visa)',
      amount: 328.0,
      fee: 32.8,
      status: 'placed' as const,
    },
    {
      id: 'VEN-98418',
      customer: 'Elena Rostova',
      customerAvatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
      vendor: 'StudioCraft Assets',
      date: 'Yesterday, 19:45',
      paymentMethod: 'Card (Visa)',
      amount: 59.0,
      fee: 8.85,
      status: 'delivered' as const,
    },
    {
      id: 'VEN-98415',
      customer: 'Michael Scott',
      customerAvatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80',
      vendor: 'SoundWave Direct',
      date: 'Yesterday, 11:05',
      paymentMethod: 'Cash on Delivery',
      amount: 159.0,
      fee: 11.13,
      status: 'in_transit' as const,
    },
  ];

  type TxStatus = (typeof recentTransactions)[number]['status'];
  const statusConfig: Record<TxStatus, { label: string; cls: string }> = {
    confirmed: {
      label: 'Confirmed',
      cls: 'bg-blue-50 text-blue-700 border border-blue-200',
    },
    placed: {
      label: 'Placed',
      cls: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    delivered: {
      label: 'Delivered',
      cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    in_transit: {
      label: 'In Transit',
      cls: 'bg-purple-50 text-purple-700 border border-purple-200',
    },
  };

  // ── Quick Actions ─────────────────────────────────────────────────────────────
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
      label: 'System Settings',
      icon: <Settings2 className="h-5 w-5" />,
      href: '/admin/settings',
      color: 'text-slate-600',
      bg: 'bg-slate-50 hover:bg-slate-100 border-slate-200',
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
            1. Top Overview Banner & Status Alert
            ===================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Vendora Central Governance</h2>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  HEALTHY
                </span>
              </div>
              <p className="text-xs text-slate-500">
                142 active vendor partners • Escrow release cycle active • MSW mock database synchronized
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="gap-1.5 rounded-xl">
              <Link to="/admin/vendors">
                <Users className="h-4 w-4 text-slate-500" />
                <span>Vendor Approvals (4)</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5 rounded-xl">
              <Link to="/admin/commission">
                <Percent className="h-4 w-4 text-slate-500" />
                <span>Commission Settings</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* =====================================================================
            2. Executive KPI Cards — Catmin-style enriched
            ===================================================================== */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
            >
              {/* Header row: label + colored icon circle */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  {card.label}
                </span>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.iconBg} ${card.iconColor}`}
                >
                  {card.icon}
                </span>
              </div>

              {/* Large bold number */}
              <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                {card.value}
              </div>

              {/* Trend pill */}
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-bold ${
                    card.trendPositive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {card.trendPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {card.trendValue}
                </span>
                <span className="text-slate-400">{card.trendLabel}</span>
                {card.extra}
              </div>

              {/* Subtle progress bar */}
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${card.progressColor} transition-all duration-700`}
                  style={{ width: `${card.progressPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* =====================================================================
            3. Revenue Analytics Chart — taller bars + total labels + legend dots
            ===================================================================== */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Marketplace Volume & Commission Growth
              </h3>
              <p className="text-xs text-slate-500">
                Simulated multi-vendor sales split over time
              </p>
            </div>

            {/* Range Selector Tabs */}
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

          {/* Bar Chart */}
          <div className="mt-6 flex h-64 items-end justify-between gap-3 px-2 sm:px-6">
            {revenuePoints.map((pt, idx) => {
              const salesH = Math.round((pt.sales / maxSales) * 100);
              const commH = Math.round((pt.commission / maxSales) * 100);
              return (
                <div key={idx} className="flex flex-1 flex-col items-center gap-1.5">
                  {/* Total label above bar group */}
                  <span className="text-[10px] font-bold text-slate-500">
                    ${(pt.sales / 1000).toFixed(0)}k
                  </span>

                  {/* Dual bars */}
                  <div className="flex w-full items-end justify-center gap-1.5" style={{ height: '200px' }}>
                    <div
                      className="w-5 rounded-t-lg bg-blue-600 transition-all duration-700 hover:bg-blue-700 sm:w-9 cursor-pointer"
                      style={{ height: `${salesH}%` }}
                      title={`Sales: $${pt.sales.toLocaleString()}`}
                    />
                    <div
                      className="w-3 rounded-t-lg bg-emerald-500 transition-all duration-700 hover:bg-emerald-600 sm:w-6 cursor-pointer"
                      style={{ height: `${commH}%` }}
                      title={`Commission: $${pt.commission.toLocaleString()}`}
                    />
                  </div>

                  <span className="text-xs font-semibold text-slate-600">{pt.label}</span>
                </div>
              );
            })}
          </div>

          {/* Legend with colored dots */}
          <div className="mt-4 flex items-center justify-center gap-6 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-600" />
              <span className="font-medium text-slate-600">Gross Marketplace Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="font-medium text-slate-600">Platform Commission (avg 10%)</span>
            </div>
          </div>
        </div>

        {/* =====================================================================
            4. Recent Marketplace Transactions — with Actions column
            ===================================================================== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Marketplace Transactions</h3>
              <p className="text-xs text-slate-500">
                Orders split across vendors with recorded commission deduction
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-1 rounded-xl text-xs">
              <Link to="/admin/reports">
                <span>View Full Audit Log</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Vendor / Store</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Gross Total</th>
                  <th className="px-5 py-3">Commission Fee</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => {
                  const s = statusConfig[tx.status];
                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{tx.id}</td>

                      {/* Customer with avatar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={tx.customerAvatar}
                            alt={tx.customer}
                            className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                          />
                          <div>
                            <div className="font-semibold text-slate-800">{tx.customer}</div>
                            <div className="text-[10px] text-slate-400">{tx.date}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-medium text-slate-700">{tx.vendor}</td>
                      <td className="px-5 py-3.5 text-slate-500">{tx.paymentMethod}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        ${tx.amount.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600">
                        +${tx.fee.toFixed(2)}
                      </td>

                      {/* Status pill — rounded-full */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${s.cls}`}
                        >
                          {s.label}
                        </span>
                      </td>

                      {/* Actions column — outline View button */}
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/admin/orders/${tx.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* =====================================================================
            5. Quick Actions Row
            ===================================================================== */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 text-center transition-all ${action.bg}`}
              >
                <span className={`${action.color}`}>{action.icon}</span>
                <span className={`text-xs font-bold ${action.color}`}>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
