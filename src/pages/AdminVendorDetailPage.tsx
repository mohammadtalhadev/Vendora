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
  CheckCircle2,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

interface StrikeRecord {
  id: string;
  type: string;
  issuedAt: string;
  reason: string;
  issuedBy: string;
}

export const AdminVendorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [vendorStatus, setVendorStatus] = useState<'approved' | 'suspended' | 'probation'>('approved');
  const [commissionOverride, setCommissionOverride] = useState(8.5); // Custom 8.5%
  const [commissionSaved, setCommissionSaved] = useState(false);

  // Strike & penalty modal
  const [strikes, setStrikes] = useState<StrikeRecord[]>([]);
  const [isStrikeModalOpen, setIsStrikeModalOpen] = useState(false);
  const [violationType, setViolationType] = useState('Late Dispatch SLA (> 48h)');
  const [violationNotes, setViolationNotes] = useState('');

  const merchantDossier = {
    id: id || 'vendor-tech-1',
    name: 'Marcus Vance',
    storeName: 'Apex Audio & Gear Inc.',
    email: 'marcus@apexaudio.com',
    phone: '+1 (510) 555-8921',
    businessRegNumber: 'LLC-CA-9482104',
    taxId: 'US-EIN-88291049',
    country: 'United States',
    joinedDate: 'August 14, 2025',
    activeProductsCount: 42,
    lifetimeOrders: 1840,
    lifetimeGmv: 248950.00,
    defectRate: 0.38,
    fulfillmentSlaRate: 98.4,
    rating: 4.85,
  };

  const handleSaveCommission = (e: React.FormEvent) => {
    e.preventDefault();
    setCommissionSaved(true);
    setTimeout(() => setCommissionSaved(false), 2500);
  };

  const handleIssueStrike = (e: React.FormEvent) => {
    e.preventDefault();
    const newStrike: StrikeRecord = {
      id: `str-${Date.now()}`,
      type: violationType,
      issuedAt: new Date().toISOString(),
      reason: violationNotes,
      issuedBy: 'Admin Elena',
    };
    setStrikes([...strikes, newStrike]);
    setIsStrikeModalOpen(false);
    setViolationNotes('');
  };

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/vendors"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {merchantDossier.storeName}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    vendorStatus === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : vendorStatus === 'probation'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {vendorStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Vendor ID: <span className="font-mono font-bold text-slate-700">{merchantDossier.id}</span> • Member since {merchantDossier.joinedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/vendors/${merchantDossier.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              View Public Storefront
            </Link>

            {vendorStatus === 'approved' ? (
              <button
                type="button"
                onClick={() => setVendorStatus('suspended')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
              >
                <Ban className="h-3.5 w-3.5" />
                Suspend Merchant
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setVendorStatus('approved')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reinstate Merchant
              </button>
            )}
          </div>
        </div>

        {/* 4 Performance KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lifetime GMV</span>
            <div className="text-xl font-black text-slate-900 mt-1">${merchantDossier.lifetimeGmv.toLocaleString()}</div>
            <span className="text-[11px] text-emerald-600 font-bold">1,840 completed orders</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order Defect Rate</span>
            <div className="text-xl font-black text-slate-900 mt-1">{merchantDossier.defectRate}%</div>
            <span className="text-[11px] text-emerald-600 font-bold">Target: &lt; 1.00% (Healthy)</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fulfillment SLA Rate</span>
            <div className="text-xl font-black text-slate-900 mt-1">{merchantDossier.fulfillmentSlaRate}%</div>
            <span className="text-[11px] text-emerald-600 font-bold">Shipped within 24h</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Warning Strikes</span>
            <div className="text-xl font-black text-slate-900 mt-1">{strikes.length} of 3</div>
            <span className="text-[11px] text-slate-400 font-medium">3 strikes trigger probation</span>
          </div>
        </div>

        {/* 2-Column Dossier & Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): KYC Documents & Penalty System */}
          <div className="lg:col-span-2 space-y-6">
            {/* KYC & Identity Verification */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">KYC & Business Registration Verification</h3>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5">
                  100% Fully Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Business Legal Entity</span>
                  <p className="font-bold text-slate-800">{merchantDossier.storeName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Registered Business No.</span>
                  <p className="font-mono font-bold text-slate-800">{merchantDossier.businessRegNumber}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Tax ID / Employer EIN</span>
                  <p className="font-mono font-bold text-slate-800">{merchantDossier.taxId}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Authorized Legal Rep</span>
                  <p className="font-bold text-slate-800">{merchantDossier.name}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <span className="font-bold text-slate-700 block">Uploaded Legal Attachments:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      Articles_Inc.pdf
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">Passed</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      Bank_Proof.pdf
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">Passed</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      Govt_ID_Rep.pdf
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">Passed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Merchant Penalty & Strike System */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">Merchant Penalty & Strike Governance</h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsStrikeModalOpen(true)}
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                >
                  + Issue Warning Strike
                </button>
              </div>

              {strikes.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No penalty strikes on record. This merchant maintains exemplary fulfillment and quality compliance.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {strikes.map((s) => (
                    <div key={s.id} className="p-3 rounded-xl border border-rose-200 bg-rose-50/60 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-900">{s.type}</span>
                          <span className="text-slate-400 text-[10px]">{new Date(s.issuedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-600 mt-1">{s.reason}</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">By: {s.issuedBy}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Custom Commission Override */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Percent className="h-4 w-4 text-[#FF7A1A]" />
                <h3 className="text-sm font-bold text-slate-900">Custom Commission Override</h3>
              </div>

              <p className="text-slate-500 leading-relaxed">
                Global platform default is <strong className="text-slate-700">10.0%</strong>. Set a preferential rate override for this merchant based on sales volume.
              </p>

              <form onSubmit={handleSaveCommission} className="space-y-4">
                <div>
                  <div className="flex justify-between font-bold text-slate-900 mb-1">
                    <span>Effective Rate:</span>
                    <span className="text-[#FF7A1A] font-black text-sm">{commissionOverride.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    step="0.5"
                    value={commissionOverride}
                    onChange={(e) => setCommissionOverride(parseFloat(e.target.value))}
                    className="w-full accent-[#FF7A1A] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>2% (High-volume tier)</span>
                    <span>10% (Default)</span>
                    <span>20% (High-risk)</span>
                  </div>
                </div>

                {commissionSaved && (
                  <div className="text-emerald-700 font-bold text-xs flex items-center gap-1 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Rate updated to {commissionOverride.toFixed(1)}%!
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#FF7A1A] text-white py-2.5 font-bold hover:bg-[#EA580C] shadow-xs cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Commission Override
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Modal: Issue Strike */}
        {isStrikeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-base font-bold text-slate-900 mb-1">Issue Merchant Warning Strike</h3>
              <p className="text-xs text-slate-500 mb-4">
                Formal penalty strike issued against {merchantDossier.storeName}.
              </p>

              <form onSubmit={handleIssueStrike} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Violation Category</label>
                  <select
                    value={violationType}
                    onChange={(e) => setViolationType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-900"
                  >
                    <option value="Late Dispatch SLA (> 48h)">Late Dispatch SLA (&gt; 48h)</option>
                    <option value="Counterfeit / Unlicensed Item Claim">Counterfeit / Unlicensed Item Claim</option>
                    <option value="Excessive Out-of-Stock Cancellations">Excessive Out-of-Stock Cancellations</option>
                    <option value="Abusive Customer Communication">Abusive Customer Communication</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Documentation & Notes</label>
                  <textarea
                    rows={3}
                    value={violationNotes}
                    onChange={(e) => setViolationNotes(e.target.value)}
                    placeholder="Include incident dates and order references..."
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStrikeModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white shadow-md hover:bg-rose-700"
                  >
                    Issue Formal Strike
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
