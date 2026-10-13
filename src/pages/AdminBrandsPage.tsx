import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Store, Tag } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useAdminScope } from '../features/admin/hooks/admin-keys';
import { fetchBrandDirectory, type AdminBrandRow } from '../features/admin/api/brands';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { formatPrice } from '../store/currency-store';

/**
 * There is no `brands` entity in this schema, so there is nothing to gate and no
 * authorization queue to approve. What this page can honestly show is the brand directory
 * the catalog proves: the distinct `products.brand` values on approved listings, with the
 * number of listings, the number of sellers carrying each, and the lowest listing price.
 * The "protected brand" columns and the brand-authorization workflow are gone, because no
 * table backs them and faking an approval would be exactly the mock the console is meant to
 * stop shipping.
 */

const reason = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim() !== '' ? error.message : fallback;

export const AdminBrandsPage: React.FC = () => {
  const userId = useAdminScope();

  const brands = useQuery({
    queryKey: ['admin', userId ?? 'anon', 'brands', 'directory'] as const,
    queryFn: ({ signal }) => fetchBrandDirectory(signal),
    enabled: Boolean(userId),
  });

  const rows = brands.data ?? [];

  const brandColumns: DataTableColumn<AdminBrandRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      className: 'p-4',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (b) => <span className="font-black text-slate-900">{b.brand}</span>,
    },
    {
      key: 'listings',
      header: 'Approved Listings',
      className: 'p-4',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (b) => (
        <span className="inline-flex items-center gap-1.5 text-slate-700">
          <Tag className="h-3.5 w-3.5 text-slate-400" />
          {b.listings}
        </span>
      ),
    },
    {
      key: 'sellers',
      header: 'Sellers',
      className: 'p-4',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (b) => (
        <span className="inline-flex items-center gap-1.5 text-slate-700">
          <Store className="h-3.5 w-3.5 text-slate-400" />
          {b.sellers}
        </span>
      ),
    },
    {
      key: 'lowest',
      header: 'Lowest Listing',
      align: 'right',
      className: 'p-4 font-bold text-slate-900',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (b) => formatPrice(b.lowestPrice),
    },
  ];

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Brand Directory" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
            Brand Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Every brand carried by an approved listing in the live catalog, counted straight from{' '}
            <code className="text-[11px]">products</code>. There is no brand-gating or authorization
            workflow because the database holds neither.
          </p>
        </div>

        {brands.isError && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800"
          >
            <ShieldCheck className="h-4 w-4" />
            {reason(brands.error, 'The brand directory could not be loaded.')}
          </p>
        )}

        {brands.isPending && !brands.isError ? (
          <p className="text-xs text-slate-500">Reading the catalog brands…</p>
        ) : rows.length === 0 && !brands.isError ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
            No approved listing carries a brand value yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <DataTable columns={brandColumns} rows={rows} getRowKey={(b) => b.brand} />
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
