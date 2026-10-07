import React, { useState } from 'react';
import {
  Layers,
  Hourglass,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Download,
  Search,
  ChevronDown,
  SlidersHorizontal,
  RotateCcw,
  Shield,
  Scale,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

interface ModerationItem {
  id: string;
  sku: string;
  title: string;
  category: string;
  image: string;
  vendorName: string;
  trustScore: string;
  tierTag?: string;
  submittedAt: string;
  price: string;
  stock: string;
  stockWarning?: boolean;
  complianceType: 'brand' | 'clean' | 'keyword' | 'verified' | 'trademark' | 'resolution';
  complianceLabel: string;
}

const MODERATION_ITEMS: ModerationItem[] = [
  {
    id: 'mod-1',
    sku: 'SPKR-009',
    title: 'Wireless Noise-Cancelling Headphones Pro',
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=120&q=80',
    vendorName: 'Nova Electronics',
    trustScore: '99% Trust Score',
    tierTag: '(Tier 1)',
    submittedAt: 'Dec 16, 2023 • 11:20 AM',
    price: '$89.99',
    stock: '42 units in stock',
    complianceType: 'brand',
    complianceLabel: 'Brand Trademark Check',
  },
  {
    id: 'mod-2',
    sku: 'BMBRD-020',
    title: 'Bamboo Cutting Board Set',
    category: 'Home & Living',
    image: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=120&q=80',
    vendorName: 'Artisan Kitchen',
    trustScore: '96% Trust Score',
    submittedAt: 'Dec 16, 2023 • 09:14 AM',
    price: '$38.99',
    stock: '55 units in stock',
    complianceType: 'clean',
    complianceLabel: 'Clean (0 flags)',
  },
  {
    id: 'mod-3',
    sku: 'DUNBL-015',
    title: 'Adjustable Dumbbell Set',
    category: 'Sports & Fitness',
    image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=120&q=80',
    vendorName: 'Nexus Tech Hub',
    trustScore: '91% Trust Score',
    submittedAt: 'Dec 15, 2023 • 16:45 PM',
    price: '$299.99',
    stock: '5 units in stock',
    complianceType: 'keyword',
    complianceLabel: 'AI Flagged (Keyword Alert)',
  },
  {
    id: 'mod-4',
    sku: 'CHAIR-002',
    title: 'Ergonomic Mesh Chair',
    category: 'Furniture',
    image: 'https://images.unsplash.com/photo-1580481077195-c3a8a30f7262?auto=format&fit=crop&w=120&q=80',
    vendorName: 'Urban Nomad Living',
    trustScore: '94% Trust Score',
    submittedAt: 'Dec 15, 2023 • 14:20 PM',
    price: '$249.99',
    stock: '32 units in stock',
    complianceType: 'verified',
    complianceLabel: 'Verified Authentic',
  },
  {
    id: 'mod-5',
    sku: 'LUX-8821',
    title: 'Designer Leather Handbag',
    category: 'Fashion & Apparel',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=120&q=80',
    vendorName: 'Aura Apparel',
    trustScore: '82% Trust Score',
    tierTag: '(New)',
    submittedAt: 'Dec 14, 2023 • 18:05 PM',
    price: '$490.00',
    stock: '8 units in stock',
    complianceType: 'trademark',
    complianceLabel: 'Suspected Trademark',
  },
  {
    id: 'mod-6',
    sku: 'FTRACK-013',
    title: 'Fitness Tracker Band V2',
    category: 'Sports & Fitness',
    image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=120&q=80',
    vendorName: 'Nexus Tech Hub',
    trustScore: '91% Trust Score',
    submittedAt: 'Dec 14, 2023 • 11:15 AM',
    price: '$59.99',
    stock: '10 units (Low stock)',
    stockWarning: true,
    complianceType: 'clean',
    complianceLabel: 'Clean (0 flags)',
  },
  {
    id: 'mod-7',
    sku: 'MUGS-012',
    title: 'Ceramic Coffee Mug Set',
    category: 'Home & Living',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=120&q=80',
    vendorName: 'Artisan Kitchen',
    trustScore: '96% Trust Score',
    submittedAt: 'Dec 13, 2023 • 10:04 AM',
    price: '$34.99',
    stock: '50 units in stock',
    complianceType: 'resolution',
    complianceLabel: 'Image Resolution Low',
  },
];

export const AdminProductsPage: React.FC = () => {
  const [activeQueueTab, setActiveQueueTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [riskFilter, setRiskFilter] = useState('All Risk Levels');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredItems = MODERATION_ITEMS.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'All Categories' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Product Moderation"
      subtitle="Review vendor catalog submissions, manage compliance approvals, and enforce marketplace listing guidelines."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        {/* =====================================================================
            1. Title, Breadcrumbs & Header Actions
            ===================================================================== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <span>Marketplace</span>
              <span>&gt;</span>
              <span className="text-slate-600">Product Moderation</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Product Moderation
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Review vendor catalog submissions, manage compliance approvals, and enforce marketplace listing guidelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Audit Log</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export Queue</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Review Queue (14 Pending)</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            2. Top 4 KPI Metric Cards
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Submissions */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                TOTAL SUBMISSIONS
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Layers className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                1,428
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span className="flex items-center gap-0.5 font-bold text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  +14.2%
                </span>
                <span className="text-slate-400">128 awaiting review</span>
              </div>
            </div>
          </div>

          {/* Card 2: Pending Review */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                PENDING REVIEW
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-600">
                <Hourglass className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                38
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">⏱ 4.2h avg</span>
                <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200">
                  12 high-risk / urgent
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Approval Rate */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                APPROVAL RATE
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                94.6%
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span className="flex items-center gap-0.5 font-bold text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  +2.1%
                </span>
                <span className="text-slate-400">1,351 approved YTD</span>
              </div>
            </div>
          </div>

          {/* Card 4: Policy Violations */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                POLICY VIOLATIONS
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-600">
                <ShieldAlert className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                77
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 border border-rose-200">
                  ⚠ 5.4% rejected
                </span>
                <span className="text-slate-400">24 brand claims</span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. Queue Status Filter Tabs & Refresh Time
            ===================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveQueueTab('all')}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${
                activeQueueTab === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Submissions (1,428)
            </button>
            <button
              type="button"
              onClick={() => setActiveQueueTab('pending')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                activeQueueTab === 'pending'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Pending First Review (22)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveQueueTab('scan')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                activeQueueTab === 'scan'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>In Automated Scan (16)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveQueueTab('escalation')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                activeQueueTab === 'escalation'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>Requires Escalation (8)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveQueueTab('approved')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                activeQueueTab === 'approved'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Approved (Last 7d) (312)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveQueueTab('rejected')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                activeQueueTab === 'rejected'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>Rejected / Action Required (14)</span>
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
            <RotateCcw className="h-3 w-3" />
            <span>Queue refreshed 2m ago</span>
          </div>
        </div>

        {/* =====================================================================
            4. Filters, Search Bar & Batch Header
            ===================================================================== */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search listings..."
                className="w-full h-8.5 pl-8 pr-10 text-xs rounded-lg border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1 py-0.2 text-[9px] font-medium text-slate-400">
                ⌘K
              </kbd>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none shadow-2xs cursor-pointer"
                >
                  <option value="All Statuses">Status: All Statuses</option>
                  <option value="Pending">Pending Review</option>
                  <option value="Flagged">Flagged</option>
                  <option value="Clean">Clean</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Category */}
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none shadow-2xs cursor-pointer"
                >
                  <option value="All Categories">Category: All Categories</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Home & Living">Home &amp; Living</option>
                  <option value="Sports & Fitness">Sports &amp; Fitness</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Fashion & Apparel">Fashion &amp; Apparel</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Risk */}
              <div className="relative">
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none shadow-2xs cursor-pointer"
                >
                  <option value="All Risk Levels">Risk: All Risk Levels</option>
                  <option value="High">High Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="Low">Low Risk</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none shadow-2xs cursor-pointer">
                  <option value="All Vendors">All Vendors</option>
                  <option value="Nova Electronics">Nova Electronics</option>
                  <option value="Artisan Kitchen">Artisan Kitchen</option>
                  <option value="Nexus Tech Hub">Nexus Tech Hub</option>
                  <option value="Urban Nomad Living">Urban Nomad Living</option>
                  <option value="Aura Apparel">Aura Apparel</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                <span>Columns</span>
              </button>
            </div>
          </div>

          {/* Batch Actions Bar */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={
                  filteredItems.length > 0 &&
                  selectedIds.length === filteredItems.length
                }
                onChange={toggleSelectAll}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <span className="font-medium">Select all 38 items requiring action</span>
            </div>

            <div className="flex items-center gap-3 font-semibold text-[11px]">
              <span className="text-slate-400 font-normal">Batch:</span>
              <button
                type="button"
                className="text-slate-800 hover:underline cursor-pointer"
              >
                Approve Selected
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                className="text-rose-600 hover:underline cursor-pointer"
              >
                Reject Selected
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                className="text-slate-800 hover:underline cursor-pointer"
              >
                Assign Moderator
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            5. Product Moderation Data Table
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredItems.length > 0 &&
                        selectedIds.length === filteredItems.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">PRODUCT / LISTING</th>
                  <th className="py-3 px-4">VENDOR / MERCHANT</th>
                  <th className="py-3 px-4">SUBMITTED</th>
                  <th className="py-3 px-4">PRICE &amp; STOCK</th>
                  <th className="py-3 px-4 text-right">COMPLIANCE / RISK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isSelected ? 'bg-slate-50/90' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      </td>

                      {/* Product details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-200 bg-slate-50"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate leading-tight">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-tight">
                              {item.sku} • {item.category}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-xs">🏪</span>
                          <div>
                            <p className="font-bold text-slate-900 text-xs leading-tight">
                              {item.vendorName}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                              {item.trustScore} {item.tierTag && <span className="font-medium text-slate-600">{item.tierTag}</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Submitted date */}
                      <td className="py-3 px-4 text-[11px] text-slate-600 font-medium">
                        {item.submittedAt}
                      </td>

                      {/* Price & Stock */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 text-xs leading-tight">
                          {item.price}
                        </p>
                        <p
                          className={`text-[10px] leading-tight mt-0.5 ${
                            item.stockWarning
                              ? 'text-amber-700 font-medium'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.stock}
                        </p>
                      </td>

                      {/* Compliance / Risk */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block rounded-md px-2.5 py-1 text-[10px] font-bold ${
                            item.complianceType === 'brand' ||
                            item.complianceType === 'trademark' ||
                            item.complianceType === 'resolution'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.complianceType === 'clean'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.complianceType === 'keyword'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {item.complianceLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <div className="relative">
                <select className="appearance-none rounded border border-slate-200 bg-white pl-2 pr-6 py-1 text-xs text-slate-700 shadow-2xs cursor-pointer">
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
              <span className="ml-2">
                Showing 1 to {filteredItems.length} of 38 pending items (1,428 total listings)
              </span>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                disabled
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs"
              >
                1
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                2
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                3
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                4
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            6. Bottom 3 SLA & Governance Policy Cards
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Policy Card 1 */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">
                  Automated Policy Rules
                </h3>
              </div>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Continuous AI scanner analyzes product titles, imagery resolution, and prohibited keyword registries before manual approval.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Rules Engine Online
              </span>
              <button
                type="button"
                className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
              >
                <span>Edit Rules</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Policy Card 2 */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">
                  Vendor Dispute Window
                </h3>
              </div>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Merchants have 7 business days to amend rejected listings with corrected invoices or trademark authorization certificates.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">14 active merchant appeals</span>
              <button
                type="button"
                className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
              >
                <span>View Appeals</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Policy Card 3 */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">
                  SLA &amp; Throughput
                </h3>
              </div>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Current moderation queue turnaround is 4.2 hours against the 12-hour vendor guarantee SLA standard.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-700">99.2% SLA Compliance</span>
              <button
                type="button"
                className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
              >
                <span>SLA Metrics</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
