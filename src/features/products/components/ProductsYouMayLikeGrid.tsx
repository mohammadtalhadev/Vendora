import React, { useMemo } from 'react';
import { useProducts } from '../../catalog/hooks/useProducts';
import { ProductCard, type ProductItem } from './ProductCard';
import { domainProductToCardItem } from '../mappers';
import { GridSkeleton } from '../../../components/common/QueryState';

interface ProductsYouMayLikeGridProps {
  /** The product being viewed, excluded from its own rail. */
  excludeId?: string;
  /** Same-category products lead the rail; featured products fill it. */
  category?: string;
  onAddToCart: (item: ProductItem) => void;
  onToggleWishlist: (item: ProductItem) => void;
  isInWishlist: (id: string) => boolean;
}

/**
 * "Products You May Like" rail on the product page. This replaces the old
 * "Customers Also Viewed" grid (owner's order): that section had
 * its own one-off card design — four across, a blue hover title — while the
 * rest of the storefront uses the shared ProductCard. This rail renders the
 * SAME shared ProductCard as everywhere else, six in one row on desktop
 * (the owner's one-row-of-six rule), fed by real catalogue products:
 * same-category first, featured products as fill, current product excluded.
 * It renders nothing when the catalogue has nothing to show.
 */
export const ProductsYouMayLikeGrid: React.FC<ProductsYouMayLikeGridProps> = ({
  excludeId,
  category,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
}) => {
  const { data: catData, isLoading: isCatLoading } = useProducts({
    category: category || undefined,
    page: 1,
    limit: 12,
  });
  const { data: allData, isLoading: isAllLoading } = useProducts({
    sort: 'featured',
    page: 1,
    limit: 12,
  });

  const items: ProductItem[] = useMemo(() => {
    const fromCat = (catData?.items ?? []).filter((product) => product.id !== excludeId);
    const seen = new Set(fromCat.map((product) => product.id));
    const fill = (allData?.items ?? []).filter(
      (product) => product.id !== excludeId && !seen.has(product.id),
    );
    return [...fromCat, ...fill].slice(0, 6).map(domainProductToCardItem);
  }, [catData, allData, excludeId]);

  if (items.length === 0) {
    if (isCatLoading || isAllLoading) {
      return (
        <section className="reveal mt-14 space-y-6" role="status" aria-label="Loading products you may like">
          <GridSkeleton count={6} />
        </section>
      );
    }
    return null;
  }

  return (
    <section className="reveal mt-14 space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-sun-orange">
          MORE TO EXPLORE
        </span>
        <h3 className="mt-1 font-outfit text-2xl font-black text-slate-900 tracking-tight">
          Products You May Like
        </h3>
      </div>

      {/* One row of six on desktop, the shared ProductCard throughout */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <div key={item.id} className="h-full">
            <ProductCard
              product={item}
              onAddToCart={onAddToCart}
              onToggleWishlist={onToggleWishlist}
              isWishlisted={isInWishlist(item.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
