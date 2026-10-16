import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronRight, PackageCheck, Search, Star, Store } from 'lucide-react';
import { fetchStoreDirectory, fetchStoreOrderStats } from '../features/vendor/api/store';
import { StoreLogo } from '../features/vendor/components/StoreLogo';

/**
 * Official Brand Stores (/brands). Every card is a real store from the
 * `vendor_profiles` directory — the same source the homepage's Shop-by-Store
 * rail reads — and opens that brand's own page (/brands/:slug). The
 * hardcoded brand list with stock-photo "logos" and stores that did not
 * exist is gone.
 */
export const BrandsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['home', 'store-directory'],
    queryFn: ({ signal }) => fetchStoreDirectory(signal),
  });

  // Delivered-order counts for every active store, one query (the
  // public store_order_stats view, shared cache with the homepage rail).
  // fetchStoreOrderStats never rejects — before the migration runs on the
  // hosted database the map is simply empty and no card shows a count.
  const activeStoreIds = useMemo(
    () => (data ?? []).filter((store) => store.status === 'active').map((store) => store.id),
    [data],
  );
  const { data: orderStats } = useQuery({
    queryKey: ['home', 'store-order-stats', activeStoreIds],
    queryFn: ({ signal }) => fetchStoreOrderStats(activeStoreIds, signal),
    enabled: activeStoreIds.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const stores = useMemo(() => {
    const active = (data ?? []).filter((store) => store.status === 'active');
    const q = searchQuery.trim().toLowerCase();
    if (!q) return active;
    return active.filter(
      (store) =>
        store.storeName.toLowerCase().includes(q) ||
        store.tagline.toLowerCase().includes(q) ||
        store.description.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  return (
    <div className="pb-16 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
        >
          <Link to="/" className="transition-colors hover:text-sun-orange">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">Brand Stores</span>
        </nav>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl space-y-2">
            <h1 className="font-outfit text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Official Brand Stores
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              The brands and sellers with a live storefront on Vendora. Open a brand to
              see its page and products.
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands…"
              aria-label="Search brand stores"
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-sun-orange focus:outline-none sm:text-sm dark:border-white/10 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Loading brand stores"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : isError || stores.length === 0 ? (
          <div className="rounded-3xl border border-white/80 bg-white/80 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <Store className="mx-auto mb-2 h-10 w-10 text-slate-400" aria-hidden="true" />
            <h2 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
              {searchQuery ? 'No brands match your search' : 'No brand stores are live yet'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {searchQuery
                ? 'Try a different brand name.'
                : 'Check back soon — new stores are being reviewed.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 cursor-pointer rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-sun-orange-600"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <Link
                key={store.id}
                to={`/brands/${store.slug}`}
                className="group flex flex-col justify-between rounded-3xl border border-white/80 bg-white/75 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/75"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <StoreLogo
                      name={store.storeName}
                      logo={store.logo}
                      className="h-14 w-14 rounded-2xl ring-1 ring-slate-900/5"
                    />
                    {store.reviewCount > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <Star
                          className="h-3 w-3 fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />
                        {store.rating.toFixed(1)} ({store.reviewCount})
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="font-outfit text-lg font-black text-slate-900 transition-colors group-hover:text-sun-orange dark:text-white">
                      {store.storeName}
                    </h2>
                    {store.tagline && (
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {store.tagline}
                      </p>
                    )}
                    {store.description && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {store.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-sun-orange dark:border-white/5">
                  <div className="flex flex-col gap-1">
                    {orderStats?.get(store.id) !== undefined && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <PackageCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                        {orderStats.get(store.id)}{' '}
                        {orderStats.get(store.id) === 1 ? 'order' : 'orders'} delivered
                      </span>
                    )}
                    <span>View brand page</span>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Sell-on-Vendora strip */}
        <section className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/70 bg-slate-50 px-6 py-6 sm:px-8 md:flex-row md:items-center dark:border-white/10 dark:bg-slate-900/60">
          <div>
            <h2 className="font-outfit text-base font-bold text-slate-900 sm:text-lg dark:text-white">
              Run a brand of your own?
            </h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
              Apply to open a store on Vendora and get a brand page like these.
            </p>
          </div>
          <Link
            to="/become-a-seller"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-sun-orange px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-95 sm:text-sm"
          >
            Become a Seller
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
};

export default BrandsPage;
