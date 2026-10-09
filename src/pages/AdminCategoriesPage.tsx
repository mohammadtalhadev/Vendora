import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Package,
  Percent,
  AlertTriangle,
  TrendingUp,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowUpDown,
  Laptop,
  Shirt,
  Armchair,
  Dumbbell,
  Zap,
  CheckCircle2,
  Settings2,
  Code2,
  ArrowRight,
  CornerDownRight,
  RotateCw,
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

interface SubCategoryItem {
  id: string;
  name: string;
  slug: string;
  productsCount: number;
  vendorsCount: number;
  takeRate: number;
  isOverride?: boolean;
  status: 'active' | 'draft' | 'archived';
  schemaAttrsCount?: number;
}

interface RootCategoryItem {
  id: string;
  name: string;
  slug: string;
  iconName: 'laptop' | 'shirt' | 'armchair' | 'dumbbell';
  schemaAttrsCount: number;
  productsCount: number;
  vendorsCount: number;
  takeRate: number;
  status: 'active' | 'draft' | 'archived';
  subcategories: SubCategoryItem[];
  isExpanded: boolean;
}

interface UncategorizedProduct {
  id: string;
  title: string;
  sku: string;
  vendorName: string;
  submittedAt: string;
}

const INITIAL_ROOT_CATEGORIES: RootCategoryItem[] = [
  {
    id: 'root-electronics',
    name: 'Electronics & Tech',
    slug: '/electronics-and-tech',
    iconName: 'laptop',
    schemaAttrsCount: 18,
    productsCount: 14210,
    vendorsCount: 384,
    takeRate: 12.0,
    status: 'active',
    isExpanded: true,
    subcategories: [
      {
        id: 'sub-audio',
        name: 'Audio & Headphones',
        slug: '/audio-headphones',
        productsCount: 3420,
        vendorsCount: 142,
        takeRate: 12.0,
        isOverride: false,
        status: 'active',
      },
      {
        id: 'sub-computers',
        name: 'Computers & Accessories',
        slug: '/computers-accessories',
        productsCount: 5180,
        vendorsCount: 189,
        takeRate: 10.0,
        isOverride: true,
        status: 'active',
      },
      {
        id: 'sub-smart-home',
        name: 'Smart Home & IoT',
        slug: '/smarthome-iot',
        productsCount: 2110,
        vendorsCount: 94,
        takeRate: 12.0,
        isOverride: false,
        status: 'active',
      },
    ],
  },
  {
    id: 'root-apparel',
    name: 'Apparel & Fashion',
    slug: '/apparel-and-fashion',
    iconName: 'shirt',
    schemaAttrsCount: 24,
    productsCount: 12840,
    vendorsCount: 452,
    takeRate: 15.0,
    status: 'active',
    isExpanded: true,
    subcategories: [
      {
        id: 'sub-mens',
        name: "Men's Clothing",
        slug: '/mens-clothing',
        productsCount: 4890,
        vendorsCount: 210,
        takeRate: 15.0,
        isOverride: false,
        status: 'active',
      },
      {
        id: 'sub-womens-luxury',
        name: "Women's Luxury",
        slug: '/womens-luxury',
        productsCount: 5400,
        vendorsCount: 242,
        takeRate: 18.0,
        isOverride: true,
        status: 'active',
      },
    ],
  },
  {
    id: 'root-home',
    name: 'Home & Living',
    slug: '/home-and-living',
    iconName: 'armchair',
    schemaAttrsCount: 14,
    productsCount: 8920,
    vendorsCount: 215,
    takeRate: 12.5,
    status: 'active',
    isExpanded: false,
    subcategories: [
      {
        id: 'sub-kitchen',
        name: 'Kitchen & Dining',
        slug: '/kitchen-dining',
        productsCount: 4100,
        vendorsCount: 108,
        takeRate: 12.5,
        isOverride: false,
        status: 'active',
      },
      {
        id: 'sub-furniture',
        name: 'Furniture & Decor',
        slug: '/furniture-decor',
        productsCount: 4820,
        vendorsCount: 107,
        takeRate: 14.0,
        isOverride: true,
        status: 'active',
      },
    ],
  },
  {
    id: 'root-sports',
    name: 'Sports & Outdoors',
    slug: '/sports-and-outdoors',
    iconName: 'dumbbell',
    schemaAttrsCount: 16,
    productsCount: 6410,
    vendorsCount: 168,
    takeRate: 11.0,
    status: 'active',
    isExpanded: false,
    subcategories: [
      {
        id: 'sub-fitness',
        name: 'Fitness & Exercise Equipment',
        slug: '/fitness-exercise',
        productsCount: 3250,
        vendorsCount: 84,
        takeRate: 11.0,
        isOverride: false,
        status: 'active',
      },
      {
        id: 'sub-outdoor',
        name: 'Outdoor Recreation & Camping',
        slug: '/outdoor-recreation',
        productsCount: 3160,
        vendorsCount: 84,
        takeRate: 11.0,
        isOverride: false,
        status: 'active',
      },
    ],
  },
];

