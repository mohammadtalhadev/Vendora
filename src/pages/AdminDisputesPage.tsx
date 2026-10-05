import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';

interface DisputeItem {
  id: string;
  orderId: string;
  customer: string;
  vendor: string;
  reason: string;
  amount: number;
  status: 'open' | 'resolved' | 'escalated';
  createdAt: string;
}

const INITIAL_DISPUTES: DisputeItem[] = [
  {
    id: 'dsp-501',
    orderId: 'ord-grp-2001',
    customer: 'Sarah Jenkins',
    vendor: 'SoundWave Direct',
    reason: 'Package delayed beyond guaranteed SLA window',
    amount: 189.0,
    status: 'escalated',
    createdAt: 'Today, 09:20',
  },
  {
    id: 'dsp-502',
    orderId: 'ord-grp-1988',
    customer: 'Alexander Pierce',
    vendor: 'SoundWave Direct',
    reason: 'Item box had dent upon doorstep arrival',
    amount: 159.0,
    status: 'open',
    createdAt: 'Yesterday, 15:40',
  },
];

export const AdminDisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<DisputeItem[]>(INITIAL_DISPUTES);

  const handleResolve = (id: string) => {
    setDisputes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'resolved' } : d))
    );
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Dispute Resolution & Escalation Hub"
      subtitle="Arbitrate vendor-buyer disputes, issue simulated refunds, and enforce platform guarantee policies."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Open Cases</span>
            <div className="mt-3 text-2xl font-black text-slate-900">
              {disputes.filter((d) => d.status !== 'resolved').length}
            </div>
            <p className="mt-1 text-xs text-amber-600 font-medium">Under active review</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Escalated to Admin</span>
            <div className="mt-3 text-2xl font-black text-rose-600">1</div>
            <p className="mt-1 text-xs text-rose-600 font-medium">Requires immediate platform ruling</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resolved Cases</span>
            <div className="mt-3 text-2xl font-black text-emerald-600">
              {disputes.filter((d) => d.status === 'resolved').length}
            </div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">Closed with buyer satisfaction</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h3 className="text-base font-bold text-slate-900">Active Disputes Queue</h3>
            <p className="text-xs text-slate-500">Customer protection guarantee claims</p>
          </div>

          <div className="divide-y divide-slate-100">
            {disputes.map((d) => (
              <div key={d.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{d.id}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-medium text-slate-500">Order #{d.orderId}</span>
                    {d.status === 'escalated' && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                        Escalated
                      </span>
                    )}
                    {d.status === 'open' && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        Open
                      </span>
                    )}
                    {d.status === 'resolved' && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        Resolved
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1 text-sm font-semibold text-slate-800">{d.reason}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Customer: <strong className="text-slate-700">{d.customer}</strong></span>
                    <span>•</span>
                    <span>Vendor: <strong className="text-slate-700">{d.vendor}</strong></span>
                    <span>•</span>
                    <span>Disputed Amount: <strong className="text-slate-900">${d.amount.toFixed(2)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {d.status !== 'resolved' ? (
                    <Button
                      size="sm"
                      onClick={() => handleResolve(d.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs rounded-xl"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Issue Ruling & Resolve</span>
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
