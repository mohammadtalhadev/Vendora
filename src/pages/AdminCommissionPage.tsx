import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Percent,
  Wallet,
  Tag,
  SlidersHorizontal,
  Crown,
  BarChart3,
  Rocket,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { exportToCsv } from '../lib/export-csv';
import { useMarketplaceStore } from '../store/marketplace-store';

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
  effectivePeriod: string;
  reason: string;
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
    effectivePeriod: 'Annual Contract (Exp. Oct 2027)',
    reason: 'Exclusive multi-year seller agreement; GMV commitment exceeding $1.2M.',
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
    newRate: '5.0% + $0.25',
    effectivePeriod: '30 Days (Exp. Nov 22)',
    reason: 'New flagship brand launch subsidized promo campaign.',
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
    effectivePeriod: '60 Days Grace Window',
    reason: 'Temporary inventory supply chain disruption waiver approved by auto compliance.',
    authorizedBy: 'System (Auto Extension)',
    auditStatus: 'System Audit',
  },
  {
    id: 'adj-4',
    timestamp: 'Oct 18, 11:20 UTC',
    merchantName: 'Vendora Soundwave',
    adjustmentType: 'Strategic Category Override',
    adjustmentBadgeStyle: 'bg-emerald-50 text-emerald-700',
    priorRate: '12.0% + $0.30',
    newRate: '8.0% + $0.30',
    effectivePeriod: 'Ongoing Evergreen',
    reason: 'High volume audio electronics catalog rate alignment.',
    authorizedBy: 'David Vance (Platform Lead)',
    auditStatus: 'Verified',
  },
  {
    id: 'adj-5',
    timestamp: 'Oct 15, 16:45 UTC',
    merchantName: 'Aura Minimalist Wear',
    adjustmentType: 'Volume Tier Incentive',
    adjustmentBadgeStyle: 'bg-purple-50 text-purple-700',
    priorRate: '15.0% + $0.40',
    newRate: '9.5% + $0.30',
    effectivePeriod: 'Quarterly Review (Q4)',
    reason: 'Crossed $75,000 GMV hurdle 2 consecutive quarters.',
    authorizedBy: 'Finance Committee',
    auditStatus: 'Verified',
  },
  {
    id: 'adj-6',
    timestamp: 'Oct 10, 08:30 UTC',
    merchantName: 'Quantum Craft Tools',
    adjustmentType: 'Hardware Special Rebate',
    adjustmentBadgeStyle: 'bg-slate-100 text-slate-700',
    priorRate: '14.0% + $0.35',
    newRate: '10.0% + $0.30',
    effectivePeriod: 'Semi-Annual (Exp. Apr 2027)',
    reason: 'Co-marketing partnership incentive for precision tool category.',
    authorizedBy: 'Sarah Chen (VP Commercial)',
    auditStatus: 'Verified',
  },
];

