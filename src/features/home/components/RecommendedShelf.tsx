import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { ProductCard, domainProductToCardItem, type ProductItem } from '../../products';
import { useProducts } from '../../catalog/hooks/useProducts';

export interface RecommendedShelfProps {
  onAddToCart?: (product: ProductItem) => void;
  onToggleWishlist?: (product: ProductItem) => void;
  isInWishlist?: (id: string) => boolean;
}

/**
 * "Curated Picks" shelf. This used to render two invented product lists —
 * including a "Recently Viewed" tab populated with products the visitor had
 * never seen, which no real tracking backed (QA frontend-Critical-2). The
 * shelf now shows the catalogue's top-rated real products; the fabricated
 * recently-viewed tab is gone until genuine view tracking exists.
 */
export const RecommendedShelf: React.FC<RecommendedShelfProps> = ({
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
}) => {
  const { data } = useProducts({ sort: 'rating', page: 1, limit: 5 });

  const items: ProductItem[] = useMemo(
    () => (data?.items ?? []).map(domainProductToCardItem),
    [data],
  );

  if (items.length === 0) return null;

  return (
    <section className="mb-14">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/10 text-[#FF7A1A]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF7A1A]">
              Personalized Discovery
            </span>
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl font-outfit">
            Curated Picks For You
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Top-rated products from verified sellers across the marketplace
          </p>
        </div>
      </div>

      {/* Grid of Recommended Products using standard ProductCard */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            product={item}
            onAddToCart={onAddToCart || (() => {})}
            onToggleWishlist={onToggleWishlist || (() => {})}
            isWishlisted={isInWishlist ? isInWishlist(item.id) : false}
          />
        ))}
      </div>
    </section>
  );
};
