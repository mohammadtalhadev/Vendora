import React, { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ChevronRight, Star, Store } from 'lucide-react';
import { ProductCard, domainProductToCardItem, type ProductItem } from '../features/products';
import { useProducts } from '../features/catalog/hooks/useProducts';
import { useStoreByHandle } from '../features/vendor/hooks/useVendorStore';
import { StoreLogo } from '../features/vendor/components/StoreLogo';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';

/**
 * Brand page (/brands/:slug). A "brand" on Vendora is an official store, so
 * this page resolves the slug against the real `vendor_profiles` directory
 * (the same record the storefront page reads) and shelves that store's real
 * products. Unknown slugs get an honest not-found state.
 */
export const BrandDetailPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const storeQuery = useStoreByHandle(slug);
  const store = storeQuery.data;

  const productsQuery = useProducts(
    { sellerId: store?.id ?? '', page: 1, limit: 24 },
    Boolean(store?.id),
  );
  const items: ProductItem[] = useMemo(
    () => (productsQuery.data?.items ?? []).map(domainProductToCardItem),
    [productsQuery.data],
  );

  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  const handleAddToCart = useCallback(
    (item: ProductItem) => {
      addItem({
        id: item.id,
        productId: item.id,
        title: item.title,
        price: item.price,
        maxStock: item.maxStock,
        image: item.image,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellerType: item.sellerType,
        type: item.type,
      });
    },
    [addItem],
  );

  const handleToggleWishlist = useCallback(
    (item: ProductItem) => {
      toggleWishlist({
        id: item.id,
        title: item.title,
        slug: item.id,
        description: item.title,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        images: [item.image],
        category: item.category,
        brand: 'Vendora',
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellerType: item.sellerType,
        type: item.type,
        stock: item.stock,
        rating: item.rating,
        reviewCount: item.reviewCount,
        variants: [],
        status: 'approved',
        createdAt: new Date().toISOString(),
      });
    },
    [toggleWishlist],
  );

  if (storeQuery.isLoading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center p-8">
        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-sun-orange border-t-transparent" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Loading brand…
        </span>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="mx-auto flex min-h-[55vh] w-full max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
        <Store className="mb-3 h-10 w-10 text-slate-400" aria-hidden="true" />
        <h1 className="font-outfit text-3xl font-black text-slate-900 dark:text-white">
          Brand not found
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          This brand does not have a store on Vendora. Browse the official brand stores
          that are live on the marketplace.
        </p>
        <Link
          to="/brands"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-sun-orange px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-95 sm:text-sm"
        >
          Browse brand stores
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

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
          <Link to="/brands" className="transition-colors hover:text-sun-orange">
            Brand Stores
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">{store.storeName}</span>
        </nav>

        {/* Brand hero */}
        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
          {store.banner ? (
            <div className="h-36 overflow-hidden bg-slate-100 sm:h-44 dark:bg-slate-800">
              <img
                src={store.banner}
                alt={`${store.storeName} banner`}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-24 bg-gradient-to-r from-orange-100 via-orange-50 to-slate-100 sm:h-28 dark:from-orange-950/50 dark:via-slate-900 dark:to-slate-800" />
          )}
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:p-8">
            <StoreLogo
              name={store.storeName}
              logo={store.logo}
              className="h-20 w-20 shrink-0 rounded-3xl shadow-md ring-1 ring-slate-900/5 sm:h-24 sm:w-24"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <h1 className="font-outfit text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {store.storeName}
              </h1>
              {store.tagline && (
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {store.tagline}
                </p>
              )}
              {store.reviewCount > 0 && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                  {store.rating.toFixed(1)} · {store.reviewCount} review
                  {store.reviewCount === 1 ? '' : 's'}
                </p>
              )}
            </div>
            <Link
              to={`/vendors/${store.slug}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-sun-orange px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-95 sm:text-sm"
            >
              Visit the full store
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {store.description && (
            <p className="border-t border-slate-100 px-6 py-5 text-sm leading-relaxed text-slate-600 sm:px-8 dark:border-white/5 dark:text-slate-300">
              {store.description}
            </p>
          )}
        </section>

        {/* Brand products */}
        <section className="space-y-5">
          <h2 className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
            Products from {store.storeName}
          </h2>
          {productsQuery.isLoading ? (
            <div
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              aria-label="Loading products"
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-white/80 bg-white/80 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
              <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
                No products listed right now
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                This store has no live products at the moment. Check the full store page
                later, or keep browsing the catalogue.
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={isInWishlist(item.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default BrandDetailPage;
