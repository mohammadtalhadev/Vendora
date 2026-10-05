import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';

interface PendingProduct {
  id: string;
  title: string;
  vendorName: string;
  category: string;
  price: number;
  image: string;
  type: 'physical' | 'digital';
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_PENDING_PRODUCTS: PendingProduct[] = [
  {
    id: 'prod-mod-1',
    title: 'Aura Studio Custom IEM Cable (8-Core Silver Plated)',
    vendorName: 'SoundWave Direct',
    category: 'Audio & Sound',
    price: 49.0,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=400&q=80',
    type: 'physical',
    submittedAt: 'Today, 11:30',
    status: 'pending',
  },
  {
    id: 'prod-mod-2',
    title: 'Modern Dashboard UI Kit 2.0 (Figma Design System)',
    vendorName: 'StudioCraft Assets',
    category: 'Digital Licenses',
    price: 79.0,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    type: 'digital',
    submittedAt: 'Yesterday, 14:15',
    status: 'pending',
  },
  {
    id: 'prod-mod-3',
    title: 'Precision Soldering Station Kit (Digital Temperature Display)',
    vendorName: 'SoundWave Direct',
    category: 'Computers & Tech',
    price: 89.0,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=400&q=80',
    type: 'physical',
    submittedAt: '2 days ago',
    status: 'pending',
  },
];

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<PendingProduct[]>(INITIAL_PENDING_PRODUCTS);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const handleApprove = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'approved' } : p))
    );
  };

  const handleReject = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'rejected' } : p))
    );
  };

  const filtered = products.filter((p) => filter === 'all' || p.status === filter);

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Product Listing Moderation"
      subtitle="Ensure catalog quality, review compliance policies, and approve marketplace merchandise."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6">
        {/* Metric summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Needs Moderation
            </span>
            <div className="mt-3 text-2xl font-black text-slate-900">
              {products.filter((p) => p.status === 'pending').length}
            </div>
            <p className="mt-1 text-xs text-amber-600 font-medium">Pending listing review</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Approved Listings
            </span>
            <div className="mt-3 text-2xl font-black text-slate-900">128</div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">Live on customer storefront</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Content Violations
            </span>
            <div className="mt-3 text-2xl font-black text-slate-900">0</div>
            <p className="mt-1 text-xs text-slate-400 font-medium">No copyright flags</p>
          </div>
        </div>

        {/* Product Cards Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Moderation Queue</h3>
              <p className="text-xs text-slate-500">Review images, descriptions, and pricing before publishing</p>
            </div>

            <div className="flex items-center gap-1.5">
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

          <div className="divide-y divide-slate-100">
            {filtered.map((prod) => (
              <div key={prod.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-4">
                  <img
                    src={prod.image}
                    alt={prod.title}
                    className="h-16 w-16 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{prod.title}</h4>
                      {prod.status === 'pending' && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          Pending
                        </span>
                      )}
                      {prod.status === 'approved' && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Approved
                        </span>
                      )}
                      {prod.status === 'rejected' && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          Rejected
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Vendor: <strong className="text-slate-700">{prod.vendorName}</strong></span>
                      <span>•</span>
                      <span>Category: <span className="font-medium text-slate-700">{prod.category}</span></span>
                      <span>•</span>
                      <span>Price: <strong className="text-slate-900">${prod.price.toFixed(2)}</strong></span>
                      <span>•</span>
                      <span>Type: <span className="uppercase text-[10px] font-bold text-slate-600">{prod.type}</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {prod.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(prod.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs rounded-xl"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve Listing</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(prod.id)}
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 gap-1 text-xs rounded-xl"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </Button>
                    </>
                  )}
                  {prod.status === 'approved' && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Live in Catalog
                    </span>
                  )}
                  {prod.status === 'rejected' && (
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
