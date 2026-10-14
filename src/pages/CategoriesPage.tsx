import React from 'react';
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
import { useCategories } from '../features/catalog/hooks/useProducts';

/**
 * All Categories index (/categories). Categories come from the live
 * `categories` table through `useCategories` — the same source the mega
 * menu and filters read. Each card goes to the catalogue filtered by that
 * category, the same destination category links have always used.
 */

// One lucide icon per seeded category, keyed by slug (same map as the mega
// menu). Used when a category has no image; unknown slugs fall back to Tag.
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

export const CategoriesPage: React.FC = () => {
  const { data, isLoading, isError } = useCategories();
  const categories = data?.categories ?? [];

  return (
    <div className="pb-16 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
        >
          <Link to="/" className="transition-colors hover:text-sun-orange">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">All Categories</span>
        </nav>

        <div className="max-w-2xl space-y-2">
          <h1 className="font-outfit text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Shop by Category
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Every department on Vendora in one place. Pick a category to browse its full
            catalogue.
          </p>
        </div>

        {isLoading ? (
          <div
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            aria-label="Loading categories"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : isError || categories.length === 0 ? (
          <div className="rounded-3xl border border-white/80 bg-white/80 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <Tag className="mx-auto mb-2 h-10 w-10 text-slate-400" aria-hidden="true" />
            <h2 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
              Categories could not be loaded
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Please try again in a moment, or browse the full catalogue instead.
            </p>
            <Link
              to="/products"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-sun-orange-600"
            >
              Browse all products
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category.slug] ?? Tag;
              return (
                <Link
                  key={category.id}
                  to={`/products?category=${encodeURIComponent(category.slug)}`}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-3xl border border-white/80 bg-slate-100 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-slate-800"
                >
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                      <Icon
                        className="h-14 w-14 text-sun-orange/70"
                        aria-hidden="true"
                      />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-4 pt-10">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-outfit text-sm font-black text-white sm:text-base">
                        {category.name}
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-white transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesPage;
