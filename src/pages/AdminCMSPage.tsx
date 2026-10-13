import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MonitorPlay,
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useAdminScope } from '../features/admin/hooks/admin-keys';
import {
  createBanner,
  deleteBanner,
  fetchBanners,
  setBannerPublished,
  type AdminBanner,
} from '../features/admin/api/content';
import {
  createCoupon,
  deleteCoupon,
  fetchCoupons,
  setCouponActive,
  type AdminCoupon,
} from '../features/admin/api/promotions';
import { formatPrice } from '../store/currency-store';

/**
 * The console edits the two tables that are genuinely behind it: hero banners live in
 * `content_blocks` (placement `homepage_hero`) and sitewide coupons live in `promotions`
 * with no `vendor_id`. The old "Limited Campaign Controller" wrote a `campaign-flash` block
 * that nothing on the storefront reads, so it is gone rather than persisted into a void.
 */

const reason = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim() !== '' ? error.message : fallback;

const bannerKey = (userId: string | null | undefined) =>
  ['admin', userId ?? 'anon', 'cms', 'banners'] as const;
const couponKey = (userId: string | null | undefined) =>
  ['admin', userId ?? 'anon', 'cms', 'coupons'] as const;

const discountLabel = (coupon: AdminCoupon): string =>
  coupon.discountType === 'percentage'
    ? `${coupon.discountValue}% OFF`
    : `${formatPrice(coupon.discountValue)} OFF`;

