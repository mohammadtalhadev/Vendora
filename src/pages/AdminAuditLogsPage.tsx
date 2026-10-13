import React, { useState } from 'react';
import { Search, Download, FileCode, ShieldAlert } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { exportToCsv } from '../lib/export-csv';
import { useAuditQueue } from '../features/admin/hooks/useAdminQueries';
import type { AuditRow } from '../features/admin/api/audit';

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
  if (action.includes('commission')) return 'bg-orange-100 text-[#FF7A1A]';
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

  const { data: queue, refetch, isPending, isError, error } = useAuditQueue({
    action: actionFilter,
    search,
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
            {error instanceof Error ? error.message : 'The audit trail could not be read.'}
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
  const totalPages = Math.ceil(queue.total / pageSize) || 1;

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

          <button
            type="button"
            onClick={handleExportPage}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Export Audit Log (CSV)
          </button>
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
              All Actions <span className="text-[10px] opacity-70">({queue.total})</span>
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
                {facet.action} <span className="text-[10px] opacity-70">({facet.count})</span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              aria-label="Search the audit trail"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by actor, action, or entity..."
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#FF7A1A] focus:ring-1 focus:ring-[#FF7A1A]/20"
            />
          </div>
        </div>

        {/* Table of Audit Logs */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Staff Actor</th>
                <th className="p-4">Action Type</th>
                <th className="p-4">Entity</th>
                <th className="p-4">IP / Session</th>
                <th className="p-4 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                    No audit entries match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {formatStamp(log.createdAt)}
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{log.actorName || '—'}</span>
                      <span className="text-[10px] text-slate-400">{log.actorRole}</span>
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full font-bold px-2 py-0.5 text-[10px] ${actionTone(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-800">
                      {log.entityType ? (
                        <>
                          <span className="block">{log.entityType}</span>
                          <span className="text-[11px] font-normal text-slate-400 font-mono break-all">
                            {log.entityId ?? ''}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">{log.ipAddress ?? '—'}</td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveDiffLog(log)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <FileCode className="h-3 w-3 text-slate-500" />
                        View Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Footer — driven by the queue's server-side page + total */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <label htmlFor="audit-page-size">Rows per page:</label>
              <select
                id="audit-page-size"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="ml-2">
                Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, queue.total)} of {queue.total.toLocaleString()} entries
              </span>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto" role="navigation" aria-label="Pagination">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    page === p
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Modal: Before / After Diff */}
        {activeDiffLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`State diff for ${activeDiffLog.action}`}
              className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Audit State Transition Diff</h3>
                  <span className="text-slate-500 font-mono text-[11px]">Action: {activeDiffLog.action}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDiffLog(null)}
                  aria-label="Close diff"
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="font-bold text-rose-700 uppercase tracking-wider text-[10px] block">
                    Before State (Pre-Execution)
                  </span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto font-mono text-[11px]">
                    {JSON.stringify(activeDiffLog.before, null, 2)}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] block">
                    After State (Committed)
                  </span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto font-mono text-[11px]">
                    {JSON.stringify(activeDiffLog.after, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveDiffLog(null)}
                  className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800"
                >
                  Close Diff
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
