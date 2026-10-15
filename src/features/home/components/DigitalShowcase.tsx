import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DownloadCloud, ChevronRight } from 'lucide-react';
import { ProductCard, domainProductToCardItem, type ProductItem } from '../../products';
import { useProducts } from '../../catalog/hooks/useProducts';
import { useReveal } from '../../../hooks/useReveal';
import { SectionHeading } from './SectionHeading';
import { BannerCta } from './BannerCta';
import { GridSkeleton, Skeleton } from '../../../components/common/QueryState';
import type { Product } from '../../../types/domain';

export interface DigitalShowcaseProps {
  onAddToCart?: (product: ProductItem) => void;
  onToggleWishlist?: (product: ProductItem) => void;
  isInWishlist?: (id: string) => boolean;
}

/**
 * Digital Goods & Software Vault (Batch 51, owner points).
 *
 * The section used to render its own frosted-glass card design — gradient
 * icon tiles, licence chips, an "Instant Access" button — that existed
 * nowhere else on the site, while the category page rendered the very
 * same digital products through the shared ProductCard and looked right.
 * The custom card is gone: this section is now a standard home rail —
 * SectionHeading plus the shared ProductCard, exactly like the other
 * shelves — so a digital product looks identical wherever it appears.
 *
 * The old trust strip went with the custom shell: two of its four claims
 * ("100% Genuine Encrypted", "48h Escrow Guarantee") asserted things the
 * platform does not do, and no other home section carries such a strip.
 * The products themselves are the catalogue's real digital products
 * (Batch-era fix): title, price, rating and review count come from the
 * database, and Add to Cart adds that genuine product.
 */
export const DigitalShowcase: React.FC<DigitalShowcaseProps> = ({
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
}) => {
  useReveal();
  const { data, isLoading } = useProducts({ type: 'digital', page: 1, limit: 6 });

  const items: ProductItem[] = useMemo(
    () => (data?.items ?? []).map((product: Product) => domainProductToCardItem(product)),
    [data],
  );

  if (isLoading) {
    return (
      <section className="reveal mb-14" role="status" aria-label="Loading digital goods">
        <Skeleton className="mb-6 h-8 w-56" />
        <GridSkeleton count={6} />
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="reveal mb-14">
      <SectionHeading
        title="Digital Goods & Software Vault"
        subtitle="Licences, design systems, codebases and media packs from Vendora sellers — delivered to your downloads after checkout."
        action={
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/downloads"
              className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/70 bg-orange-50/80 px-3.5 py-1.5 text-xs font-bold text-sun-orange shadow-2xs transition-all duration-200 hover:bg-sun-orange hover:text-white"
            >
              <DownloadCloud className="h-4 w-4" />
              <span>My Vault</span>
            </Link>
            <BannerCta to="/products?category=digital-products">
              <span>Explore All Digital</span>
              <ChevronRight className="h-4 w-4" />
            </BannerCta>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
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
