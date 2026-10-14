import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  ExternalLink,
  Percent,
  Ban,
  RotateCcw,
  Save,
  Package,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useVendorDetail } from '../features/admin/hooks/useAdminQueries';
import { useAdminActions } from '../features/admin/hooks/useAdminActions';
import { useCurrency } from '../store/currency-store';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

export const AdminVendorDetailPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { id } = useParams<{ id: string }>();

  const { data: vendor, isLoading, error, refetch } = useVendorDetail(id || '');
  const { setVendorStatus, setVendorCommission, issueStrike } = useAdminActions();

  // A rate the console is about to send, until the write lands: the slider needs somewhere to
  // draft a value, and `vendor.commissionRate` stays the server's answer until then.
  const [commissionDraft, setCommissionDraft] = useState<number | null>(null);
  const [isStrikeModalOpen, setIsStrikeModalOpen] = useState(false);

  const isPending = setVendorStatus.isPending || setVendorCommission.isPending || issueStrike.isPending;

  /** A refused write is shown, not thrown: the console stays on the page it was reading. */
  const actions = [setVendorStatus, setVendorCommission, issueStrike];
  const actionError = actions.find((mutation) => mutation.isError)?.error?.message ?? null;

  const handleSaveCommission = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = commissionOverride === 0 ? null : commissionOverride / 100;
    setVendorCommission.mutate(
      { vendorId: vendor!.id, rate },
      { onSuccess: () => setCommissionDraft(null) },
    );
  };

  const handleToggleStatus = (newStatus: 'active' | 'suspended') => {
    setVendorStatus.mutate({
      vendorId: vendor!.id,
      status: newStatus,
      note: `Status changed by admin`,
    });
  };

  const handleIssueStrike = (e: React.FormEvent) => {
    e.preventDefault();
    const strikeForm = e.target as HTMLFormElement;
    const formData = new FormData(strikeForm);
    const violationType = formData.get('violationType') as string;
    const violationNotes = formData.get('violationNotes') as string;

    issueStrike.mutate({
      vendorId: vendor!.id,
      reason: violationType,
      note: violationNotes,
    });
  };

  if (isLoading) {
    return (
      <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-sm text-slate-600 font-medium">Reading this merchant...</p>
        </div>
      </WorkspaceLayout>
    );
  }

  if (error) {
    return (
      <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-sm text-rose-600 font-medium">
            {error instanceof Error ? error.message : 'Failed to load merchant'}
          </p>
          <Button
            type="button"
            variant="ink"
            size="sm"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      </WorkspaceLayout>
    );
  }

  const commissionOverride = commissionDraft ?? (vendor?.commissionRate !== null && vendor?.commissionRate !== undefined
    ? vendor.commissionRate * 100
    : 0);

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
      <div className="space-y-6">
        {actionError && (
          <div
            role="alert"
            data-testid="vendor-action-error"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800"
          >
            {actionError}
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/vendors"
              aria-label="Back to vendor management"
              title="Back to vendor management"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {vendor!.storeName}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    vendor!.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {vendor!.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Vendor ID: <span className="font-mono font-bold text-slate-700">{vendor!.id}</span> • Member since {new Date(vendor!.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/vendors/${vendor!.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              View Public Storefront
            </Link>

            {vendor!.status === 'active' ? (
              <button
                type="button"
                onClick={() => handleToggleStatus('suspended')}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ban className="h-3.5 w-3.5" />
                Suspend Merchant
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleStatus('active')}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reinstate Merchant
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">KYC & Business Registration Verification</h3>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5">
                  Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Business Legal Entity</span>
                  <p className="font-bold text-slate-800">{vendor!.storeName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Email</span>
                  <p className="font-bold text-slate-800">{vendor!.email}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Contact Name</span>
                  <p className="font-bold text-slate-800">{vendor!.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Account Status</span>
                  <p className="font-bold text-slate-800">{vendor!.accountStatus}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">Merchant Penalty & Strike Governance</h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsStrikeModalOpen(true)}
                  disabled={isPending}
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-bold hover:bg-rose-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Issue Warning Strike
                </button>
              </div>

              {vendor!.strikes.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No penalty strikes on record. This merchant maintains exemplary fulfillment and quality compliance.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {vendor!.strikes.map((s) => (
                    <div key={s.id} className="p-3 rounded-xl border border-rose-200 bg-rose-50/60 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-900">{s.reason}</span>
                          <span className="text-slate-400 text-[10px]">{new Date(s.createdAt).toLocaleDateString()}</span>
                        </div>
                        {s.note && <p className="text-slate-600 mt-1">{s.note}</p>}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">By: {s.issuedBy ?? 'Admin'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-sun-orange" />
                  <h3 className="text-sm font-bold text-slate-900">Packages ({vendor!.packages.length})</h3>
                </div>
              </div>

              {vendor!.packages.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 italic">
                  No packages recorded for this vendor.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                        <th className="pb-2.5">Order Group</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5">Type</th>
                        <th className="pb-2.5 text-right">Gross</th>
                        <th className="pb-2.5 text-right">Net</th>
                        <th className="pb-2.5">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vendor!.packages.slice(0, 10).map((pkg) => (
                        <tr key={pkg.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 font-mono text-slate-600">{pkg.orderGroupId}</td>
                          <td className="py-2.5">
                            <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                              {pkg.status}
                            </span>
                          </td>
                          <td className="py-2.5 font-medium text-slate-700">{pkg.type}</td>
                          <td className="py-2.5 font-bold text-slate-900">{formatPrice(pkg.gross)}</td>
                          <td className="py-2.5 font-bold text-slate-900">{formatPrice(pkg.net)}</td>
                          <td className="py-2.5 text-slate-500">{new Date(pkg.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-sun-orange" />
                  <h3 className="text-sm font-bold text-slate-900">Disputes ({vendor!.disputes.length})</h3>
                </div>
              </div>

              {vendor!.disputes.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 italic">
                  No active or historical disputes for this vendor.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {vendor!.disputes.map((d) => (
                    <div key={d.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/60">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-900">{d.reason}</span>
                        <span className="text-slate-400 text-[10px]">{new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          {d.status}
                        </span>
                        <span className="text-slate-500">Urgency: {d.urgency}</span>
                      </div>
                      {d.resolutionAmount !== null && (
                        <p className="mt-1 text-slate-600">Resolution amount: {formatPrice(d.resolutionAmount)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Applications ({vendor!.applications.length})</h3>
              </div>

              {vendor!.applications.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 italic">
                  No seller applications on record.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {vendor!.applications.map((app) => (
                    <div key={app.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{app.businessType}</span>
                        <span className="inline-block rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {app.status}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">Contact: {app.contactEmail}</p>
                      {app.reviewNote && <p className="mt-1 text-slate-500 italic">{app.reviewNote}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Percent className="h-4 w-4 text-sun-orange" />
                <h3 className="text-sm font-bold text-slate-900">Commission Override</h3>
              </div>

              <p className="text-slate-500 leading-relaxed">
                Set a custom commission rate for this vendor. Set to 0% to clear override and return to platform default.
              </p>

              <form onSubmit={handleSaveCommission} className="space-y-4">
                <div>
                  <div className="flex justify-between font-bold text-slate-900 mb-1">
                    <label htmlFor="commission-rate">Effective Rate:</label>
                    <span className="text-sun-orange font-black text-sm">
                      {commissionOverride === 0 ? 'Platform Default' : `${commissionOverride.toFixed(1)}%`}
                    </span>
                  </div>
                  <input
                    id="commission-rate"
                    type="range"
                    aria-valuetext={commissionOverride === 0 ? 'Platform default' : `${commissionOverride.toFixed(1)}%`}
                    min="0"
                    max="20"
                    step="0.5"
                    value={commissionOverride}
                    onChange={(e) => setCommissionDraft(parseFloat(e.target.value))}
                    className="w-full accent-sun-orange cursor-pointer"
                    disabled={isPending}
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0% (Clear override)</span>
                    <span>10% (Default)</span>
                    <span>20% (Maximum)</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={isPending}
                  className="w-full"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Commission Override
                </Button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Payouts ({vendor!.payouts.length})</h3>
              </div>

              {vendor!.payouts.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 italic">
                  No payouts recorded for this vendor.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {vendor!.payouts.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{formatPrice(p.amount)}</span>
                        <span className="inline-block rounded-md bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 border border-green-200">
                          {p.status}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">Method: {p.method}</p>
                      <p className="text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Bank Accounts ({vendor!.bankAccounts.length})</h3>
              </div>

              {vendor!.bankAccounts.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 italic">
                  No bank accounts registered for this vendor.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {vendor!.bankAccounts.map((bank) => (
                    <div key={bank.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{bank.bankName}</span>
                        {bank.isDefault && (
                          <span className="inline-block rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-slate-600">Holder: {bank.holderName}</p>
                      <p className="text-slate-500">Account: ••••{bank.maskedAccount}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Issue Strike */}
      <Dialog open={isStrikeModalOpen} onOpenChange={setIsStrikeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Issue Merchant Warning Strike</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Formal penalty strike issued against {vendor!.storeName}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleIssueStrike} className="space-y-3 text-xs">
            <div>
              <label htmlFor="violationType" className="block font-bold text-slate-700 mb-1">Violation Category</label>
              <select
                id="violationType"
                name="violationType"
                defaultValue="Late Dispatch SLA (> 48h)"
                className="native-select w-full rounded-xl border border-slate-200 p-2.5 text-slate-900"
              >
                <option value="Late Dispatch SLA (> 48h)">Late Dispatch SLA (&gt; 48h)</option>
                <option value="Counterfeit / Unlicensed Item Claim">Counterfeit / Unlicensed Item Claim</option>
                <option value="Excessive Out-of-Stock Cancellations">Excessive Out-of-Stock Cancellations</option>
                <option value="Abusive Customer Communication">Abusive Customer Communication</option>
              </select>
            </div>

            <div>
              <label htmlFor="violationNotes" className="block font-bold text-slate-700 mb-1">Documentation &amp; Notes</label>
              <textarea
                id="violationNotes"
                name="violationNotes"
                rows={3}
                placeholder="Include incident dates and order references..."
                className="w-full rounded-xl border border-slate-200 p-2.5"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsStrikeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={isPending}
              >
                Issue Formal Strike
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </WorkspaceLayout>
  );
};
