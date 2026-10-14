import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Store, ArrowUpRight, Star } from 'lucide-react';
import { fetchStoreDirectory } from '../../vendor/api/store';
import { StoreLogo } from '../../vendor/components/StoreLogo';
import { SectionHeading } from './SectionHeading';
import { useReveal } from '../../../hooks/useReveal';

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
 *
 * Batch 51 (owner points) asked for orders-delivered and response-time on
 * these cards too. Neither has a public data source today: order counts
 * live in `sub_orders`, which no public policy or aggregate view exposes
 * (it would take a migration), and seller response time is not recorded
 * anywhere. Both are deliberately omitted rather than estimated — the
 * stat row carries only the real rating/review rollup.
 */
export const BrandSpotlight: React.FC = () => {
  useReveal();
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
    <section className="reveal mb-14">
      {/* Header */}
      <SectionHeading
        eyebrow={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sun-orange-700">
            <Store className="h-3.5 w-3.5 text-sun-orange" />
            Stores on Vendora
          </span>
        }
        title="Shop by Store"
        subtitle="The sellers currently active on Vendora — every card is a real storefront."
        action={
          <div className="flex items-center gap-2">
          {/* Scroll navigation arrows */}
          <button
            type="button"
            onClick={() => scroll('left')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-sun-orange hover:bg-orange-50 hover:text-sun-orange transition-all cursor-pointer"
            aria-label="Scroll stores left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-sun-orange hover:bg-orange-50 hover:text-sun-orange transition-all cursor-pointer"
            aria-label="Scroll stores right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          </div>
        }
      />

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
                <StoreLogo
                  name={store.storeName}
                  logo={store.logo}
                  className="h-12 w-12 rounded-2xl shadow-xs ring-1 ring-slate-900/5"
                />
                {store.vacationMode && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/70">
                    On a break
                  </span>
                )}
              </div>

              {/* Middle: Store Info */}
              <div className="mt-4">
                <h3 className="font-outfit text-sm font-extrabold text-slate-900 group-hover:text-sun-orange transition-colors line-clamp-1">
                  {store.storeName}
                </h3>
                {blurb && (
                  <p className="text-[11px] font-medium text-slate-500 line-clamp-2 mt-0.5">
                    {blurb}
                  </p>
                )}
              </div>

              {/* Bottom: the card's one minimal stat row — the store's real
                  rating/review rollup on the left (only when it has reviews),
                  Visit Store on the right. */}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px]">
                {store.reviewCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>
                      {store.rating.toFixed(1)} · {store.reviewCount}{' '}
                      {store.reviewCount === 1 ? 'review' : 'reviews'}
                    </span>
                  </span>
                ) : (
                  <span aria-hidden="true" />
                )}
                <span className="inline-flex shrink-0 items-center gap-1 font-bold text-sun-orange group-hover:underline">
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
