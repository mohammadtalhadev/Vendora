import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Boxes, PackageSearch, Search } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { QueryState, Skeleton } from '../components/common/QueryState';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { useAdminInventory } from '../features/admin/hooks/useAdminQueries';
import {
  LOW_STOCK_AT,
  filterInventoryRows,
  summarizeInventory,
  type AdminInventoryRow,
} from '../features/admin/api/inventory';
import { formatPrice } from '../store/currency-store';

/**
 * Inventory & Stock (Batch 79) — the platform's stock console. Sellers have
 * always had their own inventory page; staff had none, so a sold-out or
 * nearly-out listing was invisible from the admin panel. This page reads the
 * same `products.stock` column of record across every store: what is tracked,
 * what is out, and what is about to run out, under the same low-stock rule
 * (at or below LOW_STOCK_AT units) the vendor workspace and dashboard use.
 *
 * Monitoring only, deliberately: no admin stock-adjust RPC exists, and every
 * audited admin write in this console goes through one — a bare table update
 * here would change a seller's stock with no audit row. Stock is adjusted by
 * the seller in their workspace; each row links to the moderation queue,
 * where the listing itself is managed.
 */

const MODERATION_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

const STOCK_PILL: Record<AdminInventoryRow['stockStatus'], { label: string; className: string }> = {
  out_of_stock: { label: 'Sold Out', className: 'bg-rose-100 text-rose-800' },
  low_stock: { label: 'Low Stock', className: 'bg-amber-100 text-amber-800' },
  in_stock: { label: 'In Stock', className: 'bg-emerald-100 text-emerald-700' },
};

export const AdminInventoryPage: React.FC = () => {
  const inventory = useAdminInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const rows = useMemo(() => inventory.data ?? [], [inventory.data]);
  const summary = useMemo(() => summarizeInventory(rows), [rows]);

  const sellers = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of rows) byId.set(row.sellerId, row.storeName);
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(
    () =>
      filterInventoryRows(rows, {
        query: searchQuery,
        sellerId: sellerFilter === 'all' ? null : sellerFilter,
        lowOnly,
      }),
    [rows, searchQuery, sellerFilter, lowOnly],
  );

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: DataTableColumn<AdminInventoryRow>[] = [
    {
      key: 'product',
      header: 'Product',
      className: 'p-4',
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.imageUrl ? (
            <img
              src={row.imageUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 bg-slate-50 object-cover shadow-2xs"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <Boxes className="h-4 w-4 text-slate-300" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <span className="block font-bold leading-snug text-slate-900 line-clamp-1">
              {row.title}
            </span>
            <span className="mt-1 inline-block rounded border border-slate-200/80 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
              {row.sku}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'store',
      header: 'Store',
      className: 'p-4',
      cell: (row) => (
        <Link
          to={`/admin/vendors/${row.sellerId}`}
          className="font-semibold text-slate-700 hover:text-sun-orange hover:underline"
        >
          {row.storeName}
        </Link>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      className: 'p-4 font-bold text-slate-900',
      cell: (row) => formatPrice(row.price),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'center',
      className: 'p-4',
      cell: (row) => (
        <span
          className={`text-sm font-black ${
            row.stockStatus === 'out_of_stock'
              ? 'text-rose-600'
              : row.stockStatus === 'low_stock'
                ? 'text-amber-600'
                : 'text-slate-900'
          }`}
        >
          {row.stock.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'stockStatus',
      header: 'Stock Status',
      align: 'center',
      className: 'p-4',
      cell: (row) => {
        const pill = STOCK_PILL[row.stockStatus];
        return (
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${pill.className}`}>
            {pill.label}
          </span>
        );
      },
    },
    {
      key: 'listingStatus',
      header: 'Listing',
      className: 'p-4',
      cell: (row) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            row.listingStatus === 'approved'
              ? 'bg-emerald-100 text-emerald-800'
              : row.listingStatus === 'rejected'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {MODERATION_LABEL[row.listingStatus] ?? row.listingStatus}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      className: 'p-4',
      cell: () => (
        <Link
          to="/admin/products"
          className="font-bold text-slate-600 hover:text-sun-orange hover:underline"
        >
          Manage
        </Link>
      ),
    },
  ];

  const statCards = [
    {
      label: 'Products Tracked',
      value: summary.tracked.toLocaleString(),
      subtext: 'Physical listings across every store',
      color: 'text-slate-900',
      icon: Boxes,
    },
    {
      label: 'Out of Stock',
      value: summary.outOfStock.toLocaleString(),
      subtext: 'Zero units recorded',
      color: 'text-rose-600',
      icon: PackageSearch,
    },
    {
      label: 'Low Stock',
      value: summary.lowStock.toLocaleString(),
      subtext: `At or below ${LOW_STOCK_AT} units — the vendor dashboard's rule`,
      color: 'text-amber-600',
      icon: AlertTriangle,
    },
    {
      label: 'Total Units',
      value: summary.totalUnits.toLocaleString(),
      subtext: 'Summed from every tracked listing',
      color: 'text-blue-600',
      icon: Boxes,
    },
  ];

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Inventory & Stock"
      sidebar={<AdminNav />}
    >
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        <p className="text-xs text-slate-500">
          Live stock across every store on the platform. Sellers adjust their own stock from
          their workspace — this console watches the platform, it does not edit a seller's
          counts.
        </p>

        <QueryState
          isLoading={inventory.isLoading}
          isError={inventory.isError}
          error={inventory.error}
          errorTitle="Unable to load the inventory console"
          errorMessage={
            inventory.error instanceof Error
              ? inventory.error.message
              : 'Inventory data could not be loaded.'
          }
          onRetry={() => void inventory.refetch()}
          skeleton={
            <div className="space-y-6" aria-hidden="true">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
              <Skeleton className="h-96 w-full" />
            </div>
          }
        >
          <div className="space-y-6">
            {/* Stat cards — computed from the same rows the table renders */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">{card.label}</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                    </div>
                    <div className={`mt-2 text-2xl font-black ${card.color}`}>{card.value}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">{card.subtext}</div>
                  </div>
                );
              })}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-sm">
                <label htmlFor="admin-inventory-search" className="sr-only">
                  Search by product, SKU or store
                </label>
                <Search
                  className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <Input
                  id="admin-inventory-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search product, SKU or store…"
                  className="h-9 pl-9 text-xs font-semibold"
                />
              </div>

              <Select
                value={sellerFilter}
                onValueChange={(value) => {
                  setSellerFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full text-xs font-semibold sm:w-56" aria-label="Filter by store">
                  <SelectValue placeholder="All stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stores</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="button"
                aria-pressed={lowOnly}
                onClick={() => {
                  setLowOnly((prev) => !prev);
                  setPage(1);
                }}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors cursor-pointer ${
                  lowOnly
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Low stock only
              </button>
            </div>

            {/* Stock table */}
            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              <DataTable
                ariaLabel="Platform-wide product stock"
                columns={columns}
                rows={pageRows}
                getRowKey={(row) => row.id}
                emptyState={
                  <div className="px-4 py-10 text-center text-xs text-slate-500">
                    {rows.length === 0
                      ? 'No physical listings are being tracked yet.'
                      : 'No listings match these filters.'}
                  </div>
                }
                pagination={{
                  page,
                  pageSize,
                  totalItems: filtered.length,
                  onPageChange: setPage,
                  onPageSizeChange: setPageSize,
                  pageSizeOptions: [12, 24, 48],
                  noun: 'listings',
                }}
              />
            </div>
          </div>
        </QueryState>
      </div>
    </WorkspaceLayout>
  );
};
