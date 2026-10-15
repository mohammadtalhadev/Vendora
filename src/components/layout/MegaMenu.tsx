import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Baby,
  Camera,
  ChevronRight,
  CookingPot,
  Dumbbell,
  Footprints,
  Gem,
  Headphones,
  MonitorSmartphone,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { ViewAllLink } from '../common/ViewAllLink';
import { useCategories, useProducts } from '../../features/catalog/hooks/useProducts';
import { formatPrice } from '../../store/currency-store';

export interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// One lucide icon per seeded category, keyed by slug. A slug the map does
// not know falls back to Tag so the menu never renders an entry iconless.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'audio-wearables': Headphones,
  'bags-luggage': ShoppingBag,
  'beauty-personal-care': Sparkles,
  'cameras-photo': Camera,
  'digital-products': MonitorSmartphone,
  electronics: Smartphone,
  fashion: Shirt,
  'home-kitchen': CookingPot,
  'jewelry-watches': Gem,
  'kids-baby': Baby,
  shoes: Footprints,
  'sports-outdoors': Dumbbell,
};

const FALLBACK_IMAGE = '/images/bevesi/1-13.jpg';

export const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose }) => {
  const { data: categoriesData, isLoading: isLoadingCategories, isError: categoriesError } = useCategories();
  const categories = categoriesData?.categories ?? [];

  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Hover and focus are progressive enhancement; click (and tap) always works.
  const focusedCategory = categories.find((c) => c.slug === activeSlug) ?? categories[0] ?? null;
  const paneCategory = focusedCategory;

  const {
    data: paneProducts,
    isLoading: isLoadingPane,
  } = useProducts({ category: paneCategory?.slug ?? '', limit: 8 }, Boolean(paneCategory));

  if (!isOpen) return null;

  return (
    <div
      id="all-categories-menu"
      aria-label="Browse all categories"
      className="absolute left-0 top-full mt-2.5 z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-1 text-slate-800 overflow-hidden w-[720px] lg:w-[840px] xl:w-[920px] max-w-[calc(100vw-24px)] flex flex-row"
    >
      {/* Column 1: Real seeded categories, rendered from useCategories() */}
      <div className="w-[260px] xl:w-[280px] shrink-0 border-r border-slate-100 py-2.5 bg-white select-none">
        {isLoadingCategories ? (
          <div className="flex items-center gap-2 px-4 py-6 text-xs font-medium text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-sun-orange border-t-transparent" />
            Loading categories...
          </div>
        ) : categoriesError ? (
          <div className="px-4 py-6 text-xs text-slate-500">
            Could not load categories.{' '}
            <Link to="/products" onClick={onClose} className="font-bold text-sun-orange hover:underline">
              Browse all products
            </Link>
          </div>
        ) : categories.length === 0 ? (
          <p className="px-4 py-6 text-xs text-slate-500">No categories are available yet.</p>
        ) : (
          <div className="space-y-0.5">
            {categories.map((cat) => {
              const isActive = paneCategory?.slug === cat.slug;
              const CategoryIcon = CATEGORY_ICONS[cat.slug] ?? Tag;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveSlug(cat.slug)}
                  onFocus={() => setActiveSlug(cat.slug)}
                  onMouseEnter={() => setActiveSlug(cat.slug)}
                  aria-expanded={isActive}
                  aria-controls="mega-menu-pane"
                  className={`group flex w-[calc(100%-12px)] items-center justify-between mx-1.5 rounded-xl px-4 py-2.5 text-[13px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60 ${
                    isActive
                      ? 'bg-orange-50 text-sun-orange font-bold'
                      : 'text-slate-800 hover:bg-slate-50 hover:text-sun-orange font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon
                      aria-hidden="true"
                      className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                        isActive
                          ? 'text-sun-orange'
                          : 'text-slate-400 group-hover:text-sun-orange'
                      }`}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isActive
                        ? 'text-sun-orange translate-x-0.5'
                        : 'text-slate-400 group-hover:text-sun-orange'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Column 2: Active pane with the category's real, approved products */}
      {paneCategory ? (
        <div
          id="mega-menu-pane"
          role="region"
          aria-label={`${paneCategory.name} products`}
          className="flex-1 min-w-0 p-6 bg-white flex flex-col justify-between max-h-[520px] overflow-y-auto"
        >
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {paneCategory.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live products from the Vendora catalog
              </p>
            </div>
            <ViewAllLink
              to={`/products?category=${encodeURIComponent(paneCategory.slug)}`}
              onClick={onClose}
              className="shrink-0"
            />
          </div>

          {isLoadingPane ? (
            <div className="flex items-center gap-2 py-8 text-xs font-medium text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sun-orange border-t-transparent" />
              Loading {paneCategory.name}...
            </div>
          ) : (paneProducts?.items.length ?? 0) === 0 ? (
            <p className="py-8 text-xs text-slate-500">
              No approved products are listed in {paneCategory.name} yet.{' '}
              <Link
                to={`/products?category=${encodeURIComponent(paneCategory.slug)}`}
                onClick={onClose}
                className="font-bold text-sun-orange hover:underline"
              >
                Check this category later
              </Link>
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {paneProducts?.items.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/products/${p.slug || p.id}`}
                    onClick={onClose}
                    className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-orange-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60"
                  >
                    <div className="w-12 h-12 shrink-0 rounded-lg bg-white border border-slate-100 p-1 flex items-center justify-center overflow-hidden group-hover:border-slate-300 transition-colors">
                      <img
                        src={p.images[0] ?? FALLBACK_IMAGE}
                        alt={p.title}
                        className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-sun-orange transition-colors">
                        {p.title}
                      </h4>
                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        <span className="text-xs font-bold text-emerald-600">{formatPrice(p.price)}</span>
                        {p.compareAtPrice !== undefined && p.compareAtPrice > p.price && (
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatPrice(p.compareAtPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-600">
              Shopping the full shelf?
            </span>
            <Link
              to={`/products?category=${encodeURIComponent(paneCategory.slug)}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sun-orange px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-sun-orange-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60"
            >
              <span>Explore All {paneCategory.name}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 p-6 text-xs text-slate-500">
          Select a category to preview its products.
        </div>
      )}
    </div>
  );
};
