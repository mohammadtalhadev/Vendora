import React, { useMemo, useState } from 'react';
import {
  RotateCcw,
  Check,
  Clock,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Boxes,
  SlidersHorizontal,
  ShieldQuestion,
  X,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { Input } from '../components/ui/input';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { exportToCsv } from '../lib/export-csv';
import { formatPrice } from '../store/currency-store';
import {
  useApproveReturn,
  useCompleteReturn,
  useDeclineReturn,
  useReturnQueue,
  useVendorPackages,
} from '../features/vendor/hooks/useVendorPackages';
import type { VendorPackage } from '../features/vendor/api/packages';
import { useUpdateVendorStore, useVendorStore } from '../features/vendor/hooks/useVendorStore';
import type { VendorStore } from '../features/vendor/api/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

/** Money renders through the site's PKR formatter — no local $ strings. */
const money = (value: number) => formatPrice(value);

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

type Tab = 'all' | 'requested' | 'approved' | 'closed' | 'declined';

const TAB_STATUSES: Record<Exclude<Tab, 'all'>, string[]> = {
  requested: ['return_requested'],
  approved: ['return_approved'],
  closed: ['returned'],
  declined: ['return_rejected'],
};

const STATUS_LABEL: Record<string, string> = {
  return_requested: 'Waiting on your decision',
  return_approved: 'Approved · RMA issued',
  returned: 'Closed · units restocked',
  return_rejected: 'Declined',
};

/**
 * `sub_orders.return_reason` exists but no RPC ever writes it, so the buyer's reason is
 * read back from the history entry that moved the package into `return_requested`.
 */
function reasonOf(pkg: VendorPackage): string {
  if (pkg.returnReason) return pkg.returnReason;
  const requested = pkg.history.filter((h) => h.status === 'return_requested');
  return requested[requested.length - 1]?.note || 'No reason recorded by the buyer';
}

function requestedAtOf(pkg: VendorPackage): string {
  const requested = pkg.history.find((h) => h.status === 'return_requested');
  return requested?.timestamp ?? pkg.createdAt;
}

interface RestockReport {
  label: string;
  lines: { title: string; returned: number; stock: number }[];
}

export const VendorReturnsPage: React.FC = () => {
  const queue = useReturnQueue();
  const allPackages = useVendorPackages();
  const approve = useApproveReturn();
  const decline = useDeclineReturn();
  const close = useCompleteReturn();
  const updateStore = useUpdateVendorStore();
  const profile = useVendorStore().data;

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [restockReports, setRestockReports] = useState<RestockReport[]>([]);

  const [approveTarget, setApproveTarget] = useState<VendorPackage | null>(null);
  const [refundInput, setRefundInput] = useState('');
  const [declineTarget, setDeclineTarget] = useState<VendorPackage | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const rows = useMemo(() => queue.data ?? [], [queue.data]);
  const bookedPackages = allPackages.data ?? [];

  const requested = rows.filter((p) => p.status === 'return_requested');
  const approved = rows.filter((p) => p.status === 'return_approved');
  const closed = rows.filter((p) => p.status === 'returned');
  const declined = rows.filter((p) => p.status === 'return_rejected');

  const refundsBooked = [...approved, ...closed].reduce((sum, p) => sum + (p.refundAmount ?? 0), 0);
  const returnRate = bookedPackages.length ? (rows.length / bookedPackages.length) * 100 : 0;

  const reasonCounts = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((p) => map.set(reasonOf(p), (map.get(reasonOf(p)) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const trail = useMemo(() => {
    return rows
      .flatMap((pkg) =>
        pkg.history
          .filter((h) => h.status.startsWith('return'))
          .map((h) => ({ pkg, event: h })),
      )
      .sort((a, b) => new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime())
      .slice(0, 8);
  }, [rows]);

  const filtered = rows.filter((p) => {
    const statuses = activeTab === 'all' ? null : TAB_STATUSES[activeTab];
    if (statuses && !statuses.includes(p.status)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const haystack = [
        p.id,
        p.rmaCode ?? '',
        p.buyerEmail,
        p.items.map((i) => i.title).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paged = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  /**
   * Return-queue columns for DataTable. The page has no status pill column:
   * a package's decision state drives the ACTION cell (Approve / Decline /
   * Close & restock, or the recorded state as text via STATUS_LABEL), so the
   * cell content is carried over unchanged.
   */
  const returnColumns: DataTableColumn<(typeof rows)[number]>[] = [
    {
      key: 'package',
      header: 'PACKAGE & RMA',
      sortValue: (pkg) => pkg.rmaCode ?? pkg.id,
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (pkg) => (
        <>
          <div className="font-bold text-slate-900">{pkg.rmaCode ?? 'No RMA yet'}</div>
          <a
            href={`/vendor/orders/${pkg.id}`}
            className="text-[11px] font-semibold text-blue-600 hover:underline"
          >
            {pkg.id.slice(0, 8)}
          </a>
          <div className="text-[10px] text-slate-400">
            {pkg.type === 'digital' ? 'Digital package' : 'Physical package'}
          </div>
        </>
      ),
    },
    {
      key: 'buyer',
      header: 'BUYER',
      sortValue: (pkg) => pkg.buyerEmail || '',
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (pkg) => (
        <>
          <div className="font-semibold text-slate-800">
            {pkg.buyerEmail || 'No buyer contact on this order'}
          </div>
          {pkg.buyerAddress?.city && (
            <div className="text-[11px] text-slate-400">{pkg.buyerAddress.city}</div>
          )}
        </>
      ),
    },
    {
      key: 'contents',
      header: 'WHAT COMES BACK',
      sortValue: (pkg) => pkg.subtotal,
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (pkg) => (
        <div className="flex items-start gap-2.5">
          {pkg.items[0]?.image ? (
            <img
              src={pkg.items[0].image}
              alt={pkg.items[0].title}
              className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
              <Boxes className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <div>
            <div className="font-semibold text-slate-800">
              {pkg.items[0]?.title || 'Package contents unavailable'}
            </div>
            {pkg.items.length > 1 && (
              <div className="text-[10px] text-slate-400">
                +{pkg.items.length - 1} more line(s)
              </div>
            )}
            <div className="text-[10px] text-slate-400">
              Goods {money(pkg.subtotal)} · freight {money(pkg.shippingFee)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'requested',
      header: 'REQUESTED / REASON',
      sortValue: (pkg) => new Date(requestedAtOf(pkg)).getTime(),
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (pkg) => (
        <>
          <div className="text-slate-700">{dateLabel(requestedAtOf(pkg))}</div>
          <div className="mt-0.5 max-w-xs text-[11px] text-slate-500">{reasonOf(pkg)}</div>
          {pkg.returnRejectReason && (
            <div className="mt-1 text-[11px] font-semibold text-rose-600">
              Declined: {pkg.returnRejectReason}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'refund',
      header: 'REFUND',
      sortValue: (pkg) => pkg.refundAmount ?? pkg.subtotal,
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (pkg) => (
        <>
          <div className="font-bold text-slate-900">
            {pkg.refundAmount === undefined ? '—' : money(pkg.refundAmount)}
          </div>
          {pkg.refundAmount === undefined && (
            <div className="text-[10px] text-slate-400">
              Defaults to {money(pkg.subtotal)}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'action',
      header: 'ACTION',
      align: 'right',
      headerClassName: 'py-3.5 text-[11px]',
      className: 'py-3.5',
      cell: (pkg) => (
        <>
          {pkg.status === 'return_requested' && (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setDecisionError(null);
                  setRefundInput('');
                  setApproveTarget(pkg);
                }}
                className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-slate-800"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  setDecisionError(null);
                  setDeclineReason('');
                  setDeclineTarget(pkg);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600"
              >
                Decline
              </button>
            </div>
          )}
          {pkg.status === 'return_approved' && (
            <button
              type="button"
              onClick={() => handleCloseAndRestock(pkg)}
              disabled={close.isPending}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              Close &amp; restock
            </button>
          )}
          {pkg.status !== 'return_requested' && pkg.status !== 'return_approved' && (
            <span className="text-[11px] font-semibold text-slate-500">
              {STATUS_LABEL[pkg.status] ?? pkg.status}
            </span>
          )}
        </>
      ),
    },
  ];

  const handleApprove = async () => {
    if (!approveTarget) return;
    setDecisionError(null);
    const parsed = refundInput.trim() === '' ? undefined : Number.parseFloat(refundInput);
    if (parsed !== undefined && (!Number.isFinite(parsed) || parsed < 0)) {
      setDecisionError('Enter a refund amount as a number, or leave it blank for the goods total.');
      return;
    }
    try {
      const result = await approve.mutateAsync({
        subOrderId: approveTarget.id,
        refundAmount: parsed,
      });
      showToast(
        `Approved. RMA ${result.decision.rmaCode} issued, refund recorded at ${money(result.decision.refundAmount ?? 0)}.`,
      );
      setApproveTarget(null);
      setRefundInput('');
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDecline = async () => {
    if (!declineTarget) return;
    setDecisionError(null);
    if (declineReason.trim() === '') {
      setDecisionError('The database refuses a decline with no reason - the buyer has to be told why.');
      return;
    }
    try {
      await decline.mutateAsync({ subOrderId: declineTarget.id, reason: declineReason.trim() });
      showToast(`Declined ${declineTarget.rmaCode ?? declineTarget.id}. The reason is on the package history.`);
      setDeclineTarget(null);
      setDeclineReason('');
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCloseAndRestock = async (pkg: VendorPackage) => {
    setDecisionError(null);
    try {
      const result = await close.mutateAsync(pkg.id);
      const titles = new Map(pkg.items.map((i) => [i.productId, i.title]));
      setRestockReports((prev) => [
        {
          label: pkg.rmaCode ?? pkg.id,
          lines: result.restocked.map((line) => ({
            title: titles.get(line.productId) ?? line.productId,
            returned: line.returned,
            stock: line.stock,
          })),
        },
        ...prev,
      ]);
      showToast(`Closed ${pkg.rmaCode ?? pkg.id}: units are back on the shelf.`);
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExportCsv = () => {
    const data = filtered.map((p) => ({
      packageId: p.id,
      rma: p.rmaCode ?? '',
      buyer: p.buyerEmail || 'No buyer contact on this order',
      item: p.items.map((i) => i.title).join(' + ') || 'Package contents unavailable',
      requested: requestedAtOf(p),
      reason: reasonOf(p),
      goodsTotal: money(p.subtotal),
      refund: p.refundAmount === undefined ? '' : money(p.refundAmount),
      status: p.status,
    }));
    exportToCsv(`vendor-returns-${new Date().toISOString().split('T')[0]}.csv`, data, {
      packageId: 'Package ID',
      rma: 'RMA',
      buyer: 'Buyer',
      item: 'Items',
      requested: 'Requested',
      reason: 'Reason',
      goodsTotal: 'Goods total',
      refund: 'Refund recorded',
      status: 'Status',
    });
    showToast('Return queue exported to CSV');
  };

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">
              ORDER MANAGEMENT <span className="text-slate-300">/</span> RETURNS
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Returns &amp; Refund Decisions
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">
              A return begins when the buyer marks one of your delivered packages as returned. You
              approve or decline it here; closing an approved return puts the units back on the shelf
              in the same database transaction.
            </p>
          </div>

          <button
            onClick={() => setIsPolicyModalOpen(true)}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 sm:self-auto"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Return policy on your store record
          </button>
        </div>

        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
        )}

        {decisionError && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span>{decisionError}</span>
          </div>
        )}

        {/* ── KPI cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>WAITING ON YOU</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-600">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {queue.isPending ? '—' : requested.length}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>Requests nothing has decided yet</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>APPROVED · RMA ISSUED</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600">
                <Check className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">
              {queue.isPending ? '—' : approved.length}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Awaiting the parcel. Closing one restocks it.
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>REFUNDS RECORDED</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-600">
                <ShieldQuestion className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{money(refundsBooked)}</div>
            <div className="mt-2 text-xs text-slate-500">
              {approved.length + closed.length} return(s) carrying a refund amount
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>RETURNS PER PACKAGE</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{returnRate.toFixed(1)}%</div>
            <div className="mt-2 text-xs text-slate-500">
              {rows.length} of {bookedPackages.length} package(s) this store has booked
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div
          role="group"
          aria-label="Filter returns by decision state"
          className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/90 p-1 text-xs font-bold text-slate-600"
        >
          {(
            [
              ['all', `All (${rows.length})`],
              ['requested', `Needs a decision (${requested.length})`],
              ['approved', `Approved (${approved.length})`],
              ['closed', `Restocked (${closed.length})`],
              ['declined', `Declined (${declined.length})`],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={activeTab === key}
              onClick={() => {
                setActiveTab(key);
                setCurrentPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeTab === key ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <label htmlFor="returns-search" className="sr-only">
              Search package id, RMA, buyer email or item title
            </label>
            <Input
              id="returns-search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search package id, RMA, buyer email or item title"
              leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              className="h-9 rounded-lg bg-slate-50/60 text-xs text-slate-800 focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 sm:self-auto"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export queue
          </button>
        </div>

        {/* ── Restock receipts ────────────────────────────────────── */}
        {restockReports.length > 0 && (
          <div
            role="status"
            aria-live="polite"
            className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Stock put back by this session
            </div>
            {restockReports.map((report) => (
              <div key={report.label} className="text-xs text-emerald-900">
                <span className="font-bold">{report.label}</span>
                {' — '}
                {report.lines.map((line) => `${line.title}: ${line.returned} unit(s) back, shelf now ${line.stock}`).join('; ')}
              </div>
            ))}
          </div>
        )}

        {/* ── Queue table ─────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          {queue.isError && (
            <div role="alert" aria-live="assertive" className="flex items-start gap-2 p-5 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{(queue.error as Error).message}</span>
            </div>
          )}

          {!queue.isError && rows.length === 0 && (
            <div className="space-y-2 p-8 text-center">
              <RotateCcw className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <div className="text-sm font-bold text-slate-900">No returns on this store right now</div>
              <p className="mx-auto max-w-xl text-xs text-slate-500">
                Buyers open a return from their order page once a package of yours is delivered. Until
                one does, this queue stays empty - there is nothing here to approve, because there is
                nothing to approve.
              </p>
            </div>
          )}

          {!queue.isError && rows.length > 0 && (
            <>
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-base font-bold text-slate-900">Return queue</h2>
                <p className="text-xs text-slate-500">
                  One row per package. Approving mints the RMA the buyer must quote; declining keeps
                  your reason on the package history.
                </p>
              </div>
              <DataTable
                ariaLabel="Return queue"
                columns={returnColumns}
                rows={paged}
                getRowKey={(pkg) => pkg.id}
                isLoading={queue.isPending}
                emptyState={
                  <div className="space-y-2 px-4 py-10 text-center">
                    <RotateCcw className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                    <div className="text-sm font-bold text-slate-900">
                      No returns match this view
                    </div>
                    <p className="mx-auto max-w-md text-xs text-slate-500">
                      The store does have returns on its books, but none of them sit in the tab or
                      search you have open. Switch tabs or clear the search to see the rest of the
                      queue.
                    </p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                }
              />

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>
                  Showing{' '}
                  <strong>
                    {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filtered.length)}
                  </strong>{' '}
                  of <strong>{filtered.length}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Reason breakdown & decision trail ───────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Why these returns were opened</h2>
              <p className="text-xs text-slate-500">
                Counted from the note the buyer left on {rows.length} open or closed return(s)
              </p>
            </div>

            {reasonCounts.length === 0 && (
              <p className="text-xs text-slate-500">Nothing to break down yet.</p>
            )}

            <div className="space-y-3 text-xs">
              {reasonCounts.map(([reason, count]) => (
                <div key={reason}>
                  <div className="flex items-start justify-between gap-3 pb-1 font-medium text-slate-700">
                    <span className="max-w-md">{reason}</span>
                    <strong className="shrink-0 text-slate-900">{count}</strong>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${(count / rows.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">
              The reason is whatever the buyer typed. The schema has a{' '}
              <code className="font-mono">return_reason</code> column that no RPC writes, so this list
              reads the status history instead of a classified field.
            </p>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Decision trail</h2>
              <p className="text-xs text-slate-500">
                Every return decision on your packages, in order
              </p>
            </div>

            {trail.length === 0 && (
              <p className="text-xs text-slate-500">
                No return has been decided on this store yet. Approvals and declines both append an
                entry here the moment they happen.
              </p>
            )}

            <div className="space-y-2.5 text-xs">
              {trail.map(({ pkg, event }, idx) => (
                <div
                  key={`${pkg.id}-${idx}`}
                  className="rounded-lg border border-slate-100 bg-slate-50/70 p-3"
                >
                  <div className="font-bold text-slate-900">
                    {pkg.rmaCode ?? pkg.id.slice(0, 8)} · {STATUS_LABEL[event.status] ?? event.status}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{event.note || 'No note recorded'}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {event.actor} • {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">
              Return decisions also write to <code className="font-mono">audit_logs</code>, which row
              level security opens to staff only - this trail comes from the package history you can
              read.
            </p>
          </div>
        </div>

        {/* ── Approve modal ───────────────────────────────────────── */}
        <Dialog
          open={Boolean(approveTarget)}
          onOpenChange={(open) => {
            if (!open) setApproveTarget(null);
          }}
        >
          <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">Approve this return</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {approveTarget?.rmaCode ?? 'A new RMA code'} ·{' '}
                {approveTarget ? money(approveTarget.subtotal) + ' in goods' : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <p className="text-slate-600">
                Approving generates the RMA the buyer must quote, records the refund on the package, and
                moves it to <span className="font-semibold">return approved</span>. Refund the goods
                total in full, or agree a smaller amount. Freight is not part of this number.
              </p>

              <div>
                <label htmlFor="refund-amount" className="mb-1 block font-bold text-slate-700">
                  Refund amount (optional)
                </label>
                <input
                  id="refund-amount"
                  type="text"
                  inputMode="decimal"
                  value={refundInput}
                  onChange={(e) => setRefundInput(e.target.value)}
                  placeholder={approveTarget ? approveTarget.subtotal.toFixed(2) : '0.00'}
                  className="w-full rounded-lg border border-slate-200 p-2 font-mono text-xs focus:border-slate-900 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Leave blank and <code className="font-mono">decide_return</code> books the goods total.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setApproveTarget(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approve.isPending}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {approve.isPending ? 'Writing…' : 'Approve & issue RMA'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Decline modal ───────────────────────────────────────── */}
        <Dialog
          open={Boolean(declineTarget)}
          onOpenChange={(open) => {
            if (!open) setDeclineTarget(null);
          }}
        >
          <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">Decline this return</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Package {declineTarget?.id.slice(0, 8)} · {money(declineTarget?.subtotal ?? 0)} in goods
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <p className="text-slate-600">
                A decline is not a delete. The package stays on the order with your reason attached, and
                the buyer sees it.
              </p>

              <div>
                <label htmlFor="decline-reason" className="mb-1 block font-bold text-slate-700">
                  Reason for the buyer
                </label>
                <textarea
                  id="decline-reason"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                  placeholder="Outside the return window, or the item returned is not the unit shipped."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeclineTarget(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={decline.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Record the decline
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Policy modal ────────────────────────────────────────── */}
        <PolicyModal
          open={isPolicyModalOpen}
          onClose={() => setIsPolicyModalOpen(false)}
          profile={profile ?? null}
          updateStore={updateStore}
          onSaved={showToast}
        />
      </div>
    </WorkspaceLayout>
  );
};

function PolicyModal({
  open,
  onClose,
  profile,
  updateStore,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  profile: VendorStore | null;
  updateStore: ReturnType<typeof useUpdateVendorStore>;
  onSaved: (msg: string) => void;
}) {
  const [windowDays, setWindowDays] = useState('30');
  const [fee, setFee] = useState('0.00');
  const [payer, setPayer] = useState<'buyer' | 'seller'>('buyer');
  const [autoApprove, setAutoApprove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!profile) return;
    setWindowDays(String(profile.returnWindowDays));
    setFee(profile.restockingFee.toFixed(2));
    setPayer(profile.returnShippingPayer === 'seller' ? 'seller' : 'buyer');
    setAutoApprove(profile.autoApproveReturns);
  }, [profile]);

  const save = async () => {
    setError(null);
    const days = Number.parseInt(windowDays, 10);
    const feeValue = Number.parseFloat(fee);
    if (!Number.isFinite(days) || days < 0 || days > 365) {
      setError('The column rejects a window outside 0-365 days.');
      return;
    }
    if (!Number.isFinite(feeValue) || feeValue < 0) {
      setError('Restocking fee must be zero or more.');
      return;
    }
    try {
      await updateStore.mutateAsync({
        returnWindowDays: days,
        restockingFee: feeValue,
        returnShippingPayer: payer,
        autoApproveReturns: autoApprove,
      });
      onSaved('Return policy saved to your store record.');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">Return policy</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Four fields on <code className="font-mono">vendor_profiles</code>, the same ones the
            Settings page reads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="policy-return-window" className="mb-1 block font-bold text-slate-700">
                Return window (days)
              </label>
              <input
                id="policy-return-window"
                type="text"
                inputMode="numeric"
                value={windowDays}
                onChange={(e) => setWindowDays(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 font-mono text-xs focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="policy-restocking-fee" className="mb-1 block font-bold text-slate-700">
                Restocking fee
              </label>
              <input
                id="policy-restocking-fee"
                type="text"
                inputMode="decimal"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 font-mono text-xs focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="policy-return-payer" className="mb-1 block font-bold text-slate-700">
              Who pays return postage
            </label>
            <select
              id="policy-return-payer"
              value={payer}
              onChange={(e) => setPayer(e.target.value as 'buyer' | 'seller')}
              className="native-select w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-slate-900 focus:outline-none"
            >
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
            </select>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="mt-0.5 rounded border-slate-300"
            />
            <span>
              <span className="block font-bold text-slate-900">Auto-approve returns</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                Not active yet — every request still waits for your decision here.
              </span>
            </span>
          </label>

          <p className="rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
            The refund you approve is the refund the buyer receives. The restocking fee is{' '}
            <strong>not</strong> deducted automatically — to charge it, approve a smaller amount.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={save}
              disabled={updateStore.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {updateStore.isPending ? 'Saving…' : 'Save policy'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
