import React, { useMemo } from 'react';
import { ProductCard, domainProductToCardItem, type ProductItem } from '../../products';
import { useProducts } from '../../catalog/hooks/useProducts';
import { useReveal } from '../../../hooks/useReveal';
import { SectionHeading } from './SectionHeading';

export interface RecommendedShelfProps {
  onAddToCart?: (product: ProductItem) => void;
  onToggleWishlist?: (product: ProductItem) => void;
  isInWishlist?: (id: string) => boolean;
}

/**
 * Recommended shelf. This used to render two invented product lists —
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
  useReveal();
  const { data } = useProducts({ sort: 'rating', page: 1, limit: 5 });

  const items: ProductItem[] = useMemo(
    () => (data?.items ?? []).map(domainProductToCardItem),
    [data],
  );

  if (items.length === 0) return null;

  return (
    <section className="reveal mb-14">
      {/* Header */}
      <SectionHeading
        title="Top-Rated Picks"
        subtitle="Top-rated products from verified sellers across the marketplace"
      />

      {/* Grid of Recommended Products using standard ProductCard */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.id} className="reveal h-full">
            <ProductCard
              product={item}
              onAddToCart={onAddToCart || (() => {})}
              onToggleWishlist={onToggleWishlist || (() => {})}
              isWishlisted={isInWishlist ? isInWishlist(item.id) : false}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
