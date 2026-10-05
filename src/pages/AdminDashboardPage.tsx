import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Percent,
  Users,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';

export const AdminDashboardPage: React.FC = () => {
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');

  // Catmin Simulated Revenue Data
  const revenuePoints = [
    { label: 'W1', sales: 68000, commission: 6800, height: '55%' },
    { label: 'W2', sales: 94000, commission: 9400, height: '78%' },
    { label: 'W3', sales: 82000, commission: 8200, height: '65%' },
    { label: 'W4', sales: 112000, commission: 11200, height: '92%' },
    { label: 'W5', sales: 126950, commission: 12695, height: '100%' },
  ];

  // Recent Marketplace Transactions
  const recentTransactions = [
    {
      id: 'VEN-98421',
      customer: 'Sarah Jenkins',
      customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
      vendor: 'SoundWave Direct',
      date: 'Today, 14:22',
      itemsCount: 1,
      paymentMethod: 'Card (Mastercard)',
      amount: 189.0,
      fee: 13.23, // 7% override
      status: 'confirmed',
    },
    {
      id: 'VEN-98420',
      customer: 'David Chen',
      customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
      vendor: 'Vendora Direct',
      date: 'Today, 13:10',
      itemsCount: 2,
      paymentMethod: 'Card (Visa)',
      amount: 328.0,
      fee: 32.8, // 10% standard
      status: 'placed',
    },
    {
      id: 'VEN-98418',
      customer: 'Elena Rostova',
      customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
      vendor: 'StudioCraft Assets',
      date: 'Yesterday, 19:45',
      itemsCount: 1,
      paymentMethod: 'Card (Visa)',
      amount: 59.0,
      fee: 8.85, // 15% digital
      status: 'delivered',
    },
    {
      id: 'VEN-98415',
      customer: 'Michael Scott',
      customerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80',
      vendor: 'SoundWave Direct',
      date: 'Yesterday, 11:05',
      itemsCount: 1,
      paymentMethod: 'Cash on Delivery',
      amount: 159.0,
      fee: 11.13,
      status: 'in_transit',
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
        {/* =========================================================================
            1. Top Overview Banner & Status Alert
            ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Vendora Central Governance</h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200">
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

        {/* =========================================================================
            2. Executive KPI Cards (Catmin 4-Card Grid)
            ========================================================================= */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: GMV */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Gross Marketplace Value
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                $482,950.00
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <span className="flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" />
                  +18.2%
                </span>
                <span className="text-slate-400">vs last month</span>
              </div>
            </div>
          </div>

          {/* Card 2: Commission Earned */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Platform Commission Earned
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Percent className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                $48,295.00
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-600">Effective avg: 10.0%</span>
                <span className="text-slate-400">• Net platform revenue</span>
              </div>
            </div>
          </div>

          {/* Card 3: Active Vendors */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Storefronts
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Users className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                142 Active
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-bold text-amber-700">
                  4 Pending Approvals
                </span>
                <Link to="/admin/vendors" className="text-blue-600 hover:underline">
                  Review →
                </Link>
              </div>
            </div>
          </div>

          {/* Card 4: Open Customer Disputes */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Open Disputes
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <AlertCircle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                6 Open
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <span className="rounded-md bg-rose-50 px-1.5 py-0.5 font-bold text-rose-700">
                  2 SLA Warnings
                </span>
                <Link to="/admin/disputes" className="text-blue-600 hover:underline">
                  Triage →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. Revenue Analytics Chart & Period Range Tabs (Catmin Style)
            ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Marketplace Volume & Commission Growth</h3>
              <p className="text-xs text-slate-500">Simulated multi-vendor sales split over time</p>
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

          {/* Bar Chart Visualization */}
          <div className="mt-6 flex h-48 items-end justify-between gap-4 px-2 sm:px-6">
            {revenuePoints.map((pt, idx) => (
              <div key={idx} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                <div className="text-[10px] font-bold text-slate-500">
                  ${(pt.sales / 1000).toFixed(0)}k
                </div>
                {/* Dual Bars: Gross (Blue) + Commission (Emerald) */}
                <div className="flex items-end gap-1.5 w-full justify-center h-32">
                  <div
                    className="w-5 sm:w-10 rounded-t-lg bg-blue-600 transition-all duration-500 hover:bg-blue-700"
                    style={{ height: pt.height }}
                    title={`Sales: $${pt.sales.toLocaleString()}`}
                  />
                  <div
                    className="w-3 sm:w-6 rounded-t-lg bg-emerald-500 transition-all duration-500 hover:bg-emerald-600"
                    style={{ height: `${parseInt(pt.height) * 0.4}%` }}
                    title={`Commission: $${pt.commission.toLocaleString()}`}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600">{pt.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-blue-600" />
              <span className="font-medium text-slate-600">Gross Marketplace Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-emerald-500" />
              <span className="font-medium text-slate-600">Platform Commission (avg 10%)</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. Recent Orders & Split Transactions Table (Catmin Style Table)
            ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Marketplace Transactions</h3>
              <p className="text-xs text-slate-500">Orders split across vendors with recorded commission deduction</p>
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
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Vendor / Store</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Gross Total</th>
                  <th className="px-5 py-3">Commission Fee</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {tx.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={tx.customerAvatar}
                          alt={tx.customer}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                        <span className="font-medium text-slate-800">{tx.customer}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {tx.vendor}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {tx.paymentMethod}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600">
                      +${tx.fee.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      {tx.status === 'confirmed' && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                          Confirmed
                        </span>
                      )}
                      {tx.status === 'placed' && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          Placed
                        </span>
                      )}
                      {tx.status === 'delivered' && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Delivered
                        </span>
                      )}
                      {tx.status === 'in_transit' && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                          In Transit
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
