import React from 'react';
import {
  Download,
  FileText,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';

export const AdminReportsPage: React.FC = () => {
  const reports = [
    { name: 'Monthly Settlement & Escrow Reconciliation (Sept 2026)', date: 'Oct 01, 2026', size: '2.4 MB', type: 'PDF' },
    { name: 'Multi-Vendor GMV by Category Breakdown', date: 'Oct 04, 2026', size: '850 KB', type: 'CSV' },
    { name: 'Commission Fee Take-Rate Audit Log', date: 'Oct 05, 2026', size: '1.1 MB', type: 'CSV' },
    { name: 'Platform Dispute & Refund Settlement Summary', date: 'Oct 06, 2026', size: '420 KB', type: 'PDF' },
  ];

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Platform Reports & Auditing"
      subtitle="Export financial statements, escrow release manifests, and vendor performance audits."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Platform Volume</span>
            <div className="mt-3 text-2xl font-black text-slate-900">$482,950.00</div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">+18.2% month-over-month</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Retained Commission</span>
            <div className="mt-3 text-2xl font-black text-emerald-600">$48,295.00</div>
            <p className="mt-1 text-xs text-slate-500 font-medium">10.0% effective take-rate</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vendor Net Payouts</span>
            <div className="mt-3 text-2xl font-black text-blue-600">$434,655.00</div>
            <p className="mt-1 text-xs text-slate-500 font-medium">Weekly ACH/Bank transfers</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Generated Financial Reports</h3>
              <p className="text-xs text-slate-500">Scheduled exports available for compliance download</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {reports.map((r, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{r.name}</h4>
                    <span className="text-[11px] text-slate-400">Generated on {r.date} • {r.size} • {r.type}</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl">
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Download</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
