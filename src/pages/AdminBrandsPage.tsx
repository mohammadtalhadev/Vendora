import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Store,
  Tag,
  Trash2,
  Type,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { adminKeys, useAdminScope } from '../features/admin/hooks/admin-keys';
import { useAdminActions } from '../features/admin/hooks/useAdminActions';
import { fetchBrandDirectory, type AdminBrandRow } from '../features/admin/api/brands';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Toast } from '../components/common/Toast';
import { useToast } from '../hooks/useToast';
import { friendlyError } from '../lib/friendly-error';
import { formatPrice } from '../store/currency-store';

/**
 * The brand registry (Batch 62): `brands` is a real table, managed through the
 * `admin_*_brand` RPCs, and this page is its console. The directory merges the
 * registry with the catalog: a registered brand shows even with no listings,
 * and a brand string sellers typed into the free-text `products.brand` field
 * shows flagged "Unregistered" until an admin registers it - registering never
 * rewrites a product, and renaming is the one action that re-letters listings,
 * because it says so and shows how many it will move.
 */

const reason = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim() !== '' ? error.message : fallback;

type BrandFormState = {
  mode: 'create' | 'edit' | 'register';
  row: AdminBrandRow | null;
} | null;

const inputClass =
  'w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900';
const labelClass = 'block font-bold text-slate-700 mb-1';

