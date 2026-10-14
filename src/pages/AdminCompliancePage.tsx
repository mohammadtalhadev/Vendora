import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  ScrollText,
  AlertTriangle,
  BadgeCheck,
  Scale,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useAdminScope } from '../features/admin/hooks/admin-keys';
import { useAuditQueue } from '../features/admin/hooks/useAdminQueries';
import { fetchComplianceEvidence, type ComplianceStrike } from '../features/admin/api/compliance';
import type { AuditRow } from '../features/admin/api/audit';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { formatPrice } from '../store/currency-store';

/**
 * This schema has no tax-jurisdiction table and no 1099-K filing workflow, so the old
 * "withholding" toggle and "Generate Form" button wrote to nothing and are gone. What a
 * compliance console can honestly show is the governance trail Postgres keeps: merchant
 * verification state (`vendor_profiles`, `vendor_applications`), active strikes
 * (`vendor_strikes`), buyer-protection outcomes (`disputes`, `refunds`) and the audit log of
 * staff decisions. Every number is counted from those rows.
 */

const reason = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim() !== '' ? error.message : fallback;

const AUDIT_PAGE_SIZE = 12;

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <div className="text-2xl font-black text-slate-900">{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[11px] font-bold text-slate-500">{label}</div>
    </div>
  );
}

export const AdminCompliancePage: React.FC = () => {
  const userId = useAdminScope();
  const [activeTab, setActiveTab] = useState<'evidence' | 'trail'>('evidence');
  const [page, setPage] = useState(1);

  const evidence = useQuery({
    queryKey: ['admin', userId ?? 'anon', 'compliance', 'evidence'] as const,
    queryFn: ({ signal }) => fetchComplianceEvidence(signal),
    enabled: Boolean(userId),
  });

  const audit = useAuditQueue({ page, pageSize: AUDIT_PAGE_SIZE });

  const data = evidence.data;
  const auditRows = audit.data?.rows ?? [];
  const auditTotal = audit.data?.total ?? 0;
  const auditPages = Math.max(1, Math.ceil(auditTotal / AUDIT_PAGE_SIZE));

  const strikeColumns: DataTableColumn<ComplianceStrike>[] = [
    {
      key: 'store',
      header: 'Store',
      className: 'p-3 font-bold text-slate-900',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (s) => s.storeName,
    },
    {
      key: 'reason',
      header: 'Reason',
      className: 'p-3 text-slate-700',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (s) => s.reason,
    },
    {
      key: 'note',
      header: 'Note',
      className: 'p-3 text-slate-500',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (s) => s.note || '—',
    },
    {
      key: 'issued',
      header: 'Issued',
      align: 'right',
      className: 'p-3 text-slate-500',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (s) => new Date(s.createdAt).toLocaleDateString(),
    },
  ];

  const trailColumns: DataTableColumn<AuditRow>[] = [
    {
      key: 'action',
      header: 'Action',
      className: 'p-3 font-mono font-bold text-slate-800',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (row) => row.action,
    },
    {
      key: 'actor',
      header: 'Actor',
      className: 'p-3 text-slate-700',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (row) => (
        <>
          {row.actorName} <span className="text-slate-400">({row.actorRole})</span>
        </>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      className: 'p-3 text-slate-500',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (row) =>
        row.entityType ? `${row.entityType}${row.entityId ? ` · ${row.entityId}` : ''}` : '—',
    },
    {
      key: 'when',
      header: 'When',
      align: 'right',
      className: 'p-3 text-slate-500',
      headerClassName: 'p-3 text-[11px] tracking-normal',
      cell: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Compliance"
      subtitle="Seller verification, strikes, buyer protection and the governance trail, counted from the tables that record them."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
            Platform Compliance Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            The compliance evidence this marketplace actually stores: verified merchants, strikes,
            dispute and refund outcomes, and the audit trail of staff decisions.
          </p>
        </div>

        <div role="tablist" className="flex border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'evidence'}
            onClick={() => setActiveTab('evidence')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'evidence'
                ? 'border-sun-orange text-sun-orange'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Verification &amp; Protection
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'trail'}
            onClick={() => setActiveTab('trail')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'trail'
                ? 'border-sun-orange text-sun-orange'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ScrollText className="h-4 w-4" />
            Governance Trail
          </button>
        </div>

        {activeTab === 'evidence' && (
          <div className="space-y-6">
            {evidence.isError && (
              <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
                <AlertTriangle className="h-4 w-4" />
                {reason(evidence.error, 'The compliance evidence could not be loaded.')}
              </p>
            )}

            {evidence.isPending && !evidence.isError ? (
              <p className="text-xs text-slate-500">Reading compliance evidence…</p>
            ) : data ? (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <BadgeCheck className="h-4 w-4 text-[#2563EB]" />
                    Seller verification
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Stat label="Active stores" value={data.sellers.activeStores} />
                    <Stat label="Suspended stores" value={data.sellers.suspendedStores} />
                    <Stat label="Applications pending" value={data.sellers.applicationsPending} />
                    <Stat label="Under review" value={data.sellers.applicationsUnderReview} />
                    <Stat label="Approved" value={data.sellers.applicationsApproved} />
                    <Stat label="Rejected" value={data.sellers.applicationsRejected} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Scale className="h-4 w-4 text-[#2563EB]" />
                    Buyer protection
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Stat label="Open disputes" value={data.protection.openDisputes} />
                    <Stat label="Under review" value={data.protection.underReviewDisputes} />
                    <Stat label="Escalated" value={data.protection.escalatedDisputes} />
                    <Stat label="Resolved · refund" value={data.protection.resolvedWithRefund} />
                    <Stat label="Resolved · denied" value={data.protection.resolvedDenied} />
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                      <div className="text-2xl font-black text-slate-900">{formatPrice(data.protection.refundsTotal)}</div>
                      <div className="mt-0.5 text-[11px] font-bold text-slate-500">
                        Refunded · {data.protection.refundsCount.toLocaleString()} claims
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <h3 className="text-sm font-bold text-slate-900">Active strikes ({data.totalStrikes.toLocaleString()})</h3>
                  </div>
                  {data.recentStrikes.length === 0 ? (
                    <p className="px-5 py-8 text-center text-xs text-slate-500">No strikes have been issued.</p>
                  ) : (
                    <DataTable
                      columns={strikeColumns}
                      rows={data.recentStrikes}
                      getRowKey={(s) => s.id}
                    />
                  )}
                </section>
              </>
            ) : null}
          </div>
        )}

        {activeTab === 'trail' && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ScrollText className="h-4 w-4" />
                Staff decisions ({auditTotal.toLocaleString()})
              </h3>
              <button
                type="button"
                onClick={() => void audit.refetch()}
                disabled={audit.isFetching}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                {audit.isFetching ? 'Reading…' : 'Reload'}
              </button>
            </div>

            {audit.isPending ? (
              <p className="px-5 py-8 text-xs text-slate-500">Reading the governance trail…</p>
            ) : audit.isError ? (
              <p role="alert" className="m-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                {reason(audit.error, 'The audit trail could not be loaded.')}
              </p>
            ) : auditRows.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-slate-500">No staff actions recorded yet.</p>
            ) : (
              <>
                <DataTable columns={trailColumns} rows={auditRows} getRowKey={(row) => row.id} />

                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                  <span>
                    Page <strong className="text-slate-800">{audit.data?.page ?? page}</strong> of{' '}
                    <strong className="text-slate-800">{auditPages}</strong>
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1 font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= auditPages}
                      onClick={() => setPage((current) => Math.min(auditPages, current + 1))}
                      className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1 font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </span>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </WorkspaceLayout>
  );
};
