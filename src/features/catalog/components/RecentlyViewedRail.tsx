import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ProductCard, type ProductItem } from '../../products';
import { domainProductToCardItem } from '../../products/mappers';
import { useLiveRecentlyViewed, useRecentlyViewed } from '../recently-viewed';
import { useCartStore } from '../../../store/cart-store';
import { useWishlistStore } from '../../../store/wishlist-store';
import { useToast } from '../../../hooks/useToast';
import { Toast } from '../../../components/common/Toast';
import { ViewAllLink } from '../../../components/common/ViewAllLink';

/**
 * Recently Viewed rail — the shopper's own browser-local history, rendered
 * on the SHARED ProductCard with live product rows (see
 * useLiveRecentlyViewed for why snapshots alone go stale).
 *
 * Placement (owner's order): this rail used to sit on the
 * homepage. Personal browsing history does not belong on the landing page;
 * it belongs in the shopping context, so it now leads the /products
 * catalogue — "pick up where you left off" while browsing — with View All
 * through to the full /recently-viewed page. It renders nothing when the
 * visitor has no history on this device.
 */
export const RecentlyViewedRail: React.FC = () => {
  // Gate on the local snapshots first: a visitor with no history on this
  // device mounts nothing — and fires no catalogue query at all.
  const snapshots = useRecentlyViewed();
  if (snapshots.length === 0) return null;
  return <RecentlyViewedRailLive />;
};

const RecentlyViewedRailLive: React.FC = () => {
  const { products: liveProducts } = useLiveRecentlyViewed();
  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { toast, showToast, hideToast } = useToast();

  const items = useMemo<ProductItem[]>(
    () => liveProducts.map(domainProductToCardItem),
    [liveProducts],
  );

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
    const wasWishlisted = isInWishlist(item.id);
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
    showToast(wasWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  if (items.length === 0) return null;

  return (
    <div className="px-4 pt-5 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-[1600px]" aria-label="Recently viewed">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sun-orange">
              YOUR BROWSING HISTORY
            </span>
            <h2 className="mt-1 font-outfit text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Recently Viewed
            </h2>
          </div>
          <ViewAllLink to="/recently-viewed" />
        </div>
        <div className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar py-1">
          {items.map((product) => (
            <div key={product.id} className="w-44 shrink-0 sm:w-52">
              <ProductCard
                product={product}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleToggleWishlist}
                isWishlisted={isInWishlist(product.id)}
              />
            </div>
          ))}
        </div>
      </section>
      {createPortal(<Toast toast={toast} onDismiss={hideToast} />, document.body)}
    </div>
  );
};
