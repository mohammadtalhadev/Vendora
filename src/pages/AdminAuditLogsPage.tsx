import React, { useState } from 'react';
import { friendlyError } from '../lib/friendly-error';
import { Search, Download, FileCode, ShieldAlert, X } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { exportToCsv } from '../lib/export-csv';
import { useAuditQueue } from '../features/admin/hooks/useAdminQueries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { AuditRow } from '../features/admin/api/audit';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';

/**
 * The trail is read-only and immutable: `admin_audit_queue` pages the rows, facets the
 * actions that actually exist, and matches the search term against actor, entity and
 * action in SQL. There is no write to make here — a decision is recorded by the RPC that
 * took it, not by this console.
 */

const actionTone = (action: string): string => {
  if (action.includes('suspend') || action.includes('ban') || action.includes('strike')) {
    return 'bg-rose-100 text-rose-800';
  }
  if (action.includes('refund')) return 'bg-amber-100 text-amber-800';
  if (action.includes('commission')) return 'bg-orange-100 text-sun-orange';
  if (action.includes('product')) return 'bg-purple-100 text-purple-800';
  if (action.includes('broadcast') || action.includes('notification')) {
    return 'bg-blue-100 text-blue-800';
  }
  return 'bg-slate-100 text-slate-800';
};

const formatStamp = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
};

