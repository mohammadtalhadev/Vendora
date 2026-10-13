import React from 'react';
import { Truck, Bike, Phone, AlertTriangle } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { formatPrice } from '../store/currency-store';
import { useLogisticsBoard } from '../features/admin/hooks/useAdminQueries';
import type { LogisticsQueueRow } from '../features/admin/api/logistics';

const STATUS_TONE: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-700',
  in_transit: 'bg-orange-100 text-[#FF7A1A]',
  shipped: 'bg-orange-100 text-[#FF7A1A]',
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

const destinationOf = (row: LogisticsQueueRow): string => {
  const { address } = row;
  if (!address) return 'No shipping address';
  return [address.city, address.state].filter(Boolean).join(', ') || address.country || 'Address on file';
};

export const AdminLogisticsPage: React.FC = () => {
  const { data: board, isPending, isError, error, refetch } = useLogisticsBoard();

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
            {error instanceof Error ? error.message : 'The fleet and delivery rows could not be read.'}
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
          <button
            type="button"
            onClick={() => void refetch()}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <Bike className="h-3.5 w-3.5 text-[#FF7A1A]" />
            <span>Refresh Board</span>
          </button>
        </div>

        {/* Stats — each tile is a count produced by the board read, not a demo total. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Riders Available</span>
            <div className="text-xl font-black text-slate-900 mt-1">{counts.ridersAvailable}</div>
            <span className="text-[11px] text-emerald-600 font-bold">of {board.fleet.length} registered riders</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Awaiting Pickup</span>
            <div className="text-xl font-black text-slate-900 mt-1">{counts.awaitingPickup}</div>
            <span className="text-[11px] text-blue-600 font-bold">Packages not yet dispatched</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In-Transit Parcels</span>
            <div className="text-xl font-black text-slate-900 mt-1">{counts.inTransit}</div>
            <span className="text-[11px] text-slate-500 font-bold">{counts.delivered} delivered</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Failed / Exceptions</span>
            <div className="text-xl font-black text-rose-600 mt-1">{counts.failed}</div>
            <span className="text-[11px] text-rose-600 font-bold">Deliveries that did not complete</span>
          </div>
        </div>

        {/* Fleet roster — only the columns the board returns. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bike className="h-4 w-4 text-[#FF7A1A]" />
            Registered Delivery Couriers
          </h3>

          {board.fleet.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No riders are registered on the platform yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {board.fleet.map((rider) => (
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
            <Truck className="h-4 w-4 text-[#FF7A1A]" />
            Active Dispatch Queue
          </h3>

          {board.queue.length === 0 ? (
            <p className="text-slate-400 py-8 text-center">No packages are moving right now.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Package</th>
                    <th className="p-3">Vendor Origin</th>
                    <th className="p-3">Destination</th>
                    <th className="p-3">Assigned Courier</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Delivered</th>
                    <th className="p-3 text-right">Gross</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {board.queue.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <span className="font-mono font-bold text-slate-900">{row.id}</span>
                        <span className="text-slate-400 text-[11px] block">{prettyStatus(row.type)}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">{row.storeName}</span>
                        {(row.carrierName || row.trackingNumber) && (
                          <span className="text-slate-400 text-[11px] truncate block max-w-xs">
                            {row.carrierName ?? ''}
                            {row.carrierName && row.trackingNumber ? ' · ' : ''}
                            {row.trackingNumber ?? ''}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{destinationOf(row)}</td>
                      <td className="p-3 font-medium text-slate-800">
                        {row.riderId ? riderName.get(row.riderId) ?? 'Unknown rider' : 'Unassigned'}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusClass(row.status)}`}>
                          {row.status.toLowerCase() === 'failed' && <AlertTriangle className="h-3 w-3" />}
                          {prettyStatus(row.status)}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{formatDate(row.delivery?.deliveredAt ?? null)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatPrice(row.gross)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
};
