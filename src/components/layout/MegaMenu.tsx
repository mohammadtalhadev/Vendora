import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Baby,
  BookOpen,
  Camera,
  Car,
  ChevronRight,
  CookingPot,
  Dumbbell,
  Footprints,
  Gamepad2,
  Gem,
  Headphones,
  HeartPulse,
  Laptop,
  MonitorSmartphone,
  PawPrint,
  Refrigerator,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  TabletSmartphone,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { ViewAllLink } from '../common/ViewAllLink';
import { useCategories, useProducts } from '../../features/catalog/hooks/useProducts';
import { formatPrice } from '../../store/currency-store';
import type { Category } from '../../types/domain';

export interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// One lucide icon per seeded root category, keyed by slug. A slug the map
// does not know falls back to Tag so the menu never renders an entry iconless.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'audio-wearables': Headphones,
  'automotive-motorbike': Car,
  'bags-luggage': ShoppingBag,
  'beauty-personal-care': Sparkles,
  'books-stationery': BookOpen,
  'cameras-photo': Camera,
  'computers-gaming': Laptop,
  'digital-products': MonitorSmartphone,
  electronics: Smartphone,
  fashion: Shirt,
  'furniture-decor': Sofa,
  'groceries-essentials': ShoppingBasket,
  'health-wellness': HeartPulse,
  'home-appliances': Refrigerator,
  'home-kitchen': CookingPot,
  'jewelry-watches': Gem,
  'kids-baby': Baby,
  'mobiles-accessories': TabletSmartphone,
  'pet-supplies': PawPrint,
  shoes: Footprints,
  'sports-outdoors': Dumbbell,
  'toys-games': Gamepad2,
};

const FALLBACK_IMAGE = '/images/bevesi/1-13.jpg';

export const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose }) => {
  const { data: categoriesData, isLoading: isLoadingCategories, isError: categoriesError } = useCategories();
  const allCategories = categoriesData?.categories ?? [];

  // The left column lists root categories only. The pane shows the active
  // root's subcategories as plain links (the layout the owner approved) with
  // the root's products below them.
  const roots = allCategories.filter((c) => !c.parentId);
  const childrenOf = (root: Category) => allCategories.filter((c) => c.parentId === root.id);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Hover and focus are progressive enhancement; click (and tap) always works.
  const paneCategory = roots.find((c) => c.slug === activeSlug) ?? roots[0] ?? null;
  const paneChildren = paneCategory ? childrenOf(paneCategory) : [];

  const {
    data: paneProducts,
    isLoading: isLoadingPane,
  } = useProducts({ category: paneCategory?.slug ?? '', limit: 8 }, Boolean(paneCategory));

  if (!isOpen) return null;

  return (
    <div
      id="all-categories-menu"
      aria-label="Browse all categories"
      data-lenis-prevent
      className="absolute left-0 top-full mt-2.5 z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-1 text-slate-800 overflow-hidden w-[720px] lg:w-[840px] xl:w-[920px] max-w-[calc(100vw-24px)] flex flex-row"
    >
      {/* Column 1: Root categories, rendered from useCategories() */}
      <div className="w-[260px] xl:w-[280px] shrink-0 border-r border-slate-100 py-2.5 bg-white select-none max-h-[560px] overflow-y-auto">
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
        ) : roots.length === 0 ? (
          <p className="px-4 py-6 text-xs text-slate-500">No categories are available yet.</p>
        ) : (
          <div className="space-y-0.5">
            {roots.map((cat) => {
              const hasChildren = childrenOf(cat).length > 0;
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
                        isActive ? 'text-sun-orange' : 'text-slate-400 group-hover:text-sun-orange'
                      }`}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  {hasChildren && (
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isActive ? 'text-sun-orange translate-x-0.5' : 'text-slate-400 group-hover:text-sun-orange'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Column 2: The active root's subcategory links, then its products */}
      {paneCategory ? (
        <div
          id="mega-menu-pane"
          role="region"
          aria-label={`${paneCategory.name} subcategories and products`}
          className="flex-1 min-w-0 p-6 bg-white flex flex-col max-h-[560px] overflow-y-auto"
        >
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {paneCategory.name}
              </h3>
              <ViewAllLink
                to={`/products?category=${encodeURIComponent(paneCategory.slug)}`}
                onClick={onClose}
                className="shrink-0"
              />
            </div>

            {paneChildren.length > 0 && (
              <ul className="mb-5 space-y-1 border-b border-slate-100 pb-4">
                {paneChildren.map((sub) => (
                  <li key={sub.id}>
                    <Link
                      to={`/products?category=${encodeURIComponent(sub.slug)}`}
                      onClick={onClose}
                      className="block rounded-lg px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-orange-50/70 hover:text-sun-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60"
                    >
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

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
          </div>
        </div>
      ) : (
        !isLoadingCategories &&
        !categoriesError && (
          <div className="flex-1 min-w-0 p-6 text-xs text-slate-500">
            Select a category to preview its products.
          </div>
        )
      )}
    </div>
  );
};
