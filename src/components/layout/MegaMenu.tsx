import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useCategories, useProducts } from '../../features/catalog/hooks/useProducts';
import { formatPrice } from '../../store/currency-store';

export interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// Decorative icons for categories that exist in the seed; every other real
// category falls back to a generic tag icon so the menu never renders an
// entry that isn't backed by the seeded catalog.
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  electronics: (
    <path d="M6.00225 8.00007C6.00223 3.00208 7 3.00208 11 3.00208H13.0001C17 3.00201 18 3.00208 18 8.00005L18.0002 9.22872C18.0007 11.3213 18.0016 14.9356 17.9978 16C17.9799 20.998 17 21 13 21H11C6.99998 21 6.00222 20.998 6.00223 16C6.00223 15.6488 6.0019 15.0198 6.0015 14.2596C6.00039 12.1341 5.99873 8.98209 6.00225 8.00007ZM10 6C10 6.55229 10.4477 7 11 7H13C13.5523 7 14 6.55229 14 6C14 5.44772 13.5523 5 13 5H11C10.4477 5 10 5.44772 10 6ZM12 19C12.5523 19 13 18.5523 13 18C13 17.4477 12.5523 17 12 17C11.4477 17 11 17.4477 11 18C11 18.5523 11.4477 19 12 19Z" />
  ),
  fashion: (
    <path d="M6 15C6 19 6.3569 20 12 20C17.6431 20 18 19 18 15C18 11.9153 17.8642 11.1143 18.2018 10.7372C18.4114 10.5031 18.8036 10.4324 19.5241 10.08C21.4052 9.16 21.4052 9 19.9944 6.5C19.5241 5.66667 18.5836 4 16.7026 4C14.8215 4 14.5864 4.5 14.3513 5C14.1162 5.5 13.881 6 12 6C10.1295 6 9.88653 5.5056 9.64216 5.00843C9.39503 4.50563 9.14651 4 7.21192 4C5.41639 4 4.47587 5.66666 4.00561 6.5C2.59485 9 2.59484 9.16 4.47587 10.08C5.193 10.4307 5.58486 10.5141 5.79522 10.7555C6.13664 11.1473 6 11.9557 6 15ZM13 9H14C14.5523 9 15 9.44772 15 10C15 10.5523 14.5523 11 14 11H13C12.4477 11 12 10.5523 12 10C12 9.44772 12.4477 9 13 9Z" />
  ),
  'home-kitchen': (
    <>
      <path d="M12 3C18.125 3 19 4 19 8.5C19 9.5 18.931 9.76658 17.5 10.1154C16.9145 10.2582 16.3867 10.5357 15.9612 10.9612C15.6607 11.2617 15.434 11.6132 15.2765 12C15.2428 12.0827 15.2132 12.1585 15.1861 12.2279C14.9897 12.7312 14.9239 12.8997 14.3726 12.9402C13.564 12.9995 12.601 13 12 13C11.399 13 10.436 12.9995 9.62736 12.9402C9.07606 12.8997 9.01032 12.7313 8.8139 12.228C8.7868 12.1585 8.75721 12.0827 8.72352 12C8.56599 11.6132 8.3393 11.2617 8.03879 10.9612C7.61326 10.5357 7.08554 10.2582 6.5 10.1154C5.06895 9.76658 5 9.5 5 8.5C5 4 5.875 3 12 3Z" />
      <path d="M18.5 11C16.9488 11 16 11.9488 16 13.5C16 14.5 8 14.5 8 13.5C8 11.9488 7.05117 11 5.5 11C3.94883 11 3 11.9488 3 13.5C3 14.6822 3.55113 15.5145 4.5 15.8436C4.5661 15.8665 4.62347 15.8851 4.67328 15.9013C4.82391 15.9501 4.90526 15.9764 4.94913 16.0323C5.00062 16.0978 5.00045 16.2039 5.00007 16.4347L5 16.5C5 17.4901 5.28593 18.1126 6.28243 18.4888L6.01943 19.8038C5.91112 20.3454 6.26233 20.8722 6.80389 20.9805C7.34545 21.0888 7.87228 20.7376 7.98059 20.1961L8.24526 18.8727C9.20603 18.964 10.4351 19 12 19C13.3096 19 14.384 18.9748 15.2628 18.9131L15.5194 20.1961C15.6277 20.7376 16.1545 21.0888 16.6961 20.9805C17.2377 20.8722 17.5889 20.3454 17.4806 19.8038L17.2468 18.635C18.6267 18.2826 19 17.6313 19 16.5L18.9999 16.4347C18.9996 16.2039 18.9994 16.0978 19.0509 16.0323C19.0947 15.9764 19.1761 15.9501 19.3267 15.9013C19.3765 15.8851 19.4339 15.8665 19.5 15.8436C20.4489 15.5145 21 14.6822 21 13.5C21 11.9488 20.0512 11 18.5 11Z" />
    </>
  ),
  'beauty-personal-care': (
    <>
      <path d="M16 5.23677C16 4.00203 15.0232 3 13.8182 3C13.0814 3 12.4068 3.37607 12 3.9573C11.5932 3.37607 10.9186 3 10.1818 3C8.97677 3 8 4.00203 8 5.23677C8 7.16004 10.1014 9 12 9C13.8983 9 16 7.15989 16 5.23677Z" />
      <path d="M7 9C5 9 3 11.0638 3 14C3 18.941 6.2355 21 12 21C17.7645 21 21 18.941 21 14C21 11.0638 19 9 17 9C15 9 13.8458 10 12 10C10.1542 10 9 9 7 9ZM12 17C10.3431 17 9 16.3284 9 15.5C9 14.6716 10.3431 14 12 14C13.6569 14 15 14.6716 15 15.5C15 16.3284 13.6569 17 12 17Z" />
    </>
  ),
  'kids-baby': (
    <path d="M11.5 3C14.6765 2.99998 16.7647 4 16.7647 4.5C16.7647 5.08035 16.1307 5.43616 15.292 5.65431C15.5734 6.36158 15.7059 7.1635 15.7059 8C15.7059 8.60781 15.4851 8.87958 14.6471 9C12.2074 9.35056 8.29412 10.7594 8.29412 13.5C8.29412 14.5682 8.76048 15.4594 9.5438 16.0747C10.3183 16.6832 11.372 17 12.5294 17C13.7685 17 14.8221 16.4168 15.5508 15.7285C15.9176 15.3822 16.2149 14.9978 16.423 14.6226C16.6265 14.2557 16.7647 13.8611 16.7647 13.5C16.7647 13.2239 16.5277 13 16.2353 13C15.9429 13 15.7059 13.2239 15.7059 13.5C15.7059 13.6389 15.6455 13.8693 15.4851 14.1586C15.3292 14.4397 15.0971 14.7428 14.8021 15.0214C14.2073 15.5832 13.4079 16 12.5294 16C11.5692 16 10.7699 15.7373 10.2209 15.3059C9.6807 14.8816 9.35294 14.2727 9.35294 13.5C9.35294 12.3347 10.3761 11.4525 12.0577 10.8417C12.7447 10.5921 13.794 10.3862 14.6681 10.2146C15.0678 10.1362 15.4308 10.0649 15.7059 10C16.7914 9.7437 17.4752 9.50606 17.991 9.3268C18.5654 9.12721 18.9314 9 19.4118 9C20.9782 9 21 11 21 13C21 15 20.8695 20 12.5294 20C7.23529 20 3 18.577 3 15.0214C3 12.5248 4.63243 11.7709 5.87035 11.1991C6.6264 10.85 7 10.5687 7 10C7 9.22882 6.48633 9.11194 6.12224 9.0291C6.07901 9.01926 6.0379 9.00991 6 9C4.91095 8.71513 4 8.02943 4 7C4 6.54998 4.36352 6.07778 5 6C5.90713 5.88914 6.77032 5.63368 7.48267 4.91916C8.61374 3.78464 9.8125 3.00001 11.5 3ZM10 6C10 5.44771 9.58477 5 9 5C8.41523 5 8 5.44771 8 6C8 6.55228 8.41523 7 9 7C9.58477 7 10 6.55228 10 6Z" />
  ),
};

const GENERIC_ICON = (
  <path d="M20.59 13.41 12 22 2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82ZM7 7h.01" />
);

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
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? 'fill-sun-orange'
                          : 'fill-slate-400 group-hover:fill-sun-orange'
                      }`}
                    >
                      {CATEGORY_ICONS[cat.slug] ?? GENERIC_ICON}
                    </svg>
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
            <Link
              to={`/products?category=${encodeURIComponent(paneCategory.slug)}`}
              onClick={onClose}
              className="group shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-sun-orange hover:text-white bg-orange-50/80 hover:bg-sun-orange border border-orange-200/70 hover:border-sun-orange shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-sun-orange px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#EA580C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60"
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