export const AdminCMSPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'banners' | 'coupons'>('banners');
  const userId = useAdminScope();
  const queryClient = useQueryClient();

  const banners = useQuery({
    queryKey: bannerKey(userId),
    queryFn: ({ signal }) => fetchBanners(signal),
    enabled: Boolean(userId),
  });

  const coupons = useQuery({
    queryKey: couponKey(userId),
    queryFn: ({ signal }) => fetchCoupons(signal),
    enabled: Boolean(userId),
  });

  // Banner composer
  const [isAddBannerOpen, setIsAddBannerOpen] = useState(false);
  const [newHeadline, setNewHeadline] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newCta, setNewCta] = useState('Shop Now');
  const [newLink, setNewLink] = useState('/products');

  // Coupon composer
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponVal, setNewCouponVal] = useState('10');
  const [pendingDeleteCouponId, setPendingDeleteCouponId] = useState<string | null>(null);

  const refresh = (which: 'banners' | 'coupons') =>
    queryClient.invalidateQueries({
      queryKey: which === 'banners' ? bannerKey(userId) : couponKey(userId),
    });

  const createBannerMutation = useMutation({
    mutationFn: createBanner,
    onSuccess: () => {
      setIsAddBannerOpen(false);
      setNewHeadline('');
      setNewSubtitle('');
      setNewImage('');
      void refresh('banners');
    },
  });

  const toggleBannerMutation = useMutation({
    mutationFn: (banner: AdminBanner) => setBannerPublished(banner.id, !banner.published),
    onSuccess: () => void refresh('banners'),
  });

  const deleteBannerMutation = useMutation({
    mutationFn: (id: string) => deleteBanner(id),
    onSuccess: () => void refresh('banners'),
  });

  const createCouponMutation = useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      setNewCouponCode('');
      void refresh('coupons');
    },
  });

  const toggleCouponMutation = useMutation({
    mutationFn: (coupon: AdminCoupon) => setCouponActive(coupon.id, !coupon.active),
    onSuccess: () => void refresh('coupons'),
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      setPendingDeleteCouponId(null);
      void refresh('coupons');
    },
  });

  const submitBanner = (event: React.FormEvent) => {
    event.preventDefault();
    const headline = newHeadline.trim();
    if (!headline) return;
    createBannerMutation.mutate({
      headline,
      subtitle: newSubtitle.trim(),
      imageUrl: newImage.trim(),
      ctaText: newCta.trim() || 'Shop Now',
      ctaLink: newLink.trim() || '/products',
      published: true,
    });
  };

  const submitCoupon = (event: React.FormEvent) => {
    event.preventDefault();
    const code = newCouponCode.trim().toUpperCase();
    if (!code) return;
    createCouponMutation.mutate({
      code,
      discountType: 'percentage',
      discountValue: Number.parseFloat(newCouponVal) || 0,
      minimumOrder: 0,
      active: true,
    });
  };

  const bannerList = banners.data ?? [];
  const couponList = coupons.data ?? [];

  const CMS_TABS: Array<'banners' | 'coupons'> = ['banners', 'coupons'];

  const handleCmsTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = CMS_TABS.indexOf(activeTab);
    let nextIndex = currentIndex;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % CMS_TABS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + CMS_TABS.length) % CMS_TABS.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = CMS_TABS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextTab = CMS_TABS[nextIndex];
    setActiveTab(nextTab);
    document.getElementById(`cms-tab-${nextTab}`)?.focus();
  };

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Platform CMS" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
              Platform CMS &amp; Storefront Promotions
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Publish hero banners to <code className="text-[11px]">content_blocks</code> and manage the
              sitewide coupon codes in <code className="text-[11px]">promotions</code>.
            </p>
          </div>

          {activeTab === 'banners' && (
            <button
              type="button"
              onClick={() => setIsAddBannerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" />
              <span className="text-white">Add Hero Banner</span>
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div
          role="tablist"
          aria-label="Content management sections"
          onKeyDown={handleCmsTabKeyDown}
          className="flex border-b border-slate-200 gap-4 text-xs font-bold"
        >
          <button
            type="button"
            role="tab"
            id="cms-tab-banners"
            aria-controls="cms-panel-banners"
            aria-selected={activeTab === 'banners'}
            tabIndex={activeTab === 'banners' ? 0 : -1}
            onClick={() => setActiveTab('banners')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'banners'
                ? 'border-[#FF7A1A] text-[#FF7A1A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MonitorPlay className="h-4 w-4" aria-hidden="true" />
            Hero Banner Sliders ({banners.data?.length ?? 0})
          </button>

          <button
            type="button"
            role="tab"
            id="cms-tab-coupons"
            aria-controls="cms-panel-coupons"
            aria-selected={activeTab === 'coupons'}
            tabIndex={activeTab === 'coupons' ? 0 : -1}
            onClick={() => setActiveTab('coupons')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'coupons'
                ? 'border-[#FF7A1A] text-[#FF7A1A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="h-4 w-4" aria-hidden="true" />
            Sitewide Coupons ({coupons.data?.length ?? 0})
          </button>
        </div>

        {/* TAB 1: Banners */}
        {activeTab === 'banners' && (
          <div
            role="tabpanel"
            id="cms-panel-banners"
            aria-labelledby="cms-tab-banners"
            className="space-y-4"
          >
            {banners.isError && (
              <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
                <AlertCircle className="h-4 w-4" />
                {reason(banners.error, 'The hero banners could not be loaded.')}
              </p>
            )}
            {toggleBannerMutation.isError && (
              <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
                <AlertCircle className="h-4 w-4" />
                {reason(toggleBannerMutation.error, 'The banner could not be updated.')}
              </p>
            )}
            {deleteBannerMutation.isError && (
              <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
                <AlertCircle className="h-4 w-4" />
                {reason(deleteBannerMutation.error, 'The banner could not be deleted.')}
              </p>
            )}

            {banners.isPending && !banners.isError ? (
              <p className="text-xs text-slate-500">Loading the hero banners…</p>
            ) : bannerList.length === 0 && !banners.isError ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
                No hero banners yet. Add one to put a slider on the homepage.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bannerList.map((b) => (
                  <div key={b.id} className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-4">
                    <div className="h-40 w-full bg-slate-100 relative overflow-hidden">
                      {b.imageUrl ? (
                        <img src={b.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400">No image</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 flex flex-col justify-end text-white">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300">
                          {b.published ? 'Live Banner' : 'Draft'}
                        </span>
                        <h3 className="font-bold text-sm leading-snug">{b.headline}</h3>
                      </div>
                    </div>

                    <div className="p-5 pt-0 space-y-3 text-xs">
                      <p className="text-slate-600 line-clamp-2">{b.subtitle}</p>
                      <div className="text-slate-500 pt-2 border-t border-slate-100 text-[11px]">
                        CTA: <strong>{b.ctaText}</strong> ({b.ctaLink})
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={b.published}
                            disabled={toggleBannerMutation.isPending}
                            onChange={() => toggleBannerMutation.mutate(b)}
                            className="rounded text-[#FF7A1A] focus:ring-[#FF7A1A]"
                          />
                          <span>Active on Storefront</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => deleteBannerMutation.mutate(b.id)}
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
          </div>
        )}

        {/* TAB 2: Sitewide Coupons */}
        {activeTab === 'coupons' && (
          <div
            role="tabpanel"
            id="cms-panel-coupons"
            aria-labelledby="cms-tab-coupons"
            className="space-y-6"
          >
            {coupons.isError && (
              <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
                <AlertCircle className="h-4 w-4" />
                {reason(coupons.error, 'The coupon codes could not be loaded.')}
              </p>
            )}
            {toggleCouponMutation.isError && (
              <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
                <AlertCircle className="h-4 w-4" />
                {reason(toggleCouponMutation.error, 'The coupon could not be updated.')}
              </p>
            )}
            {deleteCouponMutation.isError && (
              <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
                <AlertCircle className="h-4 w-4" />
                {reason(deleteCouponMutation.error, 'The coupon could not be deleted.')}
              </p>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs max-w-xl text-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Create Sitewide Discount Code</h3>
              <form onSubmit={submitCoupon} className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="coupon-code" className="sr-only">Coupon code</label>
                  <input
                    id="coupon-code"
                    type="text"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    placeholder="e.g. FLASH20"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono uppercase font-bold"
                    required
                  />
                </div>
                <div className="w-24">
                  <label htmlFor="coupon-value" className="sr-only">Percent off</label>
                  <input
                    id="coupon-value"
                    type="number"
                    min="0"
                    step="0.1"
                    value={newCouponVal}
                    onChange={(e) => setNewCouponVal(e.target.value)}
                    placeholder="% Off"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-center"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={createCouponMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] text-white px-5 py-2.5 font-bold shadow-sm shadow-orange-500/20 transition-all cursor-pointer text-xs active:scale-95 disabled:opacity-50"
                >
                  {createCouponMutation.isPending ? 'Creating…' : 'Create Code'}
                </button>
              </form>
              {createCouponMutation.isError && (
                <p role="alert" className="mt-2 text-rose-700 font-bold">
                  {reason(createCouponMutation.error, 'The coupon could not be created.')}
                </p>
              )}
            </div>

            {coupons.isPending && !coupons.isError ? (
              <p className="text-xs text-slate-500">Loading coupon codes…</p>
            ) : couponList.length === 0 && !coupons.isError ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
                No sitewide coupons yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs text-xs">
                <table
                  className="w-full text-left border-collapse"
                  aria-label="Sitewide coupons"
                >
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px]">
                    <tr>
                      <th scope="col" className="p-4">Coupon Code</th>
                      <th scope="col" className="p-4">Discount</th>
                      <th scope="col" className="p-4">Min. Spend</th>
                      <th scope="col" className="p-4">Claimed</th>
                      <th scope="col" className="p-4">Status</th>
                      <th scope="col" className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {couponList.map((c) => (
                      <tr key={c.id}>
                        <td className="p-4 font-mono font-bold text-slate-900">{c.code}</td>
                        <td className="p-4 font-bold text-[#FF7A1A]">{discountLabel(c)}</td>
                        <td className="p-4 text-slate-600">{formatPrice(c.minimumOrder)}</td>
                        <td className="p-4 text-slate-600">{c.usageCount} / {c.usageLimit}</td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => toggleCouponMutation.mutate(c)}
                            aria-pressed={c.active}
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                              c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {c.active ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          {pendingDeleteCouponId === c.id ? (
                            <span className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPendingDeleteCouponId(null)}
                                className="rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCouponMutation.mutate(c.id)}
                                className="rounded-lg bg-rose-600 px-2 py-1 font-bold text-white hover:bg-rose-700 cursor-pointer"
                              >
                                Confirm delete
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteCouponId(c.id)}
                              className="text-rose-600 font-bold hover:underline cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Add Banner */}
        {isAddBannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 text-xs">
              <h3 className="text-base font-bold text-slate-900 mb-3">Add Homepage Hero Banner</h3>
              <form onSubmit={submitBanner} className="space-y-3">
                <div>
                  <label htmlFor="banner-headline" className="block font-bold text-slate-700 mb-1">Headline Text</label>
                  <input
                    id="banner-headline"
                    type="text"
                    value={newHeadline}
                    onChange={(e) => setNewHeadline(e.target.value)}
                    placeholder="e.g. Next-Gen Tech Deals"
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="banner-subtitle" className="block font-bold text-slate-700 mb-1">Subtext / Description</label>
                  <input
                    id="banner-subtitle"
                    type="text"
                    value={newSubtitle}
                    onChange={(e) => setNewSubtitle(e.target.value)}
                    placeholder="e.g. Verified sellers, 2-day delivery"
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>

                <div>
                  <label htmlFor="banner-image" className="block font-bold text-slate-700 mb-1">Image URL</label>
                  <input
                    id="banner-image"
                    type="url"
                    value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="banner-cta" className="block font-bold text-slate-700 mb-1">Button Text</label>
                    <input
                      id="banner-cta"
                      type="text"
                      value={newCta}
                      onChange={(e) => setNewCta(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5"
                    />
                  </div>
                  <div>
                    <label htmlFor="banner-link" className="block font-bold text-slate-700 mb-1">Destination URL</label>
                    <input
                      id="banner-link"
                      type="text"
                      value={newLink}
                      onChange={(e) => setNewLink(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5"
                    />
                  </div>
                </div>

                {createBannerMutation.isError && (
                  <p role="alert" className="flex items-center gap-2 text-rose-700 font-bold">
                    <AlertCircle className="h-4 w-4" />
                    {reason(createBannerMutation.error, 'The banner could not be created.')}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddBannerOpen(false)}
                    className="rounded-full border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createBannerMutation.isPending}
                    className="rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-5 py-2 font-bold text-white shadow-sm shadow-orange-500/20 cursor-pointer text-xs active:scale-95 disabled:opacity-50"
                  >
                    {createBannerMutation.isPending ? 'Saving…' : 'Save Banner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success hint that a write landed, without shadowing the server rows. */}
        {(createBannerMutation.isSuccess || createCouponMutation.isSuccess) && (
          <p className="flex items-center gap-2 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Saved to the database.
          </p>
        )}
      </div>
    </WorkspaceLayout>
  );
};