const INITIAL_UNCATEGORIZED_ITEMS: UncategorizedProduct[] = [
  {
    id: 'uncat-1',
    title: 'Mechanical RGB Key Switch Tester (Acrylic 9-Slot)',
    sku: 'SWITCH-TEST-9X',
    vendorName: 'KeyLab Innovations',
    submittedAt: 'Today, 09:15 AM',
  },
  {
    id: 'uncat-2',
    title: 'Bamboo Qi Fast Wireless Charging Valet Tray',
    sku: 'VALET-QI-BAMB',
    vendorName: 'Artisan Living Co.',
    submittedAt: 'Yesterday, 04:30 PM',
  },
  {
    id: 'uncat-3',
    title: 'Vintage Waxed Canvas Passport & Travel Wallet',
    sku: 'TRV-PASSPORT-01',
    vendorName: 'Heritage Goods',
    submittedAt: 'Oct 04, 2026',
  },
];

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<RootCategoryItem[]>(INITIAL_ROOT_CATEGORIES);
  const [uncategorizedItems, setUncategorizedItems] = useState<UncategorizedProduct[]>(INITIAL_UNCATEGORIZED_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'draft' | 'archived'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('Last re-indexed 42 minutes ago.');

  // New Category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatParent, setNewCatParent] = useState<string>('root');
  const [newCatTakeRate, setNewCatTakeRate] = useState('12.0');
  const [newCatIcon, setNewCatIcon] = useState<'laptop' | 'shirt' | 'armchair' | 'dumbbell'>('laptop');

  // Schema editor state
  const [selectedSchemaCategory, setSelectedSchemaCategory] = useState('Electronics');
  const [schemaFields, setSchemaFields] = useState<Record<string, string[]>>({
    Electronics: ['Brand', 'Model', 'Serial ID', 'Voltage'],
    'Apparel & Fashion': ['Size', 'Color', 'Fabric', 'Care Instructions'],
    'Sports & Outdoors': ['Activity Type', 'Weight Limit', 'Material'],
  });
  const [newSchemaFieldInput, setNewSchemaFieldInput] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Toggle single root category expanded
  const toggleExpand = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isExpanded: !c.isExpanded } : c))
    );
  };

  // Collapse / Expand All
  const areAllExpanded = categories.every((c) => c.isExpanded);
  const handleToggleCollapseAll = () => {
    setCategories((prev) => prev.map((c) => ({ ...c, isExpanded: !areAllExpanded })));
    showToast(!areAllExpanded ? 'All category tiers expanded' : 'All category tiers collapsed');
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return categories
      .filter((cat) => {
        if (statusFilter !== 'All' && cat.status !== statusFilter) return false;
        if (!q) return true;
        const matchesRoot =
          cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q);
        const matchesSub = cat.subcategories.some(
          (sub) => sub.name.toLowerCase().includes(q) || sub.slug.toLowerCase().includes(q)
        );
        return matchesRoot || matchesSub;
      })
      .map((cat) => {
        if (!searchQuery.trim()) return cat;
        // If searching, keep root expanded and filter subcategories
        const q = searchQuery.toLowerCase().trim();
        const matchingSubs = cat.subcategories.filter(
          (sub) => sub.name.toLowerCase().includes(q) || sub.slug.toLowerCase().includes(q)
        );
        return {
          ...cat,
          isExpanded: true,
          subcategories: matchingSubs.length > 0 ? matchingSubs : cat.subcategories,
        };
      });
  }, [categories, searchQuery, statusFilter]);

  // Handle create category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const slug = newCatSlug.trim() || `/${newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const rate = parseFloat(newCatTakeRate) || 12.0;

    if (newCatParent === 'root') {
      const newRoot: RootCategoryItem = {
        id: `root-${Date.now()}`,
        name: newCatName.trim(),
        slug,
        iconName: newCatIcon,
        schemaAttrsCount: 12,
        productsCount: 0,
        vendorsCount: 0,
        takeRate: rate,
        status: 'active',
        subcategories: [],
        isExpanded: true,
      };
      setCategories((prev) => [newRoot, ...prev]);
      showToast(`Root category "${newCatName}" created successfully.`);
    } else {
      const newSub: SubCategoryItem = {
        id: `sub-${Date.now()}`,
        name: newCatName.trim(),
        slug,
        productsCount: 0,
        vendorsCount: 0,
        takeRate: rate,
        isOverride: rate !== 12.0,
        status: 'active',
      };
      setCategories((prev) =>
        prev.map((c) =>
          c.id === newCatParent
            ? { ...c, isExpanded: true, subcategories: [...c.subcategories, newSub] }
            : c
        )
      );
      showToast(`Subcategory "${newCatName}" added successfully.`);
    }

    setNewCatName('');
    setNewCatSlug('');
    setIsNewCategoryModalOpen(false);
  };

  // Handle resolving uncategorized item
  const handleMapUncategorizedItem = (itemId: string, targetCategoryName: string) => {
    setUncategorizedItems((prev) => prev.filter((item) => item.id !== itemId));
    showToast(`Mapped item to category "${targetCategoryName}".`);
    if (uncategorizedItems.length <= 1) {
      setIsResolveModalOpen(false);
    }
  };

  // Handle Reorder Hierarchy
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const updated = [...categories];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setCategories(updated);
    showToast(`Category "${moved.name}" moved ${direction}.`);
  };

  // Handle Catalog Sync
  const handleRunManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncText('Just now (100% synchronized)');
      showToast('Automated Catalog Re-indexing completed! 48,290 items indexed across facets.');
    }, 1200);
  };

  // Add schema attribute
  const handleAddSchemaField = () => {
    if (!newSchemaFieldInput.trim()) return;
    setSchemaFields((prev) => ({
      ...prev,
      [selectedSchemaCategory]: [
        ...(prev[selectedSchemaCategory] || []),
        newSchemaFieldInput.trim(),
      ],
    }));
    showToast(`Added mandatory attribute "${newSchemaFieldInput.trim()}" to ${selectedSchemaCategory}`);
    setNewSchemaFieldInput('');
  };

  const renderCategoryIcon = (iconName: RootCategoryItem['iconName']) => {
    switch (iconName) {
      case 'laptop':
        return <Laptop className="h-4 w-4 text-slate-700" />;
      case 'shirt':
        return <Shirt className="h-4 w-4 text-slate-700" />;
      case 'armchair':
        return <Armchair className="h-4 w-4 text-slate-700" />;
      case 'dumbbell':
        return <Dumbbell className="h-4 w-4 text-slate-700" />;
      default:
        return <Package className="h-4 w-4 text-slate-700" />;
    }
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Category Management"
      subtitle="Organize marketplace taxonomy, manage commission fee overrides by category, and configure mandatory listing attributes."
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
              <span className="text-slate-600">Categories</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Category Management
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">
              Organize marketplace taxonomy, manage commission fee overrides by category, and configure mandatory listing attributes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsReorderModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
              <span>Reorder Hierarchy</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Category</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            2. Top 4 KPI Metric Cards
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Categories */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                TOTAL CATEGORIES
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Layers className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                64
              </div>
              <div className="mt-1 text-xs text-slate-500 font-medium">
                12 Root • 52 Subcategories
              </div>
            </div>
          </div>

          {/* Card 2: Active Listings */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                ACTIVE LISTINGS
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Package className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                48,290
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                <span className="flex items-center gap-0.5 font-bold text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  +12.8%
                </span>
                <span className="text-slate-400">MoM across catalogs</span>
              </div>
            </div>
          </div>

          {/* Card 3: Avg Category Take Rate */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                AVG CATEGORY TAKE RATE
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Percent className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                11.4%
              </div>
              <div className="mt-1 text-xs text-slate-400 font-medium">
                Range: Min 6.0% — Max 18.0%
              </div>
            </div>
          </div>

          {/* Card 4: Uncategorized Items */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                UNCATEGORIZED ITEMS
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-600">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold tracking-tight text-rose-600">
                  {uncategorizedItems.length}
                </div>
                <div className="mt-1 text-xs text-rose-600 font-medium">
                  Requires manual mapping
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(true)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. Main Two-Column Layout (8 cols Table + 4 cols Side Panels)
            ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Left Column (8 cols): Hierarchical Table ──────────────── */}
          <div className="lg:col-span-8 space-y-3">
            {/* Toolbar: Search + Status Filter + Collapse All */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories or taxonomies..."
                  className="w-full h-8.5 pl-8 pr-9 text-xs rounded-lg border border-slate-200 bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1 py-0.2 text-[9px] font-medium text-slate-400">
                  ⌘K
                </kbd>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none shadow-2xs cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={handleToggleCollapseAll}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="h-3 w-3 text-slate-400" />
                  <span>{areAllExpanded ? 'Collapse All' : 'Expand All'}</span>
                </button>
              </div>
            </div>

            {/* Category Hierarchical Table */}
            <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="w-10 px-3 py-3 text-center">#</th>
                      <th className="px-4 py-3">Category &amp; Taxonomy</th>
                      <th className="px-4 py-3">Products</th>
                      <th className="px-4 py-3">Vendors</th>
                      <th className="px-4 py-3 text-right">Take Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          No categories found matching "{searchQuery}"
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map((root) => (
                        <React.Fragment key={root.id}>
                          {/* Root Row */}
                          <tr className="hover:bg-slate-50/70 transition-colors bg-white font-medium">
                            <td className="px-3 py-3.5 text-center text-slate-400 font-mono text-[11px]">
                              <button
                                type="button"
                                onClick={() => toggleExpand(root.id)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
                              >
                                {root.isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 shrink-0">
                                  {renderCategoryIcon(root.iconName)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs">
                                      {root.name}
                                    </span>
                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                      {root.schemaAttrsCount} schema attrs
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                    {root.slug}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 font-bold text-slate-900">
                              {root.productsCount.toLocaleString()}
                            </td>

                            <td className="px-4 py-3.5 text-slate-600">
                              {root.vendorsCount}
                            </td>

                            <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                              {root.takeRate.toFixed(1)}%
                            </td>
                          </tr>

                          {/* Subcategory Rows (If Root is Expanded) */}
                          {root.isExpanded &&
                            root.subcategories.map((sub) => (
                              <tr
                                key={sub.id}
                                className="bg-slate-50/30 hover:bg-slate-50 transition-colors"
                              >
                                <td className="px-3 py-3 text-center text-slate-300">
                                  <CornerDownRight className="h-3.5 w-3.5 mx-auto text-slate-400" />
                                </td>

                                <td className="px-4 py-3 pl-6">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-800 text-xs">
                                      {sub.name}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-400">
                                      {sub.slug}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-slate-700 font-medium">
                                  {sub.productsCount.toLocaleString()}
                                </td>

                                <td className="px-4 py-3 text-slate-500">
                                  {sub.vendorsCount}
                                </td>

                                <td className="px-4 py-3 text-right">
                                  {sub.isOverride ? (
                                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                      {sub.takeRate.toFixed(1)}% (Override)
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[11px]">
                                      {sub.takeRate.toFixed(1)}% (Inherited)
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500 gap-3">
                <span>
                  Showing {filteredCategories.length} of 12 root tiers, 52 subcategories mapped
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => showToast('Pagination: previous page')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('Pagination: next page')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column (4 cols): Side Panels ─────────────────────── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Card 1: Commission Presets */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Commission Presets</h3>
                <Settings2 className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Categories automatically inherit root fees unless an explicit fee schedule override is specified.
              </p>

              <div className="space-y-3 text-xs">
                {/* Preset 1 */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 space-y-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-700">Standard Base Fee</span>
                    <span className="font-bold text-slate-900">12.0%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-slate-700 rounded-full" style={{ width: '40%' }} />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Applied across 38 default subcategories
                  </div>
                </div>

                {/* Preset 2 */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 space-y-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-700">High-Margin / Luxury</span>
                    <span className="font-bold text-blue-600">18.0%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '60%' }} />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Women's Luxury, Fine Jewelry, Collectibles
                  </div>
                </div>

                {/* Preset 3 */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 space-y-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-700">Volume Discount Tier</span>
                    <span className="font-bold text-slate-900">10.0%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full" style={{ width: '32%' }} />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Computers &amp; Enterprise Peripherals
                  </div>
                </div>
              </div>

              <Link
                to="/admin/commission"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <span>Configure Global Matrix</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>

            {/* Card 2: Required Attribute Schemes */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Required Attribute Schemes</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-bold text-slate-600">
                  Strict Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Merchants cannot publish listings until mandatory fields conform to taxonomy JSON schemes.
              </p>

              {/* Schema Lists */}
              <div className="space-y-3 text-xs">
                {/* Scheme 1: Electronics */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Laptop className="h-3.5 w-3.5 text-slate-500" />
                      Electronics
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {schemaFields['Electronics']?.length || 4} Required
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {schemaFields['Electronics']?.map((field) => (
                      <span
                        key={field}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700"
                      >
                        {field}
                      </span>
                    ))}
                    <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      +14 optional
                    </span>
                  </div>
                </div>

                {/* Scheme 2: Apparel & Fashion */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Shirt className="h-3.5 w-3.5 text-slate-500" />
                      Apparel &amp; Fashion
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {schemaFields['Apparel & Fashion']?.length || 4} Required
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {schemaFields['Apparel & Fashion']?.map((field) => (
                      <span
                        key={field}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700"
                      >
                        {field}
                      </span>
                    ))}
                    <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      +20 optional
                    </span>
                  </div>
                </div>

                {/* Scheme 3: Sports & Outdoors */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Dumbbell className="h-3.5 w-3.5 text-slate-500" />
                      Sports &amp; Outdoors
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {schemaFields['Sports & Outdoors']?.length || 3} Required
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {schemaFields['Sports & Outdoors']?.map((field) => (
                      <span
                        key={field}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSchemaModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Code2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Edit Taxonomy Schema</span>
              </button>
            </div>

            {/* Card 3: Automated Catalog Re-indexing */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <span>Automated Catalog Re-indexing</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {lastSyncText} 48,290 items mapped cleanly across all store facets.
              </p>
              <button
                type="button"
                onClick={handleRunManualSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`h-3 w-3 text-slate-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Synchronizing...' : 'Run Manual Sync'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            4. Interactive Modals
            ===================================================================== */}

        {/* ── Modal 1: + New Category Modal ─────────────────────────── */}
        <Dialog open={isNewCategoryModalOpen} onOpenChange={setIsNewCategoryModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-slate-900" />
                <span>Create New Category</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Add a new taxonomy node to organize marketplace catalog listings and define commission take rates.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateCategory} className="space-y-3.5 py-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Video Games & Consoles"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Permalink Slug</label>
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="/video-games-and-consoles"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hierarchy Level</label>
                  <select
                    value={newCatParent}
                    onChange={(e) => setNewCatParent(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700 focus:outline-none"
                  >
                    <option value="root">Root Level Tier</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        Child of {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Take Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="50"
                    value={newCatTakeRate}
                    onChange={(e) => setNewCatTakeRate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Icon</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['laptop', 'shirt', 'armchair', 'dumbbell'] as const).map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewCatIcon(ic)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs capitalize ${
                        newCatIcon === ic
                          ? 'border-slate-900 bg-slate-50 font-bold'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {renderCategoryIcon(ic)}
                      <span className="text-[10px]">{ic}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Save Category
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Modal 2: Resolve Uncategorized Items Modal ─────────────── */}
        <Dialog open={isResolveModalOpen} onOpenChange={setIsResolveModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span>Map Uncategorized Products</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                The following listings were imported without valid taxonomy tags. Assign them to a live category to make them discoverable.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {uncategorizedItems.length === 0 ? (
                <div className="py-6 text-center text-slate-500">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  All imported catalog listings have been mapped!
                </div>
              ) : (
                uncategorizedItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900">{item.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          SKU: {item.sku} • Vendor: {item.vendorName}
                        </div>
                      </div>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Unmapped
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium">Assign to:</span>
                      <select
                        onChange={(e) => handleMapUncategorizedItem(item.id, e.target.value)}
                        defaultValue=""
                        className="flex-1 rounded-md border border-slate-200 bg-white p-1.5 text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="" disabled>
                          Select target category...
                        </option>
                        {categories.map((c) => (
                          <optgroup key={c.id} label={c.name}>
                            <option value={c.name}>{c.name} (Root)</option>
                            {c.subcategories.map((s) => (
                              <option key={s.id} value={s.name}>
                                {c.name} &gt; {s.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Modal 3: Reorder Hierarchy Modal ──────────────────────── */}
        <Dialog open={isReorderModalOpen} onOpenChange={setIsReorderModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-slate-900" />
                <span>Reorder Category Hierarchy</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Adjust display sequence of root category tiers in navigation menus and filter sidebars.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2 text-xs">
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-slate-400 font-bold">{idx + 1}.</span>
                    <div className="font-bold text-slate-800">{cat.name}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveCategory(idx, 'up')}
                      className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === categories.length - 1}
                      onClick={() => handleMoveCategory(idx, 'down')}
                      className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Modal 4: Edit Taxonomy Schema Modal ───────────────────── */}
        <Dialog open={isSchemaModalOpen} onOpenChange={setIsSchemaModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="h-5 w-5 text-slate-900" />
                <span>Taxonomy Attribute Schema Editor</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Define required specification fields enforced during vendor product onboarding.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Category</label>
                <select
                  value={selectedSchemaCategory}
                  onChange={(e) => setSelectedSchemaCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Apparel & Fashion">Apparel &amp; Fashion</option>
                  <option value="Sports & Outdoors">Sports &amp; Outdoors</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Active Mandatory Attributes
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50 min-h-[50px]">
                  {schemaFields[selectedSchemaCategory]?.map((field, idx) => (
                    <span
                      key={field}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800"
                    >
                      {field}
                      <button
                        type="button"
                        onClick={() => {
                          setSchemaFields((prev) => ({
                            ...prev,
                            [selectedSchemaCategory]: prev[selectedSchemaCategory].filter(
                              (_, i) => i !== idx
                            ),
                          }));
                          showToast(`Removed field "${field}"`);
                        }}
                        className="text-slate-400 hover:text-rose-600 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Add Mandatory Attribute
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSchemaFieldInput}
                    onChange={(e) => setNewSchemaFieldInput(e.target.value)}
                    placeholder="e.g. Warranty Period, Certification ID"
                    className="flex-1 rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddSchemaField}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSchemaModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
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
