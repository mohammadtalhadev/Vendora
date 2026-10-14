import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, PackageSearch } from 'lucide-react';
import { ProductCard, domainProductToCardItem, type ProductItem } from '../features/products';
import { useProducts } from '../features/catalog/hooks/useProducts';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';

/**
 * New Arrivals (/new-arrivals): the catalogue ordered by creation date,
 * newest first — the `newest` sort on the same products query every other
 * catalogue page uses. No separate data source, nothing curated by hand.
 */
export const NewArrivalsPage: React.FC = () => {
  const { data, isLoading, isError } = useProducts({ sort: 'newest', page: 1, limit: 40 });
  const items: ProductItem[] = useMemo(
    () => (data?.items ?? []).map(domainProductToCardItem),
    [data],
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
          <span className="font-semibold text-slate-900 dark:text-white">New Arrivals</span>
        </nav>

        <div className="max-w-2xl space-y-2">
          <h1 className="font-outfit text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            New Arrivals
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            The latest products added to Vendora, newest first — straight from our
            sellers&apos; shelves.
          </p>
        </div>

        {isLoading ? (
          <div
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            aria-label="Loading new arrivals"
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : isError || items.length === 0 ? (
          <div className="rounded-3xl border border-white/80 bg-white/80 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <PackageSearch
              className="mx-auto mb-2 h-10 w-10 text-slate-400"
              aria-hidden="true"
            />
            <h2 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
              Nothing new to show right now
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              New products land here as sellers list them. Browse the full catalogue in
              the meantime.
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
          <>
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
            <div className="flex justify-center pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 shadow-xs transition-all hover:border-sun-orange hover:text-sun-orange sm:text-sm dark:border-white/15 dark:bg-transparent dark:text-slate-100"
              >
                Shop the full catalogue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewArrivalsPage;
