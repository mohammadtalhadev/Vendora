import React, { useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ProductCard, type ProductItem } from './ProductCard';

export interface ProductCarouselWithoutTabsProps {
  /** Parent category title displayed as section heading (e.g. 'Beauty & Personal Care') */
  title: string;
  /** Category slug (e.g. 'beauty', 'appliances') used for View All link */
  categorySlug?: string;
  /** Products to display in the carousel */
  products: ProductItem[];
  /** Optional custom view all URL override */
  viewAllHref?: string;
  /** Add to cart handler */
  onAddToCart: (item: ProductItem) => void;
  /** Toggle wishlist handler */
  onToggleWishlist: (item: ProductItem) => void;
  /** Wishlist membership checker */
  isInWishlist: (productId: string) => boolean;
  /** Extra container class */
  className?: string;
}

export const ProductCarouselWithoutTabs: React.FC<ProductCarouselWithoutTabsProps> = ({
  title,
  categorySlug,
  products,
  viewAllHref,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
  className = 'mb-14',
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  const computedViewAllHref =
    viewAllHref || (categorySlug ? `/products?category=${encodeURIComponent(categorySlug)}&sort=best_selling` : '/products');

  const scrollContainer = useCallback((offset: number) => {
    const el = carouselRef.current;
    if (!el) return;
    const step = Math.max(Math.round(el.clientWidth * 0.85), 160) * Math.sign(offset);
    el.scrollBy({ left: step, behavior: 'smooth' });
  }, []);

  return (
    <section className={className}>
      {/* Header with Title, View All link & Scroll Arrows (No tabs) */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={computedViewAllHref}
            className="group mr-2 hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#FF7A1A] hover:text-white bg-orange-50/80 hover:bg-[#FF7A1A] border border-orange-200/70 hover:border-[#FF7A1A] shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
          >
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <button
            type="button"
            onClick={() => scrollContainer(-320)}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/60 bg-white/80 backdrop-blur-md shadow-2xs hover:bg-white text-slate-700 hover:scale-105 transition-all cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollContainer(320)}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/60 bg-white/80 backdrop-blur-md shadow-2xs hover:bg-white text-slate-700 hover:scale-105 transition-all cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Product Cards Track */}
      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-auto no-scrollbar py-2 -mx-1 px-1 cursor-grab active:cursor-grabbing select-none"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            style={{ scrollSnapAlign: 'start' }}
            className="w-[calc((100%-16px)/2)] sm:w-[calc((100%-32px)/3)] md:w-[calc((100%-48px)/4)] lg:w-[calc((100%-80px)/6)] shrink-0"
          >
            <ProductCard
              product={product}
              onAddToCart={onAddToCart}
              onToggleWishlist={onToggleWishlist}
              isWishlisted={isInWishlist(product.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
