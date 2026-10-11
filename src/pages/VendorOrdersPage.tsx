import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Package,
  Truck,
  Search,
  ChevronDown,
  Printer,
  FileText,
  SlidersHorizontal,
  X,
  ArrowUpRight,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { useVendorData } from '../features/vendor/hooks/useVendorData';
import type { SubOrderStatus } from '../types/domain';

import { exportToCsv } from '../lib/export-csv';

type FilterStatus = 'all' | SubOrderStatus;

/**
 * One label per status the database can hold. The physical and digital machines share
 * `placed`, `cancelled` and `refunded`, so a row outside the six states this page used to
 * know about is still described instead of rendering blank.
 */
const STATUS_PILL: Record<SubOrderStatus, { label: string; pill: string; dot: string }> = {
  placed: { label: 'Unfulfilled', pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  packed: {
    label: 'Packed',
    pill: 'bg-purple-50 text-purple-700 border border-purple-200/60',
    dot: 'bg-purple-500',
  },
  ready_for_pickup: {
    label: 'Awaiting Rider Pickup',
    pill: 'bg-blue-50/80 text-blue-700 border border-blue-200/60',
    dot: 'bg-blue-500',
  },
  shipped: { label: 'Shipped', pill: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  out_for_delivery: {
    label: 'Out for delivery',
    pill: 'bg-indigo-50 text-indigo-700',
    dot: 'bg-indigo-500',
  },
  delivered: {
    label: 'Delivered',
    pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    dot: 'bg-rose-500',
  },
  delivery_failed: {
    label: 'Delivery failed',
    pill: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    dot: 'bg-rose-500',
  },
  return_requested: {
    label: 'Return requested',
    pill: 'bg-orange-50 text-orange-700 border border-orange-200/60',
    dot: 'bg-orange-500',
  },
  return_approved: {
    label: 'Return approved',
    pill: 'bg-orange-50 text-orange-700 border border-orange-200/60',
    dot: 'bg-orange-500',
  },
  return_rejected: {
    label: 'Return rejected',
    pill: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    dot: 'bg-rose-500',
  },
  returned: {
    label: 'Returned',
    pill: 'bg-slate-100 text-slate-700 border border-slate-200',
    dot: 'bg-slate-400',
  },
  refunded: {
    label: 'Refunded',
    pill: 'bg-slate-100 text-slate-700 border border-slate-200',
    dot: 'bg-slate-400',
  },
  paid: { label: 'Paid', pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  available: {
    label: 'Ready to download',
    pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    dot: 'bg-emerald-500',
  },
};

/** A package at `packed` is the only one a store may mark ready; earlier states need their own steps. */
const READY_ELIGIBLE: SubOrderStatus[] = ['packed'];

export const VendorOrdersPage: React.FC = () => {
  const {
    orders,
    advanceOrderStatus,
    kpis,
  } = useVendorData();

  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [ageFilter, setAgeFilter] = useState<'all' | '7' | '30'>('all');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'card' | 'cod'>('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAdvanceStatus = async (subOrderId: string, currentStatus: SubOrderStatus) => {
    let nextStatus: SubOrderStatus | null = null;
    let note = '';

    if (currentStatus === 'placed') {
      nextStatus = 'confirmed';
      note = 'Order confirmed by vendor';
    } else if (currentStatus === 'confirmed') {
      nextStatus = 'packed';
      note = 'Order packed in secure parcel';
    } else if (currentStatus === 'packed') {
      nextStatus = 'ready_for_pickup';
      note = 'Order marked ready for rider pickup';
    }

    // The RPC owns the transition; the query cache refetches the row it wrote.
    if (nextStatus) {
      await advanceOrderStatus(subOrderId, nextStatus, 'Vendor', note);
    }
  };

  const handleBulkFulfill = async () => {
    const placed = orders.filter((o) => o.status === 'placed');
    if (placed.length === 0) {
      showToast('All pending orders are already confirmed.');
      return;
    }
    for (const o of placed) {
      await advanceOrderStatus(o.id, 'confirmed', 'Vendor', 'Bulk confirmed');
    }
    showToast(`Bulk confirmed ${placed.length} pending orders.`);
  };

  const handleExportCsv = () => {
    exportToCsv({
      filename: `vendor-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'Order ID', key: 'id' },
        { header: 'Date', key: 'createdAt' },
        { header: 'Status', key: 'status' },
        { header: 'Subtotal ($)', key: 'subtotal' },
        { header: 'Commission ($)', key: 'commissionAmount' },
        { header: 'Net Payout ($)', key: 'netPayout' },
      ],
      data: filteredOrders,
    });
  };

  /** Carriers named by the store's own shipped packages - nothing else is offered. */
  const carriers = useMemo(() => {
    const names = orders.map((o) => o.carrierName).filter((c): c is string => Boolean(c));
    return [...new Set(names)].sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cutoff = ageFilter === 'all' ? -Infinity : Date.now() - Number(ageFilter) * 86_400_000;

    return orders.filter((order) => {
      if (selectedFilter !== 'all' && order.status !== selectedFilter) {
        return false;
      }
      if (new Date(order.createdAt).getTime() < cutoff) return false;
      if (carrierFilter !== 'all' && (order.carrierName ?? 'none') !== carrierFilter) return false;
      if (paymentFilter !== 'all' && order.paymentMethod !== paymentFilter) return false;
      if (q) {
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesItems = order.items.some((i) => i.title.toLowerCase().includes(q));
        const matchesBuyer = order.buyerEmail.toLowerCase().includes(q);
        if (!matchesId && !matchesItems && !matchesBuyer) return false;
      }
      return true;
    });
  }, [orders, selectedFilter, searchQuery, ageFilter, carrierFilter, paymentFilter]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelectOne = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredOrders.map((o) => o.id);
    setSelectedOrderIds((prev) => {
      const allVisibleSelected =
        visibleIds.length > 0 && visibleIds.every((id) => prev.includes(id));
      return allVisibleSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])];
    });
  };

  const selectedPackages = orders.filter((o) => selectedOrderIds.includes(o.id));
  const selectedTotal = selectedPackages.reduce((sum, o) => sum + o.gross, 0);
  const readyEligible = selectedPackages.filter((o) => READY_ELIGIBLE.includes(o.status));

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav />}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">Orders</h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Every sub-order naming your store, read from the database. Confirm, pack and release
              for pickup here; the carrier and the handover PIN are recorded by the delivery side,
              and a store has no shipping-label or tracking feed to write.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Download className="h-4 w-4 text-slate-500" />
              Export CSV
            </button>
            <button
              onClick={handleBulkFulfill}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Package className="h-4 w-4 stroke-[2.5]" />
              Bulk Fulfill ({orders.filter((o) => o.status === 'placed').length})
            </button>
          </div>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: All Orders */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>All Orders</span>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">{orders.length}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Gross sales volume</span>
              <strong className="text-slate-800">{kpis.grossSales} GMV</strong>
            </div>
          </div>

          {/* Card 2: To Pack */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <span>To Pack</span>
              </div>
              <Package className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">
                {orders.filter((o) => o.status === 'placed' || o.status === 'confirmed').length}
              </span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                Needs Action
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Unfulfilled pending sub-orders
            </div>
          </div>

          {/* Card 3: Ready for Pickup */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Ready for Pickup</span>
              <Truck className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">
                {orders.filter((o) => o.status === 'ready_for_pickup').length}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Awaiting rider dispatch
            </div>
          </div>

          {/* Card 4: Shipped & In Transit */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Shipped &amp; In Transit</span>
              <Truck className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">
                {orders.filter((o) => o.status === 'shipped' || o.status === 'out_for_delivery' || o.status === 'delivered').length}
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Active Parcels
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Dispatched to buyer destinations
            </div>
          </div>
        </div>

        {/* Filter Buttons (Exact regex names required for tests) */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/90 p-1 text-xs font-bold text-slate-600">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`rounded-lg px-3.5 py-1.5 transition-all ${
              selectedFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Orders <span className="opacity-75">{orders.length}</span>
          </button>
          <button
            onClick={() => setSelectedFilter('placed')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedFilter === 'placed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Placed <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">{orders.filter((o) => o.status === 'placed').length}</span>
          </button>
          <button
            onClick={() => setSelectedFilter('confirmed')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedFilter === 'confirmed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Confirmed <span className="opacity-75">{orders.filter((o) => o.status === 'confirmed').length}</span>
          </button>
          <button
            onClick={() => setSelectedFilter('packed')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedFilter === 'packed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Packed <span className="opacity-75">{orders.filter((o) => o.status === 'packed').length}</span>
          </button>
          <button
            onClick={() => setSelectedFilter('ready_for_pickup')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedFilter === 'ready_for_pickup'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ready for Pickup <span className="opacity-75">{orders.filter((o) => o.status === 'ready_for_pickup').length}</span>
          </button>
          <button
            onClick={() => setSelectedFilter('delivered')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedFilter === 'delivered'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Delivered <span className="opacity-75">{orders.filter((o) => o.status === 'delivered').length}</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order id, item title or buyer email"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={ageFilter}
                onChange={(e) => {
                  setAgeFilter(e.target.value as 'all' | '7' | '30');
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Booked any time</option>
                <option value="7">Booked in last 7 days</option>
                <option value="30">Booked in last 30 days</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={carrierFilter}
                onChange={(e) => {
                  setCarrierFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Any carrier</option>
                <option value="none">No carrier recorded</option>
                {carriers.map((carrier) => (
                  <option key={carrier} value={carrier}>
                    {carrier}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value as 'all' | 'card' | 'cod');
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Payment: any</option>
                <option value="card">Paid by card</option>
                <option value="cod">Cash on delivery</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {(ageFilter !== 'all' ||
              carrierFilter !== 'all' ||
              paymentFilter !== 'all' ||
              searchQuery.trim() !== '' ||
              selectedFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setAgeFilter('all');
                  setCarrierFilter('all');
                  setPaymentFilter('all');
                  setSearchQuery('');
                  setSelectedFilter('all');
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Selected Orders Actions Ribbon */}
        {selectedOrderIds.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-900 p-3 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-md">
            <div className="flex items-center gap-2">
              <span className="font-bold">{selectedOrderIds.length} orders selected</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">Selected total: ${selectedTotal.toFixed(2)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Print this page ({selectedOrderIds.length})
              </button>
              <button
                onClick={async () => {
                  for (const pkg of readyEligible) {
                    await advanceOrderStatus(pkg.id, 'ready_for_pickup', 'Vendor', 'Marked ready for pickup via bulk batch');
                  }
                  showToast(
                    readyEligible.length === selectedOrderIds.length
                      ? `${readyEligible.length} packages marked ready for pickup.`
                      : `${readyEligible.length} of ${selectedOrderIds.length} selected are packed and marked ready; the rest still need confirming and packing.`,
                  );
                  setSelectedOrderIds([]);
                }}
                className="rounded-lg bg-white px-3.5 py-1.5 font-bold text-slate-900 hover:bg-slate-100 shadow-xs cursor-pointer"
              >
                Mark as Ready ({readyEligible.length})
              </button>
              <button
                onClick={() => setSelectedOrderIds([])}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Orders Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredOrders.length > 0 &&
                        filteredOrders.every((o) => selectedOrderIds.includes(o.id))
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </th>
                  <th className="px-4 py-3.5">ORDER ID &amp; DATE</th>
                  <th className="px-4 py-3.5">CUSTOMER &amp; DESTINATION</th>
                  <th className="px-4 py-3.5">ITEMS</th>
                  <th className="px-4 py-3.5">TOTAL &amp; PAYMENT</th>
                  <th className="px-4 py-3.5">FULFILLMENT STATUS</th>
                  <th className="px-4 py-3.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedOrders.map((order) => {
                  const isChecked = selectedOrderIds.includes(order.id);
                  return (
                    <tr
                      key={order.id}
                      data-testid={`sub-order-card-${order.id}`}
                      className={`hover:bg-slate-50/70 transition-colors ${isChecked ? 'bg-slate-50/80' : ''}`}
                    >
                      <td className="w-10 px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(order.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </td>

                      {/* ORDER ID & DATE */}
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/vendor/orders/${order.id}`}
                          className="flex items-center gap-1.5 font-bold text-slate-900 hover:text-[#EA6C13] transition-colors"
                        >
                          <span>{order.id}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                        </Link>
                        <div className="text-[11px] text-slate-400">
                          {new Date(order.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* CUSTOMER & DESTINATION */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{order.buyerAddress?.fullName || order.buyerEmail || 'Buyer'}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {[order.buyerEmail, order.buyerAddress?.city && `${order.buyerAddress.city}, ${order.buyerAddress.state}`]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      </td>

                      {/* ITEMS */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 truncate max-w-xs">
                              {order.items[0]?.title ?? 'No line items on this sub-order'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {order.items.length} item{order.items.length > 1 ? 's' : ''} in shipment
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* TOTAL & PAYMENT */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">${(order.subtotal + order.shippingFee).toFixed(2)}</div>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <Check className="h-3 w-3" />
                          <span>
                            {order.paymentMethod === 'cod'
                              ? 'Cash on delivery'
                              : 'Card, charged at checkout'}
                          </span>
                        </div>
                      </td>

                      {/* FULFILLMENT STATUS */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_PILL[order.status].pill}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_PILL[order.status].dot}`}
                          />
                          {STATUS_PILL[order.status].label}
                        </span>
                        {order.trackingNumber && (
                          <div className="mt-1 text-[10px] font-mono text-slate-400 truncate max-w-[14rem]">
                            {order.carrierName ? `${order.carrierName} · ` : ''}
                            {order.trackingNumber}
                          </div>
                        )}
                      </td>

                      {/* ACTION (Sequential advancement state machine) */}
                      <td className="px-4 py-3.5 text-right">
                        {order.status === 'placed' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(order.id, 'placed')}
                            className="rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-orange-500/20 cursor-pointer transition-all active:scale-95"
                          >
                            Confirm Order
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(order.id, 'confirmed')}
                            className="rounded-full bg-sun-orange px-3.5 py-1.5 text-xs font-bold text-white hover:bg-sun-orange-600 shadow-2xs cursor-pointer transition-colors"
                          >
                            Mark Packed
                          </button>
                        )}
                        {order.status === 'packed' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(order.id, 'packed')}
                            className="rounded-full bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-700 shadow-2xs cursor-pointer transition-colors"
                          >
                            Ready for Rider Pickup
                          </button>
                        )}
                        {order.status === 'ready_for_pickup' && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            {order.riderId ? 'Rider assigned' : 'Awaiting rider assignment'}
                          </span>
                        )}
                        {order.status === 'delivered' && (
                          <span className="text-[11px] font-semibold text-emerald-600">
                            Delivered by rider
                          </span>
                        )}
                        {(order.status === 'return_requested' ||
                          order.status === 'return_approved' ||
                          order.status === 'return_rejected' ||
                          order.status === 'returned' ||
                          order.status === 'refunded') && (
                          <Link
                            to="/vendor/returns"
                            className="text-[11px] font-bold text-[#FF7A1A] hover:underline"
                          >
                            Handle in Returns
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>
                Showing <strong>{filteredOrders.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)}</strong> of <strong>{filteredOrders.length}</strong> orders
              </span>
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex h-7 px-2 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-7 px-2 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

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
