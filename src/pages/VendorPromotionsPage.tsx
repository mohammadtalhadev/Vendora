import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Calendar,
  Copy,
  Check,
  TrendingUp,
  Clock,
  Sparkles,
  Search,
  Download,
  RotateCw,
  CheckCircle2,
  ArrowRight,
  Headphones,
  Keyboard,
  Store,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

import { exportToCsv } from '../lib/export-csv';

interface PromoCampaign {
  id: string;
  name: string;
  code: string;
  typeValue: string;
  minOrder: string;
  scope: string;
  scopeIcon: 'audio' | 'keyboard' | 'storewide';
  window: string;
  windowSubtext: string;
  redemptionsCurrent: number;
  redemptionsMax: number | 'unlimited';
  salesAttributed: number;
  ordersAttributed: number;
  status: 'active' | 'scheduled' | 'expired' | 'draft';
  isEnabled: boolean;
}

export const VendorPromotionsPage: React.FC = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCreatePromoModalOpen, setIsCreatePromoModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'scheduled' | 'expired' | 'draft'>('all');
  const [discountTypeFilter, setDiscountTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState('Percentage Off (%)');
  const [formDiscountValue, setFormDiscountValue] = useState('15');
  const [formMinOrder, setFormMinOrder] = useState('50');
  const [formScope, setFormScope] = useState('Storewide (All Active Products)');

  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([
    {
      id: 'promo-1',
      name: 'Fall Audio Blowout',
      code: 'FALLAUDIO15',
      typeValue: '15% Off',
      minOrder: 'Min order $75',
      scope: 'Category: Audio',
      scopeIcon: 'audio',
      window: 'Oct 01 – Oct 31',
      windowSubtext: '14 days left',
      redemptionsCurrent: 74,
      redemptionsMax: 100,
      salesAttributed: 2140.0,
      ordersAttributed: 18,
      status: 'active',
      isEnabled: true,
    },
    {
      id: 'promo-2',
      name: 'Mechanical Keyboard Bundle',
      code: 'BUNDLE20',
      typeValue: '$20.00 Off',
      minOrder: 'Min 2 items',
      scope: 'Keychron Q1 + Rest',
      scopeIcon: 'keyboard',
      window: 'Oct 05 – Nov 05',
      windowSubtext: '19 days left',
      redemptionsCurrent: 45,
      redemptionsMax: 500,
      salesAttributed: 1280.0,
      ordersAttributed: 11,
      status: 'active',
      isEnabled: true,
    },
    {
      id: 'promo-3',
      name: 'New Customer Welcome',
      code: 'WELCOME10',
      typeValue: '10% Storewide',
      minOrder: 'First-time buyers',
      scope: 'Storewide',
      scopeIcon: 'storewide',
      window: 'Ongoing',
      windowSubtext: 'Auto-renews',
      redemptionsCurrent: 52,
      redemptionsMax: 'unlimited',
      salesAttributed: 940.5,
      ordersAttributed: 12,
      status: 'active',
      isEnabled: true,
    },
    {
      id: 'promo-4',
      name: 'Flash Headphones 24H Deal',
      code: 'SONYFLASH',
      typeValue: '$50.00 Off',
      minOrder: 'Instant checkout discount',
      scope: 'Sony WH-1000XM5',
      scopeIcon: 'audio',
      window: 'Oct 18 – Oct 19',
      windowSubtext: 'Starts in 3 days',
      redemptionsCurrent: 0,
      redemptionsMax: 50,
      salesAttributed: 0.0,
      ordersAttributed: 0,
      status: 'scheduled',
      isEnabled: true,
    },
    {
      id: 'promo-5',
      name: 'Free Express Shipping Kickoff',
      code: 'FREESHIP',
      typeValue: 'Free Domestic',
      minOrder: 'Min order $50',
      scope: 'Storewide',
      scopeIcon: 'storewide',
      window: 'Sep 01 – Sep 30',
      windowSubtext: 'Expired 15 days ago',
      redemptionsCurrent: 150,
      redemptionsMax: 150,
      salesAttributed: 450.0,
      ordersAttributed: 35,
      status: 'expired',
      isEnabled: false,
    },
  ]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleTogglePromo = (promoId: string) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === promoId ? { ...c, isEnabled: !c.isEnabled } : c
      )
    );
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (activeTab === 'active' && c.status !== 'active') return false;
    if (activeTab === 'scheduled' && c.status !== 'scheduled') return false;
    if (activeTab === 'expired' && c.status !== 'expired') return false;
    if (activeTab === 'draft' && c.status !== 'draft') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.scope.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage) || 1;
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav onOpenAddProduct={() => setIsProductModalOpen(true)} />}
    >
      <div className="space-y-6">
        {/* ── Breadcrumb & Header ─────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              MARKETING &amp; SALES <span className="text-slate-300">/</span> PROMOTIONS
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Promotions &amp; Coupons
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Create discount coupon codes, flash deals, bundle offers, and monitor promotional campaign conversion ROI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCalendarModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Calendar className="h-4 w-4 text-slate-500" />
              Campaign Calendar
            </button>
            <button
              onClick={() => setIsCreatePromoModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              + Create Promotion
            </button>
          </div>
        </div>

        {/* ── 4 Top KPI Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Active Campaigns */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Active Campaigns</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  2 Scheduled
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">4 Running</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Next flash deal starts in 18 hrs</span>
              </div>
            </div>
          </div>

          {/* Card 2: Promo-Driven Revenue */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Promo-Driven Revenue</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  +14.2%
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">$4,820.50</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span>32.3% of total store volume</span>
              </div>
            </div>
          </div>

          {/* Card 3: Coupons Redeemed */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Coupons Redeemed</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  30 Days
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">186 Redemptions</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span>Avg. Discount: $12.40 / order</span>
              </div>
            </div>
          </div>

          {/* Card 4: Promo ROI / ROAS */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Promo ROI / ROAS</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  High Efficiency
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">6.4x Return</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Net Margin Preserved: 24.8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs & Search Bar ───────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" data-lenis-prevent>
              {[
                { id: 'all', label: 'All Campaigns', count: campaigns.length },
                { id: 'active', label: 'Active', count: campaigns.filter((c) => c.status === 'active').length },
                { id: 'scheduled', label: 'Scheduled', count: campaigns.filter((c) => c.status === 'scheduled').length },
                { id: 'expired', label: 'Expired', count: campaigns.filter((c) => c.status === 'expired').length },
                { id: 'draft', label: 'Draft', count: campaigns.filter((c) => c.status === 'draft').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                exportToCsv({
                  filename: `vendor-promotions-${new Date().toISOString().slice(0, 10)}.csv`,
                  columns: [
                    { header: 'Campaign Name', key: 'name' },
                    { header: 'Coupon Code', key: 'code' },
                    { header: 'Discount', key: 'typeValue' },
                    { header: 'Scope', key: 'scope' },
                    { header: 'Window', key: 'window' },
                    { header: 'Redemptions', key: 'redemptionsCurrent' },
                    { header: 'Sales Attributed ($)', key: 'salesAttributed' },
                    { header: 'Status', key: 'status' },
                    { header: 'Enabled', key: 'isEnabled' },
                  ],
                  data: filteredCampaigns,
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 self-start sm:self-auto cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Search Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by promo code, keyword, or campaign name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
            </div>

            <select
              value={discountTypeFilter}
              onChange={(e) => setDiscountTypeFilter(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
            >
              <option value="all">All Discount Types</option>
              <option value="percent">Percentage Off</option>
              <option value="fixed">Fixed Dollar Off</option>
              <option value="shipping">Free Shipping</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
            >
              <option value="all">Status: All Active &amp; Paused</option>
              <option value="active">Active Only</option>
              <option value="paused">Paused Only</option>
            </select>
          </div>
        </div>

        {/* ── Table: Active & Scheduled Promotions ─────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Active &amp; Scheduled Promotions
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {filteredCampaigns.length} items shown
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <button className="p-1 hover:text-slate-700" title="Refresh">
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">CAMPAIGN &amp; COUPON CODE</th>
                  <th className="px-4 py-3">TYPE &amp; VALUE</th>
                  <th className="px-4 py-3">PRODUCT SCOPE</th>
                  <th className="px-4 py-3">CAMPAIGN WINDOW</th>
                  <th className="px-4 py-3">REDEMPTIONS</th>
                  <th className="px-4 py-3">SALES ATTRIBUTED</th>
                  <th className="px-4 py-3">STATUS</th>
                  <th className="px-4 py-3 text-right">ACTIVE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCampaigns.map((c) => {
                  const percent =
                    c.redemptionsMax === 'unlimited'
                      ? 100
                      : Math.round((c.redemptionsCurrent / c.redemptionsMax) * 100);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Campaign & Code */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-800 px-2 py-0.5 border border-slate-200">
                            {c.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(c.code)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Copy code"
                          >
                            {copiedCode === c.code ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Type & Value */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{c.typeValue}</div>
                        <div className="text-[11px] text-slate-500">{c.minOrder}</div>
                      </td>

                      {/* Product Scope */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          {c.scopeIcon === 'audio' && <Headphones className="h-3.5 w-3.5 text-slate-400" />}
                          {c.scopeIcon === 'keyboard' && <Keyboard className="h-3.5 w-3.5 text-slate-400" />}
                          {c.scopeIcon === 'storewide' && <Store className="h-3.5 w-3.5 text-slate-400" />}
                          <span>{c.scope}</span>
                        </div>
                      </td>

                      {/* Campaign Window */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{c.window}</div>
                        <div className="text-[11px] text-slate-500">{c.windowSubtext}</div>
                      </td>

                      {/* Redemptions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-700 font-semibold mb-1">
                          <span>
                            {c.redemptionsCurrent} /{' '}
                            {c.redemptionsMax === 'unlimited' ? '∞' : c.redemptionsMax}
                          </span>
                          <span className="text-slate-400">{percent}%</span>
                        </div>
                        <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-slate-900 rounded-full"
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                      </td>

                      {/* Sales Attributed */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">
                          ${c.salesAttributed.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          +{c.ordersAttributed} orders
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {c.status === 'active' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        )}
                        {c.status === 'scheduled' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            Scheduled
                          </span>
                        )}
                        {c.status === 'expired' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            Expired
                          </span>
                        )}
                      </td>

                      {/* Switch */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleTogglePromo(c.id)}
                          className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            c.isEnabled ? 'bg-slate-900' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              c.isEnabled ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>
              Showing {filteredCampaigns.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCampaigns.length)} of {filteredCampaigns.length} results
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                &lt;
              </button>
              <span className="px-2 font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom 2-Column Section (5 cols / 7 cols) ────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Top Performing Promo Codes (5 cols) */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-slate-700" />
                  <h2 className="text-base font-bold text-slate-900">Top Performing Promo Codes</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Last 30 Days
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ranked by total revenue attribution and conversion efficiency.
              </p>

              {/* Top 3 List */}
              <div className="mt-4 space-y-3">
                {[
                  {
                    rank: 1,
                    code: 'FALLAUDIO15',
                    meta: 'Audio Category • 74 Redemptions',
                    rev: '$2,140.00',
                    pill: '+22% AOV Boost',
                  },
                  {
                    rank: 2,
                    code: 'BUNDLE20',
                    meta: 'Keyboards SKU • 45 Redemptions',
                    rev: '$1,280.00',
                    pill: '+34% Cross-sell',
                  },
                  {
                    rank: 3,
                    code: 'WELCOME10',
                    meta: 'First Orders • 52 Redemptions',
                    rev: '$940.50',
                    pill: '8.9% Conversion',
                  },
                ].map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/60 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-[11px]">
                        {item.rank}
                      </div>
                      <div>
                        <div className="font-mono font-bold text-slate-900">{item.code}</div>
                        <div className="text-[11px] text-slate-400">{item.meta}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{item.rev}</div>
                      <div className="text-[10px] font-semibold text-emerald-700">{item.pill}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Aggregated average order value increase:</span>
              <strong className="text-emerald-700">+19.4% on promo transactions</strong>
            </div>
          </div>

          {/* Right: Featured Campaign Banner (7 cols) */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  FEATURED CAMPAIGN
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Clock className="h-3 w-3" />
                  Deadline: Oct 20
                </span>
              </div>

              <h2 className="mt-3 text-lg font-black text-slate-900 tracking-tight">
                Vendora Tech Week 2026 Nomination Open
              </h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Submit your top consumer electronics and high-rated inventory for curated spotlight placement on the Vendora primary marketplace home banner and mobile push deals carousel.
              </p>

              {/* Inner eligible box */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>3 Products Eligible in Your Catalog</span>
                </div>
                <div className="mt-1 text-slate-500 text-[11px] pl-6">
                  Sony WH-1000XM5, Keychron Q1, Anker 737 GaN Charger
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Expected Traffic Uplift: ~340%</span>
              </div>

              <button
                onClick={() => setIsNominateModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors self-start sm:self-auto"
              >
                <span>Nominate Products</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Create Promotion Modal ───────────────────────────────── */}
        <Dialog open={isCreatePromoModalOpen} onOpenChange={setIsCreatePromoModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Tag className="h-5 w-5 text-slate-700" />
                Create New Promotion
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure discount rules, coupon code, audience criteria, and redemption caps.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!formTitle || !formCode) return;
                const newPromo: PromoCampaign = {
                  id: `promo-${Date.now()}`,
                  name: formTitle,
                  code: formCode.toUpperCase(),
                  typeValue:
                    formDiscountType === 'Percentage Off (%)'
                      ? `${formDiscountValue}% Off`
                      : formDiscountType === 'Free Domestic Shipping'
                      ? 'Free Shipping'
                      : `$${formDiscountValue} Off`,
                  minOrder: formMinOrder ? `Min order $${formMinOrder}` : 'No min order',
                  scope: formScope,
                  scopeIcon: formScope.includes('Audio') ? 'audio' : formScope.includes('Keyboard') ? 'keyboard' : 'storewide',
                  window: 'Active today',
                  windowSubtext: '30 days left',
                  redemptionsCurrent: 0,
                  redemptionsMax: 500,
                  salesAttributed: 0,
                  ordersAttributed: 0,
                  status: 'active',
                  isEnabled: true,
                };
                setCampaigns([newPromo, ...campaigns]);
                setFormTitle('');
                setFormCode('');
                setIsCreatePromoModalOpen(false);
              }}
              className="space-y-3.5 py-2 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Cyber Monday Super Sale"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="CYBER50"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                  >
                    <option>Percentage Off (%)</option>
                    <option>Fixed Dollar Amount ($)</option>
                    <option>Free Domestic Shipping</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(e.target.value)}
                    placeholder="15"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min. Order Value ($)</label>
                  <input
                    type="number"
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(e.target.value)}
                    placeholder="50"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Scope</label>
                <select
                  value={formScope}
                  onChange={(e) => setFormScope(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-900"
                >
                  <option>Storewide (All Active Products)</option>
                  <option>Specific Category: Audio</option>
                  <option>Specific Category: Keyboards &amp; Peripherals</option>
                  <option>Selected SKU Listings</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreatePromoModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Launch Promotion
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Campaign Calendar Modal ──────────────────────────────── */}
        <Dialog open={isCalendarModalOpen} onOpenChange={setIsCalendarModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-700" />
                Promotional Campaign Schedule
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Timeline roadmap of scheduled discount windows and flash sales.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Fall Audio Blowout</span>
                  <span className="text-emerald-700">Active</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Oct 01, 2026 – Oct 31, 2026</div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Flash Headphones 24H Deal</span>
                  <span className="text-blue-700">Scheduled</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Oct 18, 2026 – Oct 19, 2026</div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Vendora Tech Week Spotlight</span>
                  <span className="text-amber-700">Upcoming Nomination</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Nov 10, 2026 – Nov 17, 2026</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close Calendar
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Nominate Products Modal ──────────────────────────────── */}
        <Dialog open={isNominateModalOpen} onOpenChange={setIsNominateModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Nominate Products for Tech Week 2026
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Select from your highest-rated verified inventory for prime marketplace hero banners.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {[
                { name: 'Sony WH-1000XM5 Wireless Headphones', stock: '12 in stock', rating: '4.9 ★' },
                { name: 'Keychron Q1 Pro Custom Mechanical Keyboard', stock: '8 in stock', rating: '4.8 ★' },
                { name: 'Anker 737 GaN 140W Fast Charger', stock: '24 in stock', rating: '4.7 ★' },
              ].map((p) => (
                <label
                  key={p.name}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                >
                  <input type="checkbox" defaultChecked className="rounded text-slate-900" />
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {p.stock} • {p.rating}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsNominateModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('3 products nominated for Vendora Tech Week spotlight review!');
                  setIsNominateModalOpen(false);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Submit Nomination
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Product Form Modal ───────────────────────────────────── */}
        <ProductFormModal
          open={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
        />

        {/* ── Floating Toast Notification ───────────────────────────── */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
