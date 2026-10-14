import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, ShoppingCart, ArrowUpRight } from 'lucide-react';
import { useProducts } from '../../catalog/hooks/useProducts';
import { useCarouselScroll } from '../../../hooks/useCarouselScroll';
import { useCurrency } from '../../../store/currency-store';
import type { Product } from '../../../types/domain';

interface SimilarProductsCarouselProps {
  currentProductId: string;
  category?: string;
  sellerId?: string;
  sellerName?: string;
  onAddToCart: (product: Product) => void;
}

export const SimilarProductsCarousel: React.FC<SimilarProductsCarouselProps> = ({
  currentProductId,
  category,
  sellerName,
  onAddToCart,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollLeft, scrollRight } = useCarouselScroll(scrollContainerRef);
  const { formatPrice } = useCurrency();

  // Fetch similar products in same category supplemented by general catalog to guarantee 10+ items
  const { data: catData, isLoading: isCatLoading } = useProducts({
    category: category || undefined,
    limit: 18,
  });

  const { data: allData, isLoading: isAllLoading } = useProducts({
    limit: 24,
  });

  const isLoading = isCatLoading && isAllLoading;

  const similarItems = React.useMemo(() => {
    const fromCat = (catData?.items || []).filter((item) => item.id !== currentProductId);
    if (fromCat.length >= 10) return fromCat;

    const existingIds = new Set([currentProductId, ...fromCat.map((p) => p.id)]);
    const supplements = (allData?.items || []).filter((p) => !existingIds.has(p.id));
    return [...fromCat, ...supplements];
  }, [catData, allData, currentProductId]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (direction === 'left') scrollLeft();
    else scrollRight();
  };

  if (!isLoading && similarItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-14">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Similar products {sellerName ? `from ${sellerName}` : 'you might like'}
          </h2>
        </div>

        {/* Prev / Next circular buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleScroll('left')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
            aria-label="Previous products"
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
            aria-label="Next products"
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Carousel Track */}
      <div
        ref={scrollContainerRef}
        className="no-scrollbar flex gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-auto pb-4 pt-1 cursor-grab active:cursor-grabbing select-none"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="w-[calc((100%-16px)/2)] sm:w-[calc((100%-32px)/3)] md:w-[calc((100%-48px)/4)] lg:w-[calc((100%-80px)/6)] shrink-0 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-xs"
              >
                <div className="aspect-square w-full rounded-xl bg-slate-100" />
                <div className="mt-3 h-4 w-3/4 rounded-sm bg-slate-100" />
                <div className="mt-2 h-4 w-1/2 rounded-sm bg-slate-100" />
              </div>
            ))
          : similarItems.map((item) => (
              <div
                key={item.id}
                style={{ scrollSnapAlign: 'start' }}
                className="group flex w-[calc((100%-16px)/2)] sm:w-[calc((100%-32px)/3)] md:w-[calc((100%-48px)/4)] lg:w-[calc((100%-80px)/6)] shrink-0 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-xs transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div>
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white p-2.5">
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none select-none"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                    <span className="absolute top-2 left-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-xs backdrop-blur-xs">
                      {item.brand || 'Featured'}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="flex items-center gap-1 text-[11px] text-amber-500">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-slate-800">{item.rating}</span>
                      <span className="text-slate-400 truncate">({item.reviewCount})</span>
                    </div>

                    <Link to={`/products/${item.id}`} className="mt-1 block">
                      <h3 className="font-outfit line-clamp-2 text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>
                    </Link>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="min-w-0 pr-1">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 block truncate">
                      {formatPrice(item.price)}
                    </span>
                    {item.compareAtPrice && item.compareAtPrice > item.price && (
                      <span className="text-[11px] text-slate-400 line-through block truncate">
                        {formatPrice(item.compareAtPrice)}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onAddToCart(item)}
                    type="button"
                    title="Add to cart"
                    className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-sun-orange text-white shadow-xs hover:bg-sun-orange-600 transition-transform active:scale-95 cursor-pointer"
                  >
                    <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
};
