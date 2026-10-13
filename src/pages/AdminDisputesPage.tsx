import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Scale,
  Search,
  Download,
  X,
  ShieldAlert,
  DollarSign,
  Clock,
  Eye,
  Ban,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';
import { exportToCsv } from '../lib/export-csv';
import { formatPrice } from '../store/currency-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { useDisputeQueue } from '../features/admin/hooks/useAdminQueries';
import { useAdminActions } from '../features/admin/hooks/useAdminActions';
import type { AdminDisputeRow } from '../features/admin/api/disputes';

const PAGE_SIZE = 12;

type StatusFilter = 'all' | 'open' | 'escalated' | 'resolved';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Disputes' },
  { value: 'open', label: 'Open' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
];

function statusMeta(status: AdminDisputeRow['status']): { label: string; className: string; Icon: typeof Clock } {
  switch (status) {
    case 'escalated':
      return { label: 'Escalated', className: 'bg-rose-50 text-rose-700 border-rose-200', Icon: AlertTriangle };
    case 'under_review':
      return { label: 'Under Review', className: 'bg-blue-50 text-blue-700 border-blue-200', Icon: Eye };
    case 'resolved_refund':
      return { label: 'Resolved · Refunded', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 };
    case 'resolved_denied':
      return { label: 'Resolved · Denied', className: 'bg-slate-100 text-slate-700 border-slate-200', Icon: Ban };
    case 'open':
    default:
      return { label: 'Open', className: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock };
  }
}

