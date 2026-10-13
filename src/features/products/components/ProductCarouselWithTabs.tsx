import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ProductCard, type ProductItem } from './ProductCard';

export interface CarouselChildCategory {
  id: string;
  name: string;
}

export interface CarouselSubCategoryTab {
  id: string;
  name: string;
  children?: CarouselChildCategory[];
}

export interface ProductCarouselWithTabsProps {
  /** Parent category title displayed as section heading (e.g. 'Electronics') */
  title: string;
  /** Category slug (e.g. 'electronics') used for URL linking */
  categorySlug?: string;
  /** Sub-category tabs — MUST NOT include an "All Products" tab, max 4 displayed */
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
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledActiveTabId !== undefined;
  const currentTabId = isControlled ? controlledActiveTabId : internalActiveTabId;

  // Filter out any "all" tab defensively if passed accidentally, and strictly limit to 4 tabs
  const sanitizedTabs = useMemo(() => {
    return tabs
      .filter((t) => t.id.toLowerCase() !== 'all' && t.name.toLowerCase() !== 'all products')
      .slice(0, 4);
  }, [tabs]);

  const activeSub = useMemo(() => sanitizedTabs.find((t) => t.id === currentTabId), [sanitizedTabs, currentTabId]);
  const activeChildCategories = activeSub?.children || [];

  // When no tab is selected, rank all parent category products by best selling.
  // When a tab is selected, filter by that subCategoryId (and childCategoryId if chosen).
  const displayedProducts = useMemo(() => {
    if (!currentTabId) {
      return [...products].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0) || b.rating - a.rating);
    }
    let list = products.filter((p) => p.subCategoryId === currentTabId);
    if (activeChildId) {
      list = list.filter((p) => p.childCategoryId === activeChildId);
    }
    return list;
  }, [products, currentTabId, activeChildId]);

  // Dynamic View All destination:
  // When user clicks View All without selecting a tab, it leads to parent category all products ranked with best selling!
  // When a tab is selected, it filters by that subcategory and best selling.
  const computedViewAllHref = useMemo(() => {
    if (viewAllHref) return viewAllHref;
    if (!currentTabId) {
      return `/products?category=${encodeURIComponent(categorySlug)}&sort=best_selling`;
    }
    if (activeChildId) {
      return `/products?category=${encodeURIComponent(categorySlug)}&subCategory=${encodeURIComponent(currentTabId)}&childCategory=${encodeURIComponent(activeChildId)}&sort=best_selling`;
    }
    return `/products?category=${encodeURIComponent(categorySlug)}&subCategory=${encodeURIComponent(currentTabId)}&sort=best_selling`;
  }, [viewAllHref, categorySlug, currentTabId, activeChildId]);

  const handleTabClick = (tabId: string) => {
    // Clicking the already active tab toggles it off (deselection)
    const nextTab = currentTabId === tabId ? null : tabId;
    if (!isControlled) {
      setInternalActiveTabId(nextTab);
    }
    setActiveChildId(null);
    onTabChange?.(nextTab);

    if (carouselRef.current && typeof carouselRef.current.scrollTo === 'function') {
      carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const handleChildClick = (childId: string) => {
    const nextChild = activeChildId === childId ? null : childId;
    setActiveChildId(nextChild);
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
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl whitespace-nowrap">
              {title}
            </h2>

            {/* Subcategory switcher pills (Up to 4 categories) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {sanitizedTabs.map((sub) => {
                const isSelected = currentTabId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleTabClick(sub.id)}
                    className={`cursor-pointer rounded-full px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap backdrop-blur-md ${
                      isSelected
                        ? 'border border-sun-orange bg-orange-500/10 text-sun-orange shadow-2xs font-bold'
                        : 'border border-slate-200/80 bg-white/70 text-slate-800 hover:border-slate-300 hover:bg-white hover:text-slate-900'
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
            className="group mr-2 hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-sun-orange hover:text-white bg-orange-50/80 hover:bg-sun-orange border border-orange-200/70 hover:border-sun-orange shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
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

      {/* Sub-category child filter pills with breadcrumb path */}
      {activeSub && activeChildCategories.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/70 p-2.5 sm:px-4 sm:py-2.5 shadow-2xs backdrop-blur-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mr-1.5 shrink-0">
            <span className="font-bold text-slate-700">{title}</span>
            <span className="text-slate-400 font-bold">&rsaquo;</span>
            <span className="font-extrabold text-sun-orange">{activeSub.name}</span>
            {activeChildId && (
              <>
                <span className="text-slate-400 font-bold">&rsaquo;</span>
                <span className="font-extrabold text-slate-900">
                  {activeChildCategories.find((c) => c.id === activeChildId)?.name}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleChildClick('')}
              className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                !activeChildId
                  ? 'bg-sun-orange text-white shadow-xs'
                  : 'bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/70'
              }`}
            >
              All {activeSub.name}
            </button>

            {activeChildCategories.map((child) => {
              const isChildActive = activeChildId === child.id;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleChildClick(child.id)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                    isChildActive
                      ? 'bg-sun-orange text-white shadow-xs'
                      : 'bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/70'
                  }`}
                >
                  {child.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Product Cards Track */}
      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-auto no-scrollbar py-2 -mx-1 px-1 cursor-grab active:cursor-grabbing select-none"
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
