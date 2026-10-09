import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Layers,
  Hourglass,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Download,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Shield,
  Scale,
  ArrowRight,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { exportToCsv } from '../lib/export-csv';
import { useMarketplaceStore } from '../store/marketplace-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

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
  assignedModerator?: string;
  rejectReason?: string;
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
  const navigate = useNavigate();
  const storeProducts = useMarketplaceStore((state) => state.products);

  const mergedInitialItems = useMemo(() => {
    const list: ModerationItem[] = [...MODERATION_ITEMS];
    storeProducts.forEach((p) => {
      if (!list.some((item) => item.id === p.id)) {
        const isVendora1P = p.sellerName === 'Vendora' || p.sellerType === 'platform';
        list.unshift({
          id: p.id,
          sku: p.variants?.[0]?.sku || `VEN-1P-${p.id.slice(-4).toUpperCase()}`,
          title: p.title,
          category: p.category.replace('cat-', '').replace(/-/g, ' ').toUpperCase(),
          image: p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=120&q=80',
          vendorName: p.sellerName || (isVendora1P ? 'Vendora' : 'SoundWave Direct'),
          trustScore: isVendora1P ? '100% Platform Verified' : '96% Trust Score',
          tierTag: isVendora1P ? '(Sold by Vendora)' : '(Partner)',
          submittedAt: 'Today • Just now',
          price: `$${p.price.toFixed(2)}`,
          stock: `${p.stock} units in stock`,
          stockWarning: p.stock <= 5,
          complianceType: p.status === 'approved' ? 'clean' : p.status === 'rejected' ? 'brand' : 'verified',
          complianceLabel: isVendora1P
            ? 'Sold by Vendora (Official 1P)'
            : p.status === 'approved'
            ? 'Approved ✓'
            : p.status === 'rejected'
            ? 'Rejected ✕'
            : 'Pending Review',
        });
      }
    });
    return list;
  }, [storeProducts]);

  const [items, setItems] = useState<ModerationItem[]>(mergedInitialItems);
  const [activeQueueTab, setActiveQueueTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [riskFilter, setRiskFilter] = useState('All Risk Levels');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const itemsPerPage = 8;

  // Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetIds, setRejectTargetIds] = useState<string[]>([]);
  const [rejectReasonCategory, setRejectReasonCategory] = useState('Violates Catalog Trademark & IP Policy');
  const [customRejectNote, setCustomRejectNote] = useState('');
  const [notifySeller, setNotifySeller] = useState(true);

  // Assign Moderator Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetIds, setAssignTargetIds] = useState<string[]>([]);
  const [selectedModerator, setSelectedModerator] = useState('Sarah Jenkins (Senior Compliance Lead)');
  const [moderatorPriority, setModeratorPriority] = useState('Normal (48h)');
  const [moderatorNote, setModeratorNote] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleApprove = (id: string) => {
    const item = items.find((i) => i.id === id);
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, complianceType: 'clean' as const, complianceLabel: 'Approved ✓' }
          : i
      )
    );
    try {
      useMarketplaceStore.getState().moderateProduct(id, 'approved');
    } catch {
      // ignore
    }
    showToast(`Approved "${item?.title || 'Listing'}" - catalog listing activated.`);
  };

  const handleOpenRejectModal = (id: string) => {
    setRejectTargetIds([id]);
    setRejectReasonCategory('Violates Catalog Trademark & IP Policy');
    setCustomRejectNote('');
    setNotifySeller(true);
    setIsRejectModalOpen(true);
  };

  const handleOpenBatchRejectModal = () => {
    if (selectedIds.length === 0) return;
    setRejectTargetIds([...selectedIds]);
    setRejectReasonCategory('Violates Catalog Trademark & IP Policy');
    setCustomRejectNote('');
    setNotifySeller(true);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    setItems((prev) =>
      prev.map((i) =>
        rejectTargetIds.includes(i.id)
          ? {
              ...i,
              complianceType: 'brand' as const,
              complianceLabel: 'Rejected ✕',
              rejectReason: `${rejectReasonCategory}${customRejectNote ? `: ${customRejectNote}` : ''}`,
            }
          : i
      )
    );
    try {
      rejectTargetIds.forEach((id) => {
        useMarketplaceStore.getState().moderateProduct(id, 'rejected', rejectReasonCategory);
      });
    } catch {
      // ignore
    }
    const count = rejectTargetIds.length;
    setSelectedIds([]);
    setIsRejectModalOpen(false);
    showToast(`Rejected ${count} listing(s). Vendor notified with compliance feedback.`);
  };

  const handleOpenAssignModal = (id?: string) => {
    const targets = id ? [id] : selectedIds;
    if (targets.length === 0) {
      showToast('Please select at least one listing to assign a moderator.');
      return;
    }
    setAssignTargetIds(targets);
    setSelectedModerator('Sarah Jenkins (Senior Compliance Lead)');
    setModeratorPriority('Normal (48h)');
    setModeratorNote('');
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssign = () => {
    const modShort = selectedModerator.split(' (')[0];
    setItems((prev) =>
      prev.map((i) =>
        assignTargetIds.includes(i.id)
          ? { ...i, assignedModerator: modShort }
          : i
      )
    );
    const count = assignTargetIds.length;
    setSelectedIds([]);
    setIsAssignModalOpen(false);
    showToast(`Assigned ${modShort} to ${count} listing(s).`);
  };

  const handleBulkApprove = () => {
    const count = selectedIds.length;
    setItems((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id)
          ? { ...item, complianceType: 'clean' as const, complianceLabel: 'Approved ✓' }
          : item
      )
    );
    try {
      useMarketplaceStore.getState().batchModerateProducts(selectedIds, 'approved');
    } catch {
      // ignore
    }
    setSelectedIds([]);
    showToast(`Batch approved ${count} selected listings.`);
  };

  const handleExportQueue = () => {
    exportToCsv({
      filename: `moderation-queue-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'SKU', key: 'sku' },
        { header: 'Listing Title', key: 'title' },
        { header: 'Category', key: 'category' },
        { header: 'Vendor', key: 'vendorName' },
        { header: 'Price', key: 'price' },
        { header: 'Stock', key: 'stock' },
        { header: 'Compliance Status', key: 'complianceLabel' },
      ],
      data: filteredItems,
    });
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'All Categories' || item.category === categoryFilter;

    let matchesQueue = true;
    if (activeQueueTab === 'vendora') {
      matchesQueue = item.vendorName === 'Vendora' || Boolean(item.tierTag?.includes('Sold by Vendora'));
    } else if (activeQueueTab === 'pending') {
      matchesQueue = item.complianceLabel.includes('Pending') || item.complianceType === 'verified';
    } else if (activeQueueTab === 'scan') {
      matchesQueue = item.complianceType === 'clean' || item.complianceType === 'keyword';
    } else if (activeQueueTab === 'escalation') {
      matchesQueue = item.complianceType === 'brand' || item.complianceType === 'trademark';
    } else if (activeQueueTab === 'approved') {
      matchesQueue = item.complianceLabel.includes('Approved');
    } else if (activeQueueTab === 'rejected') {
      matchesQueue = item.complianceLabel.includes('Rejected');
    }

    return matchesSearch && matchesCategory && matchesQueue;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            <Link
              to="/admin/add-product"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" />
              <span className="text-white">Add Product</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsAuditModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Audit Log</span>
            </button>

            <button
              type="button"
              onClick={handleExportQueue}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export Queue</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const unapproved = items.filter((i) => i.complianceLabel !== 'Approved ✓');
                if (unapproved.length === 0) {
                  showToast('All items in the moderation queue have already been approved!');
                } else {
                  setWizardIndex(0);
                  setIsWizardOpen(true);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Review Queue ({items.filter((i) => i.complianceLabel !== 'Approved ✓').length} Pending)</span>
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
              onClick={() => { setActiveQueueTab('pending'); setCurrentPage(1); }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                activeQueueTab === 'pending'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Submissions Queue ({items.filter(i => i.complianceLabel.includes('Pending') || i.complianceType === 'verified').length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveQueueTab('approved'); setCurrentPage(1); }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                activeQueueTab === 'approved'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Approved Catalog ({items.filter(i => i.complianceLabel.includes('Approved')).length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveQueueTab('rejected'); setCurrentPage(1); }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                activeQueueTab === 'rejected'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>Rejected / Needs Revision ({items.filter(i => i.complianceLabel.includes('Rejected')).length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveQueueTab('scan'); setCurrentPage(1); }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                activeQueueTab === 'scan'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>In Automated Scan ({items.filter(i => i.complianceType === 'clean' || i.complianceType === 'keyword').length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveQueueTab('escalation'); setCurrentPage(1); }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                activeQueueTab === 'escalation'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
              <span>Requires Escalation ({items.filter(i => i.complianceType === 'brand' || i.complianceType === 'trademark').length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveQueueTab('all'); setCurrentPage(1); }}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                activeQueueTab === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Archive ({items.length})
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
            <RotateCcw className="h-3 w-3" />
            <span>Queue refreshed live</span>
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="admin-select"
              >
                <option value="All Statuses">Status: All Statuses</option>
                <option value="Pending">Pending Review</option>
                <option value="Flagged">Flagged</option>
                <option value="Clean">Clean</option>
              </select>

              {/* Category */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="admin-select"
              >
                <option value="All Categories">Category: All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Home & Living">Home &amp; Living</option>
                <option value="Sports & Fitness">Sports &amp; Fitness</option>
                <option value="Furniture">Furniture</option>
                <option value="Fashion & Apparel">Fashion &amp; Apparel</option>
              </select>

              {/* Risk */}
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="admin-select"
              >
                <option value="All Risk Levels">Risk: All Risk Levels</option>
                <option value="High">High Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="Low">Low Risk</option>
              </select>

              <select className="admin-select">
                <option value="All Vendors">All Vendors</option>
                <option value="Nova Electronics">Nova Electronics</option>
                <option value="Artisan Kitchen">Artisan Kitchen</option>
                <option value="Nexus Tech Hub">Nexus Tech Hub</option>
                <option value="Urban Nomad Living">Urban Nomad Living</option>
                <option value="Aura Apparel">Aura Apparel</option>
                <option value="Vendora Soundwave">Vendora Soundwave</option>
              </select>

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
              <span className="font-medium">
                {selectedIds.length > 0 ? `${selectedIds.length} listings selected` : `Select all ${filteredItems.length} listings`}
              </span>
            </div>

            <div className="flex items-center gap-3 font-semibold text-[11px]">
              <span className="text-slate-400 font-normal">Batch:</span>
              <button
                type="button"
                onClick={handleBulkApprove}
                disabled={selectedIds.length === 0}
                className="text-emerald-700 hover:underline cursor-pointer disabled:opacity-40"
              >
                Approve Selected ({selectedIds.length})
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleOpenBatchRejectModal}
                disabled={selectedIds.length === 0}
                className="text-rose-600 hover:underline cursor-pointer disabled:opacity-40"
              >
                Reject Selected ({selectedIds.length})
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleOpenAssignModal()}
                disabled={selectedIds.length === 0}
                className="text-slate-800 hover:underline cursor-pointer disabled:opacity-40"
              >
                Assign Moderator ({selectedIds.length})
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
                {paginatedItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isVendora1P = item.vendorName === 'Vendora' || Boolean(item.tierTag?.includes('Sold by Vendora'));
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
                          <span className="text-slate-400 text-xs">{isVendora1P ? '⭐' : '🏪'}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 text-xs leading-tight">
                                {item.vendorName === 'Vendora' ? 'Vendora Soundwave' : item.vendorName}
                              </p>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                              {item.trustScore} {item.tierTag && !item.tierTag.includes('Vendora') && <span className="font-medium text-slate-600">{item.tierTag}</span>}
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

                      {/* Compliance / Risk & Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-1.5">
                            {item.assignedModerator && (
                              <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {item.assignedModerator}
                              </span>
                            )}
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
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                            <button
                              type="button"
                              onClick={() => handleApprove(item.id)}
                              className="text-emerald-700 hover:underline cursor-pointer"
                            >
                              Approve
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(item.id)}
                              className="text-rose-600 hover:underline cursor-pointer"
                            >
                              Reject
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => handleOpenAssignModal(item.id)}
                              className="text-slate-600 hover:underline cursor-pointer"
                            >
                              Assign
                            </button>
                          </div>
                        </div>
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
              <span>
                Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
                {filteredItems.length !== items.length && ` (filtered from ${items.length})`}
              </span>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    currentPage === page
                      ? 'bg-slate-900 text-white shadow-2xs'
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
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
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
                onClick={() => navigate('/admin/settings')}
                className="font-semibold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
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
                onClick={() => navigate('/admin/disputes')}
                className="font-semibold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
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
                onClick={() => navigate('/admin/reports')}
                className="font-semibold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>SLA Metrics</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Product Moderation Audit Log Modal ────────────────────── */}
        <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-700" />
                <span>Catalog Moderation Audit Trail</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Immutable compliance history and automated decisions recorded by the marketplace governance engine.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs divide-y divide-slate-100 max-h-80 overflow-y-auto">
              <div className="pt-2 first:pt-0">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Automated OCR Scan Completed
                  </span>
                  <span className="text-[10px] text-slate-400">12 mins ago</span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  SKU SPKR-009 passed trademark recognition against brand registry v4.2.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                    1P First-Party Product Created
                  </span>
                  <span className="text-[10px] text-slate-400">45 mins ago</span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Admin authored listing marked &quot;Sold by Vendora&quot; with automated inventory tracking.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Keyword Alert Flagged
                  </span>
                  <span className="text-[10px] text-slate-400">2 hours ago</span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  SKU DUNBL-015 triggered review rule: &quot;high price discrepancy compared to market average&quot;.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Policy Threshold Updated
                  </span>
                  <span className="text-[10px] text-slate-400">Yesterday</span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Supervisor adjusted resolution standard to minimum 1200x1200px for Tier 1 merchants.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close Audit Log
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Inspection Wizard Modal ───────────────────────────────── */}
        <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-slate-900" />
                  <span>Manual Inspection Wizard</span>
                </DialogTitle>
                {(() => {
                  const pending = items.filter((i) => i.complianceLabel !== 'Approved ✓');
                  return (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                      Listing {Math.min(wizardIndex + 1, pending.length)} of {pending.length}
                    </span>
                  );
                })()}
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Inspect vendor catalog submissions, verify compliance assertions, and apply immediate platform decisions.
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const pending = items.filter((i) => i.complianceLabel !== 'Approved ✓');
              const current = pending[wizardIndex] || pending[0];

              if (!current) {
                return (
                  <div className="py-8 text-center space-y-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-900">Queue is Clear!</div>
                    <p className="text-xs text-slate-500">
                      All products in this queue have been approved or inspected.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsWizardOpen(false)}
                      className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      Done
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-4 py-2 text-xs">
                  {/* Product Overview Card */}
                  <div className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <img
                      src={current.image}
                      alt={current.title}
                      className="h-20 w-20 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                          {current.sku}
                        </span>
                        <span className="text-[11px] text-slate-400">{current.category}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {current.title}
                      </h4>
                      <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                        <span>Vendor: <strong className="text-slate-800">{current.vendorName}</strong></span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">{current.trustScore}</span>
                      </div>
                      <div className="flex items-center gap-3 font-semibold text-slate-900">
                        <span>Price: {current.price}</span>
                        <span>•</span>
                        <span>Inventory: {current.stock}</span>
                      </div>
                    </div>
                  </div>

                  {/* Flag Details */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 flex items-start gap-2.5 text-amber-900">
                    <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Compliance Status / Flag</div>
                      <div className="mt-0.5 text-xs text-amber-800">
                        {current.complianceLabel}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsWizardOpen(false)}
                      className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Exit Wizard
                    </button>

                    <div className="flex items-center gap-2">
                      {pending.length > 1 && wizardIndex < pending.length - 1 && (
                        <button
                          type="button"
                          onClick={() => setWizardIndex((prev) => prev + 1)}
                          className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Skip
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenRejectModal(current.id);
                          if (wizardIndex >= pending.length - 1) {
                            setWizardIndex(0);
                          }
                        }}
                        className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        Reject Listing
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleApprove(current.id);
                          if (wizardIndex >= pending.length - 1) {
                            setWizardIndex(0);
                          }
                        }}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Approve Listing ✓
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* ── Rejection Reason Modal ───────────────────────────── */}
        <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
          <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100">
            <DialogHeader className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg font-bold">Reject Catalog Submission</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Specify compliance rejection reasons. The merchant will receive immediate notification with required remediation steps.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Primary Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={rejectReasonCategory}
                  onChange={(e) => setRejectReasonCategory(e.target.value)}
                  className="w-full admin-select h-10"
                >
                  <option value="Violates Catalog Trademark & IP Policy">
                    Violates Catalog Trademark & IP Policy
                  </option>
                  <option value="Misleading Listing Title or Unsubstantiated Claims">
                    Misleading Listing Title or Unsubstantiated Claims
                  </option>
                  <option value="Low Resolution or Watermarked Product Images">
                    Low Resolution or Watermarked Product Images
                  </option>
                  <option value="Missing Compliance, Safety or Regulatory Documentation">
                    Missing Compliance, Safety or Regulatory Documentation
                  </option>
                  <option value="Prohibited Goods or Hazardous Material Violation">
                    Prohibited Goods or Hazardous Material Violation
                  </option>
                  <option value="Inaccurate Pricing or Suspicious Margin Discrepancy">
                    Inaccurate Pricing or Suspicious Margin Discrepancy
                  </option>
                  <option value="Other Policy Violation">
                    Other Policy Violation
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Corrective Guidance &amp; Seller Notes
                </label>
                <textarea
                  rows={3}
                  value={customRejectNote}
                  onChange={(e) => setCustomRejectNote(e.target.value)}
                  placeholder="Explain exactly what the merchant must correct to obtain catalog approval..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="notifySellerCheck"
                  checked={notifySeller}
                  onChange={(e) => setNotifySeller(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
                <label htmlFor="notifySellerCheck" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  Notify seller via registered email &amp; vendor dashboard alert
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 shadow-xs cursor-pointer"
                >
                  Confirm Rejection &amp; Notify Seller
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Assign Moderator Modal ───────────────────────────── */}
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100">
            <DialogHeader className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600">
                  <Shield className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg font-bold">Assign Compliance Moderator</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Delegate {assignTargetIds.length} catalog submission(s) to a dedicated compliance reviewer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Moderator Specialist
                </label>
                <select
                  value={selectedModerator}
                  onChange={(e) => setSelectedModerator(e.target.value)}
                  className="w-full admin-select h-10"
                >
                  <option value="Sarah Jenkins (Senior Compliance Lead)">
                    Sarah Jenkins (Senior Compliance Lead)
                  </option>
                  <option value="Alex Rivera (Catalog & Trademark Specialist)">
                    Alex Rivera (Catalog &amp; Trademark Specialist)
                  </option>
                  <option value="David Chen (Safety & Hardware Compliance)">
                    David Chen (Safety &amp; Hardware Compliance)
                  </option>
                  <option value="Elena Rostova (IP & Anti-Counterfeit Lead)">
                    Elena Rostova (IP &amp; Anti-Counterfeit Lead)
                  </option>
                  <option value="Platform Super Admin (Direct Assignment)">
                    Platform Super Admin (Direct Assignment)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Review Priority / SLA
                </label>
                <select
                  value={moderatorPriority}
                  onChange={(e) => setModeratorPriority(e.target.value)}
                  className="w-full admin-select h-10"
                >
                  <option value="Normal (48h)">Normal Review (48h SLA)</option>
                  <option value="High Priority (24h)">High Priority (24h SLA)</option>
                  <option value="Critical Escalation (2h)">Critical Escalation (2h SLA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Internal Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={moderatorNote}
                  onChange={(e) => setModeratorNote(e.target.value)}
                  placeholder="e.g. Check trademark documentation for audio gear..."
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssign}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-[#FF7A1A] text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-[#ea6c13] shadow-xs cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
