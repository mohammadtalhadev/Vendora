import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  X,
  Star,
  LayoutGrid,
  List,
  Filter,
  ArrowLeftRight,
  Check,
} from 'lucide-react';
import { useProducts, useCategories, useProductBrands } from '../hooks/useProducts';
import { ProductCard, type ProductItem } from '../../products';
import { domainProductToCardItem } from '../../products/mappers';
import { useWishlistStore } from '../../../store/wishlist-store';
import { useCompareStore } from '../../../store/compare-store';
import { useCartStore } from '../../../store/cart-store';
import { useCurrency } from '../../../store/currency-store';
import { useToast } from '../../../hooks/useToast';
import { useReveal } from '../../../hooks/useReveal';
import { Toast } from '../../../components/common/Toast';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { QueryState } from '../../../components/common/QueryState';
import { buildPageWindow } from '../../../hooks/usePagination';
import type { Category, Product } from '../../../types/domain';

const PAGE_SIZE = 12;

const RATING_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Any rating', value: '' },
  { label: '4.0 & up', value: '4' },
  { label: '4.5 & up', value: '4.5' },
];

interface FacetSectionsProps {
  categories: Category[];
  /**
   * (owner's call): the category facet is contextual. With no
   * category selected `categories` carries the ROOT categories only and this
   * is null; once a category is selected the caller passes only that root's
   * subcategories and the root itself here, so the rail shows an
   * "All <Root>" row above its subcategories instead of every category in
   * the store.
   */
  categoryRoot: Category | null;
  brands: string[];
  categoryParam: string;
  brandParam: string;
  ratingParam: string;
  typeParam: string;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  /** False when the page itself is the sale shelf (Deals): the facet is then locked on by the page and not offered as a toggle. */
  showSaleFacet: boolean;
  onSelect: (changes: Record<string, string | null>) => void;
}

const TYPE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All products', value: '' },
  { label: 'Physical', value: 'physical' },
  { label: 'Digital', value: 'digital' },
];

/**
 * The catalogue facets beyond price — category, brand, rating, availability —
 * rendered identically in the desktop rail and the mobile drawer. Every
 * option is backed by a server-side filter in the catalog query; nothing here
 * is decorative.
 */
