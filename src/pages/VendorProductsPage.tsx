import React, { useState, useMemo } from 'react';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Search,
  Edit2,
  Box,
  Send,
  RotateCcw,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { StatusBadge } from '../components/ui/status-badge';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import { exportToCsv } from '../lib/export-csv';
import type { ModerationStatus, Product } from '../types/domain';
import {
  useSetProductListing,
  useVendorProducts,
} from '../features/vendor/hooks/useVendorProducts';

/** The same threshold the dashboard and inventory count low stock with. */
const LOW_STOCK_AT = 5;

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

const stockStatusOf = (stock: number): StockStatus =>
  stock === 0 ? 'out_of_stock' : stock <= LOW_STOCK_AT ? 'low_stock' : 'in_stock';

const MODERATION_LABEL: Record<ModerationStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Active',
  rejected: 'Rejected',
  archived: 'Archived',
};

interface ListingRow {
  id: string;
  image?: string;
  title: string;
  sku: string;
  category: string;
  fulfillmentType: string;
  listingStatus: ModerationStatus;
  stockStatus: StockStatus;
  price: string;
  priceNum: number;
  originalPrice?: string;
  inventoryCount: number;
  /** Width against the store's own deepest shelf, not an assumed capacity. */
  inventoryProgress: number;
  rating: number;
  reviewCount: number;
  rejectionReason?: string;
  createdAt: string;
}

const toRow = (p: Product, maxStock: number): ListingRow => ({
  id: p.id,
  image: p.images?.[0],
  title: p.title,
  sku: p.variants?.[0]?.sku || `SKU-${p.id.slice(-6).toUpperCase()}`,
  category: p.category.replace('cat-', '').replace('-', ' ').toUpperCase(),
  fulfillmentType: p.type === 'digital' ? 'Digital Key' : 'Physical Parcel',
  listingStatus: p.status,
  stockStatus: stockStatusOf(p.stock ?? 0),
  price: `$${p.price.toFixed(2)}`,
  priceNum: p.price,
  originalPrice: p.compareAtPrice ? `$${p.compareAtPrice.toFixed(2)}` : undefined,
  inventoryCount: p.stock ?? 0,
  inventoryProgress: maxStock > 0 ? Math.min(100, Math.round(((p.stock ?? 0) / maxStock) * 100)) : 0,
  rating: p.rating,
  reviewCount: p.reviewCount,
  rejectionReason: p.rejectionReason,
  createdAt: p.createdAt,
});

