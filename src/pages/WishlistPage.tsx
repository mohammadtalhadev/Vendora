import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowRight,
  Star,
  ArrowLeft,
} from 'lucide-react';
import { useWishlistStore } from '../store/wishlist-store';
import { useCartStore } from '../store/cart-store';
import { useCurrency } from '../store/currency-store';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PageHeader } from '../components/common/PageHeader';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Toast } from '../components/common/Toast';
import { useToast } from '../hooks/useToast';
import type { Product } from '../types/domain';

export const WishlistPage: React.FC = () => {
  const { items, toggleWishlist, clearWishlist } = useWishlistStore();
  const { addItem } = useCartStore();
  const { formatPrice } = useCurrency();
  // Shared toast (Batch 47) — this page used to run its own private banner.
  const { toast, showToast, hideToast } = useToast(3000);
  const [clearOpen, setClearOpen] = useState(false);

  const showNotification = (message: string) => showToast(message);

  const cartLineFor = (product: Product) => ({
    id: product.id,
    productId: product.id,
    title: product.title,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    maxStock: product.stock,
    image: product.images[0] || '',
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    sellerType: product.sellerType,
    type: product.type,
  });

  /**
   * A move is two persisted writes (cart add, then wishlist remove) and the
   * success toast waits for BOTH. The stores never throw — a failed write
   * lands in the store's `error` state and re-reads the server list — so
   * the outcome is read back from that state after each await. (These
   * handlers used to fire the writes un-awaited and toast success
   * unconditionally, so a failed save still announced "moved to cart"
   * while the item stayed saved.)
   */
  const moveOneToCart = async (product: Product): Promise<boolean> => {
    await addItem(cartLineFor(product));
    if (useCartStore.getState().error) return false;
    await toggleWishlist(product);
    return !useWishlistStore.getState().error;
  };

  const handleMoveToCart = async (product: Product) => {
    if (await moveOneToCart(product)) {
      showNotification(`"${product.title}" moved to cart`);
      return;
    }
    const failure =
      useCartStore.getState().error ??
      useWishlistStore.getState().error ??
      'The move could not be completed.';
    showToast(failure, 'error');
  };

  const handleMoveAllToCart = async () => {
    const inStockItems = items.filter((item) => item.stock > 0);
    if (inStockItems.length === 0) return;

    let moved = 0;
    for (const product of inStockItems) {
      if (await moveOneToCart(product)) moved += 1;
    }

    if (moved === inStockItems.length) {
      showNotification(`Moved ${moved} items to cart`);
      return;
    }
    const failure =
      useCartStore.getState().error ??
      useWishlistStore.getState().error ??
      'Some items could not be moved.';
    showToast(
      moved > 0 ? `Moved ${moved} of ${inStockItems.length} items. ${failure}` : failure,
      'error',
    );
  };

  const handleRemove = async (product: Product) => {
    await toggleWishlist(product);
    const failure = useWishlistStore.getState().error;
    if (failure) {
      showToast(failure, 'error');
      return;
    }
    showNotification(`Removed "${product.title}" from wishlist`);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-sun-orange shadow-inner">
          <Heart className="h-10 w-10 fill-sun-orange/20 text-sun-orange" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Your wishlist is empty
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
          Explore products from Vendora and independent sellers, and save your favorite items for later.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/products">
            <Button variant="orange-cta" size="lg">
              <span>Browse Catalog</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to catalog</span>
        </Link>
      </div>

      {/* Header and Controls */}
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2.5">
            Saved Wishlist
            <Badge variant="secondary" size="default">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
          </span>
        }
        description="Keep track of items you love and move them directly to your order when ready."
        action={
          <>
            <Button
              variant="glass-pill"
              size="sm"
              onClick={handleMoveAllToCart}
              disabled={items.every((i) => i.stock <= 0)}
            >
              <ShoppingCart className="h-3.5 w-3.5 text-sun-orange" />
              <span>Move All to Cart</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setClearOpen(true)}
              className="text-coral hover:bg-rose-50 hover:text-coral"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All</span>
            </Button>
          </>
        }
      />

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear your wishlist?"
        description={`This removes all ${items.length} saved ${items.length === 1 ? 'item' : 'items'}. This cannot be undone.`}
        confirmLabel="Clear Wishlist"
        onConfirm={async () => {
          await clearWishlist();
          const failure = useWishlistStore.getState().error;
          if (failure) {
            showToast(failure, 'error');
            return;
          }
          setClearOpen(false);
        }}
      />

      {/* Shared toast (Batch 47) — replaces this page's private banner. */}
      <Toast toast={toast} onDismiss={hideToast} />

      {/* Responsive Product Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((product) => {
          const isOutOfStock = product.stock <= 0;
          const hasDiscount =
            product.compareAtPrice && product.compareAtPrice > product.price;
          const discountPct = hasDiscount
            ? Math.round(
                ((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100,
              )
            : 0;

          return (
            <div
              key={product.id}
              className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              {/* Image & Badges */}
              <div>
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white p-2.5">
                  <img
                    src={product.images[0] || ''}
                    alt={product.title}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Top badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                    {product.sellerType === 'platform' ? (
                      <Badge variant="vendora-platform" size="sm">
                        Vendora
                      </Badge>
                    ) : (
                      <Badge variant="vendor-verified" size="sm">
                        {product.sellerName}
                      </Badge>
                    )}
                    {product.type === 'digital' && (
                      <Badge variant="secondary" size="sm">
                        Digital Asset
                      </Badge>
                    )}
                  </div>

                  {/* Discount Badge */}
                  {hasDiscount && (
                    <div className="absolute top-2.5 right-2.5">
                      <Badge variant="discount-coral" size="sm">
                        -{discountPct}%
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{product.brand}</span>
                    <span>{product.category}</span>
                  </div>

                  <Link to={`/products/${product.id}`} className="mt-1 block">
                    <h3 className="font-outfit line-clamp-2 text-sm font-bold text-ink transition-colors hover:text-sun-orange">
                      {product.title}
                    </h3>
                  </Link>

                  {/* Rating */}
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    <div className="flex items-center text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="ml-1 font-semibold text-slate-800">
                        {product.rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-slate-400">({product.reviewCount})</span>
                  </div>

                  {/* Stock status & Price */}
                  <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-extrabold text-ink">
                          {formatPrice(product.price)}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(product.compareAtPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isOutOfStock ? (
                        <Badge variant="discount-coral" size="sm">
                          Out of stock
                        </Badge>
                      ) : (
                        <Badge variant="in-stock" size="sm">
                          In stock
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3">
                <Button
                  variant="orange-cta"
                  size="sm"
                  className="w-full"
                  disabled={isOutOfStock}
                  onClick={() => handleMoveToCart(product)}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>{isOutOfStock ? 'Currently Unavailable' : 'Move to Cart'}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-500 hover:text-coral hover:bg-rose-50"
                  onClick={() => handleRemove(product)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
