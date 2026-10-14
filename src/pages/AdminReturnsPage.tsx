import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useAdminScope } from '../features/admin/hooks/admin-keys';
import {
  adminApproveReturn,
  adminCompleteReturn,
  adminDeclineReturn,
  fetchAdminReturns,
  type AdminReturnCase,
} from '../features/admin/api/returns';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { StatusBadge } from '../components/ui/status-badge';
import { formatPrice } from '../store/currency-store';

/**
 * Admin Returns & Refunds (/admin/returns). Every seller's return queue in
 * one oversight list. Decisions run through the same `decide_return` /
 * `complete_return` RPCs the vendor workspace uses — both accept an admin
 * caller — so an admin decision here is identical in effect to the seller's
 * own, including the RMA, refund amount and restocking.
 */
const reason = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim() !== '' ? error.message : fallback;

const WAITING = 'return_requested';

type PendingAction =
  | { kind: 'approve'; row: AdminReturnCase }
  | { kind: 'decline'; row: AdminReturnCase }
  | { kind: 'complete'; row: AdminReturnCase };

export const AdminReturnsPage: React.FC = () => {
  const userId = useAdminScope();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [refundInput, setRefundInput] = useState('');
  const [declineReason, setDeclineReason] = useState('');

  const returnsQuery = useQuery({
    queryKey: ['admin', userId ?? 'anon', 'returns'] as const,
    queryFn: ({ signal }) => fetchAdminReturns(signal),
    enabled: Boolean(userId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', userId ?? 'anon', 'returns'] });

  const actionMutation = useMutation({
    mutationFn: async (action: PendingAction) => {
      if (action.kind === 'approve') {
        const amount = refundInput.trim() === '' ? undefined : Number(refundInput);
        await adminApproveReturn(
          action.row.subOrderId,
          amount !== undefined && Number.isFinite(amount) && amount >= 0 ? amount : undefined,
        );
      } else if (action.kind === 'decline') {
        await adminDeclineReturn(action.row.subOrderId, declineReason.trim());
      } else {
        await adminCompleteReturn(action.row.subOrderId);
      }
    },
    onSuccess: () => {
      setPendingAction(null);
      setRefundInput('');
      setDeclineReason('');
      void invalidate();
    },
  });

  const allRows = returnsQuery.data ?? [];
  const waitingCount = allRows.filter((r) => r.status === WAITING).length;
  const rows = useMemo(
    () => (statusFilter === 'all' ? allRows : allRows.filter((r) => r.status === statusFilter)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [returnsQuery.data, statusFilter],
  );

  const statusOptions = useMemo(() => {
    const present = Array.from(new Set(allRows.map((r) => r.status)));
    return present;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnsQuery.data]);

  const openAction = (action: PendingAction) => {
    setPendingAction(action);
    setRefundInput('');
    setDeclineReason('');
    actionMutation.reset();
  };

  const columns: DataTableColumn<AdminReturnCase>[] = [
    {
      key: 'package',
      header: 'Package',
      className: 'p-4',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (r) => (
        <span>
          <span className="block max-w-56 truncate font-black text-slate-900">
            {r.items[0]?.title ?? 'Package'}
            {r.items.length > 1 && (
              <span className="font-semibold text-slate-400"> +{r.items.length - 1} more</span>
            )}
          </span>
          <Link
            to={`/admin/orders/${r.orderId}`}
            className="block text-[11px] font-semibold text-sun-orange hover:underline"
          >
            Order #{r.orderId.slice(0, 8).toUpperCase()}
          </Link>
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      className: 'p-4 text-slate-600',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (r) => r.customerEmail || '—',
    },
    {
      key: 'seller',
      header: 'Seller',
      className: 'p-4 text-slate-600',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (r) => r.sellerName,
    },
    {
      key: 'reason',
      header: 'Reason',
      className: 'p-4 max-w-52 text-slate-600',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (r) => (
        <span className="block">
          <span className="block truncate">{r.returnReason ?? '—'}</span>
          {r.rmaCode && (
            <span className="block font-mono text-[11px] text-slate-400">RMA {r.rmaCode}</span>
          )}
          {r.status === 'return_rejected' && r.returnRejectReason && (
            <span className="block truncate text-[11px] text-rose-500">
              Declined: {r.returnRejectReason}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'refund',
      header: 'Refund',
      align: 'right',
      className: 'p-4 font-bold text-slate-900',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (r) => formatPrice(r.refundAmount ?? r.subtotal),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'p-4',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'p-4',
      headerClassName: 'p-4',
      cell: (r) => {
        if (r.status === 'return_requested') {
          return (
            <span className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => openAction({ kind: 'approve', row: r })}
                className="cursor-pointer rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => openAction({ kind: 'decline', row: r })}
                className="cursor-pointer rounded-full border border-rose-300 px-3 py-1.5 text-[11px] font-bold text-rose-600 transition-all hover:bg-rose-50"
              >
                Decline
              </button>
            </span>
          );
        }
        if (r.status === 'return_approved') {
          return (
            <button
              type="button"
              onClick={() => openAction({ kind: 'complete', row: r })}
              className="cursor-pointer rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-slate-700"
            >
              Complete return
            </button>
          );
        }
        return <span className="text-[11px] text-slate-400">—</span>;
      },
    },
  ];

  const declineInvalid = pendingAction?.kind === 'decline' && declineReason.trim() === '';

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Returns & Refunds" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="font-outfit text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Returns &amp; Refunds
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Return cases across every seller, from the live{' '}
            <code className="text-[11px]">sub_orders</code> ledger.{' '}
            {waitingCount > 0
              ? `${waitingCount} case${waitingCount === 1 ? ' is' : 's are'} waiting for a decision.`
              : 'Nothing is waiting for a decision.'}
          </p>
        </div>

        {/* Confirm bar */}
        {pendingAction && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-900">
              {pendingAction.kind === 'approve' &&
                `Approve the return from ${pendingAction.row.sellerName}? An RMA code is minted for the buyer; leave the refund blank to refund the full goods total (${formatPrice(pendingAction.row.subtotal)}).`}
              {pendingAction.kind === 'decline' &&
                `Decline the return from ${pendingAction.row.sellerName}? The buyer sees your reason.`}
              {pendingAction.kind === 'complete' &&
                `Close this return? The items go back on the shelf (restocked by the platform) and the case is finished.`}
            </p>
            {actionMutation.isError && (
              <p role="alert" className="mt-2 text-xs font-bold text-rose-700">
                {reason(actionMutation.error, 'The return could not be updated.')}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {pendingAction.kind === 'approve' && (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundInput}
                  onChange={(e) => setRefundInput(e.target.value)}
                  placeholder={`Refund amount (blank = ${formatPrice(pendingAction.row.subtotal)})`}
                  aria-label="Refund amount"
                  className="w-72 max-w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-sun-orange focus:outline-none"
                />
              )}
              {pendingAction.kind === 'decline' && (
                <input
                  type="text"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Reason for declining (required)"
                  aria-label="Decline reason"
                  className="w-80 max-w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-sun-orange focus:outline-none"
                />
              )}
              <button
                type="button"
                disabled={actionMutation.isPending || declineInvalid}
                onClick={() => actionMutation.mutate(pendingAction)}
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  pendingAction.kind === 'decline'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : pendingAction.kind === 'complete'
                      ? 'bg-slate-900 hover:bg-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionMutation.isPending
                  ? 'Saving…'
                  : pendingAction.kind === 'approve'
                    ? 'Confirm approval'
                    : pendingAction.kind === 'decline'
                      ? 'Confirm decline'
                      : 'Confirm completion'}
              </button>
              <button
                type="button"
                disabled={actionMutation.isPending}
                onClick={() => setPendingAction(null)}
                className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:border-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            aria-pressed={statusFilter === 'all'}
            className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-sun-orange text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all ${
                statusFilter === status
                  ? 'bg-sun-orange text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {returnsQuery.isError && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800"
          >
            <ShieldCheck className="h-4 w-4" />
            {reason(returnsQuery.error, 'Returns could not be loaded.')}
          </p>
        )}

        {returnsQuery.isPending && !returnsQuery.isError ? (
          <p className="text-xs text-slate-500">Reading return cases…</p>
        ) : rows.length === 0 && !returnsQuery.isError ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
            <RotateCcw className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />
            {statusFilter === 'all'
              ? 'No return cases exist yet.'
              : 'No cases with this status.'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <DataTable columns={columns} rows={rows} getRowKey={(r) => r.subOrderId} />
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};

export default AdminReturnsPage;
