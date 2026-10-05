import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Store,
  Search,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';

interface VendorApplication {
  id: string;
  applicantName: string;
  storeName: string;
  email: string;
  category: string;
  taxId: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

const INITIAL_APPLICATIONS: VendorApplication[] = [
  {
    id: 'app-101',
    applicantName: 'Elena Rostova',
    storeName: 'Nordic Woodworks',
    email: 'elena@nordicwood.se',
    category: 'Home & Living',
    taxId: 'SE-99882211',
    submittedAt: 'Today, 10:14',
    status: 'pending',
  },
  {
    id: 'app-102',
    applicantName: 'Tariq Al-Mansoor',
    storeName: 'Desert Bloom Fragrances',
    email: 'tariq@desertbloom.ae',
    category: 'Beauty & Fragrance',
    taxId: 'AE-77221199',
    submittedAt: 'Yesterday, 16:40',
    status: 'pending',
  },
  {
    id: 'app-103',
    applicantName: 'Chloe Bennett',
    storeName: 'Velvet Horizon Apparel',
    email: 'chloe@velvethorizon.co.uk',
    category: 'Fashion & Wearables',
    taxId: 'GB-11223344',
    submittedAt: '2 days ago',
    status: 'pending',
  },
  {
    id: 'app-104',
    applicantName: 'Kenji Sato',
    storeName: 'Kyoto Artisan Ceramics',
    email: 'kenji@kyotopottery.jp',
    category: 'Artisan Crafts',
    taxId: 'JP-55443322',
    submittedAt: '3 days ago',
    status: 'approved',
  },
];

export const AdminVendorsPage: React.FC = () => {
  const [applications, setApplications] = useState<VendorApplication[]>(INITIAL_APPLICATIONS);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  const handleApprove = (id: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: 'approved' } : app))
    );
  };

  const handleReject = (id: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? { ...app, status: 'rejected', rejectionReason: 'Incomplete business license verification' }
          : app
      )
    );
  };

  const filteredApps = applications.filter((app) => {
    const matchesFilter = filter === 'all' || app.status === filter;
    const matchesSearch =
      app.storeName.toLowerCase().includes(search.toLowerCase()) ||
      app.applicantName.toLowerCase().includes(search.toLowerCase()) ||
      app.category.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Vendor Applications & Governance"
      subtitle="Review incoming seller applications, verify trade licenses, and grant storefront permissions."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6">
        {/* Catmin Metric Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pending Approvals
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900">{pendingCount}</div>
            <p className="mt-1 text-xs text-amber-600 font-medium">Awaiting compliance verification</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Approved Stores
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900">142</div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">Active marketplace sellers</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rejected / Incomplete
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <XCircle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900">8</div>
            <p className="mt-1 text-xs text-rose-600 font-medium">Flagged for document resubmission</p>
          </div>
        </div>

        {/* Applications Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search store name, applicant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  filter === tab
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h3 className="text-base font-bold text-slate-900">Seller Onboarding Queue</h3>
            <p className="text-xs text-slate-500">KYC and business identity verification pipeline</p>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredApps.map((app) => (
              <div key={app.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF7A1A] shrink-0 border border-orange-200/60">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{app.storeName}</h4>
                      {app.status === 'pending' && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          Pending Review
                        </span>
                      )}
                      {app.status === 'approved' && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Approved
                        </span>
                      )}
                      {app.status === 'rejected' && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          Rejected
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Owner: <strong className="text-slate-700">{app.applicantName}</strong></span>
                      <span>•</span>
                      <span>Category: <span className="font-medium text-slate-700">{app.category}</span></span>
                      <span>•</span>
                      <span>Tax ID: <span className="font-mono text-slate-700">{app.taxId}</span></span>
                      <span>•</span>
                      <span>Submitted: {app.submittedAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {app.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(app.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs rounded-xl"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve Vendor</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(app.id)}
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 gap-1 text-xs rounded-xl"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </Button>
                    </>
                  )}
                  {app.status === 'approved' && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Store Active
                    </span>
                  )}
                  {app.status === 'rejected' && (
                    <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Declined
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
