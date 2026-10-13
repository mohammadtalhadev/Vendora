import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, ShieldCheck, Store } from 'lucide-react';
import { useCurrency } from '../../../store/currency-store';

export interface ProductItem {
  id: string;
  title: string;
  category: string;
  subCategoryId?: string;
  childCategoryId?: string;
  price: number;
  displayPrice?: string;
  compareAtPrice?: number;
  discountPercent?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  maxStock: number;
  sellerId: string;
  sellerName: string;
  sellerType: 'platform' | 'vendor';
  isVerified?: boolean;
  type: 'physical' | 'digital';
  image: string;
}

export interface ProductCardProps {
  product: ProductItem;
  onAddToCart: (item: ProductItem) => void;
  onToggleWishlist: (item: ProductItem) => void;
  isWishlisted: boolean;
  solidAddToCart?: boolean;
  expressBadge?: string;
}

const PRODUCT_IMAGE_FALLBACK = '/images/products/prod_silver_headphones.jpg';

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
  solidAddToCart,
  expressBadge,
}) => {
  const filledStars = Math.round(product.rating);
  const hasReviews = product.reviewCount > 0;
  const stockPercent = Math.min(100, Math.round((product.stock / product.maxStock) * 100));
  const lowStock = product.stock <= 20;
  const { formatPrice } = useCurrency();

  const showVerified = product.sellerType === 'platform' || Boolean(product.isVerified);

  return (
    <div className="group relative flex h-full flex-col justify-between rounded-2xl border border-white/80 hover:border-orange-200/80 bg-white/90 backdrop-blur-md p-3 sm:p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/5 hover:bg-white">
      <div>
        {/* Image with discount + wishlist overlays */}
        <div className="relative flex h-36 sm:h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-white p-2.5 sm:p-3">
          {product.discountPercent && (
            <span className="absolute left-2 top-2 z-10 rounded-full bg-[#E11D48]/90 backdrop-blur-xs border border-white/30 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
              -{product.discountPercent}%
            </span>
          )}
          <button
            type="button"
            onClick={() => onToggleWishlist(product)}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 sm:h-8 sm:w-8 cursor-pointer items-center justify-center rounded-full bg-white/75 backdrop-blur-md border border-white/60 shadow-xs transition-all hover:bg-white hover:scale-110 hover:text-rose-500"
            title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
          </button>
          <Link to={`/products/${product.id}`} className="flex h-full w-full items-center justify-center">
            <img
              src={product.image || PRODUCT_IMAGE_FALLBACK}
              alt={product.title}
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== window.location.origin + PRODUCT_IMAGE_FALLBACK) {
                  target.src = PRODUCT_IMAGE_FALLBACK;
                }
              }}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none select-none"
            />
          </Link>
        </div>

        {/* Category */}
        <span className="mt-2.5 sm:mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {product.category}
        </span>

        {/* Product Title */}
        <Link to={`/products/${product.id}`} className="mt-1 block">
          <h4 className="font-outfit line-clamp-2 min-h-[2.2rem] sm:min-h-[2.5rem] text-xs sm:text-[13px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-sun-orange">
            {product.title}
          </h4>
        </Link>

        {/* Star Rating Row */}
        <div className="mt-1.5 flex items-center gap-1 sm:gap-1.5 text-[11px]">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${n <= filledStars ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
              />
            ))}
          </div>
          {hasReviews ? (
            <>
              <span className="font-bold text-slate-700">{product.rating.toFixed(1)}</span>
              <span className="text-[10px] text-slate-400 truncate">({product.reviewCount})</span>
            </>
          ) : (
            <span className="text-[10px] font-medium text-slate-400">No reviews yet</span>
          )}
        </div>

        {/* Price Row */}
        <div className="mt-2 flex flex-wrap items-baseline gap-1 sm:gap-1.5">
          <span className="text-sm sm:text-base font-extrabold text-[#16A34A]">
            {product.displayPrice ? product.displayPrice : formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-[11px] sm:text-xs text-slate-400 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* Sold by seller + Verified Badge with hover tooltip */}
        <div className="mt-2 sm:mt-2.5 flex max-w-full items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-slate-600">
          <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-aqua" />
          <span className="shrink-0 font-medium text-slate-500">Sold by</span>
          <Link
            to={`/products?seller=${encodeURIComponent(product.sellerId)}`}
            className="truncate font-bold text-slate-900 hover:text-sun-orange hover:underline"
            title={product.sellerName}
          >
            {product.sellerName}
          </Link>
          {showVerified && (
            <div className="relative group/badge inline-flex items-center">
              <span
                tabIndex={0}
                className="inline-flex items-center cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded-full"
                aria-label="Verified Badge"
                title="Verified Badge"
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-aqua hover:scale-110 transition-transform" />
              </span>
              {/* Tooltip on hover/focus */}
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/badge:flex group-focus-within/badge:flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl backdrop-blur-xs z-50 transition-all animate-in fade-in zoom-in-95"
              >
                <ShieldCheck className="h-3 w-3 text-cyan-400 shrink-0" />
                <span>Verified Badge</span>
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Availability & Progress Bar */}
      <div className="mt-2.5 sm:mt-3 border-t border-slate-100 pt-2 sm:pt-2.5">
        <div className="flex items-center justify-between text-[10px] text-slate-600">
          <span className="truncate pr-1">
            {product.stock > 0 ? (
              <>
                Only <strong className="text-slate-900">{product.stock}</strong> left
              </>
            ) : (
              <>
                <strong className="text-slate-900">Out of stock</strong>
              </>
            )}
          </span>
          {lowStock && product.stock > 0 && (
            <span className="font-bold text-[#F59E0B] shrink-0">Selling fast</span>
          )}
        </div>

        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${lowStock ? 'bg-[#F59E0B]' : 'bg-[#16A34A]'}`}
            style={{ width: `${stockPercent}%` }}
          />
        </div>

        {/* Express Delivery Badge or stock highlight */}
        {expressBadge && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-blue-50/90 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
            {expressBadge}
          </div>
        )}

        {/* Add to Cart Actions */}
        <div className="mt-2 sm:mt-2.5">
          {solidAddToCart ? (
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              disabled={product.stock === 0}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-sun-orange hover:bg-sun-orange-600 py-2 sm:py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Add ${product.title} to cart`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Add to Cart</span>
            </button>
          ) : (
            <>
              {/* Mobile Add to Cart button */}
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                disabled={product.stock === 0}
                className="sm:hidden flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-sun-orange/30 bg-sun-orange/[0.08] py-1.5 text-[11px] font-bold text-[#EA580C] backdrop-blur-md transition-all hover:border-transparent hover:bg-sun-orange hover:text-white hover:shadow-orange-glow active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sun-orange/[0.08] disabled:hover:text-[#EA580C]"
                aria-label={`Add ${product.title} to cart`}
              >
                <ShoppingCart className="h-3 w-3" />
                <span>Add to Cart</span>
              </button>

              {/* Desktop Add to Cart button (shows on hover) */}
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                disabled={product.stock === 0}
                className="hidden sm:flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-sun-orange/30 bg-sun-orange/[0.08] py-1.5 sm:py-2 text-[11px] font-bold text-[#EA580C] backdrop-blur-md opacity-0 shadow-sm transition-all duration-200 hover:border-transparent hover:bg-sun-orange hover:text-white hover:shadow-orange-glow group-hover:opacity-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sun-orange/[0.08] disabled:hover:text-[#EA580C]"
                aria-label={`Add ${product.title} to cart`}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>Add to Cart</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