const FacetSections: React.FC<FacetSectionsProps> = ({
  categories,
  categoryRoot,
  brands,
  categoryParam,
  brandParam,
  ratingParam,
  typeParam,
  inStockOnly,
  onSaleOnly,
  showSaleFacet,
  onSelect,
}) => {
  const optionClass = (active: boolean) =>
    `flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
      active
        ? 'bg-orange-50 font-bold text-sun-orange dark:bg-orange-950/30'
        : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
    }`;

  return (
    <>
      {/* Category */}
      <div className="space-y-1.5 pt-2">
        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
          Category
        </h4>
        <button
          type="button"
          onClick={() => onSelect({ category: null })}
          aria-pressed={categoryParam === ''}
          className={optionClass(categoryParam === '')}
        >
          <span>All Categories</span>
          {categoryParam === '' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
        {categoryRoot && (
          <button
            type="button"
            onClick={() => onSelect({ category: categoryRoot.slug })}
            aria-pressed={categoryParam === categoryRoot.slug || categoryParam === categoryRoot.id}
            className={optionClass(categoryParam === categoryRoot.slug || categoryParam === categoryRoot.id)}
          >
            <span>All {categoryRoot.name}</span>
            {(categoryParam === categoryRoot.slug || categoryParam === categoryRoot.id) && (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        )}
        {categories.map((category) => {
          const active = categoryParam === category.slug || categoryParam === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect({ category: category.slug })}
              aria-pressed={active}
              className={optionClass(active)}
            >
              <span>{category.name}</span>
              {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Brand — options read from the approved catalogue itself */}
      {brands.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
            Brand
          </h4>
          <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => onSelect({ brand: null })}
              aria-pressed={brandParam === ''}
              className={optionClass(brandParam === '')}
            >
              <span>All Brands</span>
              {brandParam === '' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
            {brands.map((brand) => {
              const active = brandParam === brand;
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => onSelect({ brand })}
                  aria-pressed={active}
                  className={optionClass(active)}
                >
                  <span>{brand}</span>
                  {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Product type — the facet behind /products?type=digital (the link
          My Downloads sends shoppers to). Backed by the same server-side
          `type` filter the catalog query has always supported. */}
      <div className="space-y-1.5 pt-2">
        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
          Product Type
        </h4>
        {TYPE_OPTIONS.map((option) => {
          const active = typeParam === option.value;
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onSelect({ type: option.value || null })}
              aria-pressed={active}
              className={optionClass(active)}
            >
              <span>{option.label}</span>
              {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Minimum rating */}
      <div className="space-y-1.5 pt-2">
        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
          Rating
        </h4>
        {RATING_OPTIONS.map((option) => {
          const active = ratingParam === option.value;
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onSelect({ rating: option.value || null })}
              aria-pressed={active}
              className={optionClass(active)}
            >
              <span className="flex items-center gap-1.5">
                {option.value !== '' && (
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                )}
                {option.label}
              </span>
              {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Availability */}
      <div className="space-y-2 pt-2">
        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
          Availability
        </h4>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => onSelect({ stock: e.target.checked ? '1' : null })}
            className="h-4 w-4 rounded border-slate-300 accent-sun-orange"
          />
          In stock only
        </label>
        {showSaleFacet && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onSaleOnly}
              onChange={(e) => onSelect({ sale: e.target.checked ? '1' : null })}
              className="h-4 w-4 rounded border-slate-300 accent-sun-orange"
            />
            On sale only
          </label>
        )}
      </div>
    </>
  );
};
/** Slider ceiling in canonical PKR (matches the largest bound the URL schema accepts). */
const PRICE_CEILING = 1_000_000;

export interface CatalogBrowserProps {
  /** Heading (and breadcrumb label) when neither a category nor a search term drives the page. */
  fallbackHeading: string;
  /** Supporting line under the heading, on the shared PageHeader. */
  headerDescription?: string;
  /** Sort applied when the URL carries none — New Arrivals exists to be newest-first. */
  defaultSort?: string;
  /**
   * The page IS the sale shelf (Deals): every query is forced on-sale and the
   * sale facet is not offered as a toggle. Facet behaviour is otherwise the
   * exact system — one implementation for /products, /new-arrivals, /deals.
   */
  lockedOnSale?: boolean;
}

/**
 * The one catalogue browser (extracted from ProductsPage): URL-driven
 * server-side facets (category / brand / rating / availability / price), sort,
 * grid/list, pagination and the category banner. /products, /new-arrivals and
 * /deals are this component with different page identities — before
 * New Arrivals had no filters at all and Deals ran a separate hand-rolled
 * layout with client-side buckets, which is why the three pages felt unrelated.
 *
 * The URL is the single source of truth for the result set; there is no local mock fallback.
 */
export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({
  fallbackHeading,
  headerDescription,
  defaultSort = 'featured',
  lockedOnSale = false,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { formatPrice, convertPrice, convertToPKR, config: currencyConfig } = useCurrency();
  const { toast, showToast, hideToast } = useToast();
  useReveal();

  // 1. Read every query input from the URL (source of truth).
  const q = searchParams.get('q') ?? '';
  const categoryParam = searchParams.get('category') ?? '';
  const brandParam = searchParams.get('brand') ?? '';
  const ratingParam = searchParams.get('rating') ?? '';
  // Only the two values the products table actually stores mean anything;
  // any other `type` in the URL is ignored rather than filtering to zero.
  const typeParamRaw = searchParams.get('type') ?? '';
  const typeParam = typeParamRaw === 'digital' || typeParamRaw === 'physical' ? typeParamRaw : '';
  const inStockOnly = searchParams.get('stock') === '1';
  const onSaleOnly = searchParams.get('sale') === '1';
  const sort = searchParams.get('sort') ?? defaultSort;
  const minParam = searchParams.get('min') ?? '';
  const maxParam = searchParams.get('max') ?? '';
  const parsedPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  // 2. Non-result UI state only (view + mobile drawer).
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filterWasOpenRef = useRef(false);

  // Move focus into the filter dialog when it opens and back to its trigger when it closes,
  // without stealing focus on the first render.
  useEffect(() => {
    if (isMobileFilterOpen && !filterWasOpenRef.current) {
      filterPanelRef.current?.focus();
    } else if (!isMobileFilterOpen && filterWasOpenRef.current) {
      filterTriggerRef.current?.focus();
    }
    filterWasOpenRef.current = isMobileFilterOpen;
  }, [isMobileFilterOpen]);

  const toFinite = (value: string): number | undefined => {
    if (value.trim() === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };
  const minPrice = toFinite(minParam);
  const maxPrice = toFinite(maxParam);

  // Write a filter/page change back to the URL; a filter change resets the page to 1.
  const updateParams = (
    changes: Record<string, string | null>,
    options?: { resetPage?: boolean; replace?: boolean },
  ) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
        }
        if (options?.resetPage) next.delete('page');
        return next;
      },
      { replace: options?.replace },
    );
  };

  // Reset means every facet — price, category (including one that arrived via
  // ?category=), brand, rating and the availability toggles. The search term
  // and sort are the shopper's context, not filters, and stay.
  const handleResetFilters = () =>
    updateParams(
      { min: null, max: null, category: null, brand: null, rating: null, stock: null, sale: null, type: null },
      { resetPage: true },
    );

  // The price inputs are a local draft, denominated in the shopper's DISPLAY
  // currency (that is what the heading and the symbol prefix advertise). The
  // URL stays the source of truth for the result set and always carries
  // canonical PKR, so the draft is derived from the URL bounds through the
  // currency store and commits back through it: display -> PKR on commit,
  // PKR -> display on sync. Writing every keystroke to the URL re-rendered
  // the page mid-typing and ate characters (QA C-3: "100000" became
  // "10000"), so typing edits the draft only; the draft commits on blur /
  // Apply. In PKR the rate is 1 and every step below is the identity, so
  // PKR behaviour is exactly what shipped.
  const toDisplayDraft = (pkr: number | undefined): string => {
    if (pkr === undefined) return '';
    const display = convertPrice(pkr);
    const rounded = Number(display.toFixed(currencyConfig.decimals));
    return Number.isFinite(rounded) ? String(rounded) : '';
  };
  const [minInput, setMinInput] = useState(() => toDisplayDraft(minPrice));
  const [maxInput, setMaxInput] = useState(() => toDisplayDraft(maxPrice));
  // Re-derive when the committed bound changes, and when the currency or its
  // live rate moves (convertPrice / currencyConfig change identity with them).
  useEffect(() => setMinInput(toDisplayDraft(minPrice)), [minPrice, convertPrice, currencyConfig]);
  useEffect(() => setMaxInput(toDisplayDraft(maxPrice)), [maxPrice, convertPrice, currencyConfig]);

  // The slider operates in display-currency scale too: its ceiling is the
  // PKR ceiling converted, and its value is the max draft. Dragging sets the
  // draft and commits (commit converts back to canonical PKR).
  const sliderCeilingDisplay = Math.max(1, Math.round(convertPrice(PRICE_CEILING)));
  const sliderStep = Math.max(1, Math.round(sliderCeilingDisplay / 1000));

  const commitPriceInputs = (min: string = minInput, max: string = maxInput) => {
    // Draft values are display-currency amounts; the URL (and therefore the
    // catalog query) only ever stores canonical PKR, rounded to whole rupees.
    const clean = (value: string): string | null => {
      const trimmed = value.trim();
      if (trimmed === '') return null;
      const display = Number(trimmed);
      if (!Number.isFinite(display) || display < 0) return null;
      return String(Math.round(convertToPKR(display)));
    };
    updateParams({ min: clean(min), max: clean(max) }, { resetPage: true });
  };

  // 3. Real server-side query (PostgREST + exact count). The api layer throws on error,
  //    so we render loading / error / empty / data — never a mock fallback.
  const minRating = toFinite(ratingParam);
  const { data, isLoading, isFetching, isError, error, refetch } = useProducts({
    q: q || undefined,
    category: categoryParam || undefined,
    brand: brandParam || undefined,
    minRating,
    inStock: inStockOnly || undefined,
    onSale: lockedOnSale ? true : onSaleOnly || undefined,
    type: typeParam || undefined,
    sort,
    minPrice,
    maxPrice,
    page,
    limit: PAGE_SIZE,
  });

  // Facet option lists — categories from the taxonomy, brands from the shelf.
  const { data: brandsData } = useProductBrands();
  const brandOptions = brandsData?.brands ?? [];

  const rows: Product[] = data?.items ?? [];
  const items = rows.map(domainProductToCardItem);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const showingFrom = items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = items.length === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  const goToPage = (target: number) => {
    const clamped = Math.min(Math.max(1, target), totalPages);
    updateParams({ page: clamped <= 1 ? null : String(clamped) });
  };

  // Human-readable category label straight from the catalog taxonomy (never invented).
  const { data: categoriesData } = useCategories();
  const activeCategory = !categoryParam
    ? null
    : categoriesData?.categories.find((c) => c.slug === categoryParam || c.id === categoryParam) ?? null;
  const heading = activeCategory?.name ?? (q ? `Results for “${q}”` : fallbackHeading);

  // (owner's call): the sidebar category facet drills down instead
  // of listing the whole taxonomy flat. No selection → root categories only.
  // A selection → the family root (the active category itself, or its parent
  // when a subcategory is active) plus that root's subcategories ONLY;
  // unrelated categories leave the rail until the shopper goes back to
  // "All Categories".
  const allCategories = categoriesData?.categories ?? [];
  const activeCategoryParent = activeCategory?.parentId
    ? allCategories.find((c) => c.id === activeCategory.parentId) ?? null
    : null;
  const categoryRoot = activeCategory ? activeCategoryParent ?? activeCategory : null;
  const categoryFacetOptions = categoryRoot
    ? allCategories.filter((c) => c.parentId === categoryRoot.id)
    : allCategories.filter((c) => !c.parentId);

  const priceRangeText =
    minPrice !== undefined && maxPrice !== undefined
      ? `between ${formatPrice(minPrice)} and ${formatPrice(maxPrice)}`
      : minPrice !== undefined
        ? `above ${formatPrice(minPrice)}`
        : maxPrice !== undefined
          ? `below ${formatPrice(maxPrice)}`
          : 'for the selected filters';

  const handleAddToCart = (product: ProductItem) => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      maxStock: product.maxStock,
      image: product.image,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sellerType: product.sellerType,
      type: product.type,
    });
    showToast(`Added ${product.title} to cart`);
  };

  // Compare toggle for the list view — the grid's ProductCard carries its own;
  // list rows add the domain product itself, so the matrix gets the full record.
  const compareItems = useCompareStore((s) => s.items);
  const addToCompare = useCompareStore((s) => s.addItem);
  const removeFromCompare = useCompareStore((s) => s.removeItem);

  const handleToggleCompare = (item: ProductItem) => {
    if (compareItems.some((entry) => entry.id === item.id)) {
      removeFromCompare(item.id);
      showToast(`Removed ${item.title} from compare`, 'info');
      return;
    }
    const domain = rows.find((row) => row.id === item.id);
    if (domain && addToCompare(domain)) {
      showToast(`Added ${item.title} to compare`);
    } else {
      showToast('Compare is full — remove a product before adding another (max 4).', 'error');
    }
  };

  const handleToggleWishlist = (product: ProductItem) => {
    const wasSaved = isInWishlist(product.id);
    toggleWishlist({
      id: product.id,
      title: product.title,
      slug: product.id,
      description: product.title,
      category: product.category,
      brand: product.category,
      images: [product.image],
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      type: product.type,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sellerType: product.sellerType,
      variants: [],
      stock: product.stock,
      rating: product.rating,
      reviewCount: product.reviewCount,
      status: 'approved',
      createdAt: new Date().toISOString(),
    });
    showToast(
      wasSaved ? `Removed ${product.title} from wishlist` : `Saved ${product.title} to wishlist`,
      wasSaved ? 'info' : 'success',
    );
  };

  return (
    <div className="relative min-h-screen py-5 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {/* =========================================================================
            1. Breadcrumbs — only the real category / search from the URL
            ========================================================================= */}
        <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-1">
          <Link to="/" className="hover:text-sun-orange transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="text-slate-800 dark:text-white font-bold">{heading}</span>
        </nav>

        {/* =========================================================================
            2. Category banner — the category's own image, set by an admin in the
            categories console (categories.image). Image-only band: the heading
            below stays the page's one title, and a category without an image
            simply opens on the heading — no placeholder art, no invented copy.
            ========================================================================= */}
        {activeCategory?.image && (
          <figure className="reveal overflow-hidden rounded-3xl border border-white/80 shadow-sm dark:border-white/10">
            <img
              src={activeCategory.image}
              alt={activeCategory.name}
              className="h-36 w-full object-cover sm:h-48 lg:h-56"
              loading="eager"
            />
          </figure>
        )}

        {/* =========================================================================
            3. Page Title & Real Result Count
            ========================================================================= */}
        <PageHeader
          className="reveal pb-1"
          title={heading}
          description={headerDescription}
          action={
          /* Right: real count of approved products for this query (no invented numbers) */
          <div className="flex items-center gap-6 sm:gap-8 self-start lg:self-center bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-white/10 px-6 py-3.5 rounded-2xl shadow-xs backdrop-blur-md shrink-0">
            {!isLoading && data ? (
              <div>
                <div className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none">
                  {total.toLocaleString()}
                </div>
                <div className="text-[10px] font-extrabold text-slate-400 mt-1">
                  Products
                </div>
              </div>
            ) : (
              <div aria-hidden="true" />
            )}
          </div>
          }
        />

        {/* =========================================================================
            5. Main 2-Column Content: Sidebar (Left) & Products Grid (Right)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start pt-2">
          {/* =======================================================================
              A. LEFT SIDEBAR — only facets backed by the query (price range) remain
              ======================================================================= */}
          <aside className="reveal hidden lg:block lg:col-span-3 sticky top-28 space-y-5 rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm uppercase tracking-wider">
                <SlidersHorizontal className="h-4 w-4 text-sun-orange" />
                <span>Filters</span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-slate-400 hover:text-sun-orange transition-colors cursor-pointer"
              >
                Reset All
              </button>
            </div>

            <FacetSections
              categories={categoryFacetOptions}
              categoryRoot={categoryRoot}
              brands={brandOptions}
              categoryParam={categoryParam}
              brandParam={brandParam}
              ratingParam={ratingParam}
              typeParam={typeParam}
              inStockOnly={inStockOnly}
              onSaleOnly={onSaleOnly}
              showSaleFacet={!lockedOnSale}
              onSelect={(changes) => updateParams(changes, { resetPage: true })}
            />

            {/* Price Range Filter — min/max are real server-side bounds */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                Price Range ({currencyConfig.code})
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 flex-1">
                  <label htmlFor="min-price" className="sr-only">
                    Minimum price
                  </label>
                  <span className="text-slate-400 text-[11px] mr-1" aria-hidden="true">
                    {currencyConfig.symbol}
                  </span>
                  <input
                    id="min-price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={minInput}
                    onChange={(e) => setMinInput(e.target.value)}
                    onBlur={() => commitPriceInputs()}
                    aria-label="Minimum price"
                    className="w-full bg-transparent font-bold focus:outline-none"
                    placeholder="No min"
                  />
                </div>
                <span className="text-slate-400 font-semibold">to</span>
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 flex-1">
                  <label htmlFor="max-price" className="sr-only">
                    Maximum price
                  </label>
                  <span className="text-slate-400 text-[11px] mr-1" aria-hidden="true">
                    {currencyConfig.symbol}
                  </span>
                  <input
                    id="max-price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={maxInput}
                    onChange={(e) => setMaxInput(e.target.value)}
                    onBlur={() => commitPriceInputs()}
                    aria-label="Maximum price"
                    className="w-full bg-transparent font-bold focus:outline-none"
                    placeholder="No max"
                  />
                </div>
              </div>
              {/* Range slider drives the maximum bound (display-currency scale) */}
              <input
                type="range"
                min="0"
                max={sliderCeilingDisplay}
                step={sliderStep}
                value={maxInput === '' ? sliderCeilingDisplay : Math.min(toFinite(maxInput) ?? sliderCeilingDisplay, sliderCeilingDisplay)}
                onChange={(e) => {
                  setMaxInput(e.target.value);
                  commitPriceInputs(minInput, e.target.value);
                }}
                aria-label="Maximum price slider"
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sun-orange"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>{formatPrice(0)}</span>
                <span>{formatPrice(PRICE_CEILING)}+</span>
              </div>
              <Button type="button" variant="ink" size="sm" onClick={() => commitPriceInputs()} className="w-full">
                Apply Price Filter
              </Button>
            </div>
          </aside>

          {/* =======================================================================
              B. RIGHT PRODUCTS CATALOG (Width ~9 cols)
              ======================================================================= */}
          <main className="lg:col-span-9 space-y-5">
            {/* Toolbar Strip: Real Count, Sort, View Switcher & Mobile Filter Trigger */}
            <div className="reveal flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 p-3.5 sm:px-5 rounded-2xl shadow-xs backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300" role="status" aria-live="polite">
                  {isLoading ? (
                    'Loading products…'
                  ) : isError ? (
                    'Could not load products'
                  ) : (
                    <>
                      Showing <strong className="text-slate-900 dark:text-white">{showingFrom}–{showingTo}</strong> of{' '}
                      <strong className="text-slate-900 dark:text-white">{total.toLocaleString()}</strong> products
                    </>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  ref={filterTriggerRef}
                  aria-expanded={isMobileFilterOpen}
                  aria-controls="mobile-filters-panel"
                  className="lg:hidden ml-auto inline-flex items-center gap-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1 text-xs font-bold"
                  title="Open filters"
                  aria-label="Open filters"
                >
                  <Filter className="h-3 w-3" />
                  <span>Filters</span>
                </button>
              </div>

              {/* Right: Sort by & View Toggle */}
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="flex shrink-0 items-center gap-2">
                  <label htmlFor="sort-select" className="shrink-0 whitespace-nowrap text-xs text-slate-500 font-medium">
                    Sort by:
                  </label>
                  <Select
                    value={sort}
                    onValueChange={(value) => updateParams({ sort: value }, { resetPage: true })}
                  >
                    <SelectTrigger
                      id="sort-select"
                      aria-label="Sort by"
                      className="h-auto rounded-full border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">Featured &amp; Recommended</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="price_asc">Price: Low to High</SelectItem>
                      <SelectItem value="price_desc">Price: High to Low</SelectItem>
                      <SelectItem value="best_selling">Best Selling</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Switcher Icons */}
                <div className="flex items-center rounded-lg border border-slate-200/80 dark:border-white/10 p-0.5 bg-slate-50 dark:bg-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-pressed={viewMode === 'grid'}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-slate-700 text-sun-orange shadow-xs'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Grid view"
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-pressed={viewMode === 'list'}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-slate-700 text-sun-orange shadow-xs'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="List view"
                    aria-label="List view"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid / List — real query result with loading/error/empty states */}
            <QueryState
              isLoading={isLoading}
              isError={isError}
              isFetching={isFetching}
              error={error}
              onRetry={refetch}
              refetch={refetch}
              errorTitle="Unable to load products"
              isEmpty={!isLoading && !isError && items.length === 0}
              skeletonType="grid"
              skeletonCount={8}
              emptyView={
                <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-12 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-sun-orange" aria-hidden="true">
                    <SlidersHorizontal className="h-6 w-6" />
                  </div>
                  <h3 className="font-outfit text-lg font-bold text-slate-900 dark:text-white">
                    {q
                      ? `No results for “${q}”`
                      : activeCategory
                        ? `No products in ${activeCategory.name}`
                        : 'No products match your filters'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {`We could not find any approved products ${priceRangeText}. Try adjusting or resetting the filters.`}
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-full bg-sun-orange text-white px-5 py-2 text-xs font-bold shadow-md hover:bg-sun-orange-600 transition-all cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              }
            >
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4.5">
                  {items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={handleToggleWishlist}
                      isWishlisted={isInWishlist(product.id)}
                      solidAddToCart={true}
                    />
                  ))}
                </div>
              ) : (
                /* List View Mode */
                <div className="space-y-3.5">
                  {items.map((product) => (
                    <div
                      key={product.id}
                      className="group flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200/80 hover:shadow-lg hover:shadow-orange-500/5"
                    >
                      <Link to={`/products/${product.id}`} className="shrink-0 w-36 h-36 rounded-xl overflow-hidden bg-slate-50">
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </Link>

                      <div className="flex-1 min-w-0 space-y-1.5 text-left">
                        <div className="text-[10px] font-black text-slate-400">
                          {product.category}
                        </div>
                        <Link to={`/products/${product.id}`}>
                          <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white hover:text-sun-orange transition-colors truncate">
                            {product.title}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="flex" aria-hidden="true">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${
                                  s <= Math.round(product.rating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-slate-200 text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-bold">{product.rating.toFixed(1)}</span>
                          {product.reviewCount > 0 ? (
                            <span className="text-slate-400">({product.reviewCount})</span>
                          ) : (
                            <span className="text-slate-400">(No reviews)</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          Sold by <strong className="text-slate-800 dark:text-slate-200">{product.sellerName}</strong>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0 sm:pl-4 sm:border-l sm:border-slate-100">
                        <div className="text-right">
                          <div className="font-outfit text-xl font-black text-[#16A34A]">
                            {formatPrice(product.price)}
                          </div>
                          {product.compareAtPrice && (
                            <div className="text-xs text-slate-400 line-through">
                              {formatPrice(product.compareAtPrice)}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock === 0}
                          className="rounded-full bg-sun-orange hover:bg-sun-orange-600 px-5 py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add to Cart
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCompare(product)}
                          aria-pressed={compareItems.some((entry) => entry.id === product.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                            compareItems.some((entry) => entry.id === product.id)
                              ? 'border-sun-orange bg-sun-orange text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-sun-orange hover:text-sun-orange'
                          }`}
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                          {compareItems.some((entry) => entry.id === product.id) ? 'In Compare' : 'Compare'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </QueryState>

            {/* =======================================================================
                6. Pagination Bar — driven by the server's exact total count
                ======================================================================= */}
            {!isLoading && !isError && total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-white/10">
                <span className="text-xs font-semibold text-slate-400">
                  Page {page} of {totalPages} ({total.toLocaleString()} total products)
                </span>

                <nav aria-label="Pagination" className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Previous Page"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {buildPageWindow(page, totalPages).map((entry, index) =>
                    entry === '…' ? (
                      <span key={`gap-${index}`} className="px-1 text-slate-400 font-bold" aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <button
                        key={entry}
                        type="button"
                        onClick={() => goToPage(entry)}
                        aria-current={entry === page ? 'page' : undefined}
                        aria-label={`Page ${entry}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          entry === page
                            ? 'bg-sun-orange text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20'
                            : 'border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {entry}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Next Page"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              </div>
            )}
          </main>
        </div>

        {/* Mobile Filter Slide-Over Modal */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
              aria-hidden="true"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <div
              ref={filterPanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-filters-title"
              tabIndex={-1}
              onKeyDown={(e) => { if (e.key === 'Escape') setIsMobileFilterOpen(false); }}
              data-lenis-prevent
              className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span id="mobile-filters-title" className="font-outfit font-black text-lg">Filters</span>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
                  title="Close filters"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="w-full py-2 text-xs font-bold text-center text-sun-orange border border-sun-orange rounded-xl"
                >
                  Reset All Filters
                </button>

                <FacetSections
                  categories={categoryFacetOptions}
                  categoryRoot={categoryRoot}
                  brands={brandOptions}
                  categoryParam={categoryParam}
                  brandParam={brandParam}
                  ratingParam={ratingParam}
                  typeParam={typeParam}
                  inStockOnly={inStockOnly}
                  onSaleOnly={onSaleOnly}
                  showSaleFacet={!lockedOnSale}
                  onSelect={(changes) => updateParams(changes, { resetPage: true })}
                />

                <div className="space-y-2">
                  <h5 className="font-bold text-xs uppercase text-slate-400">Price ({currencyConfig.code})</h5>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1">
                      <label htmlFor="m-min-price" className="block text-[10px] font-bold text-slate-400 mb-1">
                        Min ({currencyConfig.symbol})
                      </label>
                      <input
                        id="m-min-price"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={minInput}
                        onChange={(e) => setMinInput(e.target.value)}
                        onBlur={() => commitPriceInputs()}
                        className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 font-bold focus:outline-none focus:border-sun-orange"
                        placeholder="No min"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="m-max-price" className="block text-[10px] font-bold text-slate-400 mb-1">
                        Max ({currencyConfig.symbol})
                      </label>
                      <input
                        id="m-max-price"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={maxInput}
                        onChange={(e) => setMaxInput(e.target.value)}
                        onBlur={() => commitPriceInputs()}
                        className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1.5 font-bold focus:outline-none focus:border-sun-orange"
                        placeholder="No max"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Currently {priceRangeText}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  commitPriceInputs();
                  setIsMobileFilterOpen(false);
                }}
                className="mt-auto w-full py-3 rounded-full bg-sun-orange text-white font-bold text-xs shadow-md"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      <Toast toast={toast} onDismiss={hideToast} />
    </div>
  );
};
         