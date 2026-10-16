import React, { useState } from 'react';
import { friendlyError } from '../lib/friendly-error';
import { Truck, Bike, Phone, AlertTriangle, MailPlus, Check, ClipboardList, X } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { InviteRiderDialog } from '../features/admin/components/InviteRiderDialog';
import { formatPrice } from '../store/currency-store';
import {
  useLogisticsBoard,
  usePendingRiderApplications,
} from '../features/admin/hooks/useAdminQueries';
import { useAdminActions } from '../features/admin/hooks/useAdminActions';
import { CodSettlementSection } from '../features/admin/components/CodSettlementSection';
import type { LogisticsQueueRow, RiderApplicationRow } from '../features/admin/api/logistics';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Toast } from '../components/common/Toast';
import { useToast } from '../hooks/useToast';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { StatusBadge } from '../components/ui/status-badge';

const STATUS_TONE: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-700',
  in_transit: 'bg-orange-100 text-sun-orange',
  shipped: 'bg-orange-100 text-sun-orange',
  available: 'bg-emerald-100 text-emerald-700',
  busy: 'bg-blue-100 text-blue-700',
  offline: 'bg-slate-200 text-slate-600',
  failed: 'bg-rose-100 text-rose-700',
};

const statusClass = (status: string): string =>
  STATUS_TONE[status.toLowerCase()] ?? 'bg-slate-100 text-slate-600';

const prettyStatus = (status: string): string =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

/**
 * Tone overrides for the dispatch queue's status cell. The board renders its
 * statuses in -100 tints with no border, while the shared map's treatments
 * for delivered/shipped were harvested from the orders console — so the
 * dissenting tokens are overridden at this call site (the pattern),
 * with the label kept as this page's Title-Case rendering. `in_transit`
 * needs no override: the shared map now carries this page's own treatment.
 * Any other token falls back to this page's slate fallback, not the map's.
 */
const QUEUE_TONE_OVERRIDES: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-700 border-transparent',
  shipped: 'bg-orange-100 text-sun-orange border-transparent',
  available: 'bg-emerald-100 text-emerald-700 border-transparent',
  busy: 'bg-blue-100 text-blue-700 border-transparent',
  offline: 'bg-slate-200 text-slate-600 border-transparent',
};

