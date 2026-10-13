import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Store,
  ShieldOff,
  Headset,
  Bike,
  Search,
  ChevronDown,
  Download,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { exportToCsv } from '../lib/export-csv';
import { formatPrice } from '../store/currency-store';
import { useUserQueue } from '../features/admin/hooks/useAdminQueries';
import { useAdminActions } from '../features/admin/hooks/useAdminActions';

/**
 * `admin_user_queue` pages accounts and aggregates the role counts in SQL, so the tiles
 * read the queue's `counts` rather than the page of rows. A status change is a governance
 * write; the row repaints from the queue when the mutation invalidates the read.
 */

/** Role tokens `p_role` filters on, matching the profiles.roles domain. */
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'support', label: 'Support' },
  { value: 'rider', label: 'Rider' },
  { value: 'customer', label: 'Customer' },
];

/** Account statuses `accountStatus` can hold. */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'banned', label: 'Banned' },
];

const roleLabel = (token: string): string =>
  ROLE_OPTIONS.find((o) => o.value === token)?.label ?? token;

const statusTone = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-slate-900 text-white';
    case 'suspended':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'banned':
      return 'bg-rose-600 text-white';
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
};

const initialsFrom = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return initials || name.slice(0, 2).toUpperCase() || '—';
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const AdminUsersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const actions = useAdminActions();
  const { data: queue, refetch, isPending, isError, error } = useUserQueue({
    role,
    status,
    search,
    page,
    pageSize,
  });

  if (isPending) {
    return (
      <WorkspaceLayout
        role="admin"
        roleBadgeText="SUPER ADMIN"
        title="User Management"
        sidebar={<AdminNav />}
      >
        <div className="space-y-6">
          <div role="status" aria-live="polite" className="flex items-center gap-3 text-sm text-slate-700">
            <Users className="h-4 w-4" aria-hidden="true" />
            Reading accounts…
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  if (isError) {
    return (
      <WorkspaceLayout
        role="admin"
        roleBadgeText="SUPER ADMIN"
        title="User Management"
        sidebar={<AdminNav />}
      >
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-semibold mb-1">Failed to load accounts</div>
          <div className="mb-3 text-xs">
            {error instanceof Error ? error.message : 'The accounts queue could not be read.'}
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </WorkspaceLayout>
    );
  }

  const rows = queue.rows;
  const { counts } = queue;
  const totalPages = Math.ceil(queue.total / pageSize) || 1;
  const pct = (n: number): number => (counts.all > 0 ? Math.round((n / counts.all) * 100) : 0);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === rows.length ? [] : rows.map((u) => u.id)));
  };

  const toggleSelectUser = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleToggleStatus = (userId: string, current: string) => {
    const next: 'active' | 'suspended' = current === 'active' ? 'suspended' : 'active';
    actions.setUserStatus.mutate({ userId, status: next, reason: 'Action via admin console' });
  };

  const handleBatchSuspend = () => {
    selectedIds.forEach((userId) =>
      actions.setUserStatus.mutate({ userId, status: 'suspended', reason: 'Bulk suspension via admin console' }),
    );
    setSelectedIds([]);
  };

  const handleExportPage = () => {
    exportToCsv({
      filename: `marketplace-users-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'User ID', key: 'id' },
        { header: 'Full Name', key: 'name' },
        { header: 'Email Address', key: 'email' },
        { header: 'Roles', key: 'roles' },
        { header: 'Account Status', key: 'accountStatus' },
        { header: 'Volume (USD)', key: 'volume' },
        { header: 'Orders', key: 'orders' },
        { header: 'Join Date', key: 'joinedAt' },
      ],
      data: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        roles: u.roles.join(' | '),
        accountStatus: u.accountStatus,
        volume: u.volume,
        orders: u.orders,
        joinedAt: u.joinedAt,
      })),
    });
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="User Management"
      subtitle="Manage customer, vendor, support, rider and platform accounts."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        {/* =====================================================================
            1. Title & Header Action
            ===================================================================== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">
              User Management
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage customer, vendor, support, rider and platform accounts.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportPage}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Download className="h-3.5 w-3.5 text-white stroke-[2.5]" />
            <span className="text-white">Export accounts</span>
          </button>
        </div>

        {/* A refused write surfaces the database's reason and leaves the queue untouched. */}
        {actions.setUserStatus.isError && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
            {actions.setUserStatus.error instanceof Error
              ? actions.setUserStatus.error.message
              : 'That account change was not saved.'}
          </div>
        )}

        {/* =====================================================================
            2. Queue counts — the role facets `admin_user_queue` aggregates
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Total Accounts</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Users className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {counts.all.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-400">Across the marketplace.</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Admins</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {counts.admins.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-400">{pct(counts.admins)}% of accounts.</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Vendors</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Store className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {counts.vendors.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-400">{pct(counts.vendors)}% of accounts.</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Suspended</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <ShieldOff className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-rose-600">
                {counts.suspended.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-400">{pct(counts.suspended)}% of accounts.</div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. Remaining role facets the queue counts
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2">
              <Headset className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Support Staff</span>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {counts.support.toLocaleString()}
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: `${pct(counts.support)}%` }} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2">
              <Bike className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Riders</span>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {counts.riders.toLocaleString()}
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: `${pct(counts.riders)}%` }} />
            </div>
          </div>
        </div>

        {/* =====================================================================
            4. Search & Filter Bar — every control is a server-side queue param
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              aria-label="Search users"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search users by name, email, or ID..."
              className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="users-role-filter">
              Role
            </label>
            <select
              id="users-role-filter"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="admin-select"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="users-status-filter">
              Status
            </label>
            <select
              id="users-status-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="admin-select"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBatchSuspend}
                disabled={actions.setUserStatus.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 text-white px-3 py-1.5 text-xs font-semibold shadow-2xs hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <span>Suspend Selected ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* =====================================================================
            5. Users Data Table
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full text-left text-xs"
              aria-label="User accounts"
            >
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all accounts on this page"
                      checked={rows.length > 0 && selectedIds.length === rows.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </th>
                  <th scope="col" className="py-3 px-4">User</th>
                  <th scope="col" className="py-3 px-4">Roles</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Total Volume</th>
                  <th scope="col" className="py-3 px-4 text-right">Join Date</th>
                  <th scope="col" className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-500">
                      No accounts match these filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((user) => {
                    const isSelected = selectedIds.includes(user.id);
                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isSelected ? 'bg-slate-50/90' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select ${user.name}`}
                            checked={isSelected}
                            onChange={() => toggleSelectUser(user.id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[10px] font-black text-white">
                              {initialsFrom(user.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-xs truncate leading-tight">
                                {user.name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length === 0 ? (
                              <span className="text-[11px] text-slate-400">—</span>
                            ) : (
                              user.roles.map((r) => (
                                <span
                                  key={r}
                                  className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow-2xs"
                                >
                                  {roleLabel(r)}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusTone(user.accountStatus)}`}>
                            {user.accountStatus}
                          </span>
                          {user.accountStatusReason && (
                            <p className="text-[10px] text-slate-400 mt-1 max-w-[16rem] leading-tight">
                              {user.accountStatusReason}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <p className="font-semibold text-slate-900 text-xs">{formatPrice(user.volume)}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {user.orders} order{user.orders === 1 ? '' : 's'}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right text-[11px] text-slate-500 font-medium">
                          {formatDate(user.joinedAt)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            disabled={actions.setUserStatus.isPending}
                            onClick={() => handleToggleStatus(user.id, user.accountStatus)}
                            className={`rounded px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
                              user.accountStatus === 'active'
                                ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {user.accountStatus === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer — driven by the queue's server-side page + total */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <div className="relative">
                <select
                  value={pageSize}
                  aria-label="Rows per page"
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="appearance-none rounded border border-slate-200 bg-white pl-2 pr-6 py-1 text-xs text-slate-700 shadow-2xs cursor-pointer"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
              <span className="ml-2">
                Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, queue.total)} of {queue.total.toLocaleString()} users
              </span>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto" role="navigation" aria-label="Pagination">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    page === p
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
