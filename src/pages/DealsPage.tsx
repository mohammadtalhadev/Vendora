import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  ChevronRight,
  Tag,
  BadgePercent,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import { useProducts } from '../features/catalog/hooks/useProducts';
import { ProductCard, type ProductItem } from '../features/products';
import { domainProductToCardItem } from '../features/products/mappers';
import { useWishlistStore } from '../store/wishlist-store';
import { useCartStore } from '../store/cart-store';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/common/Toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { QueryState } from '../components/common/QueryState';
import { useReveal } from '../hooks/useReveal';

type DealTab = 'all' | 'thirty-plus' | 'under-2k';

// Every tab is a plain derivation over the live catalogue — a product is a
// deal when its compare-at price sits above its selling price. There is no
// flash-sale or clearance flag in the catalogue data, so those buckets are
// not offered.
const DEAL_TABS: ReadonlyArray<{ id: DealTab; label: string; icon: LucideIcon }> = [
  { id: 'all', label: 'All Deals', icon: LayoutGrid },
  { id: 'thirty-plus', label: '30% or More Off', icon: BadgePercent },
  { id: 'under-2k', label: 'Under Rs 2,000', icon: Tag },
];

const UNDER_2K_PKR = 2000;

export const DealsPage: React.FC = () => {
  useReveal();
  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { toast, showToast, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState<DealTab>('all');
  const [sort, setSort] = useState('featured');

  // One pool from the real catalogue; deals are the discounted slice of it.
  const { data, isLoading, isFetching, isError, error, refetch } = useProducts({
    sort: 'featured',
    page: 1,
    limit: 100,
  });

  const deals = useMemo(
    () =>
      (data?.items ?? [])
        .map(domainProductToCardItem)
        .filter((item) => item.compareAtPrice !== undefined && item.compareAtPrice > item.price),
    [data],
  );

  const maxDiscount = useMemo(
    () => deals.reduce((max, item) => Math.max(max, item.discountPercent ?? 0), 0),
    [deals],
  );

  const visibleDeals = useMemo(() => {
    const filtered =
      activeTab === 'thirty-plus'
        ? deals.filter((item) => (item.discountPercent ?? 0) >= 30)
        : activeTab === 'under-2k'
          ? deals.filter((item) => item.price < UNDER_2K_PKR)
          : deals;
    const sorted = [...filtered];
    if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === 'discount') sorted.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
    return sorted;
  }, [deals, activeTab, sort]);

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

  const handleTabListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const ids = DEAL_TABS.map((tab) => tab.id);
    const index = ids.indexOf(activeTab);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % ids.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + ids.length) % ids.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = ids.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = ids[nextIndex];
    setActiveTab(next);
    document.getElementById(`deals-tab-${next}`)?.focus();
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-sun-orange/20 selection:text-sun-orange pb-24">
      {/* Radiant ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-28 w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-sun-orange-200/60 via-sun-orange-100/65 to-sun-orange-200/35 blur-[130px] dark:from-sun-orange/10 pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-aqua-100/70 via-[#F1F5F9]/80 to-sun-orange-100/50 blur-[140px] dark:from-aqua/10 pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-[620px] h-[620px] rounded-full bg-gradient-to-tr from-sun-orange-100/70 via-aqua-100/50 to-[#F1F5F9] blur-[130px] dark:from-sun-orange/5 pointer-events-none" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-12 pt-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-sun-orange transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">Deals &amp; Discounts</span>
        </nav>

        {/* Hero Banner */}
        <div className="reveal rounded-3xl border border-white/80 dark:border-slate-800 bg-gradient-to-r from-orange-500 via-rose-500 to-sun-orange p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-black uppercase tracking-wider">
                <Flame className="h-4 w-4 text-amber-300" aria-hidden="true" />
                <span>{maxDiscount > 0 ? `Up to ${maxDiscount}% off` : 'On sale now'}</span>
              </div>
              <h1 className="font-outfit text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Deals &amp; Discounts
              </h1>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                Products with genuine price drops from sellers across Vendora. Every order is
                covered by buyer protection, with payment held in escrow until your order is
                delivered.
              </p>
            </div>

            {/* Live count of discounted products (replaces the old simulated countdown) */}
            <div className="rounded-2xl bg-black/30 backdrop-blur-xl border border-white/20 p-5 shrink-0 text-center space-y-1">
              <div className="font-outfit text-3xl sm:text-4xl font-black">
                {!isLoading && data ? deals.length.toLocaleString() : '—'}
              </div>
              <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                Products on sale
              </div>
              <div className="text-[10px] text-white/50 max-w-[180px]">
                Discounts are set by sellers against their original price.
              </div>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Deal categories"
          onKeyDown={handleTabListKeyDown}
          className="reveal flex flex-wrap items-center gap-2 rounded-2xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3 shadow-sm"
        >
          {DEAL_TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`deals-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="deals-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  selected
                    ? 'bg-sun-orange text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Toolbar: real count + sort, the same strip the catalogue page uses */}
        <div className="reveal flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 p-3.5 sm:px-5 rounded-2xl shadow-xs backdrop-blur-md">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300" role="status" aria-live="polite">
            {isLoading ? (
              'Loading deals…'
            ) : isError ? (
              'Could not load deals'
            ) : (
              <>
                Showing <strong className="text-slate-900 dark:text-white">{visibleDeals.length}</strong> of{' '}
                <strong className="text-slate-900 dark:text-white">{deals.length}</strong> deals
              </>
            )}
          </span>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label htmlFor="deals-sort" className="text-xs text-slate-500 font-medium">
              Sort by:
            </label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger
                id="deals-sort"
                aria-label="Sort by"
                className="h-auto rounded-full border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured &amp; Recommended</SelectItem>
                <SelectItem value="discount">Biggest Discount</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Deals Grid — real catalogue products on the standard card */}
        <div id="deals-panel" role="tabpanel" aria-labelledby={`deals-tab-${activeTab}`}>
          <QueryState
            isLoading={isLoading}
            isError={isError}
            isFetching={isFetching}
            error={error}
            onRetry={refetch}
            refetch={refetch}
            errorTitle="Unable to load deals"
            isEmpty={!isLoading && !isError && visibleDeals.length === 0}
            skeletonType="grid"
            skeletonCount={8}
            emptyView={
              <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-12 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-sun-orange" aria-hidden="true">
                  <Tag className="h-6 w-6" />
                </div>
                <h3 className="font-outfit text-lg font-bold text-slate-900 dark:text-white">
                  {deals.length === 0 ? 'No discounted products right now' : 'No deals in this view'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Discounts appear here as soon as a seller sets a compare-at price above the
                  selling price.
                </p>
                <Link
                  to="/products"
                  className="inline-block rounded-full bg-sun-orange text-white px-5 py-2 text-xs font-bold shadow-md hover:bg-sun-orange-600 transition-all"
                >
                  Browse All Products
                </Link>
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
              {visibleDeals.map((product) => (
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
          </QueryState>
        </div>
      </div>

      <Toast toast={toast} onDismiss={hideToast} />
    </div>
  );
};
