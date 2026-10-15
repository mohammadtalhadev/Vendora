import React, { useState, useMemo } from 'react';
import { ProductCard, domainProductToCardItem, type ProductItem } from '../../products';
import { useProducts } from '../../catalog/hooks/useProducts';
import { GridSkeleton } from '../../../components/common/QueryState';
import { CategoryPill } from '../../../components/common/CategoryPill';
import { useReveal } from '../../../hooks/useReveal';

export interface DealsStripProps {
  onAddToCart?: (product: ProductItem) => void;
  onToggleWishlist?: (product: ProductItem) => void;
  isInWishlist?: (id: string) => boolean;
}

/**
 * Deals strip. The three tabs used to render 24 invented products; they
 * are now three views over the real catalogue (QA frontend-Critical-2):
 * best sellers by review volume, newest arrivals, and the deepest genuine
 * discounts (compare-at price above price), all priced in canonical PKR
 * through the shared card formatter.
 *
 * Batch 93 (owner points): the tabs are the shared CategoryPill, the
 * left promo column (CMS banner / built-in Tech Fest card) is gone so the
 * products own the full width, and each tab shows a single row of four.
 */
export const DealsStrip: React.FC<DealsStripProps> = ({
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
}) => {
  useReveal();
  const [activeTab, setActiveTab] = useState<'best-sellers' | 'new-arrivals' | 'best-offers'>('best-sellers');

  const { data: bestSellerData, isLoading: bestSellersLoading } = useProducts({
    sort: 'best_selling',
    page: 1,
    limit: 8,
  });
  const { data: newArrivalData, isLoading: newArrivalsLoading } = useProducts({
    sort: 'featured',
    page: 1,
    limit: 8,
  });
  const { data: offersPoolData, isLoading: offersLoading } = useProducts({
    sort: 'featured',
    page: 1,
    limit: 40,
  });

  const bestSellers = useMemo(
    () => (bestSellerData?.items ?? []).map(domainProductToCardItem).slice(0, 4),
    [bestSellerData],
  );
  const newArrivals = useMemo(
    () => (newArrivalData?.items ?? []).map(domainProductToCardItem).slice(0, 4),
    [newArrivalData],
  );
  const bestOffers = useMemo(
    () =>
      (offersPoolData?.items ?? [])
        .map(domainProductToCardItem)
        .filter((item) => item.compareAtPrice !== undefined && item.compareAtPrice > item.price)
        .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
        .slice(0, 4),
    [offersPoolData],
  );

  const products =
    activeTab === 'best-sellers'
      ? bestSellers
      : activeTab === 'new-arrivals'
      ? newArrivals
      : bestOffers;

  // Until the active tab's query lands, the grid shows the same card
  // skeletons the other home rails use (Batch 47 standard) instead of
  // flashing the "no deals" copy at a catalogue that simply has not
  // answered yet (Batch 48).
  const activeLoading =
    activeTab === 'best-sellers'
      ? bestSellersLoading
      : activeTab === 'new-arrivals'
      ? newArrivalsLoading
      : offersLoading;

  return (
    <section className="reveal mb-14">
      {/* Section Tabs: the shared CategoryPill (Batch 93) */}
      <div className="mb-7 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        <CategoryPill
          selected={activeTab === 'new-arrivals'}
          onClick={() => setActiveTab('new-arrivals')}
        >
          New Arrivals
        </CategoryPill>
        <CategoryPill
          selected={activeTab === 'best-sellers'}
          onClick={() => setActiveTab('best-sellers')}
        >
          Best Seller
        </CategoryPill>
        <CategoryPill
          selected={activeTab === 'best-offers'}
          onClick={() => setActiveTab('best-offers')}
        >
          Best Offers
        </CategoryPill>
      </div>

      {/* Products: one row of four, full width (Batch 93) */}
      {activeLoading ? (
        <GridSkeleton count={4} />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
        <div className="flex min-h-[200px] items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
          <p className="text-sm font-medium text-slate-500">
            No deals to show right now — new offers land here as sellers publish them.
          </p>
        </div>
      )}
    </section>
  );
};
