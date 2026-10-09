import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, ShieldCheck, Store } from 'lucide-react';

export interface ProductItem {
  id: string;
  title: string;
  category: string;
  subCategoryId?: string;
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
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
}) => {
  const filledStars = Math.round(product.rating);
  const stockPercent = Math.min(100, Math.round((product.stock / product.maxStock) * 100));
  const lowStock = product.stock <= 20;

  const showVerified = product.sellerType === 'platform' || Boolean(product.isVerified);

  return (
    <div className="group relative flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-white p-3 sm:p-3.5 shadow-2xs transition-all hover:-translate-y-1 hover:shadow-md">
      <div>
        {/* Image with discount + wishlist overlays */}
        <div className="relative flex h-36 sm:h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50/60 p-2.5 sm:p-3">
          {product.discountPercent && (
            <span className="absolute left-2 top-2 z-10 rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              -{product.discountPercent}%
            </span>
          )}
          <button
            type="button"
            onClick={() => onToggleWishlist(product)}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 sm:h-8 sm:w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white hover:text-rose-500"
            title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
          </button>
          <Link to={`/products/${product.id}`} className="flex h-full w-full items-center justify-center">
            <img
              src={product.image}
              alt={product.title}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none select-none"
            />
          </Link>
        </div>

        {/* Category */}
        <span className="mt-2.5 sm:mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {product.category}
        </span>

        {/* Product Title */}
        <Link to={`/products/${product.id}`} className="mt-1 block">
          <h4 className="font-outfit line-clamp-2 min-h-[2.2rem] sm:min-h-[2.5rem] text-xs sm:text-[13px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-[#0071DC]">
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
          <span className="font-bold text-slate-700">{product.rating.toFixed(1)}</span>
          <span className="text-[10px] text-slate-400 truncate">({product.reviewCount})</span>
        </div>

        {/* Price Row */}
        <div className="mt-2 flex flex-wrap items-baseline gap-1 sm:gap-1.5">
          <span className="text-sm sm:text-base font-extrabold text-[#16A34A]">
            {product.displayPrice ? product.displayPrice : `$${product.price.toFixed(2)}`}
          </span>
          {product.compareAtPrice && (
            <span className="text-[11px] sm:text-xs text-slate-400 line-through">${product.compareAtPrice.toFixed(2)}</span>
          )}
          {product.discountPercent && (
            <span className="rounded bg-[#FEE2E2] px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#B91C1C]">
              {product.discountPercent}%
            </span>
          )}
        </div>

        {/* Sold by seller + Verified Badge with hover tooltip */}
        <div className="mt-2 sm:mt-2.5 flex max-w-full items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-slate-600">
          <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-[#0071DC]" />
          <span className="shrink-0 font-medium text-slate-500">Sold by</span>
          <Link
            to={`/products?seller=${encodeURIComponent(product.sellerId)}`}
            className="truncate font-bold text-slate-900 hover:text-[#0071DC] hover:underline"
            title={product.sellerName}
          >
            {product.sellerName}
          </Link>
          {showVerified && (
            <div className="relative group/badge inline-flex items-center">
              <span
                tabIndex={0}
                className="inline-flex items-center cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded-full"
                aria-label="Verified Badge"
                title="Verified Badge"
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#0071DC] hover:scale-110 transition-transform" />
              </span>
              {/* Tooltip on hover/focus */}
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/badge:flex group-focus-within/badge:flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl backdrop-blur-xs z-50 transition-all animate-in fade-in zoom-in-95"
              >
                <ShieldCheck className="h-3 w-3 text-sky-400 shrink-0" />
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
            Available only: <strong className="text-slate-900">{product.stock}</strong>
          </span>
          {lowStock && <span className="font-bold text-[#EF4444] shrink-0">Selling fast</span>}
        </div>

        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#E0E7FF]">
          <div className="h-full rounded-full bg-[#EF4444]" style={{ width: `${stockPercent}%` }} />
        </div>

        {/* Add to Cart Actions */}
        <div className="mt-2 sm:mt-2.5">
          {/* Mobile Add to Cart button */}
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className="sm:hidden flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-slate-900 py-1.5 text-[11px] font-bold text-white transition-all active:scale-95 hover:bg-[#0071DC]"
            aria-label={`Add ${product.title} to cart`}
          >
            <ShoppingCart className="h-3 w-3" />
            <span>Add</span>
          </button>

          {/* Desktop Add to Cart button (shows on hover) */}
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className="hidden sm:flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-slate-900 py-1.5 sm:py-2 text-[11px] font-bold text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[#0071DC] active:scale-95"
            aria-label={`Add ${product.title} to cart`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