export const AdminBrandsPage: React.FC = () => {
  const userId = useAdminScope();
  const actions = useAdminActions();
  const { toast, showToast, hideToast } = useToast(3200);

  const brands = useQuery({
    queryKey: adminKeys.brands(userId),
    queryFn: ({ signal }) => fetchBrandDirectory(signal),
    enabled: Boolean(userId),
  });

  const rows = brands.data ?? [];
  const registeredCount = rows.filter((row) => row.registered).length;

  const [form, setForm] = useState<BrandFormState>(null);
  const [formName, setFormName] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const [renameRow, setRenameRow] = useState<AdminBrandRow | null>(null);
  const [renameName, setRenameName] = useState('');

  const [deleteRow, setDeleteRow] = useState<AdminBrandRow | null>(null);

  const openCreate = () => {
    setForm({ mode: 'create', row: null });
    setFormName('');
    setFormLogoUrl('');
    setFormDescription('');
    setFormIsActive(true);
  };

  const openEdit = (row: AdminBrandRow) => {
    setForm({ mode: 'edit', row });
    setFormName(row.brand);
    setFormLogoUrl(row.logoUrl ?? '');
    setFormDescription(row.description ?? '');
    setFormIsActive(row.isActive);
  };

  const openRegister = (row: AdminBrandRow) => {
    setForm({ mode: 'register', row });
    setFormName(row.brand);
    setFormLogoUrl('');
    setFormDescription('');
    setFormIsActive(true);
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const name = formName.trim();
    if (name === '') {
      showToast('A brand needs a name.', 'error');
      return;
    }
    const logoUrl = formLogoUrl.trim() || null;
    const description = formDescription.trim() || null;

    if (form.mode === 'edit' && form.row?.id) {
      actions.updateBrand.mutate(
        { id: form.row.id, name, logoUrl, description, isActive: formIsActive },
        {
          onSuccess: () => {
            setForm(null);
            showToast(`Saved brand "${name}".`);
          },
          onError: (err) => showToast(reason(err, 'The brand could not be saved.'), 'error'),
        },
      );
    } else {
      actions.createBrand.mutate(
        { name, logoUrl, description },
        {
          onSuccess: () => {
            setForm(null);
            showToast(
              form.mode === 'register'
                ? `Registered brand "${name}".`
                : `Created brand "${name}".`,
            );
          },
          onError: (err) => showToast(reason(err, 'The brand could not be created.'), 'error'),
        },
      );
    }
  };

  const formError =
    actions.createBrand.isError
      ? actions.createBrand.error?.message
      : actions.updateBrand.isError
        ? actions.updateBrand.error?.message
        : null;

  const openRename = (row: AdminBrandRow) => {
    setRenameRow(row);
    setRenameName(row.brand);
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameRow) return;
    const next = renameName.trim();
    if (next === '') {
      showToast('A brand needs a name.', 'error');
      return;
    }
    actions.renameBrand.mutate(
      { oldName: renameRow.brand, newName: next },
      {
        onSuccess: (moved) => {
          setRenameRow(null);
          showToast(
            `Renamed "${renameRow.brand}" to "${next}" - ${moved} product${moved === 1 ? '' : 's'} updated.`,
          );
        },
        onError: (err) => showToast(reason(err, 'The brand could not be renamed.'), 'error'),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleteRow?.id) return;
    actions.deleteBrand.mutate(deleteRow.id, {
      onSuccess: () => {
        showToast(`Deleted brand "${deleteRow.brand}".`);
        setDeleteRow(null);
      },
      onError: (err) => showToast(reason(err, 'The brand could not be deleted.'), 'error'),
    });
  };

  const brandColumns: DataTableColumn<AdminBrandRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      className: 'p-4',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (b) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="font-black text-slate-900">{b.brand}</span>
          {b.registered ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <BadgeCheck className="h-3 w-3" /> Registered
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              Unregistered
            </span>
          )}
        </span>
      ),
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
      cell: (b) => (b.listings > 0 ? formatPrice(b.lowestPrice) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'p-4',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (b) =>
        !b.registered ? (
          <span className="text-slate-400">—</span>
        ) : b.isActive ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            Inactive
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      className: 'p-4',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (b) => (
        <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
          {!b.registered && (
            <button
              type="button"
              onClick={() => openRegister(b)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <BadgeCheck className="h-3 w-3" /> Register
            </button>
          )}
          {b.registered && b.id && (
            <button
              type="button"
              onClick={() => openEdit(b)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => openRename(b)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Type className="h-3 w-3" /> Rename
          </button>
          {b.registered && b.id && (
            <button
              type="button"
              disabled={b.totalListings > 0}
              title={
                b.totalListings > 0
                  ? `${b.totalListings} product${b.totalListings === 1 ? '' : 's'} still carry this brand name. Rename or reassign them first.`
                  : 'Delete this brand from the registry'
              }
              onClick={() => setDeleteRow(b)}
              className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Brand Registry" sidebar={<AdminNav />}>
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
              Brand Registry
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              The brands the platform registers, merged with every brand name the live catalog
              carries. Registered brands are managed here; a name sellers typed that is not
              registered yet is flagged until you register it.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => void brands.refetch()}
              disabled={brands.isFetching}
              title="Re-read the brand registry"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${brands.isFetching ? 'animate-spin' : ''}`} />
              <span>{brands.isFetching ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            <Button type="button" variant="default" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" />
              <span className="text-white">Add Brand</span>
            </Button>
          </div>
        </div>

        {brands.isError && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800"
          >
            <ShieldCheck className="h-4 w-4" />
            {reason(brands.error, 'The brand registry could not be loaded.')}
          </p>
        )}

        {brands.isPending && !brands.isError ? (
          <p className="text-xs text-slate-500">Reading the brand registry…</p>
        ) : rows.length === 0 && !brands.isError ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
            No brands are registered yet and no approved listing carries a brand value.
            Use “Add Brand” to register the first one.
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              {registeredCount} registered · {rows.length - registeredCount} unregistered from the catalog
            </p>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <DataTable
                columns={brandColumns}
                rows={rows}
                getRowKey={(b) => `${b.registered ? 'reg' : 'derived'}:${b.brand.toLowerCase()}`}
              />
            </div>
          </>
        )}

        {/* Modal: Add / Edit / Register brand */}
        <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-slate-900" />
                <span>
                  {form?.mode === 'edit'
                    ? 'Edit Brand'
                    : form?.mode === 'register'
                      ? 'Register Brand'
                      : 'Add Brand'}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {form?.mode === 'edit'
                  ? 'Update the registry row. Editing the name here changes the registry only - use Rename to move the listings that carry the old name.'
                  : form?.mode === 'register'
                    ? 'Create the registry row for a brand name the catalog already carries. No product is changed.'
                    : 'Add a brand to the registry. It will show here even before any listing carries it.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={submitForm} className="space-y-3.5 py-2 text-xs">
              <div>
                <label htmlFor="brand-name" className={labelClass}>Brand Name</label>
                <input
                  id="brand-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Sony"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="brand-logo" className={labelClass}>Logo URL</label>
                <input
                  id="brand-logo"
                  type="url"
                  value={formLogoUrl}
                  onChange={(e) => setFormLogoUrl(e.target.value)}
                  placeholder="https://… (optional)"
                  className={inputClass}
                />
                {formLogoUrl.trim() !== '' && (
                  <img
                    src={formLogoUrl.trim()}
                    alt="Logo preview"
                    className="mt-2 h-12 w-12 rounded-lg border border-slate-200 object-contain bg-white"
                  />
                )}
              </div>

              <div>
                <label htmlFor="brand-description" className={labelClass}>Description</label>
                <textarea
                  id="brand-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional - what this brand is, for the registry record."
                  rows={3}
                  className={inputClass}
                />
              </div>

              {form?.mode === 'edit' && (
                <label htmlFor="brand-active" className="flex items-center gap-2 font-bold text-slate-700">
                  <input
                    id="brand-active"
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  Active (visible in the public registry)
                </label>
              )}

              {formError && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={actions.createBrand.isPending || actions.updateBrand.isPending}
                >
                  {form?.mode === 'edit' ? 'Save Changes' : form?.mode === 'register' ? 'Register Brand' : 'Create Brand'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Rename brand (moves every product carrying the old name) */}
        <Dialog open={renameRow !== null} onOpenChange={(open) => !open && setRenameRow(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Type className="h-5 w-5 text-slate-900" />
                <span>Rename Brand</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Renaming <strong className="text-slate-800">{renameRow?.brand}</strong> updates every
                product carrying that brand name -{' '}
                <strong className="text-slate-800">
                  {renameRow?.totalListings ?? 0} product{(renameRow?.totalListings ?? 0) === 1 ? '' : 's'} in
                  all statuses
                </strong>{' '}
                ({renameRow?.listings ?? 0} approved) - and moves the registry row with it. This is how a
                misspelled or rebranded name is fixed across the whole catalog at once.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={submitRename} className="space-y-3.5 py-2 text-xs">
              <div>
                <label htmlFor="brand-rename" className={labelClass}>New Brand Name</label>
                <input
                  id="brand-rename"
                  type="text"
                  required
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  className={inputClass}
                />
              </div>

              {actions.renameBrand.isError && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                  {actions.renameBrand.error?.message ?? 'The brand could not be renamed.'}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRenameRow(null)}
                  className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={actions.renameBrand.isPending}
                >
                  {actions.renameBrand.isPending ? 'Renaming…' : 'Rename Brand'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Confirm delete */}
        <Dialog open={deleteRow !== null} onOpenChange={(open) => !open && setDeleteRow(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-600" />
                <span>Delete this brand?</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Deleting <strong className="text-slate-800">{deleteRow?.brand}</strong> removes it from the
                registry permanently. No product carries this name, so nothing in the catalog changes.
              </DialogDescription>
            </DialogHeader>

            {actions.deleteBrand.isError && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {friendlyError(actions.deleteBrand.error, { staff: true }).message}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteRow(null)}
                className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={actions.deleteBrand.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-60"
              >
                {actions.deleteBrand.isPending ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Toast toast={toast} onDismiss={hideToast} />
      </div>
    </WorkspaceLayout>
  );
};