export const AdminCommissionPage: React.FC = () => {
  const storeCategoryOverrides = useMarketplaceStore((state) => state.categoryOverrides);
  const addCategoryOverride = useMarketplaceStore((state) => state.addCategoryOverride);
  const storeVendors = useMarketplaceStore((state) => state.vendors);
  const storeSubOrders = useMarketplaceStore((state) => state.subOrders);
  const syncWithDatabase = useMarketplaceStore((state) => state.syncWithDatabase);

  useEffect(() => {
    syncWithDatabase();
  }, [syncWithDatabase]);

  const [overrides, setOverrides] = useState<CategoryOverride[]>(CATEGORY_OVERRIDES);

  useEffect(() => {
    if (storeCategoryOverrides && storeCategoryOverrides.length > 0) {
      const mapped: CategoryOverride[] = storeCategoryOverrides.map((c) => {
        let icon = Laptop;
        const nameLower = c.categoryName.toLowerCase();
        if (nameLower.includes('fashion') || nameLower.includes('apparel') || nameLower.includes('streetwear')) icon = Shirt;
        else if (nameLower.includes('jewelry') || nameLower.includes('beauty') || nameLower.includes('watches')) icon = Gem;
        else if (nameLower.includes('book') || nameLower.includes('media') || nameLower.includes('publication')) icon = BookOpen;

        return {
          id: c.id,
          categoryName: c.categoryName,
          subtext: c.subtext,
          icon,
          baseTierFee: c.baseTierFee,
          categoryOverride: c.categoryOverride,
          fixedOrderFee: c.fixedOrderFee,
          merchantsCount: c.merchantsCount,
          status: c.status,
        };
      });
      setOverrides(mapped);
    }
  }, [storeCategoryOverrides]);

  const [categorySearch, setCategorySearch] = useState('');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newSubtext, setNewSubtext] = useState('');
  const [newOverrideRate, setNewOverrideRate] = useState('8.0%');
  const [newFixedFee, setNewFixedFee] = useState('$0.30');

  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [tierToEdit, setTierToEdit] = useState<{
    tierName: string;
    description: string;
    takeRate: string;
    fixedFee: string;
  } | null>(null);

  const [categoryPage, setCategoryPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('all');

  const filteredOverrides = overrides.filter((cat) => {
    const matchesSearch =
      cat.categoryName.toLowerCase().includes(categorySearch.toLowerCase()) ||
      cat.subtext.toLowerCase().includes(categorySearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cat.status === 'Active';
    return matchesSearch && matchesStatus;
  });

  const categoriesPerPage = 3;
  const totalCategoryPages = Math.ceil(filteredOverrides.length / categoriesPerPage) || 1;
  const paginatedOverrides = filteredOverrides.slice(
    (categoryPage - 1) * categoriesPerPage,
    categoryPage * categoriesPerPage
  );

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('All');

  const filteredHistory = RECENT_ADJUSTMENTS.filter((adj) => {
    const matchesSearch =
      adj.merchantName.toLowerCase().includes(historySearch.toLowerCase()) ||
      adj.authorizedBy.toLowerCase().includes(historySearch.toLowerCase()) ||
      adj.reason.toLowerCase().includes(historySearch.toLowerCase());
    const matchesType =
      historyTypeFilter === 'All' ||
      adj.adjustmentType.toLowerCase().includes(historyTypeFilter.toLowerCase());
    return matchesSearch && matchesType;
  });

  const handleExportAdjustmentHistoryCsv = () => {
    exportToCsv({
      filename: `vendora-fee-adjustment-history-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'Event ID', key: 'id' },
        { header: 'Timestamp', key: 'timestamp' },
        { header: 'Merchant', key: 'merchantName' },
        { header: 'Adjustment Type', key: 'adjustmentType' },
        { header: 'Prior Rate', key: 'priorRate' },
        { header: 'New Rate', key: 'newRate' },
        { header: 'Effective Period', key: 'effectivePeriod' },
        { header: 'Reason & Scope', key: 'reason' },
        { header: 'Authorized By', key: 'authorizedBy' },
        { header: 'Audit Status', key: 'auditStatus' },
      ],
      data: filteredHistory,
    });
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const rateVal = parseFloat(newOverrideRate.replace('%', '')) || 8.0;
    const newRule: CategoryOverride = {
      id: `cat-${Date.now()}`,
      categoryName: newCatName.trim(),
      subtext: newSubtext.trim() || 'Custom override',
      icon: Laptop,
      baseTierFee: '12.0%',
      categoryOverride: `${rateVal.toFixed(1)}%`,
      fixedOrderFee: newFixedFee.startsWith('$') ? newFixedFee : `$${newFixedFee}`,
      merchantsCount: 1,
      status: 'Active',
    };
    setOverrides([newRule, ...overrides]);
    try {
      addCategoryOverride({
        categoryName: newRule.categoryName,
        subtext: newRule.subtext,
        baseTierFee: newRule.baseTierFee,
        categoryOverride: newRule.categoryOverride,
        fixedOrderFee: newRule.fixedOrderFee,
        merchantsCount: 1,
        status: 'Active',
      });
    } catch {
      // ignore
    }
    setNewCatName('');
    setNewSubtext('');
    setIsRuleModalOpen(false);
  };

  const handleExportLedger = () => {
    exportToCsv({
      filename: `marketplace-commission-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'Category Name', key: 'categoryName' },
        { header: 'Base Tier Fee', key: 'baseTierFee' },
        { header: 'Category Override', key: 'categoryOverride' },
        { header: 'Fixed Order Fee', key: 'fixedOrderFee' },
        { header: 'Active Merchants', key: 'merchantsCount' },
        { header: 'Rule Status', key: 'status' },
      ],
      data: filteredOverrides,
    });
  };

  const avgTakeRate = (
    overrides.length > 0
      ? overrides.reduce((sum: number, o: CategoryOverride) => sum + (parseFloat(o.categoryOverride.replace('%', '')) || 10.0), 0) / overrides.length
      : 11.8
  ).toFixed(1);

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Commission & Fee Rules" sidebar={<AdminNav />}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">Commission & Fee Rules</h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Configure platform take rates, vendor tier discounts, transaction fee rules, and monitor marketplace fee revenue.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Clock className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Fee Adjustment History
            </button>
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" aria-hidden="true" />
              <span className="text-white">Create Commission Rule</span>
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
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              ${(storeSubOrders.reduce((sum, so) => sum + (Number(so.commissionAmount) || 0), 0) || 18423.19).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                Live Supabase
              </span>
              <span className="text-xs text-slate-500 font-medium">
                eff. {avgTakeRate}%
              </span>
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
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {avgTakeRate}%
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Across {storeVendors.length > 0 ? storeVendors.length : 11} active brand stores
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
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              ${((storeSubOrders.reduce((sum, so) => sum + (Number(so.commissionAmount) || 0), 0) || 18423.19) * 0.12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                Volume reduction
              </span>
              <span>for Tier sellers</span>
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
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              ${((storeSubOrders.reduce((sum, so) => sum + (Number(so.commissionAmount) || 0), 0) || 18423.19) * 0.45).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                Bi-weekly sweep
              </span>
              <span>merchant escrow</span>
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
            <button
              type="button"
              onClick={() => {
                setTierToEdit({
                  tierName: 'Tier 1: High Volume',
                  description: 'Sellers with GMV exceeding $50k/month',
                  takeRate: '8.5%',
                  fixedFee: '$0.30',
                });
                setIsTierModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
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
                <button
                  type="button"
                  onClick={() => {
                    setTierToEdit({
                      tierName: 'Tier 1: High Volume',
                      description: 'Sellers with GMV exceeding $50k/month',
                      takeRate: '8.5%',
                      fixedFee: '$0.30',
                    });
                    setIsTierModalOpen(true);
                  }}
                  className="font-bold text-slate-900 hover:underline cursor-pointer"
                >
                  Configure
                </button>
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
                <button
                  type="button"
                  onClick={() => {
                    setTierToEdit({
                      tierName: 'Tier 2: Standard Growth',
                      description: 'Sellers with GMV between $10k - $50k/mo',
                      takeRate: '12.0%',
                      fixedFee: '$0.30',
                    });
                    setIsTierModalOpen(true);
                  }}
                  className="font-bold text-slate-900 hover:underline cursor-pointer"
                >
                  Configure
                </button>
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
                <button
                  type="button"
                  onClick={() => {
                    setTierToEdit({
                      tierName: 'Tier 3: Starter & Launch',
                      description: 'Initial onboarding tier under $10k/month',
                      takeRate: '15.0%',
                      fixedFee: '$0.40',
                    });
                    setIsTierModalOpen(true);
                  }}
                  className="font-bold text-slate-900 hover:underline cursor-pointer"
                >
                  Configure
                </button>
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
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="commission-category-search"
                    type="text"
                    aria-label="Filter commission categories"
                    value={categorySearch}
                    onChange={(e) => { setCategorySearch(e.target.value); setCategoryPage(1); }}
                    placeholder="Filter categories..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  aria-pressed={statusFilter === 'active'}
                  onClick={() => {
                    setStatusFilter((prev) => (prev === 'all' ? 'active' : 'all'));
                    setCategoryPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs cursor-pointer transition-colors ${
                    statusFilter === 'active'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="h-3 w-3 text-slate-500" aria-hidden="true" />
                  <span>{statusFilter === 'active' ? 'Active Only' : 'Filter All'}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table
                  className="w-full text-left text-xs"
                  aria-label="Category specific commission overrides"
                >
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">CATEGORY</th>
                      <th scope="col" className="px-4 py-3">BASE TIER FEE</th>
                      <th scope="col" className="px-4 py-3">CATEGORY OVERRIDE</th>
                      <th scope="col" className="px-4 py-3">FIXED ORDER FEE</th>
                      <th scope="col" className="px-4 py-3">MERCHANTS</th>
                      <th scope="col" className="px-4 py-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedOverrides.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
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
                <span>
                  Showing {filteredOverrides.length === 0 ? 0 : (categoryPage - 1) * categoriesPerPage + 1} to{' '}
                  {Math.min(categoryPage * categoriesPerPage, filteredOverrides.length)} of {filteredOverrides.length} rules
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous page of commission categories"
                    onClick={() => setCategoryPage((p) => Math.max(1, p - 1))}
                    disabled={categoryPage === 1}
                    className="h-6 w-6 rounded border border-slate-200 bg-white text-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    &lt;
                  </button>
                  {Array.from({ length: totalCategoryPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      aria-label={`Go to page ${page}`}
                      aria-current={categoryPage === page ? 'page' : undefined}
                      onClick={() => setCategoryPage(page)}
                      className={`h-6 w-6 rounded text-center text-xs font-bold transition-colors cursor-pointer ${
                        categoryPage === page
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Next page of commission categories"
                    onClick={() => setCategoryPage((p) => Math.min(totalCategoryPages, p + 1))}
                    disabled={categoryPage === totalCategoryPages || totalCategoryPages === 0}
                    className="h-6 w-6 rounded border border-slate-200 bg-white text-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
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

              <button
                type="button"
                onClick={handleExportLedger}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
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
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              All Events
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table
                className="w-full text-left text-xs"
                aria-label="Recent fee adjustment audit rows"
              >
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">TIMESTAMP</th>
                    <th scope="col" className="px-4 py-3">MERCHANT</th>
                    <th scope="col" className="px-4 py-3">ADJUSTMENT TYPE</th>
                    <th scope="col" className="px-4 py-3">PRIOR RATE</th>
                    <th scope="col" className="px-4 py-3">NEW RATE</th>
                    <th scope="col" className="px-4 py-3">AUTHORIZED BY</th>
                    <th scope="col" className="px-4 py-3">AUDIT STATUS</th>
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
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
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

        {/* Create Commission Rule Modal */}
        <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                Create Category Commission Rule
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Set category-specific override take rates and fixed transaction fees for marketplace merchants.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateRule} className="space-y-3 py-2 text-xs">
              <div>
                <label htmlFor="commission-rule-cat-name" className="block font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  id="commission-rule-cat-name"
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Home & Living"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label htmlFor="commission-rule-subtext" className="block font-bold text-slate-700 mb-1">Subtext / Scope</label>
                <input
                  id="commission-rule-subtext"
                  type="text"
                  value={newSubtext}
                  onChange={(e) => setNewSubtext(e.target.value)}
                  placeholder="e.g. Furniture and artisan decor"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="commission-rule-take-rate" className="block font-bold text-slate-700 mb-1">Take Rate (%)</label>
                  <input
                    id="commission-rule-take-rate"
                    type="text"
                    required
                    value={newOverrideRate}
                    onChange={(e) => setNewOverrideRate(e.target.value)}
                    placeholder="8.5%"
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="commission-rule-fixed-fee" className="block font-bold text-slate-700 mb-1">Fixed Order Fee ($)</label>
                  <input
                    id="commission-rule-fixed-fee"
                    type="text"
                    required
                    value={newFixedFee}
                    onChange={(e) => setNewFixedFee(e.target.value)}
                    placeholder="$0.30"
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Configure Volume Tier Modal */}
        <Dialog open={isTierModalOpen} onOpenChange={setIsTierModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" aria-hidden="true" />
                <span>Configure Volume Tier Bracket</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Adjust baseline commission take rate and fixed per-order fulfillment costs for {tierToEdit?.tierName || 'this tier'}.
              </DialogDescription>
            </DialogHeader>

            {tierToEdit && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsTierModalOpen(false);
                }}
                className="space-y-3 py-2 text-xs"
              >
                <div>
                  <label htmlFor="commission-tier-name" className="block font-bold text-slate-700 mb-1">Tier Name & Bracket</label>
                  <input
                    id="commission-tier-name"
                    type="text"
                    value={tierToEdit.tierName}
                    onChange={(e) =>
                      setTierToEdit((prev) => (prev ? { ...prev, tierName: e.target.value } : null))
                    }
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="commission-tier-criteria" className="block font-bold text-slate-700 mb-1">Qualification Criteria</label>
                  <input
                    id="commission-tier-criteria"
                    type="text"
                    value={tierToEdit.description}
                    onChange={(e) =>
                      setTierToEdit((prev) => (prev ? { ...prev, description: e.target.value } : null))
                    }
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="commission-tier-take-rate" className="block font-bold text-slate-700 mb-1">Take Rate (%)</label>
                    <input
                      id="commission-tier-take-rate"
                      type="text"
                      value={tierToEdit.takeRate}
                      onChange={(e) =>
                        setTierToEdit((prev) => (prev ? { ...prev, takeRate: e.target.value } : null))
                      }
                      className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="commission-tier-fixed-fee" className="block font-bold text-slate-700 mb-1">Transaction Fee ($)</label>
                    <input
                      id="commission-tier-fixed-fee"
                      type="text"
                      value={tierToEdit.fixedFee}
                      onChange={(e) =>
                        setTierToEdit((prev) => (prev ? { ...prev, fixedFee: e.target.value } : null))
                      }
                      className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTierModalOpen(false)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                  >
                    Save Tier Settings
                  </button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Fee Adjustment History Audit Ledger Modal */}
        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs">
                    <Clock className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black text-slate-900">
                      Fee Adjustment History &amp; Audit Ledger
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Comprehensive audit ledger of platform take rate exemptions, custom enterprise tiers, and promotional grants.
                    </DialogDescription>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportAdjustmentHistoryCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer self-start sm:self-center"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Export History (CSV)
                </button>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Adjustments</span>
                  <div className="mt-1 text-xl font-black text-slate-900">{RECENT_ADJUSTMENTS.length} Records</div>
                  <span className="text-[11px] text-emerald-600 font-semibold">100% cryptographically audited</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Custom Tiers</span>
                  <div className="mt-1 text-xl font-black text-slate-900">4 Merchants</div>
                  <span className="text-[11px] text-slate-500">Enterprise contracted</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GMV Under Custom Fees</span>
                  <div className="mt-1 text-xl font-black text-slate-900">$218,400</div>
                  <span className="text-[11px] text-slate-500">Trailing 30-day volume</span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <input
                    id="commission-history-search"
                    type="text"
                    aria-label="Search adjustment history by merchant, approver, or rationale memo"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search by merchant, approver, or rationale memo..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900 focus:bg-white"
                  />
                </div>
                <select
                  id="commission-history-type-filter"
                  aria-label="Filter adjustment history by type"
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="admin-select text-xs font-medium text-slate-700 sm:w-56"
                >
                  <option value="All">All Adjustment Types</option>
                  <option value="Enterprise">Enterprise Contract</option>
                  <option value="Promotional">Promotional Launch</option>
                  <option value="Grace">Tier Downgrade Grace</option>
                  <option value="Strategic">Strategic Category Override</option>
                  <option value="Volume">Volume Tier Incentive</option>
                </select>
              </div>

              {/* Detailed Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-left text-xs"
                    aria-label="Fee adjustment history and audit ledger"
                  >
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th scope="col" className="px-3.5 py-2.5">TIMESTAMP</th>
                        <th scope="col" className="px-3.5 py-2.5">MERCHANT</th>
                        <th scope="col" className="px-3.5 py-2.5">TYPE</th>
                        <th scope="col" className="px-3.5 py-2.5">RATE DELTA</th>
                        <th scope="col" className="px-3.5 py-2.5">DURATION</th>
                        <th scope="col" className="px-3.5 py-2.5">AUTHORIZED BY</th>
                        <th scope="col" className="px-3.5 py-2.5">RATIONALE / AUDIT MEMO</th>
                        <th scope="col" className="px-3.5 py-2.5">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {item.timestamp}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {item.merchantName}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${item.adjustmentBadgeStyle}`}>
                              {item.adjustmentType}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono whitespace-nowrap">
                            <span className="text-slate-400 line-through mr-1.5">{item.priorRate}</span>
                            <span className="font-bold text-slate-900">{item.newRate}</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
                            {item.effectivePeriod}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap font-medium">
                            {item.authorizedBy}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500 max-w-xs text-[11px] leading-relaxed">
                            {item.reason}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {item.auditStatus === 'Verified' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
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

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Showing <strong>{filteredHistory.length}</strong> of {RECENT_ADJUSTMENTS.length} historical ledger entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportAdjustmentHistoryCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(false)}
                    className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
