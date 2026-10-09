import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ProductCard, type ProductItem } from './ProductCard';

export interface CarouselSubCategoryTab {
  id: string;
  name: string;
}

export interface ProductCarouselWithTabsProps {
  /** Parent category title displayed as section heading (e.g. 'Electronics') */
  title: string;
  /** Category slug (e.g. 'electronics') used for URL linking */
  categorySlug?: string;
  /** Sub-category tabs — MUST NOT include an "All Products" tab */
  tabs: CarouselSubCategoryTab[];
  /** Products belonging to this parent category */
  products: ProductItem[];
  /** Controlled active tab id (optional) */
  activeTabId?: string | null;
  /** Default active tab id (defaults to null: no tab selected) */
  defaultTabId?: string | null;
  /** Callback fired when a tab is selected or deselected */
  onTabChange?: (tabId: string | null) => void;
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

export const ProductCarouselWithTabs: React.FC<ProductCarouselWithTabsProps> = ({
  title,
  categorySlug = 'electronics',
  tabs,
  products,
  activeTabId: controlledActiveTabId,
  defaultTabId = null,
  onTabChange,
  viewAllHref,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
  className = 'mb-14',
}) => {
  const [internalActiveTabId, setInternalActiveTabId] = useState<string | null>(defaultTabId);
  const carouselRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledActiveTabId !== undefined;
  const currentTabId = isControlled ? controlledActiveTabId : internalActiveTabId;

  // Filter out any "all" tab defensively if passed accidentally
  const sanitizedTabs = useMemo(() => {
    return tabs.filter((t) => t.id.toLowerCase() !== 'all' && t.name.toLowerCase() !== 'all products');
  }, [tabs]);

  // When no tab is selected, rank all parent category products by best selling.
  // When a tab is selected, filter by that subCategoryId.
  const displayedProducts = useMemo(() => {
    if (!currentTabId) {
      return [...products].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0) || b.rating - a.rating);
    }
    return products.filter((p) => p.subCategoryId === currentTabId);
  }, [products, currentTabId]);

  // Dynamic View All destination:
  // When user clicks View All without selecting a tab, it leads to parent category all products ranked with best selling!
  // When a tab is selected, it filters by that subcategory and best selling.
  const computedViewAllHref = useMemo(() => {
    if (viewAllHref) return viewAllHref;
    if (!currentTabId) {
      return `/products?category=${encodeURIComponent(categorySlug)}&sort=best_selling`;
    }
    return `/products?category=${encodeURIComponent(categorySlug)}&subCategory=${encodeURIComponent(currentTabId)}&sort=best_selling`;
  }, [viewAllHref, categorySlug, currentTabId]);

  const handleTabClick = (tabId: string) => {
    // Clicking the already active tab toggles it off (deselection)
    const nextTab = currentTabId === tabId ? null : tabId;
    if (!isControlled) {
      setInternalActiveTabId(nextTab);
    }
    onTabChange?.(nextTab);

    if (carouselRef.current && typeof carouselRef.current.scrollTo === 'function') {
      carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const scrollContainer = useCallback((offset: number) => {
    const el = carouselRef.current;
    if (!el) return;
    const step = Math.max(Math.round(el.clientWidth * 0.85), 160) * Math.sign(offset);
    el.scrollBy({ left: step, behavior: 'smooth' });
  }, []);

  return (
    <section className={className}>
      {/* Header with Title, Subcategory Tabs, View All link & Scroll Arrows */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl whitespace-nowrap">
              {title}
            </h2>

            {/* Subcategory switcher pills (No "All Products" tab) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {sanitizedTabs.map((sub) => {
                const isSelected = currentTabId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleTabClick(sub.id)}
                    className={`cursor-pointer rounded-full px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                      isSelected
                        ? 'border border-[#0071DC] bg-[#EBF5FF] text-[#0071DC] shadow-2xs'
                        : 'border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {sub.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={computedViewAllHref}
            className="group mr-2 hidden sm:flex items-center gap-1 text-xs font-bold text-[#0071DC] hover:underline"
          >
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            onClick={() => scrollContainer(-320)}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-2xs hover:bg-slate-50 text-slate-700 hover:scale-105 transition-all cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollContainer(320)}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-2xs hover:bg-slate-50 text-slate-700 hover:scale-105 transition-all cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Product Cards Track */}
      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto no-scrollbar py-2 -mx-1 px-1 cursor-grab active:cursor-grabbing select-none"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {displayedProducts.map((product) => (
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
