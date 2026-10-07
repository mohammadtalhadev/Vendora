import React, { useState } from 'react';
import {
  Store,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  ChevronRight,
  Download,
  Plus,
  RotateCw,
  LayoutGrid,
  List,
  ChevronDown,
  Check,
  AlertTriangle,
  Award,
  TrendingUp,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

interface VendorItem {
  id: string;
  storeName: string;
  category: string;
  subdomain: string;
  ownerName: string;
  countryCode: string;
  email: string;
  kycStatus: 'Verified' | 'Pending Review' | 'Investigation';
  performanceTier: 'Tier 1 Elite' | 'Tier 2 Verified' | 'Tier 3 Standard';
  revenue: string;
  trend: string;
  trendType: 'positive' | 'neutral' | 'frozen';
}

const INITIAL_VENDORS: VendorItem[] = [
  {
    id: 'v-1',
    storeName: 'Nova Electro...',
    category: 'CONSUMER TECH',
    subdomain: 'nova-elec.vendora.shop',
    ownerName: 'Marcus Vance',
    countryCode: 'US',
    email: 'marcus@novaelectronics.io',
    kycStatus: 'Verified',
    performanceTier: 'Tier 1 Elite',
    revenue: '$58,400',
    trend: '+14%',
    trendType: 'positive',
  },
  {
    id: 'v-2',
    storeName: 'Aura Apparel',
    category: 'FASHION',
    subdomain: 'aura-apparel.vendora.shop',
    ownerName: 'Elena Rostova',
    countryCode: 'FR',
    email: 'elena@aurastyle.fr',
    kycStatus: 'Verified',
    performanceTier: 'Tier 2 Verified',
    revenue: '$41,290',
    trend: '+8%',
    trendType: 'positive',
  },
  {
    id: 'v-3',
    storeName: 'Nexus Tech Hub',
    category: 'HARDWARE',
    subdomain: 'nexustech.vendora.shop',
    ownerName: 'Tariq Mansour',
    countryCode: 'AE',
    email: 'tariq@nexusglobal.ae',
    kycStatus: 'Pending Review',
    performanceTier: 'Tier 3 Standard',
    revenue: '$18,920',
    trend: 'In escrow',
    trendType: 'neutral',
  },
  {
    id: 'v-4',
    storeName: 'Urban Nomad ...',
    category: 'HOME & LIVING',
    subdomain: 'urbannomad.vendora.shop',
    ownerName: 'Chloe Davenport',
    countryCode: 'UK',
    email: 'chloe@urbannomad.co.uk',
    kycStatus: 'Verified',
    performanceTier: 'Tier 1 Elite',
    revenue: '$72,810',
    trend: '+22%',
    trendType: 'positive',
  },
  {
    id: 'v-5',
    storeName: 'Artisan Kitchen',
    category: 'COOKWARE',
    subdomain: 'artisankitchen.vendora.shop',
    ownerName: 'Marco Bellini',
    countryCode: 'IT',
    email: 'marco@bellini-kitchen.it',
    kycStatus: 'Verified',
    performanceTier: 'Tier 2 Verified',
    revenue: '$34,500',
    trend: '+5%',
    trendType: 'positive',
  },
  {
    id: 'v-6',
    storeName: 'Apex Tech',
    category: 'FLAGGED',
    subdomain: 'apextech-direct.vendora.shop',
    ownerName: 'Arthur Pendelton',
    countryCode: 'CA',
    email: 'art@apexsupplies.ca',
    kycStatus: 'Investigation',
    performanceTier: 'Tier 3 Standard',
    revenue: '$8,210',
    trend: 'Payouts Frozen',
    trendType: 'frozen',
  },
  {
    id: 'v-7',
    storeName: 'Lumina Beauty',
    category: 'COSMETICS',
    subdomain: 'lumina-skincare.vendora.shop',
    ownerName: 'Aya Tanaka',
    countryCode: 'JP',
    email: 'tanaka@luminacosmetics.jp',
    kycStatus: 'Verified',
    performanceTier: 'Tier 2 Verified',
    revenue: '$29,140',
    trend: '+11%',
    trendType: 'positive',
  },
  {
    id: 'v-8',
    storeName: 'Peak Outdo...',
    category: 'SPORTING GOODS',
    subdomain: 'peakoutdoors.vendora.shop',
    ownerName: 'Stefan Lindqvist',
    countryCode: 'SE',
    email: 'stefan@peakgear.se',
    kycStatus: 'Verified',
    performanceTier: 'Tier 1 Elite',
    revenue: '$63,220',
    trend: '+19%',
    trendType: 'positive',
  },
];

export const AdminVendorsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'pending' | 'suspended' | 'top'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedTier, setSelectedTier] = useState('All Tiers');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const toggleSelectAll = () => {
    if (selectedIds.length === INITIAL_VENDORS.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(INITIAL_VENDORS.map((v) => v.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredVendors = INITIAL_VENDORS.filter((vendor) => {
    const matchesSearch =
      vendor.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'active' && vendor.kycStatus !== 'Verified') return false;
    if (activeTab === 'pending' && vendor.kycStatus !== 'Pending Review') return false;
    if (activeTab === 'suspended' && vendor.kycStatus !== 'Investigation') return false;
    if (activeTab === 'top' && vendor.performanceTier !== 'Tier 1 Elite') return false;

    if (selectedStatus === 'Verified' && vendor.kycStatus !== 'Verified') return false;
    if (selectedStatus === 'Pending' && vendor.kycStatus !== 'Pending Review') return false;
    if (selectedStatus === 'Investigation' && vendor.kycStatus !== 'Investigation') return false;

    if (selectedTier === 'Tier 1' && vendor.performanceTier !== 'Tier 1 Elite') return false;
    if (selectedTier === 'Tier 2' && vendor.performanceTier !== 'Tier 2 Verified') return false;
    if (selectedTier === 'Tier 3' && vendor.performanceTier !== 'Tier 3 Standard') return false;

    return true;
  });

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
      <div className="space-y-6">
        {/* Breadcrumb & Sync Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span>Marketplace</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800">Vendors</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-600">
              KYC REGISTRY V2.4
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-sync enabled</span>
            <span className="text-slate-300">•</span>
            <span>Last updated 2m ago</span>
          </div>
        </div>

        {/* Page Title & Action Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Vendor Management</h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Monitor active sellers, manage KYC onboarding verification, evaluate performance metrics, and review store compliance.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors">
              <Download className="h-4 w-4 text-slate-500" />
              Export Merchants
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors">
              <Plus className="h-4 w-4" />
              Onboard Vendor
            </button>
          </div>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Vendors */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>TOTAL VENDORS</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <Store className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">1,280</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                +8.4%
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span><strong className="text-slate-800">1,142</strong> active</span>
              <span className="text-slate-300">•</span>
              <span><strong className="text-slate-800">84</strong> onboarding</span>
            </div>
            {/* Progress Segment */}
            <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="bg-slate-900" style={{ width: '85%' }} />
              <div className="bg-[#FF7A1A]" style={{ width: '15%' }} />
            </div>
          </div>

          {/* Card 2: Pending Verification */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>PENDING VERIFICATION</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">28</span>
              <span className="rounded bg-amber-100/80 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                URGENT ATTENTION
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Avg. 18h compliance review window</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
              <span>SLA Met (88%)</span>
              <span className="font-bold text-amber-700">4 overdue</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '88%' }} />
            </div>
          </div>

          {/* Card 3: Avg Merchant Health */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>AVG MERCHANT HEALTH</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">96.2%</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                +1.4%
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              <strong className="text-slate-800">98.1%</strong> fulfillment SLA integrity
            </div>
            <div className="mt-5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: '96.2%' }} />
            </div>
          </div>

          {/* Card 4: GMV Contributed (30D) */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>GMV CONTRIBUTED (30D)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">$482,900</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                +14.2%
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              Avg <strong className="text-slate-800">$377.20</strong> per store per month
            </div>
            <div className="mt-5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '82%' }} />
            </div>
          </div>
        </div>

        {/* Tab Filters Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center rounded-xl bg-slate-100/90 p-1 text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All Vendors</span>
              <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                1,280
              </span>
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
                activeTab === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Active</span>
              <span className="text-slate-500 font-normal">1,142</span>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
                activeTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending Verification</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                28
              </span>
            </button>
            <button
              onClick={() => setActiveTab('suspended')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
                activeTab === 'suspended'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Suspended / Flagged</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                14
              </span>
            </button>
            <button
              onClick={() => setActiveTab('top')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
                activeTab === 'top'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Top Performers</span>
              <span className="text-slate-500 font-normal">120</span>
            </button>
          </div>

          {/* List / Grid view switcher */}
          <div className="flex items-center gap-1 self-end sm:self-auto rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendors by store name, owner, email..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-12 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-hidden"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              ⌘ K
            </kbd>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden"
              >
                <option>Status: All Statuses</option>
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="Investigation">Investigation</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Tier Dropdown */}
            <div className="relative">
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden"
              >
                <option>Tier: All Tiers</option>
                <option value="Tier 1">Tier 1 Elite</option>
                <option value="Tier 2">Tier 2 Verified</option>
                <option value="Tier 3">Tier 3 Standard</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden"
              >
                <option>Category: All Categories</option>
                <option>Consumer Tech</option>
                <option>Fashion</option>
                <option>Hardware</option>
                <option>Home & Living</option>
                <option>Cookware</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('All Statuses');
                setSelectedTier('All Tiers');
                setSelectedCategory('All Categories');
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
              title="Reset Filters"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Vendors Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === INITIAL_VENDORS.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </th>
                  <th className="px-4 py-3.5">VENDOR / STORE</th>
                  <th className="px-4 py-3.5">OWNER / CONTACT</th>
                  <th className="px-4 py-3.5">KYC STATUS</th>
                  <th className="px-4 py-3.5">PERFORMANCE TIER</th>
                  <th className="px-4 py-3.5 text-right">REVENUE (30D GMV)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVendors.map((vendor) => {
                  const isChecked = selectedIds.includes(vendor.id);
                  return (
                    <tr
                      key={vendor.id}
                      className={`transition-colors hover:bg-slate-50/70 ${isChecked ? 'bg-slate-50/90' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(vendor.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </td>

                      {/* Vendor / Store */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-bold text-xs uppercase shadow-2xs">
                            {vendor.storeName.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 truncate">
                                {vendor.storeName}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                                  vendor.category === 'FLAGGED'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {vendor.category}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal truncate">
                              {vendor.subdomain}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner / Contact */}
                      <td className="px-4 py-3.5">
                        <div>
                          <div className="font-semibold text-slate-900">{vendor.ownerName}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="font-bold text-slate-700">{vendor.countryCode}</span>
                            <span className="text-slate-400 truncate">{vendor.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* KYC Status */}
                      <td className="px-4 py-3.5">
                        {vendor.kycStatus === 'Verified' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Verified
                          </span>
                        )}
                        {vendor.kycStatus === 'Pending Review' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            <Clock className="h-3 w-3 text-amber-500" />
                            Pending Review
                          </span>
                        )}
                        {vendor.kycStatus === 'Investigation' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                            <AlertTriangle className="h-3 w-3 text-rose-500" />
                            Investigation
                          </span>
                        )}
                      </td>

                      {/* Performance Tier */}
                      <td className="px-4 py-3.5">
                        {vendor.performanceTier === 'Tier 1 Elite' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <Award className="h-3.5 w-3.5 text-slate-700" />
                            Tier 1 Elite
                          </span>
                        )}
                        {vendor.performanceTier === 'Tier 2 Verified' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <Check className="h-3.5 w-3.5 text-slate-500" />
                            Tier 2 Verified
                          </span>
                        )}
                        {vendor.performanceTier === 'Tier 3 Standard' && (
                          <span className="text-xs font-medium text-slate-500">
                            Tier 3 Standard
                          </span>
                        )}
                      </td>

                      {/* Revenue (30D GMV) */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-bold text-slate-900">{vendor.revenue}</div>
                        <div
                          className={`text-[11px] font-semibold ${
                            vendor.trendType === 'positive'
                              ? 'text-emerald-600'
                              : vendor.trendType === 'frozen'
                              ? 'text-rose-600 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {vendor.trend}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>
                Showing <strong>1-8</strong> of <strong>1,280</strong> merchant records
              </span>
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 focus:outline-hidden">
                  <option>8</option>
                  <option>16</option>
                  <option>32</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                |&lt;
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                &lt;
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white">
                1
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">
                2
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">
                3
              </button>
              <span className="px-1 text-slate-400">...</span>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">
                160
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                &gt;
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                &gt;|
              </button>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