const isResolved = (status: AdminDisputeRow['status']): boolean =>
  status === 'resolved_refund' || status === 'resolved_denied';

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export const AdminDisputesPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedForRuling, setSelectedForRuling] = useState<AdminDisputeRow | null>(null);
  const [rulingOutcome, setRulingOutcome] = useState<'refund' | 'denied'>('refund');
  const [rulingAmount, setRulingAmount] = useState('0');
  const [rulingNote, setRulingNote] = useState('');

  const [selectedForDetails, setSelectedForDetails] = useState<AdminDisputeRow | null>(null);

  const actions = useAdminActions();
  const { data: queue, isPending, isError, error, refetch } = useDisputeQueue({
    status: statusFilter,
    search: searchQuery,
    page,
    pageSize: PAGE_SIZE,
  });

  const resolveAction = actions.resolveDispute;
  const escalateAction = actions.escalateDispute;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenRulingModal = (dispute: AdminDisputeRow) => {
    setSelectedForRuling(dispute);
    setRulingOutcome('refund');
    setRulingAmount(String(dispute.remainingGross));
    setRulingNote('');
  };

  const handleConfirmRuling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForRuling) return;
    const note = rulingNote.trim();
    if (note === '') {
      showToast('A ruling needs a written rationale.');
      return;
    }
    const disputeId = selectedForRuling.id;
    if (rulingOutcome === 'refund') {
      const amount = Number(rulingAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        showToast('Enter a refund amount greater than zero.');
        return;
      }
      resolveAction.mutate(
        { disputeId, outcome: 'resolved_refund', note, amount },
        {
          onSuccess: () => {
            setSelectedForRuling(null);
            showToast(`Case ${disputeId} closed with a refund.`);
          },
        },
      );
    } else {
      resolveAction.mutate(
        { disputeId, outcome: 'resolved_denied', note, amount: null },
        {
          onSuccess: () => {
            setSelectedForRuling(null);
            showToast(`Case ${disputeId} denied.`);
          },
        },
      );
    }
  };

  const handleEscalate = (dispute: AdminDisputeRow) => {
    actions.escalateDispute.mutate(
      { disputeId: dispute.id },
      { onSuccess: () => showToast(`Case ${dispute.id} escalated to platform arbitration.`) },
    );
  };

  const handleExportCsv = () => {
    const rows = (queue?.rows ?? []).map((d) => ({
      dispute_id: d.id,
      order_id: d.orderGroupId ?? d.subOrderId ?? '',
      customer: d.customerName,
      vendor: d.vendorName,
      package_gross: d.packageGross,
      refunded: d.refundedAmount,
      status: d.status,
      created_at: d.createdAt,
      reason: d.reason,
      resolution_note: d.resolutionNote ?? '',
    }));

    exportToCsv({
      filename: `vendora_platform_disputes_${new Date().toISOString().slice(0, 10)}.csv`,
      data: rows,
      columns: [
        { header: 'Dispute ID', key: 'dispute_id' },
        { header: 'Order ID', key: 'order_id' },
        { header: 'Customer', key: 'customer' },
        { header: 'Vendor', key: 'vendor' },
        { header: 'Package Gross', key: 'package_gross' },
        { header: 'Refunded', key: 'refunded' },
        { header: 'Status', key: 'status' },
        { header: 'Created At', key: 'created_at' },
        { header: 'Reason', key: 'reason' },
        { header: 'Resolution Note', key: 'resolution_note' },
      ],
    });

    showToast('The disputes on this page were exported to CSV.');
  };

  const rows = queue?.rows ?? [];
  const counts = queue?.counts;
  const total = queue?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusFilterFor = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const searchFilterFor = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const resolutionError = resolveAction.isError
    ? resolveAction.error?.message ?? 'The ruling could not be recorded.'
    : null;

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Dispute Resolution & Escalation Hub"
      subtitle="Arbitrate vendor-buyer disputes, record refunds against the ledger, and enforce platform guarantee policies."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">Disputes &amp; Resolution</h1>
            <p className="text-xs text-slate-500 mt-0.5">Customer protection claims read from the arbitration queue.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={rows.length === 0}
            className="gap-2 text-xs rounded-xl border-slate-200 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export This Page</span>
          </Button>
        </div>

        {isPending && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-xs text-slate-500 shadow-xs">
            Reading the dispute queue…
          </div>
        )}

        {isError && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <div className="font-bold mb-1">Failed to load disputes</div>
            <div className="mb-3 text-xs">{error instanceof Error ? error.message : 'The arbitration queue could not be read.'}</div>
            <Button size="sm" variant="outline" onClick={() => void refetch()} className="rounded-xl text-xs">
              Retry
            </Button>
          </div>
        )}

        {!isPending && !isError && queue && (
          <>
            {/* KPI Cards — every figure is counted in Postgres by the queue read. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Open Cases</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-black text-slate-900">{counts?.open ?? 0}</div>
                <p className="mt-1 text-xs text-amber-600 font-medium">{counts?.underReview ?? 0} under review</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Escalated to Admin</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-black text-rose-600">{counts?.escalated ?? 0}</div>
                <p className="mt-1 text-xs text-rose-600 font-medium">Awaiting a platform ruling</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resolved Cases</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-black text-emerald-600">{counts?.resolved ?? 0}</div>
                <p className="mt-1 text-xs text-emerald-600 font-medium">{counts?.awaitingStaff ?? 0} awaiting staff</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Open Exposure</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-black text-slate-900">{formatPrice(queue.exposure)}</div>
                <p className="mt-1 text-xs text-slate-500 font-medium">Across every unsettled package</p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
              <div role="group" aria-label="Filter disputes by status" className="flex items-center gap-1 overflow-x-auto" data-lenis-prevent>
                {STATUS_TABS.map((tab) => {
                  const active = statusFilter === tab.value;
                  const badge =
                    tab.value === 'all'
                      ? total
                      : tab.value === 'open'
                      ? counts?.open ?? 0
                      : tab.value === 'escalated'
                      ? counts?.escalated ?? 0
                      : counts?.resolved ?? 0;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => statusFilterFor(tab.value)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                        active
                          ? tab.value === 'open'
                            ? 'bg-amber-600 text-white'
                            : tab.value === 'escalated'
                            ? 'bg-rose-600 text-white'
                            : tab.value === 'resolved'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label} ({badge})
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <label htmlFor="dispute-search" className="sr-only">
                  Search disputes
                </label>
                <input
                  id="dispute-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => searchFilterFor(e.target.value)}
                  placeholder="Search ID, order, buyer, or vendor..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Active Disputes Queue */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <div className="border-b border-slate-100 p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Active Disputes Queue</h3>
                  <p className="text-xs text-slate-500">Customer protection guarantee claims requiring platform adjudication</p>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  Page {page} of {totalPages} • {total} case{total === 1 ? '' : 's'}
                </span>
              </div>

              {rows.length === 0 ? (
                <div className="py-16 text-center">
                  <Scale className="mx-auto h-10 w-10 text-slate-300" />
                  <h4 className="mt-2 text-sm font-bold text-slate-800">No disputes found</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    {searchQuery
                      ? 'No arbitration cases match your search filter.'
                      : 'All cases in this tab have been resolved.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rows.map((d) => {
                    const meta = statusMeta(d.status);
                    return (
                      <div
                        key={d.id}
                        className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="space-y-1.5 max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">{d.id}</span>
                            <span className="text-slate-400">•</span>
                            <button
                              type="button"
                              onClick={() => setSelectedForDetails(d)}
                              className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 hover:text-slate-950 underline decoration-slate-300 hover:decoration-slate-900 cursor-pointer"
                              title="Open the case record"
                            >
                              <span>{d.orderGroupId ? `Order #${d.orderGroupId}` : d.subOrderId ? `Package #${d.subOrderId}` : 'No order reference'}</span>
                              <Eye className="h-3 w-3 text-slate-400" />
                            </button>
                            <span className="text-slate-400">•</span>
                            <span className="text-xs text-slate-400">{formatDate(d.createdAt)}</span>

                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${meta.className}`}>
                              <meta.Icon className="h-3 w-3" />
                              {meta.label}
                            </span>
                            {d.urgency === 'urgent' && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-700">
                                Urgent
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-semibold text-slate-900">{d.reason}</h4>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span>Customer: <strong className="text-slate-800">{d.customerName}</strong></span>
                            <span>•</span>
                            <span>Vendor: <strong className="text-slate-800">{d.vendorName}</strong></span>
                            <span>•</span>
                            <span>
                              Package: <strong className="text-slate-900 font-bold">{formatPrice(d.packageGross)}</strong>{' '}
                              · refunded {formatPrice(d.refundedAmount)} · still movable {formatPrice(d.remainingGross)}
                            </span>
                          </div>

                          {d.resolutionNote && (
                            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs text-slate-600">
                              <span className="font-bold text-slate-800">Ruling: </span>
                              <span>{d.resolutionNote}</span>
                              {d.resolutionAmount !== null && (
                                <span className="text-slate-500"> · {formatPrice(d.resolutionAmount)}</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedForDetails(d)}
                            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs rounded-xl gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            <span>Case Record</span>
                          </Button>

                          {(d.status === 'open' || d.status === 'under_review') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEscalate(d)}
                              disabled={escalateAction.isPending}
                              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-xs rounded-xl cursor-pointer disabled:opacity-50"
                            >
                              <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                              <span>Escalate</span>
                            </Button>
                          )}

                          {!isResolved(d.status) ? (
                            <Button
                              size="sm"
                              onClick={() => handleOpenRulingModal(d)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs rounded-xl shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Issue Ruling & Resolve</span>
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Case Closed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-xl text-xs disabled:opacity-40"
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-medium text-slate-500">Page {page} of {totalPages}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-xl text-xs disabled:opacity-40"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal: Issue Official Platform Ruling */}
        {selectedForRuling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ruling-title"
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 id="ruling-title" className="text-sm font-bold text-slate-900">Issue Dispute Resolution Ruling</h3>
                    <p className="text-xs text-slate-400">Case ID: {selectedForRuling.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedForRuling(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Close"
                  aria-label="Close ruling dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmRuling} className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Buyer:</span>
                    <span className="font-medium text-slate-800">{selectedForRuling.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vendor:</span>
                    <span className="font-medium text-slate-800">{selectedForRuling.vendorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Package charged:</span>
                    <span className="font-bold text-slate-900">{formatPrice(selectedForRuling.packageGross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Already refunded:</span>
                    <span className="font-medium text-slate-800">{formatPrice(selectedForRuling.refundedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Most this ruling can move:</span>
                    <span className="font-bold text-slate-900">{formatPrice(selectedForRuling.remainingGross)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1 mt-1">
                    <span className="text-slate-500">Claim Reason: </span>
                    <span className="font-medium text-slate-800">{selectedForRuling.reason}</span>
                  </div>
                </div>

                <fieldset>
                  <legend className="text-xs font-bold text-slate-700 block mb-1">Arbitration Ruling Action</legend>
                  <div className="grid grid-cols-2 gap-2" role="group">
                    <button
                      type="button"
                      aria-pressed={rulingOutcome === 'refund'}
                      onClick={() => {
                        setRulingOutcome('refund');
                        setRulingAmount(String(selectedForRuling.remainingGross));
                      }}
                      className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition-all ${
                        rulingOutcome === 'refund'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Refund Buyer
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        up to {formatPrice(selectedForRuling.remainingGross)}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={rulingOutcome === 'denied'}
                      onClick={() => {
                        setRulingOutcome('denied');
                        setRulingAmount('0');
                      }}
                      className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition-all ${
                        rulingOutcome === 'denied'
                          ? 'border-slate-800 bg-slate-50 text-slate-900 ring-2 ring-slate-800/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Deny Claim
                      <span className="block text-[10px] text-slate-400 mt-0.5">Release funds to vendor</span>
                    </button>
                  </div>
                </fieldset>

                {rulingOutcome === 'refund' && (
                  <div>
                    <label htmlFor="ruling-amount" className="text-xs font-bold text-slate-700 block mb-1">
                      Refund amount
                    </label>
                    <input
                      id="ruling-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={selectedForRuling.remainingGross}
                      value={rulingAmount}
                      onChange={(e) => setRulingAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="ruling-note" className="text-xs font-bold text-slate-700 block mb-1">
                    Official Ruling Notes / Explanation
                  </label>
                  <textarea
                    id="ruling-note"
                    rows={3}
                    required
                    value={rulingNote}
                    onChange={(e) => setRulingNote(e.target.value)}
                    placeholder="Provide clear rationale for the platform ruling..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                {resolutionError && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                    {resolutionError}
                  </div>
                )}

                <div className="mt-1 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedForRuling(null)}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={resolveAction.isPending}
                    className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {resolveAction.isPending
                        ? 'Recording ruling…'
                        : rulingOutcome === 'refund'
                        ? `Execute Refund (${formatPrice(Number(rulingAmount) || 0)})`
                        : 'Record Denial'}
                    </span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Case Record — only the fields the dispute row actually carries. */}
        <Dialog open={!!selectedForDetails} onOpenChange={(open) => !open && setSelectedForDetails(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedForDetails && (() => {
              const d = selectedForDetails;
              const meta = statusMeta(d.status);
              return (
                <div className="space-y-5 text-xs py-2">
                  <DialogHeader>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-base font-extrabold text-slate-900">Case {d.id}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${meta.className}`}>
                            <meta.Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          {d.urgency === 'urgent' && (
                            <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-700">
                              Urgent
                            </span>
                          )}
                        </div>
                        <DialogTitle className="text-base font-bold text-slate-900 mt-1">
                          Dispute Record
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                          Everything shown here is read from the arbitration queue; nothing is reconstructed on the client.
                        </DialogDescription>
                      </div>
                      <div className="text-right self-center shrink-0">
                        <div className="text-xs text-slate-500 font-medium">Package charged</div>
                        <div className="text-2xl font-black text-slate-900">{formatPrice(d.packageGross)}</div>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <Scale className="h-4 w-4 text-slate-600" />
                        <span>Parties &amp; Reference</span>
                      </div>
                      <dl className="space-y-1 text-slate-600">
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Customer</dt><dd className="font-medium text-slate-800">{d.customerName}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Vendor</dt><dd className="font-medium text-slate-800">{d.vendorName}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Order</dt><dd className="font-mono text-slate-800">{d.orderGroupId ?? '—'}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Package</dt><dd className="font-mono text-slate-800">{d.subOrderId ?? '—'}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Package status</dt><dd className="font-medium text-slate-800">{d.packageStatus}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Assigned agent</dt><dd className="font-medium text-slate-800">{d.agentName ?? 'Unassigned'}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Messages</dt><dd className="font-medium text-slate-800">{d.messages}</dd></div>
                      </dl>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <DollarSign className="h-4 w-4 text-slate-600" />
                        <span>Ledger Position</span>
                      </div>
                      <dl className="space-y-1 text-slate-600">
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Charged for package</dt><dd className="font-bold text-slate-900">{formatPrice(d.packageGross)}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Refunded so far</dt><dd className="font-medium text-slate-800">{formatPrice(d.refundedAmount)}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Still movable</dt><dd className="font-medium text-slate-800">{formatPrice(d.remainingGross)}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Filed</dt><dd className="font-medium text-slate-800">{formatDate(d.createdAt)}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-slate-500">Last updated</dt><dd className="font-medium text-slate-800">{formatDate(d.updatedAt)}</dd></div>
                      </dl>
                    </div>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span>Buyer Claim</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{d.reason}</p>
                  </div>

                  {d.resolutionNote && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Platform Ruling</span>
                      </div>
                      <p className="text-xs text-slate-700">{d.resolutionNote}</p>
                      {d.resolutionAmount !== null && (
                        <p className="text-[11px] text-emerald-700 font-semibold">Amount: {formatPrice(d.resolutionAmount)}</p>
                      )}
                    </div>
                  )}

                  {d.evidencePhotos.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-900">Buyer Evidence</div>
                      <div className="flex flex-wrap gap-2">
                        {d.evidencePhotos.map((url, idx) => (
                          <a key={`${url}-${idx}`} href={url} target="_blank" rel="noreferrer" className="block">
                            <img src={url} alt={`Dispute ${d.id} evidence ${idx + 1}`} className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="text-slate-400 text-[11px]">
                      Case status: <strong className="text-slate-700">{meta.label}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedForDetails(null)}
                        className="rounded-xl text-xs cursor-pointer"
                      >
                        Close
                      </Button>
                      {(d.status === 'open' || d.status === 'under_review') && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={escalateAction.isPending}
                          onClick={() => handleEscalate(d)}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs rounded-xl cursor-pointer disabled:opacity-50"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                          Escalate
                        </Button>
                      )}
                      {!isResolved(d.status) && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const target = d;
                            setSelectedForDetails(null);
                            handleOpenRulingModal(target);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl cursor-pointer shadow-xs gap-1.5"
                        >
                          <Scale className="h-3.5 w-3.5" />
                          Rule &amp; Resolve Claim
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
