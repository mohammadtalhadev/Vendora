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
import {
  getVendorSubOrders,
  advanceSubOrderStatus,
} from '../features/vendor/vendorData';
import type { SubOrder, SubOrderStatus } from '../types/domain';
import { useAuthStore } from '../store/auth-store';

import { exportToCsv } from '../lib/export-csv';

type FilterStatus = 'all' | SubOrderStatus;

export const VendorOrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const vendorId = user?.vendorId || 'vendor-tech-1';

  const [orders, setOrders] = useState<SubOrder[]>(() => getVendorSubOrders(vendorId));
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(['sub-ord-2001', 'sub-ord-2002']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAdvanceStatus = (subOrderId: string, currentStatus: SubOrderStatus) => {
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

    if (nextStatus) {
      const updated = advanceSubOrderStatus(subOrderId, nextStatus, 'Vendor', note);
      setOrders((prev) =>
        prev.map((order) => (order.id === subOrderId ? updated : order)),
      );
    }
  };

  const handleBulkFulfill = () => {
    const placed = orders.filter((o) => o.status === 'placed');
    if (placed.length === 0) {
      showToast('All pending orders are already confirmed.');
      return;
    }
    placed.forEach((o) => {
      advanceSubOrderStatus(o.id, 'confirmed', 'Vendor', 'Bulk confirmed');
    });
    setOrders(getVendorSubOrders(vendorId));
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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (selectedFilter !== 'all' && order.status !== selectedFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesItems = order.items.some((i) => i.title.toLowerCase().includes(q));
        if (!matchesId && !matchesItems) return false;
      }
      return true;
    });
  }, [orders, selectedFilter, searchQuery]);

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
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map((o) => o.id));
    }
  };

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav />}
    >
      <div className="space-y-6">
        {/* Breadcrumb & Live Sync */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-slate-600">
              FULFILLMENT CENTRAL
            </span>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sync Active</span>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Orders</h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Track customer orders, manage packing slips, fulfill shipments, and handle real-time carrier telemetry.
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
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Package className="h-4 w-4" />
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
              <span className="text-3xl font-extrabold text-slate-900">342</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                +9.4%
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Current calendar month</span>
              <strong className="text-slate-800">$128.4k GMV</strong>
            </div>
          </div>

          {/* Card 2: To Pack */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>To Pack</span>
              </div>
              <Package className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">12</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                Needs Action
              </span>
            </div>
            <div className="mt-2 text-xs text-rose-600 font-semibold">
              Oldest unfulfilled: 3h 42m overdue
            </div>
          </div>

          {/* Card 3: Ready for Pickup */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Ready for Pickup</span>
              <Truck className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">8</span>
              <span className="text-xs text-slate-500 font-medium">DHL &amp; FedEx</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Carrier pickup window: <strong className="text-slate-800">Today, 4:00 PM</strong>
            </div>
          </div>

          {/* Card 4: Shipped & In Transit */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Shipped &amp; In Transit</span>
              <Truck className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">284</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                98.6% On-time
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Avg delivery duration: <strong className="text-slate-800">2.1 Business Days</strong>
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
            All Orders <span className="opacity-75">342</span>
          </button>
          <button
            onClick={() => setSelectedFilter('placed')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedFilter === 'placed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Placed <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">12</span>
          </button>
          <button
            onClick={() => setSelectedFilter('confirmed')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedFilter === 'confirmed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Confirmed
          </button>
          <button
            onClick={() => setSelectedFilter('packed')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedFilter === 'packed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Packed <span className="opacity-75">8</span>
          </button>
          <button
            onClick={() => setSelectedFilter('ready_for_pickup')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedFilter === 'ready_for_pickup'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ready for Pickup <span className="opacity-75">5</span>
          </button>
          <button
            onClick={() => setSelectedFilter('delivered')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedFilter === 'delivered'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Delivered <span className="opacity-75">1,420</span>
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
              placeholder="Search Order ID, customer name... ⌘K"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden">
                <option>Last 30 Days</option>
                <option>Last 7 Days</option>
                <option>Today</option>
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
                <option value="all">All Shipping Carriers</option>
                <option value="fedex">FedEx Ground</option>
                <option value="dhl">DHL Express</option>
                <option value="usps">USPS Priority</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Payment: All</option>
                <option value="apple_pay">Paid (Apple Pay)</option>
                <option value="credit_card">Paid (Credit Card)</option>
                <option value="refunded">Refunded</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={() => {
                setShowFilters(!showFilters);
                if (showFilters) {
                  setCarrierFilter('all');
                  setPaymentFilter('all');
                  setSearchQuery('');
                  setSelectedFilter('all');
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
                showFilters || carrierFilter !== 'all' || paymentFilter !== 'all'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showFilters || carrierFilter !== 'all' || paymentFilter !== 'all' ? 'Reset Filters' : 'Filters'}
            </button>
          </div>
        </div>

        {/* Selected Orders Actions Ribbon */}
        {selectedOrderIds.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-900 p-3 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-md">
            <div className="flex items-center gap-2">
              <span className="font-bold">{selectedOrderIds.length} orders selected</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">Selected total: $861.40</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Packing Slips ({selectedOrderIds.length})
              </button>
              <button
                type="button"
                onClick={() => showToast(`Generated carrier shipping labels for ${selectedOrderIds.length} orders: ${selectedOrderIds.join(', ')}`)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                Generate Shipping Labels
              </button>
              <button
                onClick={() => {
                  selectedOrderIds.forEach((id) => {
                    const ord = orders.find((o) => o.id === id);
                    if (ord && (ord.status === 'placed' || ord.status === 'confirmed' || ord.status === 'packed')) {
                      advanceSubOrderStatus(id, 'ready_for_pickup', 'Vendor', 'Marked ready for pickup via bulk batch');
                    }
                  });
                  setOrders(getVendorSubOrders(vendorId));
                  setSelectedOrderIds([]);
                }}
                className="rounded-lg bg-white px-3.5 py-1.5 font-bold text-slate-900 hover:bg-slate-100 shadow-xs cursor-pointer"
              >
                Mark as Ready
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
                      checked={selectedOrderIds.length === orders.length}
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
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today, 11:20 AM'}
                        </div>
                      </td>

                      {/* CUSTOMER & DESTINATION */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">Sarah Jenkins</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          s.jenkins@example.com • Austin, TX, USA
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
                              {order.items[0]?.title || 'Sony WH-1000XM5 (x1)'}
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
                          <span>Paid (Apple Pay)</span>
                        </div>
                      </td>

                      {/* FULFILLMENT STATUS */}
                      <td className="px-4 py-3.5">
                        {order.status === 'placed' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Unfulfilled
                          </span>
                        )}
                        {order.status === 'confirmed' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Confirmed
                          </span>
                        )}
                        {order.status === 'packed' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                            Packing
                          </span>
                        )}
                        {order.status === 'ready_for_pickup' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                            Awaiting Rider Pickup
                          </span>
                        )}
                        {order.status === 'delivered' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Delivered
                          </span>
                        )}
                        {order.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Cancelled
                          </span>
                        )}
                      </td>

                      {/* ACTION (Sequential advancement state machine) */}
                      <td className="px-4 py-3.5 text-right">
                        {order.status === 'placed' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(order.id, 'placed')}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs"
                          >
                            Confirm Order
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(order.id, 'confirmed')}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs"
                          >
                            Mark Packed
                          </button>
                        )}
                        {order.status === 'packed' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(order.id, 'packed')}
                            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 shadow-2xs"
                          >
                            Ready for Rider Pickup
                          </button>
                        )}
                        {order.status === 'ready_for_pickup' && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            Staged at Dock ✓
                          </span>
                        )}
                        {order.status === 'delivered' && (
                          <span className="text-[11px] font-semibold text-emerald-600">
                            Completed ✓
                          </span>
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
