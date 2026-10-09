import React, { useState } from 'react';
import {
  RotateCcw,
  Check,
  Clock,
  Truck,
  TrendingDown,
  DollarSign,
  Search,
  ChevronDown,
  Download,
  CheckCircle2,
  Camera,
  Video,
  Lightbulb,
  SlidersHorizontal,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { useMarketplaceStore } from '../store/marketplace-store';
import { exportToCsv } from '../lib/export-csv';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

export const VendorReturnsPage: React.FC = () => {
  const storeReturns = useMarketplaceStore((state) => state.returns);
  const approveReturn = useMarketplaceStore((state) => state.approveReturn);
  const rejectReturn = useMarketplaceStore((state) => state.rejectReturn);
  const markReturnRestocked = useMarketplaceStore((state) => state.markReturnRestocked);

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'transit' | 'inspection' | 'completed' | 'disputed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>(['rma-1']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === storeReturns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(storeReturns.map((item) => item.id));
    }
  };

  const handleBulkApprove = () => {
    const pendingList = storeReturns.filter((r) => r.status === 'pending');
    if (pendingList.length === 0) {
      showToast('No pending returns to approve');
      return;
    }
    for (const item of pendingList) {
      approveReturn(item.rmaId);
    }
    showToast(`Approved ${pendingList.length} returns and issued buyer refunds`);
  };

  const handleExportCsv = () => {
    const exportData = filteredItems.map((r) => ({
      RMA: r.rmaId,
      Order: r.orderNumber,
      Customer: r.customerName,
      Product: r.productName,
      Reason: r.reason,
      Refund: r.refundAmountFormatted,
      Status: r.status,
    }));

    exportToCsv(`vendor-returns-${new Date().toISOString().split('T')[0]}.csv`, exportData, {
      RMA: 'RMA Tracking ID',
      Order: 'Order Number',
      Customer: 'Buyer Name',
      Product: 'Returned Product',
      Reason: 'Return Reason',
      Refund: 'Refund Amount',
      Status: 'RMA Status',
    });
    showToast('Returns exported to CSV successfully');
  };

  const filteredItems = storeReturns.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      item.rmaId.toLowerCase().includes(q) ||
      item.orderNumber.toLowerCase().includes(q) ||
      item.customerName.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q);

    if (!matchSearch) return false;

    if (reasonFilter !== 'All') {
      if (!item.reason.toLowerCase().includes(reasonFilter.toLowerCase())) return false;
    }

    if (activeTab === 'pending' && item.status !== 'pending') return false;
    if (activeTab === 'transit' && item.status !== 'in_transit') return false;
    if (activeTab === 'completed' && item.status !== 'approved' && item.status !== 'restocked') return false;
    if (activeTab === 'disputed' && item.status !== 'rejected') return false;

    return true;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Returns &amp; Refunds
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live RMA Queue
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              Process return authorizations, inspect received merchandise, issue instantaneous buyer credits, and manage intelligent automated restocking workflows.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              Return Settings / Policy
            </button>
            <button
              onClick={handleBulkApprove}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Check className="h-4 w-4" />
              Bulk Approve Pending
            </button>
          </div>
        </div>

        {toastMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Active Return Requests */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>ACTIVE RETURN REQUESTS</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <RotateCcw className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">3</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                Action Needed
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Avg resolution time: <strong className="text-slate-800">4.2 hrs</strong></span>
            </div>
          </div>

          {/* Card 2: In Transit to Warehouse */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>IN TRANSIT TO WAREHOUSE</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">5</span>
              <span className="text-xs text-slate-500 font-medium">Via UPS / FedEx Ground</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              <strong className="text-slate-800">2</strong> expected delivery today
            </div>
          </div>

          {/* Card 3: Merchant Return Rate */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>MERCHANT RETURN RATE</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">1.8%</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                -0.4% vs benchmark
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Cat. Benchmark: <strong>3.5% (Electronics)</strong></span>
            </div>
          </div>

          {/* Card 4: Total Refunded */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>TOTAL REFUNDED (30D)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900">$490.50</span>
              <span className="text-xs text-slate-500 font-medium">4 Approved</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Recovery rate: <strong className="text-slate-800">76.4% via restock</strong>
            </div>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/90 p-1 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Returns <span className="opacity-75">23</span>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'pending'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Action <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">3</span>
          </button>
          <button
            onClick={() => setActiveTab('transit')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'transit'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Transit <span className="rounded bg-blue-100 px-1 text-[10px] text-blue-800">5</span>
          </button>
          <button
            onClick={() => setActiveTab('inspection')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'inspection'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Awaiting Inspection <span className="opacity-75">2</span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'completed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed / Refunded <span className="opacity-75">16</span>
          </button>
          <button
            onClick={() => setActiveTab('disputed')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === 'disputed'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected / Disputed <span className="rounded bg-rose-100 px-1 text-[10px] text-rose-800">2</span>
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
              placeholder="Search RMA or order ID..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden"
              >
                <option value="All">All Reasons (Defective, Remorse, Damaged)</option>
                <option value="Defective">Defective</option>
                <option value="Remorse">Remorse</option>
                <option value="Damaged">Damaged</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden">
                <option>All Resolutions</option>
                <option>Refund to Card</option>
                <option>Store Credit</option>
                <option>Replacement</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden">
                <option>Last 90 Days</option>
                <option>Last 30 Days</option>
                <option>Last 7 Days</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              onClick={handleExportCsv}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              title="Download Report (CSV)"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Returns Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={storeReturns.length > 0 && selectedIds.length === storeReturns.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </th>
                  <th className="px-4 py-3.5">RMA &amp; ORDER ID</th>
                  <th className="px-4 py-3.5">CUSTOMER</th>
                  <th className="px-4 py-3.5">RETURNED PRODUCT</th>
                  <th className="px-4 py-3.5">REASON &amp; VERIFICATION</th>
                  <th className="px-4 py-3.5">REFUND AMOUNT</th>
                  <th className="px-4 py-3.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${isChecked ? 'bg-slate-50/80' : ''}`}
                    >
                      <td className="w-10 px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(item.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </td>

                      {/* RMA & Order ID */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{item.rmaId}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-blue-600">{item.orderNumber}</span>
                          <span>•</span>
                          <span className="text-slate-400">{item.orderTime}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{item.customerName}</div>
                        <div className="text-[11px] text-slate-400">{item.customerCity}</div>
                      </td>

                      {/* Returned Product */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-9 w-9 shrink-0 rounded-lg object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            <div className="text-[10px] text-slate-400">{item.productVariant}</div>
                          </div>
                        </div>
                      </td>

                      {/* Reason & Verification */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">{item.reason}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {item.badgeType === 'photos' && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                              <Camera className="h-3 w-3" />
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.badgeType === 'video' && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                              <Video className="h-3 w-3" />
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.badgeType === 'unopened' && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700">
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.badgeType === 'dock' && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[10px] font-semibold text-blue-700">
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.badgeType === 'restocked' && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700">
                              {item.badgeLabel}
                            </span>
                          )}
                          {item.serialNote && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              • {item.serialNote}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Refund Amount */}
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {item.refundAmountFormatted}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        {item.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                approveReturn(item.rmaId);
                                showToast(`Approved refund of ${item.refundAmountFormatted} for ${item.rmaId}`);
                              }}
                              className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                rejectReturn(item.rmaId);
                                showToast(`Rejected return ${item.rmaId}`);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {item.status === 'approved' && (
                          <button
                            onClick={() => {
                              markReturnRestocked(item.rmaId);
                              showToast(`Restocked merchandise for ${item.rmaId}`);
                            }}
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                          >
                            Restock
                          </button>
                        )}
                        {item.status === 'restocked' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            Restocked ✓
                          </span>
                        )}
                        {item.status === 'rejected' && (
                          <span className="text-[11px] font-semibold text-rose-600">
                            Rejected ✗
                          </span>
                        )}
                        {item.status === 'in_transit' && (
                          <span className="text-[11px] font-semibold text-blue-600">
                            In Transit 🚚
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            <span>
              Showing <strong>{filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)}</strong> of <strong>{filteredItems.length}</strong> return orders •{' '}
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
              </select>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                &lt; Prev
              </button>
              <span className="px-2 font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next &gt;
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Bottom Analytics: Common Reasons & Return Rules */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (7 cols): Common Return Reasons Breakdown */}
          <div className="lg:col-span-7 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Common Return Reasons Breakdown
                </h2>
                <p className="text-xs text-slate-500">Telemetry based on last 90 days RMA classifications</p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Sample: 124 returns
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                  <span>Defective packaging / hardware issue</span>
                  <strong className="text-slate-900">42% (52 orders)</strong>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-slate-900 rounded-full" style={{ width: '42%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                  <span>Changed mind / Buyer remorse</span>
                  <strong className="text-slate-900">28% (35 orders)</strong>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-slate-700 rounded-full" style={{ width: '28%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                  <span>Item not as described / Spec mismatch</span>
                  <strong className="text-slate-900">18% (22 orders)</strong>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-slate-500 rounded-full" style={{ width: '18%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1 font-medium text-slate-700">
                  <span>Damaged in transit by carrier</span>
                  <strong className="text-slate-900">12% (15 orders)</strong>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: '12%' }} />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span>Tip: Updating power bank specs lowered return velocity by <strong>14%</strong>.</span>
              </div>
              <button
                type="button"
                onClick={handleExportCsv}
                className="font-bold text-slate-900 hover:underline self-start sm:self-auto cursor-pointer"
              >
                Download CSV report →
              </button>
            </div>
          </div>

          {/* Right Column (5 cols): Automated Return Rules */}
          <div className="lg:col-span-5 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Automated Return Rules</h2>
                <p className="text-xs text-slate-500">System rules to accelerate merchant review</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(true)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Configure
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Rule 1 */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Auto-approve items under $30</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Buyer receives label instantly without manual approval
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Enabled
                </span>
              </div>

              {/* Rule 2 */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Camera className="h-4 w-4 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Mandatory photo proof for defects</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Requires min. 1 serial image and 1 defect image
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Enabled
                </span>
              </div>

              {/* Rule 3 */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-slate-600 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Standard Return Window</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      30 days from carrier delivery timestamp
                    </p>
                  </div>
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  30 Days
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Last edited 3 days ago by vendor@demo.test</span>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(true)}
                className="font-semibold text-slate-600 hover:text-slate-900 cursor-pointer underline"
              >
                View Audit Log
              </button>
            </div>
          </div>
        </div>

        {/* Modal: Automated Return Rules */}
        <Dialog open={isRulesModalOpen} onOpenChange={setIsRulesModalOpen}>
          <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">Automated Return Rules</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure auto-approval thresholds, inspection policies, and customer return shipping costs.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Auto-Approval Price Floor ($)</label>
                <input
                  type="text"
                  defaultValue="30.00"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Return Window (Days)</label>
                <input
                  type="text"
                  defaultValue="30"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Return Shipping Cost</label>
                <select className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900">
                  <option>Free returns (Vendor prepaid label)</option>
                  <option>Customer pays return postage</option>
                  <option>Deducted from refund ($5.99 fee)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRulesModalOpen(false);
                    showToast('Return policy rules updated successfully');
                  }}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Save Rules
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Return Audit Log */}
        <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
          <DialogContent className="max-w-lg bg-white p-6 rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">Return &amp; RMA Audit Log</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Recent policy modifications and dispute audit trail.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-3 max-h-80 overflow-y-auto text-xs">
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
                <div className="font-bold text-slate-900">Return window calibrated to 30 days</div>
                <div className="text-[11px] text-slate-400 mt-0.5">vendor@demo.test • 3 days ago</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
                <div className="font-bold text-slate-900">Mandatory photo proof requirement enabled</div>
                <div className="text-[11px] text-slate-400 mt-0.5">ops@vendora.market • 1 week ago</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
                <div className="font-bold text-slate-900">Instant label threshold set to &lt;$30</div>
                <div className="text-[11px] text-slate-400 mt-0.5">vendor@demo.test • 2 weeks ago</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
