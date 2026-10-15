import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
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
import { useCategories } from '../../features/catalog/hooks/useProducts';
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

const categoryLinkClass = (isActive: boolean) =>
  `group flex w-[calc(100%-12px)] items-center justify-between mx-1.5 rounded-xl px-4 py-2.5 text-[13px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60 ${
    isActive
      ? 'bg-orange-50 text-sun-orange font-bold'
      : 'text-slate-800 hover:bg-slate-50 hover:text-sun-orange font-semibold'
  }`;

const CategoryRowContent: React.FC<{ category: Category; isActive: boolean; hasChildren: boolean }> = ({
  category,
  isActive,
  hasChildren,
}) => {
  const CategoryIcon = CATEGORY_ICONS[category.slug] ?? Tag;
  return (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <CategoryIcon
          aria-hidden="true"
          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
            isActive ? 'text-sun-orange' : 'text-slate-400 group-hover:text-sun-orange'
          }`}
        />
        <span className="truncate">{category.name}</span>
      </div>
      {hasChildren && (
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-transform ${
            isActive ? 'text-sun-orange translate-x-0.5' : 'text-slate-400 group-hover:text-sun-orange'
          }`}
        />
      )}
    </>
  );
};

export const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose }) => {
  const { data: categoriesData, isLoading: isLoadingCategories, isError: categoriesError } = useCategories();
  const allCategories = categoriesData?.categories ?? [];

  // The left column lists root categories only; the pane shows the active
  // root's subcategories as plain links (the layout the owner approved).
  const roots = allCategories.filter((c) => !c.parentId);
  const childrenOf = (root: Category) => allCategories.filter((c) => c.parentId === root.id);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Hover and focus are progressive enhancement; click (and tap) always works.
  // The pane follows the active root that HAS subcategories; a root without
  // any is a plain link in the left column and never becomes the pane.
  const paneCategory =
    roots.find((c) => c.slug === activeSlug && childrenOf(c).length > 0) ??
    roots.find((c) => childrenOf(c).length > 0) ??
    null;
  const paneChildren = paneCategory ? childrenOf(paneCategory) : [];

  if (!isOpen) return null;

  return (
    <div
      id="all-categories-menu"
      aria-label="Browse all categories"
      className="absolute left-0 top-full mt-2.5 z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-1 text-slate-800 overflow-hidden w-[720px] max-w-[calc(100vw-24px)] flex flex-row"
    >
      {/* Column 1: Root categories, rendered from useCategories() */}
      <div className="w-[300px] shrink-0 border-r border-slate-100 py-2.5 bg-white select-none max-h-[520px] overflow-y-auto">
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
              const children = childrenOf(cat);
              const hasChildren = children.length > 0;
              const isActive = paneCategory?.slug === cat.slug;
              return hasChildren ? (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveSlug(cat.slug)}
                  onFocus={() => setActiveSlug(cat.slug)}
                  onMouseEnter={() => setActiveSlug(cat.slug)}
                  aria-expanded={isActive}
                  aria-controls="mega-menu-pane"
                  className={categoryLinkClass(isActive)}
                >
                  <CategoryRowContent category={cat} isActive={isActive} hasChildren />
                </button>
              ) : (
                <Link
                  key={cat.id}
                  to={`/products?category=${encodeURIComponent(cat.slug)}`}
                  onClick={onClose}
                  onFocus={() => setActiveSlug(cat.slug)}
                  onMouseEnter={() => setActiveSlug(cat.slug)}
                  className={categoryLinkClass(false)}
                >
                  <CategoryRowContent category={cat} isActive={false} hasChildren={false} />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Column 2: The active root's subcategories, as plain text links */}
      {paneCategory ? (
        <div
          id="mega-menu-pane"
          role="region"
          aria-label={`${paneCategory.name} subcategories`}
          className="flex-1 min-w-0 px-7 py-5 bg-white flex flex-col max-h-[520px]"
        >
          <ul className="space-y-1 overflow-y-auto">
            {paneChildren.map((sub) => (
              <li key={sub.id}>
                <Link
                  to={`/products?category=${encodeURIComponent(sub.slug)}`}
                  onClick={onClose}
                  className="block rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-orange-50/70 hover:text-sun-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60"
                >
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-5 flex justify-start">
            <Link
              to={`/products?category=${encodeURIComponent(paneCategory.slug)}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sun-orange-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60"
            >
              <span>Explore All {paneCategory.name}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : (
        !isLoadingCategories &&
        !categoriesError && (
          <div className="flex-1 min-w-0 p-6 text-xs text-slate-500">
            Select a category to browse its products.
          </div>
        )
      )}
    </div>
  );
};
