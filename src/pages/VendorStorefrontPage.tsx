import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Package,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Truck,
} from 'lucide-react';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';
import { useCurrency } from '../store/currency-store';
import { useStoreByHandle } from '../features/vendor/hooks/useVendorStore';
import { useProducts } from '../features/catalog/hooks/useProducts';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/common/Toast';
import type { Product } from '../types/domain';

/** One page of the seller's shelf; "Load more" widens this limit and refetches. */
const PAGE_SIZE = 12;
/** The slider tops out here (USD, the stored base). At the ceiling the filter lifts entirely. */
/** Max-price slider ceiling in canonical PKR; at the ceiling the filter is unbounded. */
const PRICE_CEILING = 1_000_000;

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'featured', label: 'Newest arrivals' },
  { value: 'best_selling', label: 'Best selling' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export const VendorStorefrontPage: React.FC = () => {
  const params = useParams<{ vendorId?: string; id?: string }>();
  const handle = params.vendorId ?? params.id ?? '';

  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { formatPrice } = useCurrency();
  const { toast, showToast, hideToast } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sort, setSort] = useState('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceMax, setPriceMax] = useState(PRICE_CEILING);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const storeQuery = useStoreByHandle(handle);
  const store = storeQuery.data;

  const productsQuery = useProducts(
    {
      sellerId: store?.id ?? '',
      q: searchTerm || undefined,
      sort,
      maxPrice: priceMax < PRICE_CEILING ? priceMax : undefined,
      page: 1,
      limit,
    },
    Boolean(store?.id),
  );

  // Keep a stable identity between renders so the memos below only re-run when the
  // query data itself changes.
  const loadedItems = productsQuery.data?.items;
  const items = useMemo(() => loadedItems ?? [], [loadedItems]);
  const total = productsQuery.data?.total ?? 0;

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of items) {
      if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const visibleProducts = useMemo(() => {
    let list = items;
    if (inStockOnly) list = list.filter((p) => p.stock > 0);
    if (activeCategory) list = list.filter((p) => p.category === activeCategory);
    return list;
  }, [items, inStockOnly, activeCategory]);

  const resetFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setActiveCategory(null);
    setSort('featured');
    setInStockOnly(false);
    setPriceMax(PRICE_CEILING);
    setLimit(PAGE_SIZE);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Store link copied to clipboard');
    } catch {
      showToast('Could not copy the store link', 'error');
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      maxStock: product.stock,
      image: product.images[0] ?? '',
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sellerType: product.sellerType,
      type: product.type,
    });
    showToast(`Added ${product.title} to cart`);

    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  const handleToggleWishlist = (product: Product) => {
    const wasSaved = isInWishlist(product.id);
    void toggleWishlist(product);
    showToast(
      wasSaved ? `Removed ${product.title} from wishlist` : `Saved ${product.title} to wishlist`,
      wasSaved ? 'info' : 'success',
    );
  };

  const storeNotFound =
    !storeQuery.isLoading &&
    storeQuery.isError &&
    (storeQuery.error.message.includes('not found') || !handle);
  const storeFailed = !storeQuery.isLoading && storeQuery.isError && !storeNotFound;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-slate-950 font-sans selection:bg-[#FF7A1A]/20 selection:text-[#FF7A1A] text-slate-800 dark:text-slate-100 antialiased overflow-hidden pb-20">
      {/* Radiant ambient glow orbs (Matching Homepage & Storefront) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-28 w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-[#FED7AA]/65 via-[#FFEDD5]/70 to-[#FED7AA]/40 blur-[130px] dark:from-[#FF7A1A]/10 dark:via-[#FED7AA]/5 pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-[#CFFAFE]/70 via-[#F1F5F9]/80 to-[#FFEDD5]/50 blur-[140px] dark:from-[#00B8C8]/10 dark:via-transparent pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-[620px] h-[620px] rounded-full bg-gradient-to-tr from-[#FFEDD5]/70 via-[#CFFAFE]/50 to-[#F1F5F9] blur-[130px] dark:from-[#FF7A1A]/5 pointer-events-none" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-6">
        {storeQuery.isLoading && (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 py-24"
            role="status"
            aria-live="polite"
          >
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF7A1A] border-t-transparent" />
            <span className="text-xs font-bold text-slate-500">Loading this store…</span>
          </div>
        )}

        {storeNotFound && (
          <div className="mx-auto max-w-lg rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 p-8 text-center shadow-xl">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" aria-hidden="true" />
            <h1 className="mt-3 font-outfit text-lg font-black text-slate-900 dark:text-white">
              Store not found
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              No shop exists at this address on Vendora{handle ? ` (“${handle}”)` : ''}. It may have
              closed or the link is wrong.
            </p>
            <Link
              to="/products"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#FF7A1A] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA6C13]"
            >
              Browse the marketplace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {storeFailed && (
          <div className="mx-auto max-w-lg rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 p-8 text-center shadow-xl">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" aria-hidden="true" />
            <h1 className="mt-3 font-outfit text-lg font-black text-slate-900 dark:text-white">
              Could not load this store
            </h1>
            <p className="mt-1 text-xs text-slate-500">{storeQuery.error?.message}</p>
            <button
              type="button"
              onClick={() => void storeQuery.refetch()}
              className="mt-4 rounded-xl bg-[#FF7A1A] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA6C13]"
            >
              Try again
            </button>
          </div>
        )}

        {store && (
          <>
            {/* ========================================================================= */}
            {/* 1. Store Header & Cover Banner                                            */}
            {/* ========================================================================= */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-slate-800 shadow-xl bg-slate-900">
              <div className="h-48 sm:h-64 w-full overflow-hidden relative">
                {store.banner ? (
                  <img
                    src={store.banner}
                    alt={`${store.storeName} banner`}
                    className="h-full w-full object-cover opacity-75 filter saturate-120"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-tr from-slate-800 via-slate-900 to-slate-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className="rounded-full bg-slate-950/65 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white border border-white/20 flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#00B8C8]" />
                    {store.status === 'active' ? 'Store active' : 'Store suspended'}
                  </span>
                </div>
              </div>

              {store.vacationMode && (
                <div className="mx-4 sm:mx-6 mt-3 rounded-2xl border border-amber-300/70 bg-amber-50/80 dark:bg-amber-950/40 dark:border-amber-800/50 px-4 py-2.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  {store.vacationMessage || `${store.storeName} is on vacation mode right now.`}
                </div>
              )}

              {/* Floating Store Identity Card */}
              <div className="relative mt-4 mx-4 sm:mx-6 mb-6 rounded-3xl border border-white/90 dark:border-slate-800 bg-white/85 dark:bg-slate-900/90 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Store Avatar Logo */}
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl bg-slate-950 border-2 border-white dark:border-slate-700 shadow-xl flex items-center justify-center text-white overflow-hidden">
                      {store.logo ? (
                        <img
                          src={store.logo}
                          alt={`${store.storeName} logo`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-outfit text-2xl sm:text-3xl font-black">
                          {store.storeName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="absolute -bottom-2 rounded-full bg-blue-600 px-2 py-0.2 text-[8px] font-bold text-white uppercase tracking-wider">
                        {store.sellerType === 'platform' ? 'Platform' : 'Seller'}
                      </span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          {store.storeName}
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-extrabold uppercase tracking-wider">
                            {store.sellerType === 'platform' ? 'Vendora Store' : 'Independent Seller'}
                          </span>
                        </span>
                      </div>

                      {(store.tagline || store.description) && (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                          {store.tagline || store.description}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px] font-bold">
                        {typeof store.freeShippingThreshold === 'number' &&
                          store.freeShippingThreshold > 0 && (
                            <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 text-amber-800 dark:text-amber-300 border border-amber-200/80 flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              Free shipping over {formatPrice(store.freeShippingThreshold)}
                            </span>
                          )}
                        {store.returnWindowDays > 0 && (
                          <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 flex items-center gap-1">
                            <RotateCcw className="h-3 w-3" />
                            {store.returnWindowDays}-day returns
                          </span>
                        )}
                        {store.warrantyPeriod && (
                          <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-blue-800 dark:text-blue-300 border border-blue-200/80 flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Warranty: {store.warrantyPeriod}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center gap-4 lg:gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1 font-outfit text-sm font-black text-slate-900 dark:text-white">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {store.rating.toFixed(1)}
                        </div>
                        <span className="text-[10px] text-slate-400">Store rating</span>
                      </div>
                      <div>
                        <div className="font-outfit text-sm font-black text-slate-900 dark:text-white">
                          {store.reviewCount.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400">Reviews</span>
                      </div>
                      <div>
                        <div className="font-outfit text-sm font-black text-slate-900 dark:text-white">
                          {productsQuery.isLoading ? '—' : total.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400">Products</span>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 font-outfit text-sm font-black text-slate-900 dark:text-white">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(store.createdAt).getFullYear()}
                        </div>
                        <span className="text-[10px] text-slate-400">Store since</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleShare()}
                        className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                        title="Share store link"
                        aria-label="Share store link"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. Category Strip (derived from the seller's loaded catalogue)            */}
            {/* ========================================================================= */}
            <div
              className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs font-bold"
              role="group"
              aria-label="Filter products by category"
            >
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                aria-pressed={activeCategory === null}
                className={`rounded-full px-4 py-2 transition-all whitespace-nowrap ${
                  activeCategory === null
                    ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
                    : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                All products ({items.length.toLocaleString()})
              </button>
              {categories.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setActiveCategory(activeCategory === name ? null : name)}
                  aria-pressed={activeCategory === name}
                  className={`rounded-full px-4 py-2 transition-all whitespace-nowrap ${
                    activeCategory === name
                      ? 'bg-[#FF7A1A] text-white shadow-md'
                      : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  {name} ({count.toLocaleString()})
                </button>
              ))}
            </div>

            {/* ========================================================================= */}
            {/* 3. Main 2-Column Catalog Grid Layout                                      */}
            {/* ========================================================================= */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Store Filters */}
              <div className="lg:col-span-3 space-y-6">
                <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-[#FF7A1A]" />
                      <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                        Store Filters
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-[11px] font-bold text-rose-500 hover:underline"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Search this store */}
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={`Search ${store.storeName}`}
                      aria-label={`Search products in ${store.storeName}`}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#FF7A1A]"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="h-4 w-4 rounded text-[#FF7A1A] focus:ring-[#FF7A1A]"
                      />
                      <span>In stock only</span>
                    </label>
                  </div>

                  {/* Price Range Slider */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-2">
                      <span id="store-price-range-label">Max price</span>
                      <span className="text-[10px] text-slate-400">
                        {priceMax >= PRICE_CEILING ? 'No limit' : formatPrice(priceMax)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={PRICE_CEILING}
                      step="1000"
                      value={priceMax}
                      onChange={(e) => setPriceMax(Number(e.target.value))}
                      aria-labelledby="store-price-range-label"
                      aria-valuetext={priceMax >= PRICE_CEILING ? 'No limit' : formatPrice(priceMax)}
                      className="w-full accent-[#FF7A1A] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Contact card - only when the seller actually published contact details */}
                {(store.supportEmail || store.supportPhone) && (
                  <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/70 dark:border-indigo-900/40 dark:bg-indigo-950/30 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                      <MessageCircle className="h-4 w-4" />
                      <h4 className="font-outfit text-xs font-bold">Contact {store.storeName}</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      These details come from the store's published profile.
                    </p>
                    {store.supportEmail && (
                      <a
                        href={`mailto:${store.supportEmail}`}
                        className="block w-full rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 py-2 text-center text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50/50 shadow-xs"
                      >
                        {store.supportEmail}
                      </a>
                    )}
                    {store.supportPhone && (
                      <a
                        href={`tel:${store.supportPhone}`}
                        className="block w-full rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 py-2 text-center text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50/50 shadow-xs"
                      >
                        {store.supportPhone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Inventory Grid */}
              <div className="lg:col-span-9 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h2 className="font-outfit text-base font-extrabold text-slate-900 dark:text-white">
                    {store.storeName} catalog
                    <span className="ml-1.5 text-xs font-normal text-slate-400">
                      ({visibleProducts.length.toLocaleString()} of {total.toLocaleString()} shown)
                    </span>
                  </h2>

                  <div className="relative flex items-center gap-2">
                    <label
                      htmlFor="store-sort"
                      className="text-xs text-slate-400 font-bold"
                    >
                      Sort by:
                    </label>
                    <div className="relative">
                      <select
                        id="store-sort"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pl-3 pr-8 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden"
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                {productsQuery.isLoading && (
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                    role="status"
                    aria-live="polite"
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-72 animate-pulse rounded-3xl border border-white/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60"
                      />
                    ))}
                    <span className="sr-only">Loading products…</span>
                  </div>
                )}

                {productsQuery.isError && !productsQuery.isLoading && (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50/70 dark:bg-rose-950/30 dark:border-rose-900/50 p-6 text-center">
                    <AlertTriangle className="mx-auto h-6 w-6 text-rose-500" aria-hidden="true" />
                    <p className="mt-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                      {productsQuery.error.message}
                    </p>
                    <button
                      type="button"
                      onClick={() => void productsQuery.refetch()}
                      className="mt-3 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!productsQuery.isLoading && !productsQuery.isError && visibleProducts.length === 0 && (
                  <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-8 text-center">
                    <Package className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      {total === 0 && items.length === 0 && !searchTerm
                        ? `${store.storeName} has no products listed yet.`
                        : 'No products match your filters in this store.'}
                    </p>
                  </div>
                )}

                {!productsQuery.isLoading && visibleProducts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {visibleProducts.map((prod) => {
                      const isAdded = Boolean(addedIds[prod.id]);
                      const isSaved = isInWishlist(prod.id);
                      const discountPct =
                        prod.compareAtPrice && prod.compareAtPrice > prod.price
                          ? Math.round((1 - prod.price / prod.compareAtPrice) * 100)
                          : 0;
                      const inStock = prod.stock > 0;

                      return (
                        <div
                          key={prod.id}
                          className="group relative flex flex-col justify-between rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                          <div>
                            {/* Image Container with Badges & Wishlist */}
                            <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-2 flex items-center justify-center">
                              <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                                {discountPct > 0 && (
                                  <Badge variant="discount-coral" size="sm">
                                    {discountPct}% off
                                  </Badge>
                                )}
                                {inStock ? (
                                  <Badge variant="in-stock" size="sm">
                                    In stock ({prod.stock})
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" size="sm">
                                    Out of stock
                                  </Badge>
                                )}
                                {prod.rating >= 4.5 && prod.reviewCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/85 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white shadow-xs">
                                    <Award className="h-2.5 w-2.5 text-amber-400" />
                                    Top rated
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleWishlist(prod)}
                                aria-pressed={isSaved}
                                aria-label={isSaved ? `Remove ${prod.title} from wishlist` : `Save ${prod.title} to wishlist`}
                                title="Toggle wishlist"
                                className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs shadow-xs hover:scale-110 transition-transform"
                              >
                                <Heart className={`h-3.5 w-3.5 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                              </button>

                              <img
                                src={prod.images[0] ?? ''}
                                alt={prod.title}
                                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>

                            {/* Brand & Rating */}
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-400">{prod.brand}</span>
                              <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span>{prod.rating.toFixed(1)}</span>
                                <span className="text-slate-400 text-[10px]">({prod.reviewCount})</span>
                              </div>
                            </div>

                            {/* Product Title (links to its detail page) */}
                            <h4 className="font-outfit mt-1 text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#FF7A1A] transition-colors">
                              <Link to={`/products/${prod.id}`}>{prod.title}</Link>
                            </h4>

                            {/* Description Snippet */}
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {prod.description}
                            </p>
                          </div>

                          {/* Price and Actions */}
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="font-outfit text-sm font-extrabold text-slate-900 dark:text-white">
                                {formatPrice(prod.price)}
                              </span>
                              {prod.compareAtPrice && prod.compareAtPrice > prod.price && (
                                <span className="text-[11px] text-slate-400 line-through">
                                  {formatPrice(prod.compareAtPrice)}
                                </span>
                              )}
                            </div>
                            {prod.shippingSettings?.freeShipping && (
                              <p className="mb-2 flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                <Truck className="h-3 w-3" />
                                Free shipping on this item
                              </p>
                            )}

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddToCart(prod)}
                                disabled={!inStock}
                                aria-label={inStock ? `Add ${prod.title} to cart` : `${prod.title} is out of stock`}
                                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all shadow-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                                  isAdded
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gradient-to-r from-[#FF7A1A] to-[#FF9040] text-white hover:from-[#EA6C13] hover:to-[#FF7A1A]'
                                }`}
                              >
                                {isAdded ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                )}
                                <span>{!inStock ? 'Out of stock' : isAdded ? 'Added' : 'Add to Cart'}</span>
                              </button>
                              <Link
                                to={`/products/${prod.id}`}
                                aria-label={`View details for ${prod.title}`}
                                title="View product details"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Strip */}
                {!productsQuery.isLoading && !productsQuery.isError && total > 0 && (
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 p-4 border border-white/80 dark:border-slate-800 text-xs text-slate-500">
                    <span>
                      Showing {items.length.toLocaleString()} of {total.toLocaleString()} products
                      from {store.storeName}
                    </span>
                    {items.length < total ? (
                      <button
                        type="button"
                        onClick={() => setLimit((l) => l + PAGE_SIZE)}
                        disabled={productsQuery.isFetching}
                        className="font-outfit font-bold text-slate-900 dark:text-white flex items-center gap-1.5 hover:text-[#FF7A1A] disabled:opacity-50"
                      >
                        <span>
                          {productsQuery.isFetching
                            ? 'Loading…'
                            : `Load ${Math.min(PAGE_SIZE, total - items.length).toLocaleString()} more`}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        Showing all {total.toLocaleString()} products
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <Toast toast={toast} onDismiss={hideToast} />
    </div>
  );
};

export default VendorStorefrontPage;