const queueStatusCell = (row: LogisticsQueueRow): React.ReactNode => {
  const token = row.status.toLowerCase();
  if (token === 'failed') {
    // The failed pill carries a warning glyph inside the pill itself;
    // StatusBadge has no adornment slot, so this one status keeps its
    // legacy pill verbatim rather than dropping the glyph.
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusClass(row.status)}`}
      >
        <AlertTriangle className="h-3 w-3" />
        {prettyStatus(row.status)}
      </span>
    );
  }
  return (
    <StatusBadge
      status={token}
      label={prettyStatus(row.status)}
      className={
        token === 'in_transit'
          ? undefined
          : QUEUE_TONE_OVERRIDES[token] ?? 'bg-slate-100 text-slate-600 border-transparent'
      }
    />
  );
};

const destinationOf = (row: LogisticsQueueRow): string => {
  const { address } = row;
  if (!address) return 'No shipping address';
  return [address.city, address.state].filter(Boolean).join(', ') || address.country || 'Address on file';
};

export const AdminLogisticsPage: React.FC = () => {
  const { data: board, isPending, isError, error, refetch } = useLogisticsBoard();
  const [inviteOpen, setInviteOpen] = useState(false);

  if (isPending) {
    return (
      <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Fleet Logistics" sidebar={<AdminNav />}>
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <Truck className="h-4 w-4" />
          Reading the dispatch board…
        </div>
      </WorkspaceLayout>
    );
  }

  if (isError || !board) {
    return (
      <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Fleet Logistics" sidebar={<AdminNav />}>
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-semibold mb-1">Failed to load the dispatch board</div>
          <div className="mb-3 text-xs">
            {error ? friendlyError(error, { staff: true }).message : 'The fleet and delivery rows could not be read.'}
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

  const riderName = new Map(board.fleet.map((rider) => [rider.id, rider.name] as const));
  const { counts } = board;
  // A 'pending' row is an application, not a courier: it is
  // reviewed in the applications section below, not counted as fleet.
  const roster = board.fleet.filter((rider) => rider.status !== 'pending');

  const queueColumns: DataTableColumn<LogisticsQueueRow>[] = [
    {
      key: 'package',
      header: 'Package',
      className: 'p-3',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (row) => (
        <>
          <span className="font-mono font-bold text-slate-900">{row.id}</span>
          <span className="text-slate-400 text-[11px] block">{prettyStatus(row.type)}</span>
        </>
      ),
    },
    {
      key: 'origin',
      header: 'Vendor Origin',
      className: 'p-3',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (row) => (
        <>
          <span className="font-bold text-slate-800 block">{row.storeName}</span>
          {(row.carrierName || row.trackingNumber) && (
            <span className="text-slate-400 text-[11px] truncate block max-w-xs">
              {row.carrierName ?? ''}
              {row.carrierName && row.trackingNumber ? ' · ' : ''}
              {row.trackingNumber ?? ''}
            </span>
          )}
        </>
      ),
    },
    {
      key: 'destination',
      header: 'Destination',
      className: 'p-3 text-slate-600',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (row) => destinationOf(row),
    },
    {
      key: 'courier',
      header: 'Assigned Courier',
      className: 'p-3 font-medium text-slate-800',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (row) => (row.riderId ? riderName.get(row.riderId) ?? 'Unknown rider' : 'Unassigned'),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'p-3',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: queueStatusCell,
    },
    {
      key: 'delivered',
      header: 'Delivered',
      className: 'p-3 text-slate-600',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (row) => formatDate(row.delivery?.deliveredAt ?? null),
    },
    {
      key: 'gross',
      header: 'Gross',
      align: 'right',
      className: 'p-3 font-bold text-slate-900',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (row) => formatPrice(row.gross),
    },
  ];

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Fleet Logistics" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
              Logistics &amp; Fleet Dispatch Console
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Registered couriers and the delivery queue, read from <code className="font-mono">rider_delivery_board</code> on every refresh.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sun-orange px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:opacity-90 cursor-pointer"
            >
              <MailPlus className="h-3.5 w-3.5" />
              <span>Invite Rider</span>
            </button>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              <Bike className="h-3.5 w-3.5 text-sun-orange" />
              <span>Refresh Board</span>
            </button>
          </div>
        </div>

        <InviteRiderDialog open={inviteOpen} onOpenChange={setInviteOpen} />

        {/* Stats — each tile is a count produced by the board read, not a demo total. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400">Riders Available</span>
            <div className="text-xl font-black text-slate-900 mt-1">{counts.ridersAvailable}</div>
            <span className="text-[11px] text-emerald-600 font-bold">of {roster.length} registered riders</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400">Awaiting Pickup</span>
            <div className="text-xl font-black text-slate-900 mt-1">{counts.awaitingPickup}</div>
            <span className="text-[11px] text-blue-600 font-bold">Packages not yet dispatched</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400">In-Transit Parcels</span>
            <div className="text-xl font-black text-slate-900 mt-1">{counts.inTransit}</div>
            <span className="text-[11px] text-slate-500 font-bold">{counts.delivered} delivered</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400">Failed / Exceptions</span>
            <div className="text-xl font-black text-rose-600 mt-1">{counts.failed}</div>
            <span className="text-[11px] text-rose-600 font-bold">Deliveries that did not complete</span>
          </div>
        </div>

        {/* Rider applications: self-serve applicants the desk decides on. */}
        <RiderApplicationsSection />

        {/* Fleet roster — only the columns the board returns. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bike className="h-4 w-4 text-sun-orange" />
            Registered Delivery Couriers
          </h3>

          {roster.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No riders are registered on the platform yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {roster.map((rider) => (
                <div key={rider.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 truncate">{rider.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(rider.status)}`}>
                      {prettyStatus(rider.status)}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] space-y-0.5">
                    <p>Vehicle: <strong className="text-slate-800">{rider.vehicle}</strong></p>
                    <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" />{rider.phone || '—'}</p>
                    <p>Active: <strong className="text-slate-800">{rider.active}</strong> · Completed: <strong className="text-slate-800">{rider.completed}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivery queue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-4 w-4 text-sun-orange" />
            Active Dispatch Queue
          </h3>

          {board.queue.length === 0 ? (
            <p className="text-slate-400 py-8 text-center">No packages are moving right now.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <DataTable columns={queueColumns} rows={board.queue} getRowKey={(row) => row.id} />
            </div>
          )}
        </div>

        {/* COD cash settlements: rider-collected cash and its desk handover. */}
        <CodSettlementSection />
      </div>
    </WorkspaceLayout>
  );
};

