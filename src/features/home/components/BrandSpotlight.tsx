import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Store, ArrowUpRight, Star } from 'lucide-react';
import { fetchStoreDirectory } from '../../vendor/api/store';

/**
 * Stores on Vendora — the real store directory.
 *
 * This section used to render eight invented "flagship partner" stores
 * (big-brand "official" stores with warranty and escrow-protection badges
 * that no partnership backs). It now reads the real
 * `vendor_profiles` directory through `fetchStoreDirectory`: the
 * `vendor_profiles_select_public` RLS policy exposes active stores to
 * everyone, so the same query the vendor workspace uses is public-safe.
 * (The `useStoreDirectory` hook stays unused here on purpose — it is gated
 * on a signed-in vendor scope, which a homepage visitor does not have.)
 *
 * Nothing on a card is asserted beyond the row itself: no partnership,
 * warranty, or escrow badges, and a store's rating is shown only when it
 * has reviews — the column defaults to 5.0 for stores nobody has reviewed,
 * so printing it for a zero-review store would repeat the fake-signal
 * problem this rewrite removes. When the directory is empty or fails to
 * load, the section renders nothing rather than placeholder stores.
 */
export const BrandSpotlight: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data, isError } = useQuery({
    queryKey: ['home', 'store-directory'],
    queryFn: ({ signal }) => fetchStoreDirectory(signal),
  });

  const stores = (data ?? []).filter((store) => store.status === 'active').slice(0, 12);

  if (isError || stores.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="mb-14">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700">
              <Store className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">
              Stores on Vendora
            </span>
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl font-outfit">
            Shop by Store
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            The sellers currently active on Vendora — every card is a real storefront.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll navigation arrows */}
          <button
            type="button"
            onClick={() => scroll('left')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            aria-label="Scroll stores left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            aria-label="Scroll stores right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Single-Row Scrollable Rail of Real Store Cards */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory"
      >
        {stores.map((store) => {
          const blurb = store.tagline || store.description;
          return (
            <Link
              key={store.id}
              to={`/vendors/${store.slug}`}
              className="group relative flex w-[260px] sm:w-[280px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[24px] border border-white/80 bg-white/75 p-5 backdrop-blur-md shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:bg-white/95 hover:shadow-xl hover:shadow-orange-500/5"
            >
              {/* Top row: Store logo / icon */}
              <div className="flex items-start justify-between">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt=""
                    className="h-12 w-12 rounded-2xl object-cover shadow-xs"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0C1046] to-[#1E1B4B] text-white shadow-xs group-hover:scale-105 transition-transform">
                    <Store className="h-6 w-6 text-amber-300" />
                  </div>
                )}
                {store.vacationMode && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/70">
                    On a break
                  </span>
                )}
              </div>

              {/* Middle: Store Info */}
              <div className="mt-4">
                <h3 className="font-outfit text-sm font-extrabold text-slate-900 group-hover:text-[#FF7A1A] transition-colors line-clamp-1">
                  {store.storeName}
                </h3>
                {blurb && (
                  <p className="text-[11px] font-medium text-slate-500 line-clamp-2 mt-0.5">
                    {blurb}
                  </p>
                )}
                {store.reviewCount > 0 && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-100/70 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>
                      {store.rating.toFixed(1)} · {store.reviewCount}{' '}
                      {store.reviewCount === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom: Visit Store */}
              <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3 text-[11px]">
                <span className="inline-flex items-center gap-1 font-bold text-[#FF7A1A] group-hover:underline">
                  Visit Store <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
