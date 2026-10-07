import React, { useState } from 'react';
import {
  ChevronRight,
  Clock,
  Plus,
  Percent,
  Wallet,
  Tag,
  SlidersHorizontal,
  Crown,
  BarChart3,
  Rocket,
  Check,
  Zap,
  Info,
  Search,
  Filter,
  Laptop,
  Gem,
  Shirt,
  BookOpen,
  Download,
  Calendar,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

interface CategoryOverride {
  id: string;
  categoryName: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  baseTierFee: string;
  categoryOverride: string;
  fixedOrderFee: string;
  merchantsCount: number;
  status: 'Active' | 'Exp in 6d';
}

const CATEGORY_OVERRIDES: CategoryOverride[] = [
  {
    id: 'cat-1',
    categoryName: 'Consumer Electronics',
    subtext: 'High-ticket hardware',
    icon: Laptop,
    baseTierFee: '12.0%',
    categoryOverride: '6.5%',
    fixedOrderFee: '$0.45',
    merchantsCount: 218,
    status: 'Active',
  },
  {
    id: 'cat-2',
    categoryName: 'Fine Jewelry & Watches',
    subtext: 'Luxury verified',
    icon: Gem,
    baseTierFee: '12.0%',
    categoryOverride: '9.0%',
    fixedOrderFee: '$1.50',
    merchantsCount: 64,
    status: 'Active',
  },
  {
    id: 'cat-3',
    categoryName: 'Streetwear Apparel',
    subtext: 'Seasonal discounts',
    icon: Shirt,
    baseTierFee: '12.0%',
    categoryOverride: '10.0%',
    fixedOrderFee: '$0.25',
    merchantsCount: 540,
    status: 'Exp in 6d',
  },
  {
    id: 'cat-4',
    categoryName: 'Media Publications',
    subtext: 'Books & prints',
    icon: BookOpen,
    baseTierFee: '12.0%',
    categoryOverride: '14.5%',
    fixedOrderFee: '$0.15',
    merchantsCount: 112,
    status: 'Active',
  },
];

interface FeeAdjustmentEvent {
  id: string;
  timestamp: string;
  merchantName: string;
  adjustmentType: string;
  adjustmentBadgeStyle: string;
  priorRate: string;
  newRate: string;
  authorizedBy: string;
  auditStatus: 'Verified' | 'System Audit';
}

const RECENT_ADJUSTMENTS: FeeAdjustmentEvent[] = [
  {
    id: 'adj-1',
    timestamp: 'Oct 24, 14:32 UTC',
    merchantName: 'Nordic Living Studio',
    adjustmentType: 'Enterprise Contract Waiver',
    adjustmentBadgeStyle: 'bg-slate-100 text-slate-700',
    priorRate: '12.0% + $0.30',
    newRate: '7.0% + $0.20',
    authorizedBy: 'Sarah Chen (VP Commercial)',
    auditStatus: 'Verified',
  },
  {
    id: 'adj-2',
    timestamp: 'Oct 23, 09:14 UTC',
    merchantName: 'Apex Footwear Official',
    adjustmentType: 'Promotional Launch Grant',
    adjustmentBadgeStyle: 'bg-blue-50 text-blue-700',
    priorRate: '15.0% + $0.40',
    newRate: '5.0% (30 Days)',
    authorizedBy: 'Alex Mercer (Growth)',
    auditStatus: 'Verified',
  },
  {
    id: 'adj-3',
    timestamp: 'Oct 21, 18:05 UTC',
    merchantName: 'Komorebi Ceramics',
    adjustmentType: 'Tier Downgrade Grace',
    adjustmentBadgeStyle: 'bg-amber-50 text-amber-700',
    priorRate: '15.0% + $0.40',
    newRate: '12.0% + $0.30',
    authorizedBy: 'System (Auto Extension)',
    auditStatus: 'System Audit',
  },
];

export const AdminCommissionPage: React.FC = () => {
  const [categorySearch, setCategorySearch] = useState('');

  const filteredOverrides = CATEGORY_OVERRIDES.filter((cat) =>
    cat.categoryName.toLowerCase().includes(categorySearch.toLowerCase()) ||
    cat.subtext.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>MARKETPLACE</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800">COMMISSION</span>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Commission & Fee Rules</h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Configure platform take rates, vendor tier discounts, transaction fee rules, and monitor marketplace fee revenue.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors">
              <Clock className="h-4 w-4 text-slate-500" />
              Fee Adjustment History
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors">
              <Plus className="h-4 w-4" />
              Create Commission Rule
            </button>
          </div>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Fees Collected */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Total Fees Collected (30d)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">$64,820.40</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                +16.5% MoM
              </span>
              <span className="text-xs text-slate-500 font-medium">eff. 11.8%</span>
            </div>
          </div>

          {/* Card 2: Avg Marketplace Take Rate */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Avg Marketplace Take Rate</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">12.2%</div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Across 1,280 active merchants
            </div>
          </div>

          {/* Card 3: Tier Discounts Applied */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Tier Discounts Applied</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <Tag className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">$8,410.00</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                Volume reduction
              </span>
              <span>for Elite sellers</span>
            </div>
          </div>

          {/* Card 4: Pending Settlements */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Pending Settlements</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">$14,290.10</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                Bi-weekly sweep
              </span>
              <span>in 2 days</span>
            </div>
          </div>
        </div>

        {/* Default Seller Volume Tiers */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Default Seller Volume Tiers</h2>
              <p className="text-xs text-slate-500">
                Automated bracket assignments computed on rolling 30-day gross merchandise volume.
              </p>
            </div>
            <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Edit tier logic
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Tier 1 Card */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Tier 1: High Volume</span>
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                      Preferred Rate
                    </span>
                  </div>
                  <Crown className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-1 text-xs text-slate-500">Sellers with GMV exceeding $50k/month</p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-900">8.5%</span>
                  <span className="text-xs text-slate-500">+ $0.30 / transaction</span>
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100">
                  <span className="text-slate-400">Merchant Count: </span>
                  <strong className="text-slate-800">94 merchants</strong>
                  <span className="text-slate-500"> (38.4% GMV)</span>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                  <Check className="h-3.5 w-3.5" />
                  Auto-qualified monthly
                </span>
                <button className="font-bold text-slate-900 hover:underline">Configure</button>
              </div>
            </div>

            {/* Tier 2 Card */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Tier 2: Standard Growth</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      Default Core
                    </span>
                  </div>
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-1 text-xs text-slate-500">Sellers with GMV between $10k - $50k/mo</p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-900">12.0%</span>
                  <span className="text-xs text-slate-500">+ $0.30 / transaction</span>
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100">
                  <span className="text-slate-400">Merchant Count: </span>
                  <strong className="text-slate-800">412 merchants</strong>
                  <span className="text-slate-500"> (46.1% GMV)</span>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="inline-flex items-center gap-1 text-slate-600 font-medium text-[11px]">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Standard qualification
                </span>
                <button className="font-bold text-slate-900 hover:underline">Configure</button>
              </div>
            </div>

            {/* Tier 3 Card */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Tier 3: Starter & Launch</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      New Sellers
                    </span>
                  </div>
                  <Rocket className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-1 text-xs text-slate-500">Initial onboarding tier under $10k/month</p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-900">15.0%</span>
                  <span className="text-xs text-slate-500">+ $0.40 / transaction</span>
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100">
                  <span className="text-slate-400">Merchant Count: </span>
                  <strong className="text-slate-800">774 merchants</strong>
                  <span className="text-slate-500"> (15.5% GMV)</span>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-[11px]">
                  <Info className="h-3.5 w-3.5 text-slate-400" />
                  Standard gateway charge
                </span>
                <button className="font-bold text-slate-900 hover:underline">Configure</button>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Category Overrides & Revenue Waterfall */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (8 cols): Category Specific Overrides */}
          <div className="lg:col-span-8 space-y-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Category Specific Overrides</h2>
              <p className="text-xs text-slate-500">
                Preempt standard tier commission rates for specialized product categories.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Filter categories..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                  />
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
                  <Filter className="h-3 w-3 text-slate-500" />
                  Filter
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">CATEGORY</th>
                      <th className="px-4 py-3">BASE TIER FEE</th>
                      <th className="px-4 py-3">CATEGORY OVERRIDE</th>
                      <th className="px-4 py-3">FIXED ORDER FEE</th>
                      <th className="px-4 py-3">MERCHANTS</th>
                      <th className="px-4 py-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOverrides.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{cat.categoryName}</div>
                                <div className="text-[10px] text-slate-400">{cat.subtext}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-400 line-through">
                            {cat.baseTierFee}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {cat.categoryOverride}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {cat.fixedOrderFee}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-600">
                            {cat.merchantsCount}
                          </td>
                          <td className="px-4 py-3">
                            {cat.status === 'Active' ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                Active
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                Exp in 6d
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
                <span>Showing 4 of 18 configured category rules</span>
                <div className="flex items-center gap-1">
                  <button className="h-6 w-6 rounded border border-slate-200 bg-white text-center text-slate-500 hover:bg-slate-50">
                    &lt;
                  </button>
                  <button className="h-6 w-6 rounded bg-slate-900 text-center font-bold text-white">
                    1
                  </button>
                  <button className="h-6 w-6 rounded border border-slate-200 bg-white text-center font-semibold text-slate-600 hover:bg-slate-50">
                    2
                  </button>
                  <button className="h-6 w-6 rounded border border-slate-200 bg-white text-center text-slate-500 hover:bg-slate-50">
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Revenue Waterfall */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Revenue Waterfall</h2>
                <p className="text-xs text-slate-500">Platform capture and processor fee leakage analysis.</p>
              </div>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                LAST 30 DAYS
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Gross Marketplace GMV</span>
                  <span className="font-bold text-slate-900">$548,200.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Gross Platform Fees (11.8%)</span>
                  <span className="font-bold text-slate-900">$64,820.40</span>
                </div>
                <div className="flex items-center justify-between text-rose-600">
                  <span className="font-medium">Payment Processing Costs (Stripe)</span>
                  <span className="font-bold">-$15,800.00</span>
                </div>
                <div className="h-1 w-full bg-rose-500 rounded-full" />

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">Net Commission Retained</div>
                    <div className="text-[11px] text-emerald-600 font-bold">Net Margin on GMV: 8.94%</div>
                  </div>
                  <span className="text-xl font-black text-slate-900">$49,020.40</span>
                </div>
              </div>

              {/* 30-Day Capture Velocity mini bar chart */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  30-DAY CAPTURE VELOCITY
                </div>
                <div className="mt-3 flex items-end gap-1.5 h-12">
                  <div className="flex-1 bg-slate-100 rounded-xs h-3" />
                  <div className="flex-1 bg-slate-100 rounded-xs h-4" />
                  <div className="flex-1 bg-slate-200 rounded-xs h-5" />
                  <div className="flex-1 bg-slate-200 rounded-xs h-7" />
                  <div className="flex-1 bg-slate-300 rounded-xs h-8" />
                  <div className="flex-1 bg-slate-400 rounded-xs h-10" />
                  <div className="flex-1 bg-slate-900 rounded-xs h-12" />
                </div>
              </div>

              <button className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors">
                <Download className="h-3.5 w-3.5 text-slate-500" />
                Download Ledger Report
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent Fee Adjustments & Seller Exemptions */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Fee Adjustments & Seller Exemptions
              </h2>
              <p className="text-xs text-slate-500">
                Audit trail of manual overrides, customized enterprise contracts, and temporary promotional fee waivers.
              </p>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              All Events
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">TIMESTAMP</th>
                    <th className="px-4 py-3">MERCHANT</th>
                    <th className="px-4 py-3">ADJUSTMENT TYPE</th>
                    <th className="px-4 py-3">PRIOR RATE</th>
                    <th className="px-4 py-3">NEW RATE</th>
                    <th className="px-4 py-3">AUTHORIZED BY</th>
                    <th className="px-4 py-3">AUDIT STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {RECENT_ADJUSTMENTS.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {event.timestamp}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {event.merchantName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${event.adjustmentBadgeStyle}`}
                        >
                          {event.adjustmentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{event.priorRate}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{event.newRate}</td>
                      <td className="px-4 py-3 text-slate-600">{event.authorizedBy}</td>
                      <td className="px-4 py-3">
                        {event.auditStatus === 'Verified' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            System Audit
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
      </div>
    </WorkspaceLayout>
  );
};
