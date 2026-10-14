import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard, domainProductToCardItem, type ProductItem } from '../../products';
import { useProducts } from '../../catalog/hooks/useProducts';
import { useReveal } from '../../../hooks/useReveal';

export interface DealsStripProps {
  onAddToCart?: (product: ProductItem) => void;
  onToggleWishlist?: (product: ProductItem) => void;
  isInWishlist?: (id: string) => boolean;
}

/**
 * Flash-deals strip. The three tabs used to render 24 invented products; they
 * are now three views over the real catalogue (QA frontend-Critical-2):
 * best sellers by review volume, newest arrivals, and the deepest genuine
 * discounts (compare-at price above price), all priced in canonical PKR
 * through the shared card formatter.
 */
export const DealsStrip: React.FC<DealsStripProps> = ({
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
}) => {
  useReveal();
  const [activeTab, setActiveTab] = useState<'best-sellers' | 'new-arrivals' | 'best-offers'>('best-sellers');

  const { data: bestSellerData } = useProducts({ sort: 'best_selling', page: 1, limit: 8 });
  const { data: newArrivalData } = useProducts({ sort: 'featured', page: 1, limit: 8 });
  const { data: offersPoolData } = useProducts({ sort: 'featured', page: 1, limit: 40 });

  const bestSellers = useMemo(
    () => (bestSellerData?.items ?? []).map(domainProductToCardItem),
    [bestSellerData],
  );
  const newArrivals = useMemo(
    () => (newArrivalData?.items ?? []).map(domainProductToCardItem),
    [newArrivalData],
  );
  const bestOffers = useMemo(
    () =>
      (offersPoolData?.items ?? [])
        .map(domainProductToCardItem)
        .filter((item) => item.compareAtPrice !== undefined && item.compareAtPrice > item.price)
        .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
        .slice(0, 8),
    [offersPoolData],
  );

  const maxDiscount = useMemo(
    () => bestOffers.reduce((max, item) => Math.max(max, item.discountPercent ?? 0), 0),
    [bestOffers],
  );



  const products =
    activeTab === 'best-sellers'
      ? bestSellers
      : activeTab === 'new-arrivals'
      ? newArrivals
      : bestOffers;

  return (
    <section className="reveal mb-14">
      {/* Top Centered Section Tabs matching the user screenshot */}
      <div className="mb-7 flex items-center justify-center gap-6 sm:gap-10 border-b border-slate-200/80 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('new-arrivals')}
          className={`cursor-pointer font-outfit text-base sm:text-lg font-bold hover-lift ${
            activeTab === 'new-arrivals'
              ? 'text-sun-orange border-b-2 border-sun-orange pb-3 -mb-[17px] font-extrabold'
              : 'text-slate-500 hover:text-sun-orange'
          }`}
        >
          New Arrivals
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('best-sellers')}
          className={`cursor-pointer font-outfit text-base sm:text-lg font-bold hover-lift ${
            activeTab === 'best-sellers'
              ? 'text-sun-orange border-b-2 border-sun-orange pb-3 -mb-[17px] font-extrabold'
              : 'text-slate-500 hover:text-sun-orange'
          }`}
        >
          Best Seller
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('best-offers')}
          className={`cursor-pointer font-outfit text-base sm:text-lg font-bold hover-lift ${
            activeTab === 'best-offers'
              ? 'text-sun-orange border-b-2 border-sun-orange pb-3 -mb-[17px] font-extrabold'
              : 'text-slate-500 hover:text-sun-orange'
          }`}
        >
          Best Offers
        </button>
      </div>

      {/* Main Grid: Left Tall Promo Card + Right 4x2 Grid of Standard ProductCards */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        {/* Left Column: Tall Promo Card */}
        <div className="group relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-[26px] bg-black p-6 sm:p-7 text-white shadow-lg lg:col-span-3">
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />

          {/* Middle: Hero Graphic Preview */}
          <div className="relative z-10 my-auto flex items-center justify-center py-4">
            <img
              src="/images/bevesi/art_elec_phones.png"
              alt="Smartphones and audio on sale"
              className="max-h-56 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          {/* Bottom: Campaign Title + Subtitle + Shop Now */}
          <div className="relative z-10 text-center">
            <h3 className="font-outfit text-2xl font-black tracking-tight text-white sm:text-[26px]">
              Tech Fest 2026
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              {maxDiscount > 0
                ? `Up to ${maxDiscount}% off flagship devices`
                : 'Fresh deals from verified sellers'}
            </p>
            <Link
              to="/deals"
              className="mt-4 inline-flex items-center justify-center gap-1 font-outfit text-sm font-bold text-sun-orange hover:underline"
            >
              <span>Shop Now</span>
            </Link>
          </div>
        </div>

        {/* Right Column: 4 Columns x 2 Rows (8 Standard ProductCards) */}
        <div className="lg:col-span-9">
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {products.map((p) => (
                <div key={p.id} className="reveal h-full">
                  <ProductCard
                    product={p}
                    onAddToCart={onAddToCart || (() => {})}
                    onToggleWishlist={onToggleWishlist || (() => {})}
                    isWishlisted={isInWishlist ? isInWishlist(p.id) : false}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
              <p className="text-sm font-medium text-slate-500">
                No deals to show right now — new offers land here as sellers publish them.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
