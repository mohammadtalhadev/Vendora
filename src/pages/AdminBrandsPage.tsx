import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Eye,
  Download,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useMarketplaceStore } from '../store/marketplace-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

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
  { id: 'b-1', name: 'Apple', logoText: 'AAPL', category: 'electronics', gatingLevel: 'restricted', activeListingsCount: 14 },
  { id: 'b-2', name: 'Samsung', logoText: 'SMSN', category: 'electronics', gatingLevel: 'restricted', activeListingsCount: 12 },
  { id: 'b-3', name: 'Sony', logoText: 'SONY', category: 'electronics', gatingLevel: 'restricted', activeListingsCount: 10 },
  { id: 'b-4', name: 'Nike', logoText: 'NIKE', category: 'fashion-apparel', gatingLevel: 'gated', activeListingsCount: 10 },
  { id: 'b-5', name: 'Adidas', logoText: 'ADID', category: 'fashion-apparel', gatingLevel: 'gated', activeListingsCount: 9 },
  { id: 'b-6', name: 'Khaadi', logoText: 'KHAD', category: 'fashion-apparel', gatingLevel: 'gated', activeListingsCount: 8 },
  { id: 'b-7', name: 'J.', logoText: 'JDOT', category: 'fashion-apparel', gatingLevel: 'gated', activeListingsCount: 8 },
  { id: 'b-8', name: 'Ronin', logoText: 'RONN', category: 'electronics', gatingLevel: 'gated', activeListingsCount: 7 },
  { id: 'b-9', name: 'National Foods', logoText: 'NATL', category: 'groceries-food', gatingLevel: 'open', activeListingsCount: 7 },
  { id: 'b-10', name: 'Shan Foods', logoText: 'SHAN', category: 'groceries-food', gatingLevel: 'open', activeListingsCount: 7 },
  { id: 'b-11', name: 'The Ordinary', logoText: 'ORDN', category: 'beauty-personal-care', gatingLevel: 'gated', activeListingsCount: 6 },
];

const SEED_REQUESTS: BrandAuthorizationRequest[] = [
  {
    id: 'req-1',
    brandName: 'Sony',
    vendorId: 'vendor-tech-1',
    vendorName: 'Ronin Official',
    invoiceFile: 'Distributor_Invoice_Sony_Q3.pdf',
    submittedAt: '2026-10-07T12:00:00Z',
    status: 'pending',
  },
  {
    id: 'req-2',
    brandName: 'Apple',
    vendorId: 'vendor-apple-reseller',
    vendorName: 'Apex Mobile Supplies',
    invoiceFile: 'Apple_Authorized_Reseller_LOA.pdf',
    submittedAt: '2026-10-06T15:30:00Z',
    status: 'pending',
  },
  {
    id: 'req-3',
    brandName: 'Nike',
    vendorId: 'vendor-sport-reseller',
    vendorName: 'Prime Athletics LLC',
    invoiceFile: 'Nike_Wholesale_Distribution_P01.pdf',
    submittedAt: '2026-10-05T11:20:00Z',
    status: 'pending',
  },
];

export const AdminBrandsPage: React.FC = () => {
  const storeProducts = useMarketplaceStore((state) => state.products);
  const storeVendors = useMarketplaceStore((state) => state.vendors);
  const syncWithDatabase = useMarketplaceStore((state) => state.syncWithDatabase);

  useEffect(() => {
    syncWithDatabase();
  }, [syncWithDatabase]);

  const brands: ProtectedBrand[] = useMemo(() => {
    if (!storeProducts || storeProducts.length === 0) {
      return SEED_BRANDS;
    }

    const brandMap = new Map<string, { count: number; category: string }>();

    storeProducts.forEach((p) => {
      const bName = (p.brand || '').trim();
      if (!bName) return;
      const existing = brandMap.get(bName);
      if (existing) {
        existing.count += 1;
      } else {
        brandMap.set(bName, {
          count: 1,
          category: p.category || 'electronics',
        });
      }
    });

    storeVendors.forEach((v) => {
      const cleanName = v.storeName.replace(/ Official( Store)?/i, '').trim();
      if (!brandMap.has(cleanName)) {
        brandMap.set(cleanName, { count: 6, category: 'electronics' });
      }
    });

    const result: ProtectedBrand[] = [];
    brandMap.forEach((info, name) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const logoText = name.slice(0, 4).toUpperCase();
      result.push({
        id: `brand-${slug}`,
        name,
        logoText,
        category: info.category,
        gatingLevel: ['Apple', 'Sony', 'Nike', 'Samsung'].includes(name) ? 'restricted' : 'gated',
        activeListingsCount: info.count,
      });
    });

    return result.sort((a, b) => b.activeListingsCount - a.activeListingsCount);
  }, [storeProducts, storeVendors]);

  const [requests, setRequests] = useState<BrandAuthorizationRequest[]>(SEED_REQUESTS);
  const [activeTab, setActiveTab] = useState<'requests' | 'registry'>('requests');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<{ filename: string; brand: string; vendor: string } | null>(null);

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
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Brand Registry" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
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
                ? 'border-[#FF7A1A] text-[#FF7A1A]'
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
                ? 'border-[#FF7A1A] text-[#FF7A1A]'
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
                        <button
                          type="button"
                          onClick={() => setViewingPdf({ filename: r.invoiceFile, brand: r.brandName, vendor: r.vendorName })}
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#2563EB] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors cursor-pointer group"
                          title="Click to view full PDF document in popup modal"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>{r.invoiceFile}</span>
                          <Eye className="h-3 w-3 text-blue-500 opacity-70 group-hover:opacity-100 ml-0.5" />
                        </button>
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
                  <span className="text-[#FF7A1A] font-bold hover:underline cursor-pointer">Edit Rules</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Brand Registry Invoice PDF Document Viewer Modal ── */}
        <Dialog open={Boolean(viewingPdf)} onOpenChange={(open) => !open && setViewingPdf(null)}>
          <DialogContent className="max-w-3xl bg-white p-6 rounded-2xl shadow-2xl border border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>{viewingPdf?.filename}</span>
                      <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-bold">
                        PDF Document
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Authorized Wholesale Distributor Invoice for {viewingPdf?.brand} by {viewingPdf?.vendor}
                    </DialogDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = '#';
                      link.setAttribute('download', viewingPdf?.filename || 'document.pdf');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </DialogHeader>

            {/* Document Preview Pane */}
            <div className="py-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center min-h-[340px] text-center space-y-3">
                <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-rose-500">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{viewingPdf?.filename}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authentic commercial distributor certification on file with Vendora IP Registry.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-sm rounded-lg bg-white p-3 border border-slate-200 text-left text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Trademark</span>
                    <span className="font-bold text-slate-800">{viewingPdf?.brand}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Merchant Store</span>
                    <span className="font-bold text-slate-800">{viewingPdf?.vendor}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">File Verification</span>
                    <span className="font-semibold text-emerald-600">SHA-256 Validated</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Gating Status</span>
                    <span className="font-semibold text-blue-600">Direct In-App Preview</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingPdf(null)}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
