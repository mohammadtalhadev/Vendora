import { useState } from 'react';
import { friendlyError } from '../lib/friendly-error';
import { Link } from 'react-router-dom';
import {
  Store,
  Search,
  Download,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { exportToCsv } from '../lib/export-csv';
import { useVendorQueue } from '../features/admin/hooks/useAdminQueries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useAdminActions } from '../features/admin/hooks/useAdminActions';
import type { AdminVendorRow } from '../features/admin/api/vendors';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { useCurrency } from '../store/currency-store';

export const AdminVendorsPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  // A decision without a reason is a mystery to the applicant, so each row drafts its own note.
  const [applicationNotes, setApplicationNotes] = useState<Record<string, string>>({});

  const actions = useAdminActions();
  // The queue searches in SQL, not on the loaded page: debounce the term so
  // typing does not fire a request per keystroke.
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: queue, refetch, isPending, isError, error } = useVendorQueue({ status, search: debouncedSearch, page, pageSize });

  const filteredVendors = queue?.rows ?? [];
  const activeOnPage = filteredVendors.filter((vendor) => vendor.status === 'active').length;
  const activeShare = filteredVendors.length === 0 ? 0 : activeOnPage / filteredVendors.length;

  const handleExportMerchants = () => {
    exportToCsv({
      filename: `vendora-merchants-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'Store Name', key: 'storeName' as const },
        { header: 'Tier', key: 'tier' as const },
        { header: 'Subdomain', key: 'slug' as const },
        { header: 'KYC Status', key: 'kyc' as const },
        { header: 'Gross (30D)', key: 'gross' as const },
        { header: 'Commission', key: 'commission' as const },
        { header: 'Net', key: 'net' as const },
      ],
      data: filteredVendors.map((v) => ({
        storeName: v.storeName,
        tier: v.tier.toUpperCase(),
        slug: v.slug,
        kyc: v.kyc.toUpperCase(),
        gross: v.gross,
        commission: v.commission,
        net: v.net,
      })),
    });
  };

  const handleSetVendorStatus = (vendorId: string, status: 'active' | 'suspended') => {
    actions.setVendorStatus.mutate({ vendorId, status, note: 'Action via admin console' });
  };

  if (isPending) {
    return (
      <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Vendor Management" sidebar={<AdminNav />}>
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <Store className="h-4 w-4" />
            Reading merchants…
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  if (isError) {
    return (
      <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Vendor Management" sidebar={<AdminNav />}>
        <div className="space-y-6">
          {/* The database's own reason, so the platform knows whether this is a permission
              problem or an empty table - "no merchants" and "cannot read merchants" are not
              the same message. */}
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <div className="font-semibold mb-1">Failed to load vendors</div>
            <div className="mb-3 text-xs">
              {error ? friendlyError(error, { staff: true }).message : 'The merchant queue could not be read.'}
            </div>
            <button
              onClick={() => void refetch()}
              className="inline-flex items-center rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  const vendorColumns: DataTableColumn<AdminVendorRow>[] = [
    {
      key: 'vendor',
      header: 'Vendor / Store',
      className: 'py-3.5',
      headerClassName: 'py-3.5 text-[11px]',
      cell: (vendor) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-bold text-xs uppercase shadow-2xs">
            {vendor.storeName.substring(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/admin/vendors/${vendor.id}`}
                className="font-bold text-slate-900 truncate hover:text-sun-orange hover:underline transition-colors"
              >
                {vendor.storeName}
              </Link>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                  vendor.status === 'suspended'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {vendor.tier}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-normal truncate">
              {vendor.slug}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner / Contact',
      className: 'py-3.5',
      headerClassName: 'py-3.5 text-[11px]',
      cell: (vendor) => (
        <div>
          <div className="font-semibold text-slate-900">{vendor.storeName}</div>
          <div className="text-[11px] text-slate-500 truncate">/vendors/{vendor.slug}</div>
        </div>
      ),
    },
    {
      // The KYC cell is a composite — a dotted pill plus the row's quick
      // Suspend/Approve action beside it — not a passive status badge, so
      // the pill markup stays local rather than going through StatusBadge.
      key: 'kyc',
      header: 'KYC Status',
      className: 'py-3.5',
      headerClassName: 'py-3.5 text-[11px]',
      cell: (vendor) =>
        vendor.kyc === 'verified' ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Verified
            </span>
            <button
              type="button"
              onClick={() => handleSetVendorStatus(vendor.id, 'suspended')}
              className="text-[10px] text-slate-400 hover:text-rose-600 underline font-semibold cursor-pointer"
            >
              Suspend
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              {vendor.kyc.charAt(0).toUpperCase() + vendor.kyc.slice(1)}
            </span>
            <Button
              type="button"
              variant="ink"
              size="sm"
              onClick={() => handleSetVendorStatus(vendor.id, 'active')}
              className="h-auto rounded px-2 py-0.5 text-[10px] font-bold"
            >
              Approve
            </Button>
          </div>
        ),
    },
    {
      key: 'tier',
      header: 'Performance Tier',
      className: 'py-3.5',
      headerClassName: 'py-3.5 text-[11px]',
      cell: (vendor) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          {vendor.tier}
        </span>
      ),
    },
    {
      key: 'revenue',
      header: 'Revenue (30D GMV)',
      align: 'right',
      className: 'py-3.5',
      headerClassName: 'py-3.5 text-[11px]',
      cell: (vendor) => (
        <>
          <div className="font-bold text-slate-900">{formatPrice(vendor.gross)}</div>
          <div className="text-[11px] text-slate-400">
            Commission: {formatPrice(vendor.commission)}
          </div>
          <div className="text-[11px] font-semibold text-emerald-600">
            Net: {formatPrice(vendor.net)}
          </div>
        </>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      className: 'py-3.5',
      headerClassName: 'py-3.5 text-[11px]',
      cell: (vendor) =>
        vendor.status === 'active' ? (
          <button
            type="button"
            onClick={() => handleSetVendorStatus(vendor.id, 'suspended')}
            className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-700 cursor-pointer"
          >
            Suspend
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSetVendorStatus(vendor.id, 'active')}
            className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 cursor-pointer"
          >
            Reinstate
          </button>
        ),
    },
  ];

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Vendor Management" sidebar={<AdminNav />}>
      <div className="space-y-6">

        {/* Page Title & Action Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">Vendor Management</h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Monitor active sellers, manage KYC onboarding verification, evaluate performance metrics, and review store compliance.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportMerchants}
              disabled={filteredVendors.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-500" />
              Export Merchants
            </button>
          </div>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Vendors */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>TOTAL VENDORS</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <Store className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">{queue.total}</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                Live Brands
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span><strong className="text-slate-800">{queue.rows.filter(v => v.status === 'active').length}</strong> active</span>
              <span className="text-slate-300">•</span>
              <span><strong className="text-slate-800">{queue.pending}</strong> pending</span>
            </div>
            {/* The split is over the page on screen, and says so: `rows` is one page, `total` is the queue. */}
            <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-slate-900"
                style={{ width: `${activeShare * 100}%` }}
              />
              <div
                className="bg-sun-orange"
                style={{ width: `${(1 - activeShare) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {activeOnPage} of the {queue.rows.length} stores on this page are active.
            </p>
          </div>

          {/* Card 2: Pending Verification */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>PENDING VERIFICATION</span>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">{queue.pending}</span>
              <span className="rounded bg-amber-100/80 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                {queue.pending > 0 ? 'NEEDS REVIEW' : 'ALL CLEAR'}
              </span>
            </div>
            {/* No invented review SLA: the only date the applications table carries is when each was filed. */}
            <p className="mt-1 text-xs text-slate-500">
              {queue.applicants.length > 0
                ? `Oldest filed ${new Date(queue.applicants[0].submittedAt).toLocaleDateString()}.`
                : 'Nothing is waiting on a decision.'}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">{queue.suspended} suspended store{queue.suspended === 1 ? '' : 's'}.</p>
          </div>

          {/* Applications with no store row yet: the list `pending` counts, ready to decide. */}
          {queue.applicants.length > 0 && (
            <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-bold text-slate-900">Applications awaiting a decision</h2>
                <p className="text-xs text-slate-500">
                  Approving creates the store and grants the seller role; declining records the reason on the account.
                </p>
              </div>
              <ul className="divide-y divide-slate-100">
                {queue.applicants.map((applicant) => (
                  <li key={applicant.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900">{applicant.storeName}</p>
                      <p className="text-[11px] text-slate-500">
                        {applicant.businessType} · {applicant.contactEmail} · filed{' '}
                        {new Date(applicant.submittedAt).toLocaleDateString()}
                        {applicant.hasStore ? ' · store already exists' : ''}
                      </p>
                      <input
                        aria-label={`Reason for the decision on ${applicant.storeName}`}
                        data-testid={`applicant-note-${applicant.id}`}
                        value={applicationNotes[applicant.id] ?? ''}
                        onChange={(e) => setApplicationNotes((current) => ({ ...current, [applicant.id]: e.target.value }))}
                        placeholder="Note the applicant reads if declined"
                        className="mt-2 w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        data-testid={`applicant-approve-${applicant.id}`}
                        disabled={actions.reviewApplication.isPending}
                        onClick={() => {
                          const note = (applicationNotes[applicant.id] ?? '').trim();
                          actions.reviewApplication.mutate({
                            applicationId: applicant.id,
                            decision: 'approved',
                            note: note === '' ? undefined : note,
                          });
                        }}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        data-testid={`applicant-reject-${applicant.id}`}
                        disabled={actions.reviewApplication.isPending || (applicationNotes[applicant.id] ?? '').trim() === ''}
                        onClick={() => {
                          actions.reviewApplication.mutate({
                            applicationId: applicant.id,
                            decision: 'rejected',
                            note: (applicationNotes[applicant.id] ?? '').trim(),
                          });
                        }}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Card 3: Active Vendor Health */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>MERCHANT HEALTH</span>
            </div>
            {/* Counted over every store by the queue read, not over the page on screen. */}
            <div className="mt-3 flex items-baseline gap-2.5">
              <span
                data-testid="volume-active-pct"
                className="text-3xl font-extrabold text-slate-900"
              >
                {queue.volume.stores > 0 ? Math.round((queue.volume.active / queue.volume.stores) * 100) : 0}%
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                Trading
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              <strong className="text-slate-800">{queue.volume.active}</strong> of {queue.volume.stores} stores are not suspended.
            </p>
            <div className="mt-5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full"
                style={{ width: `${queue.volume.stores > 0 ? (queue.volume.active / queue.volume.stores) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Card 4: Gross booked across the platform */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>GROSS BOOKED (EVERY STORE)</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span data-testid="volume-gross" className="text-3xl font-extrabold text-slate-900">
                {formatPrice(queue.volume.gross)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Commission <strong className="text-slate-800">{formatPrice(queue.volume.commission)}</strong> ·
              paid to sellers <strong className="text-slate-800">{formatPrice(queue.volume.net)}</strong>
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              Summed in Postgres over packages that were not cancelled — not the page this screen is showing.
            </p>
          </div>
        </div>

        {/* Tab Filters Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="group"
            aria-label="Merchant status filters"
            className="inline-flex items-center rounded-xl bg-slate-100/90 p-1 text-xs font-bold text-slate-600"
          >
            <button
              onClick={() => { setStatus('all'); setPage(1); }}
              aria-pressed={status === 'all'}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
                status === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All Vendors</span>
              <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {queue.total}
              </span>
            </button>
            <button
              onClick={() => { setStatus('active'); setPage(1); }}
              aria-pressed={status === 'active'}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
                status === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Active</span>
              <span className="text-slate-500 font-normal">{queue.rows.filter(v => v.status === 'active').length}</span>
            </button>
            <button
              onClick={() => { setStatus('pending'); setPage(1); }}
              aria-pressed={status === 'pending'}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
                status === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending Verification</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                {queue.pending}
              </span>
            </button>
            <button
              onClick={() => { setStatus('suspended'); setPage(1); }}
              aria-pressed={status === 'suspended'}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
                status === 'suspended'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Suspended / Flagged</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                {queue.suspended}
              </span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => { setSearch(''); setStatus('all'); setPage(1); }}
            className="self-end sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex-1">
            <label htmlFor="vendor-search" className="sr-only">
              Search merchants
            </label>
            <Input
              id="vendor-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors by store name, owner, email..."
              leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              className="h-9 rounded-lg bg-slate-50/80 text-xs text-slate-900 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="vendor-status-select" className="sr-only">
              Filter by status
            </label>
            <Select
              value={status}
              onValueChange={(value) => { setStatus(value); setPage(1); }}
            >
              <SelectTrigger
                id="vendor-status-select"
                aria-label="Filter by status"
                className="h-9 w-auto text-xs font-semibold text-slate-700"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Status: All</SelectItem>
                <SelectItem value="active" className="text-xs">Active</SelectItem>
                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                <SelectItem value="suspended" className="text-xs">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <label htmlFor="vendor-page-size" className="sr-only">
              Rows per page
            </label>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}
            >
              <SelectTrigger
                id="vendor-page-size"
                aria-label="Rows per page"
                className="h-9 w-auto text-xs font-semibold text-slate-700"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6" className="text-xs">6 per page</SelectItem>
                <SelectItem value="12" className="text-xs">12 per page</SelectItem>
                <SelectItem value="24" className="text-xs">24 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vendors Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <DataTable
            columns={vendorColumns}
            rows={filteredVendors}
            getRowKey={(vendor) => vendor.id}
            ariaLabel="Vendor and merchant directory"
            emptyState={<div className="hidden" aria-hidden="true" />}
          />

          {/* Table Footer / Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>
                Showing{' '}
                <strong>
                  {filteredVendors.length === 0 ? 0 : (page - 1) * pageSize + 1}-
                  {Math.min(page * pageSize, filteredVendors.length)}
                </strong>{' '}
                of <strong>{queue.total}</strong> merchant records
              </span>
              <div className="flex items-center gap-1.5">
                <label htmlFor="vendor-rows-per-page">Rows per page:</label>
                <select
                  id="vendor-rows-per-page"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="native-select rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto" role="group" aria-label="Pagination">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                aria-label="First Page"
                title="First Page"
              >
                |&lt;
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                aria-label="Previous Page"
                title="Previous Page"
              >
                &lt;
              </button>
              {Array.from({ length: Math.ceil(queue.total / pageSize) || 1 }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={page === p ? 'page' : undefined}
                  className={`flex h-7 min-w-7 px-1.5 items-center justify-center rounded text-xs font-bold transition-colors cursor-pointer ${
                    page === p
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(Math.ceil(queue.total / pageSize), p + 1))}
                disabled={page >= Math.ceil(queue.total / pageSize) || Math.ceil(queue.total / pageSize) === 0}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                aria-label="Next Page"
                title="Next Page"
              >
                &gt;
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.ceil(queue.total / pageSize))}
                disabled={page >= Math.ceil(queue.total / pageSize) || Math.ceil(queue.total / pageSize) === 0}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                aria-label="Last Page"
                title="Last Page"
              >
                &gt;|
              </button>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