export const VendorProductsPage: React.FC = () => {
  const productsQuery = useVendorProducts();
  const setListing = useSetProductListing();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listings = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  /**
   * Every listing this store owns, in any moderation state, straight from `products` - RLS
   * already scopes the read to the signed-in store, so there is no local catalog behind it.
   */
  const maxStock = listings.reduce((max, p) => Math.max(max, p.stock ?? 0), 0);
  const rows = useMemo(
    () => listings.map((p) => toRow(p, maxStock)),
    [listings, maxStock],
  );

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort(),
    [rows],
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRows.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  /**
   * `ProductFormModal` has already written the listing through `products_insert_vendor` /
   * `products_update_vendor` by the time it reports back, so this only acknowledges it -
   * writing again here would book the same listing twice.
   */
  const handleProductSaved = (savedProduct: Product) => {
    showNotification(`"${savedProduct.title}" saved${editingProduct ? '' : ' as a submission for review'}.`);
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  /** `set_vendor_product_listing` owns both transitions and refuses the illegal ones. */
  const handleListingAction = async (row: ListingRow, action: 'submit' | 'withdraw') => {
    setActionError(null);
    try {
      await setListing.mutateAsync({ productId: row.id, action });
      showNotification(
        action === 'submit'
          ? `"${row.title}" is with the review queue.`
          : `"${row.title}" is back in your drafts.`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleBatchSubmit = async () => {
    const eligible = rows.filter(
      (r) => selectedIds.includes(r.id) && (r.listingStatus === 'draft' || r.listingStatus === 'rejected'),
    );
    if (eligible.length === 0) {
      showNotification('Selected listings are already with moderation or live on the shelf.');
      return;
    }
    setActionError(null);
    const failures: string[] = [];
    let sent = 0;
    for (const row of eligible) {
      try {
        await setListing.mutateAsync({ productId: row.id, action: 'submit' });
        sent += 1;
      } catch (err) {
        failures.push(`${row.title}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setSelectedIds([]);
    if (failures.length > 0) setActionError(failures.join(' · '));
    showNotification(`${sent} of ${eligible.length} selected listings sent to moderation.`);
  };

  const handleExportCsv = () => {
    const exportData = filteredRows.map((p) => ({
      ID: p.id,
      Title: p.title,
      SKU: p.sku,
      Category: p.category,
      Fulfillment: p.fulfillmentType,
      Price: p.price,
      Stock: p.inventoryCount,
      Status: MODERATION_LABEL[p.listingStatus],
      Rating: p.rating ? p.rating.toFixed(2) : 'No ratings',
      Reviews: p.reviewCount,
    }));

    exportToCsv(`vendor-products-${new Date().toISOString().split('T')[0]}.csv`, exportData, {
      ID: 'Product ID',
      Title: 'Product Title',
      SKU: 'SKU Code',
      Category: 'Category',
      Fulfillment: 'Fulfillment Type',
      Price: 'Price',
      Stock: 'Stock Count',
      Status: 'Moderation Status',
      Rating: 'Average Rating',
      Reviews: 'Review Count',
    });
    showNotification('Your listings exported to CSV.');
  };

  const filteredRows = useMemo(() => {
    return rows.filter((product) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        product.title.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (categoryFilter !== 'All Categories') {
        if (!product.category.toLowerCase().includes(categoryFilter.toLowerCase())) {
          return false;
        }
      }

      if (activeTab === 'approved' && product.listingStatus !== 'approved') return false;
      if (activeTab === 'low_stock' &&
        (product.stockStatus !== 'low_stock' || product.listingStatus !== 'approved')) return false;
      if (activeTab === 'out_of_stock' &&
        (product.stockStatus !== 'out_of_stock' || product.listingStatus !== 'approved')) return false;
      if (activeTab === 'pending' && product.listingStatus !== 'pending_review') return false;
      if (activeTab === 'draft' && product.listingStatus !== 'draft') return false;
      if (activeTab === 'rejected' && product.listingStatus !== 'rejected') return false;

      return true;
    });
  }, [rows, activeTab, searchQuery, categoryFilter]);

  const countAll = rows.length;
  const countApproved = rows.filter((p) => p.listingStatus === 'approved').length;
  const countLowStock = rows.filter((p) => p.stockStatus === 'low_stock').length;
  const countOutOfStock = rows.filter((p) => p.stockStatus === 'out_of_stock').length;
  const countPending = rows.filter((p) => p.listingStatus === 'pending_review').length;
  const countDraft = rows.filter((p) => p.listingStatus === 'draft').length;
  const countRejected = rows.filter((p) => p.listingStatus === 'rejected').length;
  const selectedSubmittable = rows.filter(
    (r) => selectedIds.includes(r.id) && (r.listingStatus === 'draft' || r.listingStatus === 'rejected'),
  ).length;

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    return filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const isLoading = productsQuery.isPending;
  const loadError = productsQuery.error;

  /**
   * Listings columns for DataTable. The approved / pending / rejected pills
   * carry a status dot inside the pill, which StatusBadge cannot render, so
   * they keep their local markup (the AdminReportsPage pattern); the two
   * unadorned pills (draft, archived) go through StatusBadge with this page's
   * slate treatment as an override, archived keeping its longer label.
   */
  const listingColumns: DataTableColumn<ListingRow>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={filteredRows.length > 0 && selectedIds.length === filteredRows.length}
          onChange={toggleSelectAll}
          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
        />
      ),
      align: 'center',
      headerClassName: 'w-10 py-3.5 text-[11px]',
      className: 'w-10 py-3.5',
      cell: (p) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(p.id)}
          onChange={() => toggleSelectOne(p.id)}
          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
        />
      ),
    },
    {
      key: 'product',
      header: 'Product Details',
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (p) => (
        <div className="flex items-center gap-3">
          {p.image ? (
            <img
              src={p.image}
              alt={p.title}
              className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-200"
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
              <Box className="h-4 w-4 text-slate-300" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 max-w-sm">
            <span className="font-bold text-slate-900 line-clamp-1">
              {p.title}
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span>{p.sku}</span>
              <span>•</span>
              <span className="font-sans text-slate-500">{p.category}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'fulfillment',
      header: 'Fulfillment Type',
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5 font-medium text-slate-600',
      cell: (p) => p.fulfillmentType,
    },
    {
      key: 'status',
      header: 'Moderation Status',
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (p) => (
        <>
          {p.listingStatus === 'approved' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Approved
            </span>
          )}
          {p.listingStatus === 'pending_review' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Pending Review
            </span>
          )}
          {p.listingStatus === 'rejected' && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700"
              title={p.rejectionReason ?? 'No reason recorded'}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Rejected
            </span>
          )}
          {p.listingStatus === 'draft' && (
            <StatusBadge
              status="draft"
              className="bg-slate-100 text-slate-600 border-transparent text-[11px] font-semibold"
            />
          )}
          {p.listingStatus === 'archived' && (
            <StatusBadge
              status="archived"
              label="Archived by platform"
              className="bg-slate-100 text-slate-600 border-transparent text-[11px] font-semibold"
            />
          )}
          {p.rejectionReason && p.listingStatus === 'rejected' && (
            <div className="mt-1 text-[10px] text-rose-600 max-w-[18rem]">
              {p.rejectionReason}
            </div>
          )}
          {p.listingStatus === 'approved' && p.stockStatus !== 'in_stock' && (
            <div className="mt-1 text-[10px] text-amber-700 font-semibold">
              {p.stockStatus === 'out_of_stock' ? 'Sold out' : `Low stock (${p.inventoryCount})`}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (p) => (
        <>
          <div className="font-bold text-slate-900">{p.price}</div>
          {p.originalPrice && (
            <div className="text-[11px] text-slate-400 line-through">
              {p.originalPrice}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'stock',
      header: 'Stock Level',
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (p) => (
        <>
          <div className="text-xs font-semibold text-slate-800">
            {p.inventoryCount} in stock
          </div>
          <div
            className="mt-1 h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden"
            title={`Relative to your deepest shelf (${maxStock} units)`}
          >
            <div
              className={`h-full rounded-full ${
                p.stockStatus === 'out_of_stock'
                  ? 'bg-rose-500'
                  : p.stockStatus === 'low_stock'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${p.inventoryProgress}%` }}
            />
          </div>
        </>
      ),
    },
    {
      key: 'feedback',
      header: 'Buyer Feedback',
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (p) => (
        <>
          <div className="text-xs font-semibold text-slate-800">
            {p.reviewCount === 0
              ? 'No reviews yet'
              : `${p.rating.toFixed(1)} ★ · ${p.reviewCount} ${p.reviewCount === 1 ? 'review' : 'reviews'}`}
          </div>
          <div className="text-[10px] text-slate-400">
            Written by buyers, not editable here
          </div>
        </>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (p) => {
        const canSubmit = p.listingStatus === 'draft' || p.listingStatus === 'rejected';
        const canWithdraw = p.listingStatus === 'pending_review';
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => {
                const found = listings.find((pr) => pr.id === p.id) ?? null;
                setEditingProduct(found);
                setIsModalOpen(true);
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title="Edit listing"
            >
              <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {canSubmit && (
              <button
                onClick={() => void handleListingAction(p, 'submit')}
                disabled={setListing.isPending}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-40"
                title="Send this listing to moderation"
              >
                <Send className="h-3 w-3" aria-hidden="true" />
                Submit
              </button>
            )}
            {canWithdraw && (
              <button
                onClick={() => void handleListingAction(p, 'withdraw')}
                disabled={setListing.isPending}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-40"
                title="Pull this submission back to draft"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Withdraw
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav onOpenAddProduct={handleOpenAddModal} />}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Products</h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Your listings, their stock and where each one sits in moderation. Approval is the
              platform's decision; you send work in and pull it back.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {feedback && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {feedback}
              </span>
            )}
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Download className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Export CSV
            </button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleOpenAddModal}
            >
              + Add New Product
            </Button>
          </div>
        </div>

        {/* Real moderation summary in place of a health score nobody computed */}
        {countAll > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-slate-700">
                <strong>{countApproved} live</strong> of {countAll} listings ·{' '}
                {countPending} awaiting review · {countDraft} in draft ·{' '}
                {countRejected} rejected
              </span>
            </div>
            {(countLowStock > 0 || countOutOfStock > 0) && (
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold self-end sm:self-auto">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {countLowStock} low, {countOutOfStock} sold out
              </span>
            )}
          </div>
        )}

        {actionError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="ml-auto text-rose-500 hover:text-rose-700"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {loadError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />
            <span>{loadError instanceof Error ? loadError.message : String(loadError)}</span>
            <button
              type="button"
              onClick={() => void productsQuery.refetch()}
              className="ml-auto rounded-lg border border-rose-200 px-2.5 py-1 hover:bg-rose-100 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total listings */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>TOTAL LISTINGS</span>
              <Box className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">{countAll}</span>
              <span className="text-[11px] font-bold text-slate-500">
                owned by your store
              </span>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-900 rounded-full" />
          </div>

          {/* Card 2: Approved listings */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>APPROVED LISTINGS</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">{countApproved}</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                {countAll > 0 ? `${Math.round((countApproved / countAll) * 100)}% of your catalog` : 'No listings yet'}
              </span>
            </div>
            <div className="mt-4 h-1 w-full bg-emerald-500 rounded-full" />
          </div>

          {/* Card 3: Low / Out of Stock */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>LOW / OUT OF STOCK</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">
                {countLowStock + countOutOfStock}
              </span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                {countOutOfStock} sold out
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              At {LOW_STOCK_AT} units or fewer · edit on Inventory
            </div>
            <div className="mt-3 h-1 w-full bg-amber-500 rounded-full" />
          </div>

          {/* Card 4: In moderation */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>IN MODERATION</span>
              <span className="h-2 w-2 rounded-full bg-rose-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">
                {countPending + countDraft + countRejected}
              </span>
              <span className="text-xs text-rose-600 font-bold">
                {countPending} with the reviewers
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              {countDraft} draft · {countRejected} rejected
            </div>
            <div className="mt-3 h-1 w-full bg-rose-500 rounded-full" />
          </div>
        </div>

        {/* Tab Filters Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/90 p-1 text-xs font-bold text-slate-600">
            {[
              { id: 'all', label: 'All', count: countAll },
              { id: 'approved', label: 'Approved', count: countApproved },
              { id: 'low_stock', label: 'Low Stock', count: countLowStock },
              { id: 'out_of_stock', label: 'Out of Stock', count: countOutOfStock },
              { id: 'pending', label: 'Pending', count: countPending },
              { id: 'draft', label: 'Draft', count: countDraft },
              { id: 'rejected', label: 'Rejected', count: countRejected },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span> <span className="opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex-1">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search product title or SKU..."
              leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              className="h-9 rounded-lg bg-slate-50/60 text-xs text-slate-800 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={categoryFilter}
              onValueChange={(value) => { setCategoryFilter(value); setCurrentPage(1); }}
            >
              <SelectTrigger aria-label="Filter by category" className="h-9 w-auto text-xs font-medium text-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Categories" className="text-xs">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
              <span className="text-xs text-slate-400 font-medium">
                {selectedIds.length} selected
              </span>
              <button
                disabled={selectedSubmittable === 0 || setListing.isPending}
                onClick={() => void handleBatchSubmit()}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                Submit {selectedSubmittable > 0 ? selectedSubmittable : ''} to review
              </button>
            </div>
          </div>
        </div>

        {/* Listings Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <DataTable
            columns={listingColumns}
            rows={isLoading ? [] : paginatedRows}
            getRowKey={(p) => p.id}
            rowClassName={(p) => (selectedIds.includes(p.id) ? 'bg-slate-50/90' : '')}
            emptyState={
              <div className="px-4 py-10 text-center text-slate-500">
                {isLoading ? (
                  <>
                    <Box className="h-8 w-8 mx-auto text-slate-300 mb-2 animate-pulse" aria-hidden="true" />
                    <p className="font-semibold text-slate-700">Reading your catalog…</p>
                  </>
                ) : (
                  <>
                    <Box className="h-8 w-8 mx-auto text-slate-300 mb-2" aria-hidden="true" />
                    <p className="font-semibold text-slate-700">
                      {countAll === 0 ? 'No listings yet' : 'Nothing matches these filters'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {countAll === 0
                        ? 'Add a product and it goes to the platform for review.'
                        : 'Clear the search, category or tab filter to see the rest.'}
                    </p>
                  </>
                )}
              </div>
            }
          />

          {/* Table Footer */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
            <div>
              Showing{' '}
              <strong>
                {filteredRows.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredRows.length)}
              </strong>{' '}
              of <strong>{filteredRows.length}</strong> listings
              {filteredRows.length !== countAll && ` (filtered from ${countAll})`}
            </div>
            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
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
              >
                &gt;
              </button>
            </div>
          </div>

          <p className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[10px] text-slate-500">
            Listings are withdrawn, never deleted: past orders keep referencing them, and archiving
            is the platform's action.
          </p>
        </div>

        {/* Product Create / Edit Modal */}
        <ProductFormModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) setEditingProduct(null);
          }}
          initialProduct={editingProduct}
          onSave={handleProductSaved}
        />
      </div>
    </WorkspaceLayout>
  );
};