export const AdminAuditLogsPage: React.FC = () => {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeDiffLog, setActiveDiffLog] = useState<AuditRow | null>(null);

  // Server-side queue read: debounce the search term so typing does not fire a
  // request per keystroke.
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: queue, refetch, isPending, isError, error } = useAuditQueue({
    action: actionFilter,
    search: debouncedSearch,
    page,
    pageSize,
  });

  if (isPending) {
    return (
      <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Audit Logs" sidebar={<AdminNav />}>
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <ShieldAlert className="h-4 w-4" />
          Reading the audit trail…
        </div>
      </WorkspaceLayout>
    );
  }

  if (isError) {
    return (
      <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Audit Logs" sidebar={<AdminNav />}>
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-semibold mb-1">Failed to load the audit trail</div>
          <div className="mb-3 text-xs">
            {error ? friendlyError(error, { staff: true }).message : 'The audit trail could not be read.'}
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

  const auditColumns: DataTableColumn<AuditRow>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      className: 'p-4 font-mono text-slate-500 text-xs whitespace-nowrap',
      headerClassName: 'p-4 text-xs',
      cell: (log) => formatStamp(log.createdAt),
    },
    {
      key: 'actor',
      header: 'Staff Actor',
      className: 'p-4',
      headerClassName: 'p-4 text-xs',
      cell: (log) => (
        <>
          <span className="font-bold text-slate-900 block">{log.actorName || '—'}</span>
          <span className="text-xs text-slate-500">{log.actorRole}</span>
        </>
      ),
    },
    {
      // The action chip is NOT a status: its tone is substring-matched over
      // free-form action strings (suspend/ban/refund/…), which the shared
      // exact-token StatusBadge map cannot express, so it stays local.
      key: 'action',
      header: 'Action Type',
      className: 'p-4',
      headerClassName: 'p-4 text-xs',
      cell: (log) => (
        <span className={`rounded-full font-bold px-2 py-0.5 text-xs ${actionTone(log.action)}`}>
          {log.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      className: 'p-4 font-medium text-slate-800',
      headerClassName: 'p-4 text-xs',
      cell: (log) =>
        log.entityType ? (
          <>
            <span className="block">{log.entityType}</span>
            <span className="text-xs font-normal text-slate-500 font-mono break-all">
              {log.entityId ?? ''}
            </span>
          </>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'ip',
      header: 'IP / Session',
      className: 'p-4 font-mono text-xs text-slate-500',
      headerClassName: 'p-4 text-xs',
      cell: (log) => log.ipAddress ?? '—',
    },
    {
      key: 'diff',
      header: 'State Diff',
      align: 'right',
      className: 'p-4',
      headerClassName: 'p-4 text-xs',
      cell: (log) => (
        <button
          type="button"
          onClick={() => setActiveDiffLog(log)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <FileCode className="h-3 w-3 text-slate-500" />
          View Diff
        </button>
      ),
    },
  ];

  const handleExportPage = () => {
    exportToCsv({
      filename: `vendora_audit_logs_${Date.now()}.csv`,
      columns: [
        { header: 'ID', key: 'id' },
        { header: 'Timestamp', key: 'createdAt' },
        { header: 'Actor', key: 'actorName' },
        { header: 'Actor Role', key: 'actorRole' },
        { header: 'Action', key: 'action' },
        { header: 'Entity Type', key: 'entityType' },
        { header: 'Entity ID', key: 'entityId' },
        { header: 'IP Address', key: 'ipAddress' },
      ],
      data: rows.map((l) => ({
        id: l.id,
        createdAt: l.createdAt,
        actorName: l.actorName,
        actorRole: l.actorRole,
        action: l.action,
        entityType: l.entityType ?? '',
        entityId: l.entityId ?? '',
        ipAddress: l.ipAddress ?? '',
      })),
    });
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Audit Logs"
      subtitle="Immutable audit trail recording high-risk administrative operations."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
              Audit Logs &amp; Security Activity Stream
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Immutable audit trail recording high-risk administrative operations, commission edits, forced refunds, and merchant suspensions.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPage}
            disabled={rows.length === 0}
          >
            <Download className="h-4 w-4 text-slate-500" />
            Export Audit Log (CSV)
          </Button>
        </div>

        {/* Filter & Search Bar — the action facets come from the trail the queue read */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div
            role="tablist"
            aria-label="Filter audit actions"
            className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={actionFilter === 'all'}
              onClick={() => {
                setActionFilter('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
                actionFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Actions <span className="text-xs opacity-70">({queue.total})</span>
            </button>
            {queue.actions.map((facet) => (
              <button
                key={facet.action}
                type="button"
                role="tab"
                aria-selected={actionFilter === facet.action}
                onClick={() => {
                  setActionFilter(facet.action);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  actionFilter === facet.action ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {facet.action} <span className="text-xs opacity-70">({facet.count})</span>
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <Input
              type="text"
              aria-label="Search the audit trail"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by actor, action, or entity..."
              leftIcon={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
              className="h-9 rounded-lg bg-slate-50/80 text-xs text-slate-800 focus:bg-white"
            />
          </div>
        </div>

        {/* Table of Audit Logs — pagination is the shared TablePagination
            (via DataTable), driven by the queue's server-side page + total. */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <DataTable
            columns={auditColumns}
            rows={rows}
            getRowKey={(log) => log.id}
            emptyState={
              <div className="p-8 text-center text-xs text-slate-500">
                No audit entries match these filters.
              </div>
            }
            pagination={{
              page,
              pageSize,
              totalItems: queue.total,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
              pageSizeOptions: [25, 50, 100],
              noun: 'entries',
            }}
          />
        </div>

        {/* Modal: the full stored detail for one row — who, what, when, from
            where, and the before/after payload the writing RPC recorded. */}
        {activeDiffLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`State diff for ${activeDiffLog.action}`}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Audit State Transition Diff</h3>
                  <span className="text-slate-500 font-mono text-xs">Action: {activeDiffLog.action}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDiffLog(null)}
                  aria-label="Close diff"
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pt-4 md:grid-cols-3">
                <div>
                  <dt className="text-xs font-bold text-slate-500">Staff actor</dt>
                  <dd className="mt-0.5 font-bold text-slate-900">
                    {activeDiffLog.actorName || '—'}
                    <span className="block text-xs font-medium text-slate-500">
                      {activeDiffLog.actorRole}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-500">Entity</dt>
                  <dd className="mt-0.5 font-bold text-slate-900">
                    {activeDiffLog.entityType ?? '—'}
                    <span className="block break-all font-mono text-xs font-medium text-slate-500">
                      {activeDiffLog.entityId ?? ''}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-500">Recorded at</dt>
                  <dd className="mt-0.5 font-bold text-slate-900">{formatStamp(activeDiffLog.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-500">IP address</dt>
                  <dd className="mt-0.5 font-mono font-bold text-slate-900">
                    {activeDiffLog.ipAddress ?? 'Not recorded'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-500">Entry ID</dt>
                  <dd className="mt-0.5 break-all font-mono text-xs font-medium text-slate-500">
                    {activeDiffLog.id}
                  </dd>
                </div>
              </dl>

              {activeDiffLog.before === null && activeDiffLog.after === null ? (
                <p className="py-4 text-slate-500">
                  No state payload was recorded for this action.
                </p>
              ) : (
                <div className="py-4 grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="font-bold text-rose-700 uppercase tracking-wider text-xs block">
                      Before State (Pre-Execution)
                    </span>
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto font-mono text-xs">
                      {activeDiffLog.before === null
                        ? 'Nothing recorded'
                        : JSON.stringify(activeDiffLog.before, null, 2)}
                    </pre>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-bold text-emerald-700 uppercase tracking-wider text-xs block">
                      After State (Committed)
                    </span>
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto font-mono text-xs">
                      {activeDiffLog.after === null
                        ? 'Nothing recorded'
                        : JSON.stringify(activeDiffLog.after, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button
                  type="button"
                  variant="ink"
                  size="sm"
                  onClick={() => setActiveDiffLog(null)}
                >
                  Close Diff
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
