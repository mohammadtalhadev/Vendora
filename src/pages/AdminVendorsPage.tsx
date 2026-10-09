import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Check,
  AlertTriangle,
  Award,
  TrendingUp,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { exportToCsv } from '../lib/export-csv';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

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
  const [vendors, setVendors] = useState<VendorItem[]>(INITIAL_VENDORS);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'pending' | 'suspended' | 'top'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedTier, setSelectedTier] = useState('All Tiers');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);

  // Form state
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCategory, setNewCategory] = useState('CONSUMER TECH');
  const [newCountry, setNewCountry] = useState('US');

  const [suspendModalVendor, setSuspendModalVendor] = useState<VendorItem | null>(null);
  const [suspendReasonCategory, setSuspendReasonCategory] = useState('Policy Violation & Prohibited Items');
  const [suspendNotes, setSuspendNotes] = useState('');
  const [freezeEscrow, setFreezeEscrow] = useState(true);
  const [delistCatalog, setDelistCatalog] = useState(true);
  const [notifyVendorEmail, setNotifyVendorEmail] = useState(true);

  const toggleSelectAll = () => {
    if (selectedIds.length === vendors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(vendors.map((v) => v.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleVerifyKyc = (id: string) => {
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, kycStatus: 'Verified' as const } : v))
    );
  };

  const handleOpenSuspendModal = (vendor: VendorItem) => {
    setSuspendModalVendor(vendor);
    setSuspendReasonCategory('Policy Violation & Prohibited Items');
    setSuspendNotes('');
    setFreezeEscrow(true);
    setDelistCatalog(true);
    setNotifyVendorEmail(true);
  };

  const handleConfirmSuspend = () => {
    if (!suspendModalVendor) return;
    setVendors((prev) =>
      prev.map((v) =>
        v.id === suspendModalVendor.id
          ? {
              ...v,
              kycStatus: 'Investigation' as const,
              trend: 'Payouts Frozen',
              trendType: 'frozen' as const,
            }
          : v
      )
    );
    setSuspendModalVendor(null);
  };

  const handleReinstate = (vendorId: string) => {
    setVendors((prev) =>
      prev.map((v) =>
        v.id === vendorId
          ? {
              ...v,
              kycStatus: 'Verified' as const,
              trend: '+5%',
              trendType: 'positive' as const,
            }
          : v
      )
    );
  };

  const handleExportMerchants = () => {
    exportToCsv({
      filename: `vendora-merchants-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'Store Name', key: 'storeName' },
        { header: 'Category', key: 'category' },
        { header: 'Subdomain', key: 'subdomain' },
        { header: 'Owner', key: 'ownerName' },
        { header: 'Email', key: 'email' },
        { header: 'Country', key: 'countryCode' },
        { header: 'KYC Status', key: 'kycStatus' },
        { header: 'Tier', key: 'performanceTier' },
        { header: 'Revenue (30D GMV)', key: 'revenue' },
      ],
      data: filteredVendors,
    });
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newOwnerName) return;
    const newVendor: VendorItem = {
      id: `v-${Date.now()}`,
      storeName: newStoreName,
      category: newCategory.toUpperCase(),
      subdomain: `${newStoreName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.vendora.shop`,
      ownerName: newOwnerName,
      countryCode: newCountry,
      email: newEmail,
      kycStatus: 'Verified',
      performanceTier: 'Tier 2 Verified',
      revenue: '$0',
      trend: 'New Merchant',
      trendType: 'neutral',
    };
    setVendors([newVendor, ...vendors]);
    setNewStoreName('');
    setNewOwnerName('');
    setNewEmail('');
    setIsOnboardModalOpen(false);
  };

  const filteredVendors = vendors.filter((vendor) => {
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

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage) || 1;
  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
            <button
              onClick={handleExportMerchants}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-500" />
              Export Merchants
            </button>
            <button
              onClick={() => setIsOnboardModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
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
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="admin-select text-xs font-medium text-slate-700"
            >
              <option value="All Statuses">Status: All Statuses</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Investigation">Investigation</option>
            </select>

            {/* Tier Dropdown */}
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="admin-select text-xs font-medium text-slate-700"
            >
              <option value="All Tiers">Tier: All Tiers</option>
              <option value="Tier 1">Tier 1 Elite</option>
              <option value="Tier 2">Tier 2 Verified</option>
              <option value="Tier 3">Tier 3 Standard</option>
            </select>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="admin-select text-xs font-medium text-slate-700"
            >
              <option value="All Categories">Category: All Categories</option>
              <option value="Consumer Tech">Consumer Tech</option>
              <option value="Fashion">Fashion</option>
              <option value="Hardware">Hardware</option>
              <option value="Home & Living">Home & Living</option>
              <option value="Cookware">Cookware</option>
            </select>

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
                {paginatedVendors.map((vendor) => {
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
                              <Link
                                to={`/admin/vendors/${vendor.id}`}
                                className="font-bold text-slate-900 truncate hover:text-[#FF7A1A] hover:underline transition-colors"
                              >
                                {vendor.storeName}
                              </Link>
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
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Verified
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenSuspendModal(vendor)}
                              className="text-[10px] text-slate-400 hover:text-rose-600 underline font-semibold cursor-pointer"
                            >
                              Suspend
                            </button>
                          </div>
                        )}
                        {vendor.kycStatus === 'Pending Review' && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                              <Clock className="h-3 w-3 text-amber-500" />
                              Pending Review
                            </span>
                            <button
                              type="button"
                              onClick={() => handleVerifyKyc(vendor.id)}
                              className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-slate-800 cursor-pointer"
                            >
                              Approve
                            </button>
                          </div>
                        )}
                        {vendor.kycStatus === 'Investigation' && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                              <AlertTriangle className="h-3 w-3 text-rose-500" />
                              Investigation
                            </span>
                            <button
                              type="button"
                              onClick={() => handleReinstate(vendor.id)}
                              className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 cursor-pointer"
                            >
                              Re-instate
                            </button>
                          </div>
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
                Showing{' '}
                <strong>
                  {filteredVendors.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, filteredVendors.length)}
                </strong>{' '}
                of <strong>{filteredVendors.length}</strong> merchant records
                {filteredVendors.length !== vendors.length && ` (filtered from ${vendors.length})`}
              </span>
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                title="First Page"
              >
                |&lt;
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                title="Previous Page"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-7 min-w-7 px-1.5 items-center justify-center rounded text-xs font-bold transition-colors cursor-pointer ${
                    currentPage === page
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                title="Next Page"
              >
                &gt;
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                title="Last Page"
              >
                &gt;|
              </button>
            </div>
          </div>
        </div>

        {/* Onboard Vendor Modal */}
        <Dialog open={isOnboardModalOpen} onOpenChange={setIsOnboardModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-slate-700" />
                Onboard New Merchant
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Grant approved merchant credentials, configure initial escrow rate, and generate storefront subdomain.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleOnboardSubmit} className="space-y-3.5 py-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Store / Business Name</label>
                <input
                  type="text"
                  required
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="e.g. Apex Optics Direct"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    required
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Country</label>
                  <select
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    className="admin-select w-full text-xs font-medium text-slate-700"
                  >
                    <option value="US">US (United States)</option>
                    <option value="UK">UK (United Kingdom)</option>
                    <option value="DE">DE (Germany)</option>
                    <option value="FR">FR (France)</option>
                    <option value="JP">JP (Japan)</option>
                    <option value="AE">AE (UAE)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Business Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@apexoptics.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="admin-select w-full text-xs font-medium text-slate-700"
                >
                  <option value="CONSUMER TECH">Consumer Tech</option>
                  <option value="FASHION">Fashion &amp; Apparel</option>
                  <option value="HARDWARE">Hardware &amp; Tools</option>
                  <option value="HOME & LIVING">Home &amp; Living</option>
                  <option value="COOKWARE">Cookware</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Approve &amp; Onboard
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Suspend Vendor Enforcement Modal */}
        <Dialog open={!!suspendModalVendor} onOpenChange={(open) => !open && setSuspendModalVendor(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 text-rose-600 mb-1">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Merchant Enforcement Action</span>
              </div>
              <DialogTitle className="text-lg font-black text-slate-900">
                Suspend Vendor Account
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Placing this vendor under investigation will freeze escrow disbursements, pause storefront checkout, and initiate formal compliance review.
              </DialogDescription>
            </DialogHeader>

            {suspendModalVendor && (
              <div className="space-y-4 py-2 text-xs">
                {/* Vendor Summary Card */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{suspendModalVendor.storeName}</span>
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      30D GMV: {suspendModalVendor.revenue}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                    <span>Owner: <strong className="text-slate-700">{suspendModalVendor.ownerName}</strong></span>
                    <span>•</span>
                    <span>Subdomain: <strong className="text-slate-700">{suspendModalVendor.subdomain}</strong></span>
                  </div>
                </div>

                {/* Reason category */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Primary Enforcement Reason</label>
                  <select
                    value={suspendReasonCategory}
                    onChange={(e) => setSuspendReasonCategory(e.target.value)}
                    className="admin-select w-full text-xs font-medium text-slate-700"
                  >
                    <option value="Policy Violation & Prohibited Items">Policy Violation &amp; Prohibited Items</option>
                    <option value="Counterfeit & Intellectual Property Infringement">Counterfeit &amp; Intellectual Property Infringement</option>
                    <option value="High Dispute & Chargeback Velocity (>4.5%)">High Dispute &amp; Chargeback Velocity (&gt;4.5%)</option>
                    <option value="Logistics SLA Failure (Late Dispatch Breaches)">Logistics SLA Failure (Late Dispatch Breaches)</option>
                    <option value="KYC & Identity Invalidation">KYC &amp; Identity Invalidation</option>
                    <option value="Suspicious Financial or Payout Activity">Suspicious Financial or Payout Activity</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Internal Audit Notes &amp; Evidence Memo</label>
                  <textarea
                    rows={3}
                    value={suspendNotes}
                    onChange={(e) => setSuspendNotes(e.target.value)}
                    placeholder="Document incident ticket ID, violation citations, customer complaints, or compliance findings..."
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900"
                  />
                </div>

                {/* Enforcement Toggles */}
                <div className="space-y-2 rounded-lg border border-slate-200 p-3 bg-white">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={freezeEscrow}
                      onChange={(e) => setFreezeEscrow(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Freeze Pending Escrow &amp; Payouts</span>
                      <p className="text-[11px] text-slate-500">Hold all unsettled funds in platform escrow protection vault.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delistCatalog}
                      onChange={(e) => setDelistCatalog(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Immediately De-list Storefront Products</span>
                      <p className="text-[11px] text-slate-500">Remove all listings from marketplace search and buyer cart pages.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyVendorEmail}
                      onChange={(e) => setNotifyVendorEmail(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Notify Merchant with Appeal Instructions</span>
                      <p className="text-[11px] text-slate-500">Dispatch automated enforcement email to {suspendModalVendor.email}.</p>
                    </div>
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSuspendModalVendor(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSuspend}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Confirm Account Suspension
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
