import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

interface ProtectedBrand {
  id: string;
  name: string;
  logoText: string;
  category: string;
  gatingLevel: 'gated' | 'restricted' | 'open';
  activeListingsCount: number;
}

interface BrandAuthorizationRequest {
  id: string;
  brandName: string;
  vendorId: string;
  vendorName: string;
  invoiceFile: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const SEED_BRANDS: ProtectedBrand[] = [
  { id: 'b-1', name: 'Apple Inc.', logoText: 'AAPL', category: 'electronics', gatingLevel: 'restricted', activeListingsCount: 12 },
  { id: 'b-2', name: 'Sony Electronics', logoText: 'SONY', category: 'electronics', gatingLevel: 'gated', activeListingsCount: 38 },
  { id: 'b-3', name: 'Bose Professional Audio', logoText: 'BOSE', category: 'electronics', gatingLevel: 'gated', activeListingsCount: 19 },
  { id: 'b-4', name: 'Nike Athletic Co.', logoText: 'NIKE', category: 'apparel', gatingLevel: 'gated', activeListingsCount: 64 },
  { id: 'b-5', name: 'Dyson Technology', logoText: 'DYSON', category: 'home', gatingLevel: 'restricted', activeListingsCount: 8 },
];

const SEED_REQUESTS: BrandAuthorizationRequest[] = [
  {
    id: 'req-1',
    brandName: 'Sony Electronics',
    vendorId: 'vendor-tech-1',
    vendorName: 'Apex Audio & Gear',
    invoiceFile: 'Distributor_Invoice_Sony_Q3.pdf',
    submittedAt: '2026-10-07T12:00:00Z',
    status: 'pending',
  },
  {
    id: 'req-2',
    brandName: 'Bose Professional Audio',
    vendorId: 'vendor-tech-1',
    vendorName: 'Apex Audio & Gear',
    invoiceFile: 'Bose_Authorized_Reseller_LOA.pdf',
    submittedAt: '2026-10-06T15:30:00Z',
    status: 'pending',
  },
];

export const AdminBrandsPage: React.FC = () => {
  const [brands] = useState<ProtectedBrand[]>(SEED_BRANDS);
  const [requests, setRequests] = useState<BrandAuthorizationRequest[]>(SEED_REQUESTS);
  const [activeTab, setActiveTab] = useState<'requests' | 'registry'>('requests');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleApprove = (id: string, vendorName: string, brand: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)),
    );
    setActionNotice(`Approved brand listing authorization for ${vendorName} to sell ${brand}.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleReject = (id: string, vendorName: string, brand: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r)),
    );
    setActionNotice(`Rejected distributor documentation for ${vendorName} (${brand}).`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Brand Gating & Counterfeit Protection Registry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforce authorized distributor verification before merchants can list trademark-protected brands (e.g. Apple, Sony, Nike).
          </p>
        </div>

        {actionNotice && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {actionNotice}
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'border-[#0071DC] text-[#0071DC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Seller Authorization Queue ({requests.filter((r) => r.status === 'pending').length} Pending)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('registry')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'registry'
                ? 'border-[#0071DC] text-[#0071DC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Protected Brands Registry ({brands.length})
          </button>
        </div>

        {/* TAB 1: Authorization Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="p-4">Target Brand</th>
                    <th className="p-4">Applicant Merchant</th>
                    <th className="p-4">Distributor Invoices</th>
                    <th className="p-4">Submission Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Moderation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-black text-slate-900">{r.brandName}</td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 block">{r.vendorName}</span>
                        <span className="font-mono text-slate-400 text-[10px]">{r.vendorId}</span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#0071DC] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                          <FileText className="h-3.5 w-3.5" />
                          {r.invoiceFile}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(r.submittedAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        {r.status === 'pending' && (
                          <span className="rounded-full bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 text-[10px]">
                            Invoices Pending Review
                          </span>
                        )}
                        {r.status === 'approved' && (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 text-[10px]">
                            Authorized Seller
                          </span>
                        )}
                        {r.status === 'rejected' && (
                          <span className="rounded-full bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 text-[10px]">
                            Documentation Rejected
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {r.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleReject(r.id, r.vendorName, r.brandName)}
                              className="rounded-lg border border-rose-200 text-rose-700 px-3 py-1 font-bold hover:bg-rose-50 cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(r.id, r.vendorName, r.brandName)}
                              className="rounded-lg bg-emerald-600 text-white px-3 py-1 font-bold hover:bg-emerald-700 shadow-2xs cursor-pointer"
                            >
                              Approve Brand Rights
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Brand Registry */}
        {activeTab === 'registry' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {brands.map((b) => (
              <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xs">
                    {b.logoText}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      b.gatingLevel === 'restricted'
                        ? 'bg-rose-100 text-rose-800'
                        : b.gatingLevel === 'gated'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {b.gatingLevel}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                  <span className="text-slate-400 capitalize">{b.category}</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Authorized Listings: <strong>{b.activeListingsCount}</strong></span>
                  <span className="text-[#0071DC] font-bold hover:underline cursor-pointer">Edit Rules</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