/**
 * Rider applications: accounts that applied to ride from their own
 * workspace, waiting on this desk. Approving promotes the rider to
 * 'available' on the roster above; rejecting removes the application (the
 * applicant can apply again). Before the onboarding migration reaches a
 * database the read errors — the section then simply is not part of the
 * page yet, rather than an error the desk cannot act on.
 */
const RiderApplicationsSection: React.FC = () => {
  const applications = usePendingRiderApplications();
  const actions = useAdminActions();
  const { toast, showToast, hideToast } = useToast(3600);
  const [rejecting, setRejecting] = useState<RiderApplicationRow | null>(null);

  if (applications.isError || !applications.data) return null;
  const rows = applications.data;
  const busy = actions.setRiderApproval.isPending;

  const decide = (row: RiderApplicationRow, approve: boolean) => {
    actions.setRiderApproval.mutate(
      { userId: row.userId, approve },
      {
        onSuccess: () =>
          showToast(
            approve
              ? `${row.name || row.email || 'Rider'} approved — their board is open.`
              : 'Application rejected and removed.',
          ),
        onError: (err) => showToast(friendlyError(err, { staff: true }).message, 'error'),
      },
    );
  };

  return (
    <section
      data-testid="rider-applications"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4"
    >
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-sun-orange" />
        Rider Applications
        {rows.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            {rows.length} waiting
          </span>
        )}
      </h3>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">
          No rider applications are waiting for review. Riders apply from their own workspace;
          new applications appear here.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.profileId}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-xs space-y-0.5 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {row.name || 'Unnamed applicant'}
                </p>
                <p className="text-slate-500 truncate">{row.email || 'No email on the account'}</p>
                <p className="text-slate-500">
                  Vehicle: <strong className="text-slate-800">{row.vehicleType || '—'}</strong>
                  {' · '}Plate: <strong className="text-slate-800">{row.vehiclePlate || '—'}</strong>
                  {' · '}City: <strong className="text-slate-800">{row.city || '—'}</strong>
                </p>
                <p className="flex items-center gap-1 text-slate-500">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {row.phone || '—'}
                  {row.appliedAt && (
                    <span className="text-slate-400">· applied {formatDate(row.appliedAt)}</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  data-testid="btn-approve-rider"
                  disabled={busy}
                  onClick={() => decide(row, true)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  data-testid="btn-reject-rider"
                  disabled={busy}
                  onClick={() => setRejecting(row)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs transition-all hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) setRejecting(null);
        }}
        title="Reject this rider application?"
        description={
          rejecting
            ? `${rejecting.name || rejecting.email || 'This applicant'}'s application will be removed. They can apply again, and the decision is written to the audit log.`
            : undefined
        }
        confirmLabel="Reject application"
        isPending={busy}
        onConfirm={() => {
          if (rejecting) decide(rejecting, false);
          setRejecting(null);
        }}
      />
      <Toast toast={toast} onDismiss={hideToast} />
    </section>
  );
};
