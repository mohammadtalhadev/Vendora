import React, { useState } from 'react';
import {
  Search,
  Download,
  FileCode,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: 'vendor.suspend' | 'commission.override' | 'dispute.force_refund' | 'product.takedown' | 'payout.freeze';
  targetResource: string;
  ipAddress: string;
  details: string;
  beforeState: Record<string, any>;
  afterState: Record<string, any>;
}

const SEED_LOGS: AuditLog[] = [
  {
    id: 'aud-101',
    timestamp: '2026-10-08T11:42:00Z',
    actor: 'Elena Administrator',
    actorRole: 'Super Admin',
    action: 'commission.override',
    targetResource: 'Vendor: Apex Audio (#VND-104)',
    ipAddress: '192.168.1.104 (San Francisco, CA)',
    details: 'Adjusted merchant commission rate from global 10.0% to preferred high-volume tier 8.5%.',
    beforeState: { commissionRate: 0.10, tier: 'standard' },
    afterState: { commissionRate: 0.085, tier: 'volume_preferred' },
  },
  {
    id: 'aud-102',
    timestamp: '2026-10-08T09:15:22Z',
    actor: 'Elena Administrator',
    actorRole: 'Super Admin',
    action: 'dispute.force_refund',
    targetResource: 'Dispute: #DSP-401 (Order #SUB-98421-A)',
    ipAddress: '192.168.1.104 (San Francisco, CA)',
    details: 'Admin override: Issued full customer refund of $189.99 after seller failed 48h RMA response window.',
    beforeState: { disputeStatus: 'escalated', orderStatus: 'shipped' },
    afterState: { disputeStatus: 'resolved_refund', orderStatus: 'refunded', refundAmount: 189.99 },
  },
  {
    id: 'aud-103',
    timestamp: '2026-10-07T16:30:10Z',
    actor: 'Jordan Support Lead',
    actorRole: 'Compliance Moderator',
    action: 'product.takedown',
    targetResource: 'Product: #PROD-9912 (Unbranded Smart Watch)',
    ipAddress: '172.56.21.90 (Austin, TX)',
    details: 'Listing removed from public storefront due to trademark infringement report from brand holder.',
    beforeState: { moderationStatus: 'approved', visibleOnStore: true },
    afterState: { moderationStatus: 'archived', visibleOnStore: false, takedownReason: 'Trademark violation' },
  },
  {
    id: 'aud-104',
    timestamp: '2026-10-06T14:10:45Z',
    actor: 'Elena Administrator',
    actorRole: 'Super Admin',
    action: 'vendor.suspend',
    targetResource: 'Vendor: FastTech Depot (#VND-088)',
    ipAddress: '192.168.1.104 (San Francisco, CA)',
    details: 'Suspended merchant account after 3rd consecutive counterfeit goods strike.',
    beforeState: { vendorStatus: 'approved', strikes: 2 },
    afterState: { vendorStatus: 'suspended', strikes: 3, suspensionDate: '2026-10-06' },
  },
];

export const AdminAuditLogsPage: React.FC = () => {
  const [logs] = useState<AuditLog[]>(SEED_LOGS);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDiffLog, setActiveDiffLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.actor.toLowerCase().includes(q) ||
        log.targetResource.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCsv = () => {
    const header = 'id,timestamp,actor,action,targetResource,ipAddress,details\n';
    const rows = filteredLogs.map((l) =>
      `"${l.id}","${l.timestamp}","${l.actor}","${l.action}","${l.targetResource}","${l.ipAddress}","${l.details.replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendora_audit_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'vendor.suspend':
        return <span className="rounded-full bg-rose-100 text-rose-800 font-bold px-2 py-0.5 text-[10px]">vendor.suspend</span>;
      case 'commission.override':
        return <span className="rounded-full bg-blue-100 text-[#0071DC] font-bold px-2 py-0.5 text-[10px]">commission.override</span>;
      case 'dispute.force_refund':
        return <span className="rounded-full bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[10px]">dispute.force_refund</span>;
      case 'product.takedown':
        return <span className="rounded-full bg-purple-100 text-purple-800 font-bold px-2 py-0.5 text-[10px]">product.takedown</span>;
      default:
        return <span className="rounded-full bg-slate-100 text-slate-800 font-bold px-2 py-0.5 text-[10px]">{action}</span>;
    }
  };

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Audit Logs & Security Activity Stream
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Immutable audit trail recording high-risk administrative operations, commission edits, forced refunds, and merchant suspensions.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Export Audit Log (CSV)
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setFilterAction('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filterAction === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Actions
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('vendor.suspend')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filterAction === 'vendor.suspend' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Vendor Suspensions
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('commission.override')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filterAction === 'commission.override' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Commission Overrides
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('dispute.force_refund')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filterAction === 'dispute.force_refund' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Dispute Refunds
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by actor or resource..."
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#0071DC]"
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
                <th className="p-4">Target Resource</th>
                <th className="p-4">Operational Details</th>
                <th className="p-4">IP / Session</th>
                <th className="p-4 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-mono text-slate-500 text-[11px]">
                    {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-slate-900 block">{log.actor}</span>
                    <span className="text-[10px] text-slate-400">{log.actorRole}</span>
                  </td>
                  <td className="p-4">{getActionBadge(log.action)}</td>
                  <td className="p-4 font-medium text-slate-800">{log.targetResource}</td>
                  <td className="p-4 text-slate-600 max-w-xs">{log.details}</td>
                  <td className="p-4 font-mono text-[11px] text-slate-400">{log.ipAddress}</td>
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal: Before / After Diff */}
        {activeDiffLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Audit State Transition Diff</h3>
                  <span className="text-slate-500 font-mono text-[11px]">Action: {activeDiffLog.action}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDiffLog(null)}
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
                    {JSON.stringify(activeDiffLog.beforeState, null, 2)}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] block">
                    After State (Committed)
                  </span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto font-mono text-[11px]">
                    {JSON.stringify(activeDiffLog.afterState, null, 2)}
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
