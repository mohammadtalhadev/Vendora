import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Search, ChevronDown, Download, Wallet } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { exportToCsv } from '../lib/export-csv';
import { formatPrice } from '../store/currency-store';
import { useAdminOrderQueue } from '../features/admin/hooks/useAdminQueries';

/**
 * The queue read is the page's only source: Postgres sums the money and pages the rows,
 * so a filter or a page change re-reads the queue rather than trimming a local array.
 * The `admin_order_queue` read only carries what the console can honestly show.
 */

/** Statuses `leadStatus` can hold, taken from the `sub_orders` status domain. */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'placed', label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packed', label: 'Packed' },
  { value: 'ready_for_pickup', label: 'Ready for pickup' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
  { value: 'refunded', label: 'Refunded' },
];

const PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All payments' },
  { value: 'pending', label: 'Pending' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const statusLabel = (token: string): string =>
  STATUS_OPTIONS.find((o) => o.value === token)?.label ?? token.replace(/_/g, ' ');

const statusTone = (token: string): string => {
  switch (token) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'cancelled':
    case 'refunded':
    case 'returned':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'shipped':
    case 'out_for_delivery':
      return 'bg-purple-50 text-purple-700 border border-purple-200';
    case 'placed':
    case 'confirmed':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
};

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export const AdminOrdersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [payment, setPayment] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const { data: queue, refetch, isPending, isError, error } = useAdminOrderQueue({
    status,
    payment,
    search,
    page,
    pageSize,
  });

  if (isPending) {
    return (
      <WorkspaceLayout
        role="admin"
        roleBadgeText="SUPER ADMIN"
        title="Order Management"
        sidebar={<AdminNav />}
      >
        <div className="space-y-6">
          <div role="status" aria-live="polite" className="flex items-center gap-3 text-sm text-slate-700">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Reading the order queue…
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
        title="Order Management"
        sidebar={<AdminNav />}
      >
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-semibold mb-1">Failed to load the order queue</div>
          <div className="mb-3 text-xs">
            {error instanceof Error ? error.message : 'The order queue could not be read.'}
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
  const totalPages = Math.ceil(queue.total / pageSize) || 1;

  const handleExportPage = () => {
    exportToCsv({
      filename: `admin-marketplace-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'Order ID', key: 'id' },
        { header: 'Date', key: 'createdAt' },
        { header: 'Customer Email', key: 'customerEmail' },
        { header: 'Packages', key: 'packages' },
        { header: 'Payment Method', key: 'paymentMethod' },
        { header: 'Payment Status', key: 'paymentStatus' },
        { header: 'Gross (USD)', key: 'gross' },
        { header: 'Commission (USD)', key: 'commission' },
        { header: 'Paid to sellers (USD)', key: 'paidToSellers' },
        { header: 'Status', key: 'leadStatus' },
      ],
      data: rows.map((o) => ({
        id: o.id,
        createdAt: o.createdAt,
        customerEmail: o.customerEmail,
        packages: o.packages,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        gross: o.gross,
        commission: o.commission,
        paidToSellers: o.paidToSellers,
        leadStatus: o.leadStatus,
      })),
    });
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Order Management"
      subtitle="Monitor marketplace transactions across every seller's packages."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        {/* =====================================================================
            1. Title & Header Action
            ===================================================================== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Order Management
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Monitor marketplace transactions across every seller's packages.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportPage}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Orders</span>
          </button>
        </div>

        {/* =====================================================================
            2. Queue totals — the only platform-wide aggregates the read returns
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Total Orders</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <ShoppingBag className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {queue.total.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Matching order groups across the platform.
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Booked Volume</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Wallet className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {formatPrice(queue.booked)}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Summed in Postgres over every order, not just this page.
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. Search & Filter Bar — every control is a server-side queue param
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              aria-label="Search orders"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search orders by ID, customer, payment…"
              className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="orders-status-filter">
              Status
            </label>
            <select
              id="orders-status-filter"
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

            <label className="sr-only" htmlFor="orders-payment-filter">
              Payment
            </label>
            <select
              id="orders-payment-filter"
              value={payment}
              onChange={(e) => {
                setPayment(e.target.value);
                setPage(1);
              }}
              className="admin-select"
            >
              {PAYMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleExportPage}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export page</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            4. Orders Data Table
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full text-left text-xs"
              aria-label="Orders queue"
            >
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="py-3 px-4">Order ID</th>
                  <th scope="col" className="py-3 px-4">Customer</th>
                  <th scope="col" className="py-3 px-4">Packages</th>
                  <th scope="col" className="py-3 px-4">Payment</th>
                  <th scope="col" className="py-3 px-4 text-right">Amount</th>
                  <th scope="col" className="py-3 px-4 text-center">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-500">
                      No orders match these filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="hover:text-[#FF7A1A] hover:underline transition-colors"
                        >
                          {order.id.slice(0, 8)}
                        </Link>
                      </td>

                      <td className="py-3 px-4">
                        <p className="text-[11px] text-slate-600 leading-tight break-all">
                          {order.customerEmail || '—'}
                        </p>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {order.packages} package{order.packages === 1 ? '' : 's'}
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-700 leading-tight">{order.paymentMethod}</p>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{order.paymentStatus}</p>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <p className="font-semibold text-slate-900 text-xs">{formatPrice(order.gross)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Commission {formatPrice(order.commission)}
                        </p>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusTone(order.leadStatus)}`}
                        >
                          {statusLabel(order.leadStatus)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-[11px] text-slate-500 font-medium">
                        {formatDateTime(order.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer — driven by the queue's server-side page + total */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>
                Rows per page:
              </span>
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
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
              <span className="ml-2">
                Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, queue.total)} of {queue.total.toLocaleString()} orders
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
