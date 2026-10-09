import React, { useState } from 'react';
import {
  MonitorPlay,
  Clock,
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

interface BannerItem {
  id: string;
  headline: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface CouponCode {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minSpend: number;
  isActive: boolean;
}

const INITIAL_BANNERS: BannerItem[] = [
  {
    id: 'b-1',
    headline: 'Next-Gen Audio Experience. Up to 40% Off.',
    subtitle: 'Shop verified premium sound systems and noise-cancelling gear.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80',
    ctaText: 'Explore Collection',
    ctaLink: '/products?category=electronics',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    isActive: true,
  },
  {
    id: 'b-2',
    headline: 'Autumn Home Essentials & Smart Kitchen',
    subtitle: 'Cookware, ergonomic dining, and verified kitchen appliances.',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80',
    ctaText: 'Shop Home',
    ctaLink: '/products?category=home',
    startDate: '2026-10-05',
    endDate: '2026-10-25',
    isActive: true,
  },
];

const INITIAL_COUPONS: CouponCode[] = [
  { id: 'c-1', code: 'VENDORA10', discountType: 'percent', discountValue: 10, minSpend: 50, isActive: true },
  { id: 'c-2', code: 'FREESHIP', discountType: 'fixed', discountValue: 8.50, minSpend: 75, isActive: true },
  { id: 'c-3', code: 'WELCOME25', discountType: 'percent', discountValue: 25, minSpend: 150, isActive: false },
];

export const AdminCMSPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'banners' | 'campaigns' | 'coupons'>('banners');

  // Banners
  const [banners, setBanners] = useState<BannerItem[]>(INITIAL_BANNERS);
  const [isAddBannerOpen, setIsAddBannerOpen] = useState(false);
  const [newHeadline, setNewHeadline] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newCta, setNewCta] = useState('Shop Now');
  const [newLink, setNewLink] = useState('/products');

  // Limited Campaign
  const [campaignTitle, setCampaignTitle] = useState('Limited Campaign Deals');
  const [campaignEndDate, setCampaignEndDate] = useState('2026-10-15T23:59');
  const [campaignBadge, setCampaignBadge] = useState('FLASH SALE • 48H ONLY');
  const [savedMsg, setSavedMsg] = useState(false);

  // Coupons
  const [coupons, setCoupons] = useState<CouponCode[]>(INITIAL_COUPONS);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponVal, setNewCouponVal] = useState('10');

  const handleToggleBanner = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b)),
    );
  };

  const handleCreateBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeadline) return;

    const newB: BannerItem = {
      id: `b-${Date.now()}`,
      headline: newHeadline,
      subtitle: newSubtitle,
      imageUrl: newImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80',
      ctaText: newCta,
      ctaLink: newLink,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-11-01',
      isActive: true,
    };

    setBanners([...banners, newB]);
    setIsAddBannerOpen(false);
    setNewHeadline('');
    setNewSubtitle('');
    setNewImage('');
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode) return;

    const newC: CouponCode = {
      id: `c-${Date.now()}`,
      code: newCouponCode.trim().toUpperCase(),
      discountType: 'percent',
      discountValue: parseFloat(newCouponVal) || 10,
      minSpend: 50,
      isActive: true,
    };

    setCoupons([...coupons, newC]);
    setNewCouponCode('');
  };

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Platform CMS & Storefront Promotions
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Schedule hero sliders, configure "Limited Campaign" timers, and manage sitewide coupon codes.
            </p>
          </div>

          {activeTab === 'banners' && (
            <button
              type="button"
              onClick={() => setIsAddBannerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0071DC] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#005bb5] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Hero Banner
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'banners'
                ? 'border-[#0071DC] text-[#0071DC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MonitorPlay className="h-4 w-4" />
            Hero Banner Sliders ({banners.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'campaigns'
                ? 'border-[#0071DC] text-[#0071DC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="h-4 w-4" />
            Limited Campaign Controller
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coupons')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'coupons'
                ? 'border-[#0071DC] text-[#0071DC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="h-4 w-4" />
            Sitewide Coupons ({coupons.length})
          </button>
        </div>

        {/* TAB 1: Banners */}
        {activeTab === 'banners' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {banners.map((b) => (
              <div
                key={b.id}
                className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-4"
              >
                <div className="h-40 w-full bg-slate-100 relative overflow-hidden">
                  <img src={b.imageUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 flex flex-col justify-end text-white">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300">Live Banner</span>
                    <h3 className="font-bold text-sm leading-snug">{b.headline}</h3>
                  </div>
                </div>

                <div className="p-5 pt-0 space-y-3 text-xs">
                  <p className="text-slate-600 line-clamp-2">{b.subtitle}</p>

                  <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-100 text-[11px]">
                    <span>CTA: <strong>{b.ctaText}</strong> ({b.ctaLink})</span>
                    <span>{b.startDate} to {b.endDate}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={b.isActive}
                        onChange={() => handleToggleBanner(b.id)}
                        className="rounded text-[#0071DC]"
                      />
                      <span>Active on Storefront</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setBanners(banners.filter((x) => x.id !== b.id))}
                      className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: Limited Campaign */}
        {activeTab === 'campaigns' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs max-w-xl text-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Homepage "Limited Campaign" Countdown</h3>
            <p className="text-slate-500">
              Configures the high-urgency countdown timer displayed above the deal carousels on the homepage.
            </p>

            {savedMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Campaign configuration saved and live on homepage!
              </div>
            )}

            <form onSubmit={handleSaveCampaign} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Section Display Title</label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Badge Tag / Ribbon Text</label>
                <input
                  type="text"
                  value={campaignBadge}
                  onChange={(e) => setCampaignBadge(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-rose-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Expiration Deadline</label>
                <input
                  type="datetime-local"
                  value={campaignEndDate}
                  onChange={(e) => setCampaignEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-[#0071DC] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#005bb5]"
              >
                <Save className="h-4 w-4" />
                Update Live Campaign
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: Sitewide Coupons */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs max-w-xl text-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Create Sitewide Discount Code</h3>
              <form onSubmit={handleAddCoupon} className="flex gap-3">
                <input
                  type="text"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  placeholder="e.g. FLASH20"
                  className="flex-1 rounded-xl border border-slate-200 p-2.5 font-mono uppercase font-bold"
                  required
                />
                <input
                  type="number"
                  value={newCouponVal}
                  onChange={(e) => setNewCouponVal(e.target.value)}
                  placeholder="% Off"
                  className="w-24 rounded-xl border border-slate-200 p-2.5 font-bold text-center"
                  required
                />
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 text-white px-5 py-2.5 font-bold hover:bg-slate-800"
                >
                  Create Code
                </button>
              </form>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="p-4">Coupon Code</th>
                    <th className="p-4">Discount</th>
                    <th className="p-4">Min. Spend</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td className="p-4 font-mono font-bold text-slate-900">{c.code}</td>
                      <td className="p-4 font-bold text-[#0071DC]">
                        {c.discountType === 'percent' ? `${c.discountValue}% OFF` : `$${c.discountValue.toFixed(2)} OFF`}
                      </td>
                      <td className="p-4 text-slate-600">${c.minSpend}</td>
                      <td className="p-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {c.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => setCoupons(coupons.filter((x) => x.id !== c.id))}
                          className="text-rose-600 font-bold hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Banner */}
        {isAddBannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 text-xs">
              <h3 className="text-base font-bold text-slate-900 mb-3">Add Homepage Hero Banner</h3>
              <form onSubmit={handleCreateBanner} className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Headline Text</label>
                  <input
                    type="text"
                    value={newHeadline}
                    onChange={(e) => setNewHeadline(e.target.value)}
                    placeholder="e.g. Next-Gen Tech Deals"
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subtext / Description</label>
                  <input
                    type="text"
                    value={newSubtitle}
                    onChange={(e) => setNewSubtitle(e.target.value)}
                    placeholder="e.g. Verified sellers, 2-day delivery"
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Button Text</label>
                    <input
                      type="text"
                      value={newCta}
                      onChange={(e) => setNewCta(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Destination URL</label>
                    <input
                      type="text"
                      value={newLink}
                      onChange={(e) => setNewLink(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddBannerOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0071DC] px-5 py-2 font-bold text-white shadow-sm hover:bg-[#005bb5]"
                  >
                    Save Banner
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
