import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Wallet } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useAdminScope } from '../features/admin/hooks/admin-keys';
import {
  fetchAdminPayouts,
  setPayoutStatus,
  type AdminPayout,
  type AdminPayoutStatus,
} from '../features/admin/api/payouts';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { StatusBadge } from '../components/ui/status-badge';
import { formatPrice } from '../store/currency-store';

/**
 * Admin Payouts & Finance (/admin/payouts). Vendors request payouts; this is
 * where the platform releases them. Marking a payout completed/failed writes
 * the row the `payouts_notify` trigger watches, so the vendor is told by the
 * database, and the reference recorded here is the one their history quotes.
 */
const reason = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim() !== '' ? error.message : fallback;

const FILTERS: Array<{ id: AdminPayoutStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'processing', label: 'Processing' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
];

interface PendingAction {
  payout: AdminPayout;
  status: 'completed' | 'failed';
}

export const AdminPayoutsPage: React.FC = () => {
  const userId = useAdminScope();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AdminPayoutStatus | 'all'>('all');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reference, setReference] = useState('');

  const payoutsQuery = useQuery({
    queryKey: ['admin', userId ?? 'anon', 'payouts'] as const,
    queryFn: ({ signal }) => fetchAdminPayouts(signal),
    enabled: Boolean(userId),
  });

  const actionMutation = useMutation({
    mutationFn: (action: PendingAction & { reference: string }) =>
      setPayoutStatus(action.payout.id, action.status, action.reference || undefined),
    onSuccess: () => {
      setPendingAction(null);
      setReference('');
      void queryClient.invalidateQueries({ queryKey: ['admin', userId ?? 'anon', 'payouts'] });
    },
  });

  const rows = useMemo(() => {
    const all = payoutsQuery.data ?? [];
    return filter === 'all' ? all : all.filter((p) => p.status === filter);
  }, [payoutsQuery.data, filter]);

  const summary = useMemo(() => {
    const all = payoutsQuery.data ?? [];
    return {
      processingCount: all.filter((p) => p.status === 'processing').length,
      processingTotal: all
        .filter((p) => p.status === 'processing')
        .reduce((sum, p) => sum + p.amount, 0),
      completedTotal: all
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      failedCount: all.filter((p) => p.status === 'failed').length,
    };
  }, [payoutsQuery.data]);

  const columns: DataTableColumn<AdminPayout>[] = [
    {
      key: 'vendor',
      header: 'Vendor',
      className: 'p-4',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (p) => (
        <span>
          <span className="block font-black text-slate-900">{p.storeName}</span>
          {p.storeSlug && <span className="block text-[11px] text-slate-400">{p.storeSlug}</span>}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      className: 'p-4 font-bold text-slate-900',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (p) => formatPrice(p.amount),
    },
    {
      key: 'method',
      header: 'Method',
      className: 'p-4 text-slate-600',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (p) => p.method,
    },
    {
      key: 'reference',
      header: 'Reference',
      className: 'p-4 font-mono text-xs text-slate-500',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (p) => p.reference ?? '—',
    },
    {
      key: 'requested',
      header: 'Requested',
      className: 'p-4 text-slate-600',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (p) =>
        new Date(p.createdAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'p-4',
      headerClassName: 'p-4 text-[11px] tracking-normal',
      cell: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'p-4',
      headerClassName: 'p-4',
      cell: (p) =>
        p.status === 'processing' ? (
          <span className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPendingAction({ payout: p, status: 'completed' });
                setReference('');
                actionMutation.reset();
              }}
              className="cursor-pointer rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-emerald-700"
            >
              Mark paid
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingAction({ payout: p, status: 'failed' });
                setReference('');
                actionMutation.reset();
              }}
              className="cursor-pointer rounded-full border border-rose-300 px-3 py-1.5 text-[11px] font-bold text-rose-600 transition-all hover:bg-rose-50"
            >
              Mark failed
            </button>
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">—</span>
        ),
    },
  ];

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Payouts" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="font-outfit text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Payouts &amp; Finance
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Vendor payout requests from the live <code className="text-[11px]">payouts</code>{' '}
            ledger. Releasing a payout records its outcome here; the vendor is notified by
            the platform automatically.
          </p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <span className="text-[10px] font-black text-slate-400">
              Awaiting release
            </span>
            <p className="mt-1 font-outfit text-2xl font-black text-slate-900">
              {formatPrice(summary.processingTotal)}
            </p>
            <p className="text-[11px] text-slate-500">
              {summary.processingCount} request{summary.processingCount === 1 ? '' : 's'} processing
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <span className="text-[10px] font-black text-slate-400">
              Paid out (shown)
            </span>
            <p className="mt-1 font-outfit text-2xl font-black text-slate-900">
              {formatPrice(summary.completedTotal)}
            </p>
            <p className="text-[11px] text-slate-500">Completed payouts in this ledger view</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <span className="text-[10px] font-black text-slate-400">
              Failed
            </span>
            <p className="mt-1 font-outfit text-2xl font-black text-slate-900">
              {summary.failedCount}
            </p>
            <p className="text-[11px] text-slate-500">Vendors are asked to fix bank details</p>
          </div>
        </div>

        {/* Confirm bar */}
        {pendingAction && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-900">
              Mark the {formatPrice(pendingAction.payout.amount)} payout to{' '}
              {pendingAction.payout.storeName} as{' '}
              {pendingAction.status === 'completed' ? 'paid' : 'failed'}?
              {pendingAction.status === 'completed' &&
                ' The vendor will be notified it has been sent.'}
              {pendingAction.status === 'failed' &&
                ' The vendor will be notified and asked to update their bank details.'}
            </p>
            {actionMutation.isError && (
              <p role="alert" className="mt-2 text-xs font-bold text-rose-700">
                {reason(actionMutation.error, 'The payout could not be updated.')}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {pendingAction.status === 'completed' && (
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Bank / transfer reference (recommended)"
                  aria-label="Payment reference"
                  className="w-72 max-w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-sun-orange focus:outline-none"
                />
              )}
              <button
                type="button"
                disabled={actionMutation.isPending}
                onClick={() =>
                  actionMutation.mutate({ ...pendingAction, reference: reference.trim() })
                }
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-60 ${
                  pendingAction.status === 'completed'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionMutation.isPending
                  ? 'Saving…'
                  : pendingAction.status === 'completed'
                    ? 'Confirm paid'
                    : 'Confirm failed'}
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
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all ${
                filter === f.id
                  ? 'bg-sun-orange text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {payoutsQuery.isError && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800"
          >
            <ShieldCheck className="h-4 w-4" />
            {reason(payoutsQuery.error, 'Payouts could not be loaded.')}
          </p>
        )}

        {payoutsQuery.isPending && !payoutsQuery.isError ? (
          <p className="text-xs text-slate-500">Reading the payouts ledger…</p>
        ) : rows.length === 0 && !payoutsQuery.isError ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
            <Wallet className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />
            {filter === 'all'
              ? 'No vendor has requested a payout yet.'
              : `No ${filter} payouts.`}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <DataTable columns={columns} rows={rows} getRowKey={(p) => p.id} />
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};

export default AdminPayoutsPage;
