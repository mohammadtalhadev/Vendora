import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Eye, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ProductCard, domainProductToCardItem } from '../features/products';
import { clearRecentlyViewed, useLiveRecentlyViewed, useRecentlyViewed } from '../features/catalog/recently-viewed';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';
import type { ProductItem } from '../features/products';

/**
 * Recently Viewed (/recently-viewed) — the shopper's own browsing history
 * on this device, from the localStorage snapshots recorded on product
 * pages. Clearing here really clears that stored history.
 */
export const RecentlyViewedPage: React.FC = () => {
  const items = useRecentlyViewed();
  // Cards render the LIVE product rows behind the history (real stock and
  // price), not the view-time snapshots — see useLiveRecentlyViewed.
  const { products: liveProducts, isLoading: liveLoading } = useLiveRecentlyViewed();
  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((prev) => (prev === msg ? null : prev)), 3200);
  };

  const handleAddToCart = (item: ProductItem) => {
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
    showToast(`Added ${item.title} to cart`);
  };

  const handleToggleWishlist = (item: ProductItem) => {
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
    showToast(isInWishlist(item.id) ? 'Removed from wishlist' : 'Added to wishlist');
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Recently Viewed
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Products you opened on this device, most recent first. This history is stored only in
            this browser.
          </p>
        </div>
        {items.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              clearRecentlyViewed();
              showToast('Recently viewed history cleared');
            }}
            className="gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear history
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-white/80 bg-white/80 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
          <Eye className="mx-auto mb-2 h-10 w-10 text-slate-400" aria-hidden="true" />
          <h2 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
            Nothing viewed yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            Products you open will be remembered here on this device, so you can find them again
            without searching.
          </p>
          <Link
            to="/products"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-sun-orange-600"
          >
            Browse products
          </Link>
        </div>
      ) : liveLoading ? (
        <p className="mt-10 text-center text-xs text-slate-500" role="status">
          Loading the current details for your viewed products…
        </p>
      ) : liveProducts.length === 0 ? (
        <p className="mt-10 text-center text-xs text-slate-500">
          None of the products in this history are on sale right now — they stay in your
          history in case they come back.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {liveProducts.map((product) => {
            const card = domainProductToCardItem(product);
            return (
              <ProductCard
                key={product.id}
                product={card}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleToggleWishlist}
                isWishlisted={isInWishlist(product.id)}
              />
            );
          })}
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-white/50 bg-white/75 px-5 py-3 text-xs font-semibold text-slate-800 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default RecentlyViewedPage;
