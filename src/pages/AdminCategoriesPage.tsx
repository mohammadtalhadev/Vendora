import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Package,
  Percent,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Settings2,
  ArrowRight,
  CornerDownRight,
  RotateCw,
  Eye,
  EyeOff,
  Laptop,
  Shirt,
  Armchair,
  Dumbbell,
  Volume2,
  Watch,
  Home,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { formatPrice } from '../store/currency-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { useCategoryTree } from '../features/admin/hooks/useAdminQueries';
import { useAdminActions } from '../features/admin/hooks/useAdminActions';
import type { AdminCategoryRoot, AdminCategoryChild } from '../features/admin/api/categories';

// Every figure on this page is read from `admin_category_tree`; nothing here is typed
// into a form and then remembered by the browser. Only fields the tree returns are shown.

const ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'laptop', Icon: Laptop },
  { name: 'shirt', Icon: Shirt },
  { name: 'armchair', Icon: Armchair },
  { name: 'dumbbell', Icon: Dumbbell },
  { name: 'volume-2', Icon: Volume2 },
  { name: 'watch', Icon: Watch },
  { name: 'home', Icon: Home },
];

const ICON_BY_NAME: Record<string, LucideIcon> = Object.fromEntries(ICON_OPTIONS.map((o) => [o.name, o.Icon]));

const CATEGORY_PAGE_SIZE = 8;

type StatusFilter = 'all' | 'active' | 'inactive';

type CategoryView = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  commissionOverride: number | null;
  products: number;
  sellers: number;
  icon: string | null;
};

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; node: CategoryView; isRoot: boolean }
  | null;

const toKebab = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const renderCategoryIcon = (name: string | null) => {
  const Icon = name ? ICON_BY_NAME[name] : undefined;
  const Cmp = Icon ?? Package;
  return <Cmp className="h-4 w-4 text-slate-700" />;
};

const rateLabel = (override: number | null): string =>
  override === null ? 'Default' : `${(override * 100).toFixed(1)}%`;

const toRootView = (r: AdminCategoryRoot): CategoryView => ({
  id: r.id, name: r.name, slug: r.slug, isActive: r.isActive,
  commissionOverride: r.commissionOverride, products: r.products, sellers: r.sellers, icon: r.icon,
});

const toChildView = (c: AdminCategoryChild): CategoryView => ({
  id: c.id, name: c.name, slug: c.slug, isActive: c.isActive,
  commissionOverride: c.commissionOverride, products: c.products, sellers: c.sellers, icon: null,
});

