import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Search, Download, Wallet } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { exportToCsv } from '../lib/export-csv';
import { formatPrice } from '../store/currency-store';
import { useAdminOrderQueue } from '../features/admin/hooks/useAdminQueries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { AdminOrderRow } from '../features/admin/api/orders';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { StatusBadge } from '../components/ui/status-badge';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { OrderActionsMenu } from '../features/admin/components/OrderActionsMenu';

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

  // The queue read is server-side, so the search term is debounced: typing must
  // not fire one widest-read-in-the-console request per keystroke.
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: queue, refetch, isPending, isError, error } = useAdminOrderQueue({
    status,
    payment,
    search: debouncedSearch,
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

  const orderColumns: DataTableColumn<AdminOrderRow>[] = [
    {
      key: 'id',
      header: 'Order ID',
      className: 'font-mono font-bold text-slate-900',
      cell: (order) => (
        <Link
          to={`/admin/orders/${order.id}`}
          className="hover:text-sun-orange hover:underline transition-colors"
        >
          {order.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (order) => (
        <p className="text-[11px] text-slate-600 leading-tight break-all">
          {order.customerEmail || '—'}
        </p>
      ),
    },
    {
      key: 'packages',
      header: 'Packages',
      className: 'text-slate-600',
      cell: (order) => (
        <>
          {order.packages} package{order.packages === 1 ? '' : 's'}
        </>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      cell: (order) => (
        <>
          <p className="font-medium text-slate-700 leading-tight">{order.paymentMethod}</p>
          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{order.paymentStatus}</p>
        </>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (order) => (
        <>
          <p className="font-semibold text-slate-900 text-xs">{formatPrice(order.gross)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Commission {formatPrice(order.commission)}
          </p>
        </>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (order) => <StatusBadge status={order.leadStatus} />,
    },
    {
      key: 'date',
      header: 'Date',
      align: 'right',
      className: 'text-[11px] text-slate-500 font-medium',
      cell: (order) => formatDateTime(order.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (order) => (
        <OrderActionsMenu order={order} onChanged={() => void refetch()} />
      ),
    },
  ];

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

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPage}
            disabled={rows.length === 0}
            className="self-start sm:self-auto"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Orders</span>
          </Button>
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
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              aria-label="Search orders"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search orders by ID, customer, payment…"
              leftIcon={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
              className="h-9 rounded-lg bg-slate-50/80 text-xs text-slate-800 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                id="orders-status-filter"
                aria-label="Status"
                className="h-9 w-auto text-xs font-semibold text-slate-700"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={payment}
              onValueChange={(value) => {
                setPayment(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                id="orders-payment-filter"
                aria-label="Payment"
                className="h-9 w-auto text-xs font-semibold text-slate-700"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
          <DataTable
            columns={orderColumns}
            rows={rows}
            getRowKey={(order) => order.id}
            ariaLabel="Orders queue"
            emptyState={
              <div className="px-4 py-10 text-center text-xs text-slate-500">
                No orders match these filters.
              </div>
            }
            pagination={{
              page,
              pageSize,
              totalItems: queue.total,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
              pageSizeOptions: [12, 24, 48],
              noun: 'orders',
            }}
          />
        </div>
      </div>
    </WorkspaceLayout>
  );
};
