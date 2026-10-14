import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Star, ShoppingBag, Heart } from 'lucide-react';
import { useCurrency } from '../../../store/currency-store';
import { domainProductToCardItem, type ProductItem } from '../../products';
import { useProducts } from '../../catalog/hooks/useProducts';
import { useReveal } from '../../../hooks/useReveal';
import { SectionHeading } from './SectionHeading';
import { RailEmptyState } from '../../products/components/RailEmptyState';
import { GridSkeleton, Skeleton } from '../../../components/common/QueryState';

export interface BestSellersRailProps {
  onAddToCart?: (product: ProductItem) => void;
  onToggleWishlist?: (product: ProductItem) => void;
  isInWishlist?: (id: string) => boolean;
}

type RankedItem = ProductItem & { rank: number };

/** Tab ids are the mapped card categories (upper-cased catalogue category names). */
const CATEGORY_TABS = [
  { id: 'all', label: 'All Best Sellers' },
  { id: 'AUDIO & WEARABLES', label: 'Audio & Wearables' },
  { id: 'ELECTRONICS', label: 'Smartphones & Tech' },
  { id: 'BEAUTY & PERSONAL CARE', label: 'Beauty & Skincare' },
  { id: 'HOME & KITCHEN', label: 'Home Appliances' },
];

export const BestSellersRail: React.FC<BestSellersRailProps> = ({
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
}) => {
  useReveal();
  const { formatPrice } = useCurrency();
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Real best sellers: the catalogue's best_selling sort (review volume).
  // The rail used to rank six invented products with fabricated "units sold"
  // strings (QA frontend-Critical-2); rank is now the product's position in
  // the real list and the velocity pill shows its genuine review count.
  const { data, isLoading } = useProducts({ sort: 'best_selling', page: 1, limit: 12 });
  const rankedItems: RankedItem[] = useMemo(
    () =>
      (data?.items ?? []).map((product, index) => ({
        ...domainProductToCardItem(product),
        rank: index + 1,
      })),
    [data],
  );

  // Tabs only ever name categories that HAVE products in this rail — a tab
  // that filters to zero is a dead end (Batch 22J). If the selected tab's
  // category empties out, the rail falls back to "all" rather than a hole.
  const visibleTabs = CATEGORY_TABS.filter(
    (tab) => tab.id === 'all' || rankedItems.some((item) => item.category === tab.id),
  );
  const effectiveCategory = visibleTabs.some((tab) => tab.id === selectedCategory)
    ? selectedCategory
    : 'all';

  const filteredItems = rankedItems.filter((item) => {
    if (effectiveCategory === 'all') return true;
    return item.category === effectiveCategory;
  });

  if (rankedItems.length === 0) {
    if (isLoading) {
      // Page-shaped skeleton while the ranking query is in flight (Batch 47)
      // — the rail used to vanish and pop in.
      return (
        <section className="reveal mb-14" role="status" aria-label="Loading best sellers">
          <Skeleton className="mb-6 h-8 w-56" />
          <GridSkeleton count={4} />
        </section>
      );
    }
    return (
      <section className="reveal mb-14">
        <SectionHeading
          eyebrow={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sun-orange-700">
              <Trophy className="h-3.5 w-3.5 text-sun-orange" />
              Official Leaderboard
            </span>
          }
          title="Best-Sellers Rail"
          subtitle="Top-rated products ranked by genuine customer review volume"
        />
        <RailEmptyState message="No best sellers to rank yet — check back after the next restock." />
      </section>
    );
  }

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-md shadow-amber-500/30';
    if (rank === 2) return 'bg-slate-300 text-slate-900 ring-2 ring-slate-200 shadow-sm';
    if (rank === 3) return 'bg-amber-700 text-amber-50 ring-2 ring-amber-600 shadow-sm';
    return 'bg-slate-900/80 text-white backdrop-blur-xs';
  };

  return (
    <section className="reveal mb-14">
      {/* Header with Title and Category Filters */}
      <SectionHeading
        eyebrow={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sun-orange-700">
            <Trophy className="h-3.5 w-3.5 text-sun-orange" />
            Official Leaderboard
          </span>
        }
        title="Best-Sellers Rail"
        subtitle="Top-rated products ranked by genuine customer review volume"
        action={
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {visibleTabs.map((tab) => {
            const isActive = effectiveCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-sun-orange text-white shadow-md shadow-orange-500/25 border border-sun-orange'
                    : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          </div>
        }
      />

      {/* Grid of Best Sellers */}
      {filteredItems.length === 0 ? (
        <RailEmptyState />
      ) : (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {filteredItems.map((item) => {
          const wishlisted = isInWishlist ? isInWishlist(item.id) : false;
          return (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-white/80 bg-white/75 p-3.5 backdrop-blur-md shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:bg-white/95 hover:shadow-xl hover:shadow-orange-500/10"
            >
              {/* Product Thumbnail & Rank Pill */}
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white p-2.5">
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-105"
                />

                {/* Rank Badge */}
                <span
                  className={`absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${getRankBadgeClass(
                    item.rank
                  )}`}
                >
                  #{item.rank}
                </span>

                {/* Wishlist Button */}
                <button
                  type="button"
                  onClick={() => onToggleWishlist && onToggleWishlist(item)}
                  className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full transition-all cursor-pointer ${
                    wishlisted
                      ? 'bg-rose-50 text-rose-500 shadow-sm'
                      : 'bg-white/80 text-slate-500 hover:bg-white hover:text-sun-orange hover:ring-2 hover:ring-sun-orange backdrop-blur-xs'
                  }`}
                  title="Save to wishlist"
                >
                  <Heart className={`h-3.5 w-3.5 ${wishlisted ? 'fill-rose-500' : ''}`} />
                </button>

                {/* Review Volume Pill — the standard card badge: small frosted
                    white pill with a star (the old full-width dark bar with a
                    lightning bolt broke the badge system, Batch 22M) */}
                {item.reviewCount > 0 && (
                  <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/85 px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-xs backdrop-blur-md">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {item.reviewCount} reviews
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {item.category}
                </p>
                <Link
                  to={`/products/${item.id}`}
                  className="mt-1 line-clamp-2 text-xs font-bold leading-snug text-slate-900 group-hover:text-sun-orange transition-colors"
                >
                  {item.title}
                </Link>

                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{item.rating}</span>
                  <span className="text-[10px] text-slate-400">({item.reviewCount})</span>
                </div>
              </div>

              {/* Pricing & Add to Cart */}
              <div className="mt-3 border-t border-slate-100 pt-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-outfit text-sm font-black text-slate-900">
                    {formatPrice(item.price)}
                  </span>
                  {item.compareAtPrice && (
                    <span className="font-outfit text-[11px] text-slate-400 line-through">
                      {formatPrice(item.compareAtPrice)}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onAddToCart && onAddToCart(item)}
                  className="cursor-pointer mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-sun-orange py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-sun-orange-600 active:scale-95"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Add to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
};