export const AdminCategoriesPage: React.FC = () => {
  const actions = useAdminActions();
  const { data: tree, isPending, isError, error, refetch, isFetching } = useCategoryTree();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIcon, setFormIcon] = useState('laptop');
  const [formParent, setFormParent] = useState<string>('root');

  const [rateTarget, setRateTarget] = useState<CategoryView | null>(null);
  const [rateInput, setRateInput] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<CategoryView | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3200);
  };

  const rootsView: CategoryView[] = useMemo(
    () => (tree?.roots ?? []).map(toRootView),
    [tree],
  );

  const allChildren: CategoryView[] = useMemo(
    () => (tree?.roots ?? []).flatMap((r) => r.children.map(toChildView)),
    [tree],
  );

  const mappedListings = useMemo(
    () => rootsView.reduce((sum, r) => sum + r.products, 0) + allChildren.reduce((sum, c) => sum + c.products, 0),
    [rootsView, allChildren],
  );
  const rateOverrides = useMemo(
    () => [...rootsView, ...allChildren].filter((c) => c.commissionOverride !== null).length,
    [rootsView, allChildren],
  );

  const searching = searchQuery.trim().toLowerCase();

  // Filtering is a view concern for a finite tree read: apply the status and the search
  // (root name/slug, or any child name/slug) over the rows the RPC actually returned.
  const visibleRoots: CategoryView[] = useMemo(() => {
    return (tree?.roots ?? [])
      .filter((root) => {
        if (statusFilter === 'active' && !root.isActive) return false;
        if (statusFilter === 'inactive' && root.isActive) return false;
        if (!searching) return true;
        return (
          root.name.toLowerCase().includes(searching) ||
          root.slug.toLowerCase().includes(searching) ||
          root.children.some(
            (c) => c.name.toLowerCase().includes(searching) || c.slug.toLowerCase().includes(searching),
          )
        );
      })
      .map(toRootView);
  }, [tree, statusFilter, searching]);

  const totalPages = Math.max(1, Math.ceil(visibleRoots.length / CATEGORY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRoots = visibleRoots.slice((safePage - 1) * CATEGORY_PAGE_SIZE, safePage * CATEGORY_PAGE_SIZE);

  const childrenFor = (rootId: string): CategoryView[] =>
    (tree?.roots ?? []).find((r) => r.id === rootId)?.children.map(toChildView) ?? [];

  const isExpanded = (rootId: string): boolean =>
    searching ? true : !collapsed.has(rootId);

  const toggleExpand = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const areAllExpanded = visibleRoots.length > 0 && visibleRoots.every((r) => isExpanded(r.id));
  const handleToggleCollapseAll = () => {
    if (areAllExpanded) {
      setCollapsed(new Set(visibleRoots.map((r) => r.id)));
    } else {
      setCollapsed(new Set());
    }
  };

  const openCreate = () => {
    setModal({ mode: 'create' });
    setFormName('');
    setFormSlug('');
    setFormIcon('laptop');
    setFormParent('root');
  };

  const openEdit = (node: CategoryView, isRoot: boolean) => {
    setModal({ mode: 'edit', node, isRoot });
    setFormName(node.name);
    setFormSlug(node.slug);
    setFormIcon(node.icon ?? 'laptop');
    setFormParent('root');
  };

  const submitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (name === '') {
      showToast('A category needs a name.');
      return;
    }
    const slug = formSlug.trim() || toKebab(name);

    if (modal?.mode === 'create') {
      actions.createCategory.mutate(
        {
          name,
          slug,
          parentId: formParent === 'root' ? null : formParent,
          icon: formIcon,
        },
        {
          onSuccess: (created) => {
            setModal(null);
            showToast(`Created category "${created.name}".`);
          },
        },
      );
    } else if (modal?.mode === 'edit') {
      actions.updateCategory.mutate(
        {
          categoryId: modal.node.id,
          name,
          slug,
          ...(modal.isRoot ? { icon: formIcon } : {}),
        },
        {
          onSuccess: () => {
            setModal(null);
            showToast(`Saved category "${name}".`);
          },
        },
      );
    }
  };

  const categoryModalError =
    actions.createCategory.isError
      ? actions.createCategory.error?.message
      : actions.updateCategory.isError
      ? actions.updateCategory.error?.message
      : null;

  const handleToggleActive = (node: CategoryView) => {
    actions.updateCategory.mutate(
      { categoryId: node.id, isActive: !node.isActive },
      {
        onSuccess: () => showToast(`"${node.name}" is now ${node.isActive ? 'hidden' : 'active'}.`),
        onError: (err) => showToast(err.message),
      },
    );
  };

  const openRate = (node: CategoryView) => {
    setRateTarget(node);
    setRateInput(node.commissionOverride === null ? '' : String(+(node.commissionOverride * 100).toFixed(2)));
  };

  const submitRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateTarget) return;
    const pct = parseFloat(rateInput);
    if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
      showToast('Enter a rate between 0 and 50.');
      return;
    }
    actions.setCategoryCommission.mutate(
      { categoryId: rateTarget.id, rate: pct / 100 },
      {
        onSuccess: () => {
          showToast(`Set "${rateTarget.name}" rate to ${rateLabel(pct / 100)}.`);
          setRateTarget(null);
        },
      },
    );
  };

  const clearRate = () => {
    if (!rateTarget) return;
    actions.setCategoryCommission.mutate(
      { categoryId: rateTarget.id, rate: null },
      {
        onSuccess: () => {
          showToast(`"${rateTarget.name}" now uses the platform default.`);
          setRateTarget(null);
        },
      },
    );
  };

  const rateError = actions.setCategoryCommission.isError
    ? actions.setCategoryCommission.error?.message ?? 'The rate could not be saved.'
    : null;

  const confirmDelete = () => {
    if (!deleteTarget) return;
    actions.deleteCategory.mutate(deleteTarget.id, {
      onSuccess: () => {
        showToast(`Deleted category "${deleteTarget.name}".`);
        setDeleteTarget(null);
      },
    });
  };

  const deleteError = actions.deleteCategory.isError
    ? actions.deleteCategory.error?.message ?? 'The category could not be deleted.'
    : null;

  const handleAssign = (productId: string, categoryId: string | null, title: string) => {
    if (categoryId === null || categoryId === '') return;
    actions.assignProductCategory.mutate(
      { productId, categoryId },
      {
        onSuccess: () => showToast(`Mapped "${title}" into the taxonomy.`),
        onError: (err) => showToast(err.message),
      },
    );
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Category Management"
      subtitle="Organize the marketplace taxonomy and set commission overrides per category — all figures come from the category tree."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        {/* Header actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit mt-1">Category Management</h1>
            <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">
              Taxonomy tree, per-category commission overrides, and the listings the taxonomy has not yet placed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              title="Re-read the category tree"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RotateCw className={`h-3.5 w-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{isFetching ? 'Refreshing…' : 'Refresh'}</span>
            </button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" />
              <span className="text-white">New Category</span>
            </Button>
          </div>
        </div>

        {isPending && (
          <div className="rounded-xl border border-slate-200/90 bg-white p-6 text-xs text-slate-500 shadow-2xs">
            Reading the category tree…
          </div>
        )}

        {isError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <div className="font-semibold mb-1">Failed to load the category tree</div>
            <div className="mb-3 text-xs">{error instanceof Error ? error.message : 'The taxonomy could not be read.'}</div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {tree && !isPending && (
          <>
            {/* KPI cards — all derived from the tree read. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Categories</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{tree.total}</div>
                <div className="mt-1 text-xs text-slate-500 font-medium">
                  {tree.roots.length} Root • {tree.roots.reduce((s, r) => s + r.children.length, 0)} Subcategories
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Categorized Listings</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                    <Package className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{mappedListings.toLocaleString()}</div>
                <div className="mt-1 text-xs text-slate-400 font-medium">Counted in SQL from the products table</div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rate Overrides</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                    <Percent className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{rateOverrides}</div>
                <div className="mt-1 text-xs text-slate-400 font-medium">Categories charged other than the default</div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Uncategorized Listings</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold tracking-tight text-rose-600">{tree.unmapped.length}</div>
                <div className="mt-1 text-xs text-rose-600 font-medium">Need a category before they are discoverable</div>
              </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: hierarchical table */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <label htmlFor="category-search" className="sr-only">Search categories</label>
                    <input
                      id="category-search"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                      placeholder="Search categories or taxonomies..."
                      className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="category-status" className="sr-only">Filter by status</label>
                    <div className="relative">
                      <select
                        id="category-status"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
                        className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none shadow-2xs cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Hidden</option>
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

                <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table
                      className="w-full text-left text-xs"
                      aria-label="Categories and taxonomy"
                    >
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th scope="col" className="w-10 px-3 py-3 text-center">#</th>
                          <th scope="col" className="px-4 py-3">Category &amp; Taxonomy</th>
                          <th scope="col" className="px-4 py-3">Products</th>
                          <th scope="col" className="px-4 py-3">Sellers</th>
                          <th scope="col" className="px-4 py-3">Take Rate</th>
                          <th scope="col" className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleRoots.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400">
                              No categories match your filters.
                            </td>
                          </tr>
                        ) : (
                          pagedRoots.map((root) => {
                            const kids = childrenFor(root.id);
                            const expanded = isExpanded(root.id);
                            return (
                              <React.Fragment key={root.id}>
                                <tr className="hover:bg-slate-50/70 transition-colors bg-white font-medium">
                                  <td className="px-3 py-3.5 text-center text-slate-400 font-mono text-[11px]">
                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(root.id)}
                                      aria-label={expanded ? `Collapse ${root.name}` : `Expand ${root.name}`}
                                      aria-expanded={expanded}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
                                    >
                                      {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                    </button>
                                  </td>

                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 shrink-0">
                                        {renderCategoryIcon(root.icon)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900 text-xs">{root.name}</span>
                                          {!root.isActive && (
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200">
                                              Hidden
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{root.slug}</div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-4 py-3.5 font-bold text-slate-900">{root.products.toLocaleString()}</td>
                                  <td className="px-4 py-3.5 text-slate-600">{root.sellers}</td>

                                  <td className="px-4 py-3.5">
                                    {root.commissionOverride === null ? (
                                      <span className="text-slate-500 text-[11px]">Default</span>
                                    ) : (
                                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                        {rateLabel(root.commissionOverride)}
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => openRate(root)}
                                        title="Set commission rate"
                                        aria-label={`Set commission rate for ${root.name}`}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                                      >
                                        <Percent className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleActive(root)}
                                        title={root.isActive ? 'Hide category' : 'Show category'}
                                        aria-label={root.isActive ? `Hide ${root.name}` : `Show ${root.name}`}
                                        disabled={actions.updateCategory.isPending}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                                      >
                                        {root.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEdit(root, true)}
                                        title="Edit category"
                                        aria-label={`Edit ${root.name}`}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteTarget(root)}
                                        title="Delete category"
                                        aria-label={`Delete ${root.name}`}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {expanded && kids.map((sub) => (
                                  <tr key={sub.id} className="bg-slate-50/30 hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-3 text-center text-slate-300">
                                      <CornerDownRight className="h-3.5 w-3.5 mx-auto text-slate-400" />
                                    </td>
                                    <td className="px-4 py-3 pl-6">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-slate-800 text-xs">
                                          {sub.name}
                                          {!sub.isActive && (
                                            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500 border border-slate-200">Hidden</span>
                                          )}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-400">{sub.slug}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-700 font-medium">{sub.products.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-slate-500">{sub.sellers}</td>
                                    <td className="px-4 py-3">
                                      {sub.commissionOverride === null ? (
                                        <span className="text-slate-500 text-[11px]">Default</span>
                                      ) : (
                                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                          {rateLabel(sub.commissionOverride)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          type="button"
                                          onClick={() => openRate(sub)}
                                          title="Set commission rate"
                                          aria-label={`Set commission rate for ${sub.name}`}
                                          className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                                        >
                                          <Percent className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleActive(sub)}
                                          title={sub.isActive ? 'Hide subcategory' : 'Show subcategory'}
                                          aria-label={sub.isActive ? `Hide ${sub.name}` : `Show ${sub.name}`}
                                          disabled={actions.updateCategory.isPending}
                                          className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                                        >
                                          {sub.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openEdit(sub, false)}
                                          title="Edit subcategory"
                                          aria-label={`Edit ${sub.name}`}
                                          className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDeleteTarget(sub)}
                                          title="Delete subcategory"
                                          aria-label={`Delete ${sub.name}`}
                                          className="inline-flex h-7 w-7 items-center justify-center rounded border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Real client-side paging over the roots the tree returned. */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500 gap-3">
                    <span>
                      Page {safePage} of {totalPages} • showing {pagedRoots.length} of {visibleRoots.length} root categories
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: real side panels */}
              <div className="lg:col-span-4 space-y-4">
                {/* Unmapped listings, with a genuine assign-to-category write. */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm">Uncategorized Listings</h3>
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                  </div>
                  {tree.unmapped.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                      Every listing has a category.
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs">
                      {tree.unmapped.map((item) => (
                        <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                          <div>
                            <div className="font-bold text-slate-900">{item.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {item.brand || 'No brand'} • {item.storeName || 'Unknown store'} • {formatPrice(item.price)} • stock {item.stock}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                            <label htmlFor={`assign-${item.id}`} className="text-slate-500 font-medium shrink-0">
                              Assign to
                            </label>
                            <select
                              id={`assign-${item.id}`}
                              defaultValue=""
                              onChange={(e) => {
                                handleAssign(item.id, e.target.value || null, item.title);
                                e.currentTarget.value = '';
                              }}
                              className="flex-1 rounded-md border border-slate-200 bg-white p-1.5 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="" disabled>Select a category…</option>
                              {tree.roots.map((c) => (
                                <optgroup key={c.id} label={c.name}>
                                  <option value={c.id}>{c.name} (root)</option>
                                  {c.children.map((s) => (
                                    <option key={s.id} value={s.id}>{c.name} &gt; {s.name}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* A real navigation affordance to the commission matrix. */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm">Commission</h3>
                    <Settings2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Categories without an override are charged the platform default. Set per-category rates inline, or manage the global matrix.
                  </p>
                  <Link
                    to="/admin/commission"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <span>Configure Global Matrix</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal: Create / Edit Category */}
        <Dialog open={modal !== null} onOpenChange={(open) => !open && setModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-slate-900" />
                <span>{modal?.mode === 'edit' ? 'Edit Category' : 'Create New Category'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {modal?.mode === 'edit'
                  ? 'Update the taxonomy node. Commission overrides are set separately from the rate action.'
                  : 'Add a taxonomy node. The category is created at the rate the platform charges by default.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={submitCategory} className="space-y-3.5 py-2 text-xs">
              <div>
                <label htmlFor="cat-name" className="block font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Video Games & Consoles"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label htmlFor="cat-slug" className="block font-bold text-slate-700 mb-1">Permalink Slug</label>
                <input
                  id="cat-slug"
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="auto-derived from the name"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {modal?.mode === 'create' && (
                <div>
                  <label htmlFor="cat-parent" className="block font-bold text-slate-700 mb-1">Hierarchy Level</label>
                  <select
                    id="cat-parent"
                    value={formParent}
                    onChange={(e) => setFormParent(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700 focus:outline-none"
                  >
                    <option value="root">Root Level Tier</option>
                    {tree?.roots.map((c) => (
                      <option key={c.id} value={c.id}>Child of {c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {modal?.mode === 'create' || (modal?.mode === 'edit' && modal.isRoot) ? (
                <div>
                  <span className="block font-bold text-slate-700 mb-1">Category Icon</span>
                  <div className="grid grid-cols-4 gap-2" role="group" aria-label="Choose a category icon">
                    {ICON_OPTIONS.map((opt) => (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setFormIcon(opt.name)}
                        aria-pressed={formIcon === opt.name}
                        className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs capitalize ${
                          formIcon === opt.name
                            ? 'border-slate-900 bg-slate-50 font-bold'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <opt.Icon className="h-4 w-4 text-slate-700" />
                        <span className="text-[10px]">{opt.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {categoryModalError && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                  {categoryModalError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={actions.createCategory.isPending || actions.updateCategory.isPending}
                >
                  {modal?.mode === 'edit' ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Set Commission Rate */}
        <Dialog open={rateTarget !== null} onOpenChange={(open) => !open && setRateTarget(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Percent className="h-5 w-5 text-slate-900" />
                <span>Commission Rate</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {rateTarget ? `Override for "${rateTarget.name}". Leave unset to charge the platform default.` : ''}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={submitRate} className="space-y-3 py-2 text-xs">
              <div>
                <label htmlFor="rate-input" className="block font-bold text-slate-700 mb-1">Take rate (% of gross, 0–50)</label>
                <input
                  id="rate-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {rateError && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                  {rateError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={clearRate}
                  disabled={actions.setCategoryCommission.isPending || rateTarget?.commissionOverride === null}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                >
                  Use default
                </button>
                <Button
                  type="submit"
                  variant="ink"
                  size="sm"
                  disabled={actions.setCategoryCommission.isPending}
                >
                  Save Rate
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Confirm Delete (irreversible) */}
        <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-600" />
                <span>Delete this category?</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Deleting <strong className="text-slate-800">{deleteTarget?.name}</strong> is permanent. The database will refuse
                while listings or subcategories still point at it — move them first.
              </DialogDescription>
            </DialogHeader>

            {deleteError && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={actions.deleteCategory.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                {actions.deleteCategory.isPending ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Floating toast */}
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
