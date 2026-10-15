import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { X, Minus, Plus, Trash2, Tag, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore, useCartCalculations } from '../../../store/cart-store';
import { useSmoothScroll } from '../../../components/SmoothScrollProvider';
import { useCurrency } from '../../../store/currency-store';
import { fetchCouponByCode } from '../api/promotions';
import { friendlyErrorText } from '../../../lib/friendly-error';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, applyCoupon, removeCoupon, appliedCoupon } = useCartStore();
  const { subtotal, discountTotal, grandTotal, itemCount } = useCartCalculations();
  const { formatPrice } = useCurrency();

  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

  const { lenis, pauseScroll, resumeScroll } = useSmoothScroll();

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    // Lock page scroll while the drawer is open. Stopping Lenis is the
    // primary mechanism: a hard `overflow: hidden` on <body> fights Lenis's
    // internal scroll state (and any Radix scroll lock mounted alongside),
    // while stop()/start() pause and resume the exact instance that owns
    // scrolling. The body-overflow lock remains only as the fallback for
    // when no Lenis instance exists (reduced-motion users, tests).
    if (lenis) {
      pauseScroll();
      return () => {
        document.removeEventListener('keydown', handleKey);
        resumeScroll();
      };
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, lenis, pauseScroll, resumeScroll]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    // Only live promotions from the database are accepted — checkout_pricing
    // applies the same rules server-side, so a code that works here works at
    // checkout. (This replaces hardcoded fallback codes that always succeeded.)
    try {
      const coupon = await fetchCouponByCode(code, subtotal);
      applyCoupon(coupon);
      setCouponCode('');
    } catch (err) {
      setCouponError(friendlyErrorText(err, { context: 'cart' }));
    }
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[70] transition-opacity duration-300 ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop — a pointer-only dismiss affordance; the header X is the keyboard path. */}
      <div
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Frosted glass panel */}
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-white/70 bg-white/70 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="font-outfit text-lg font-extrabold tracking-tight text-slate-900">Cart</h2>
            {itemCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-900/8 px-1.5 text-[11px] font-bold text-slate-600">
                {itemCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        {itemCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 shadow-sm">
              <ShoppingBag className="h-8 w-8 text-slate-300" />
            </div>
            <p className="font-outfit text-base font-bold text-slate-700">Your cart is empty</p>
            <p className="-mt-2 text-xs text-slate-500">Add items to get started.</p>
            <Link
              to="/products"
              onClick={onClose}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sun-orange px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-95"
            >
              Browse Products
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <>
            <div data-lenis-prevent className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/80 bg-white/80 p-3.5 shadow-sm backdrop-blur-xl"
                >
                  <div className="flex gap-3.5">
                    <Link
                      to={`/products/${item.productId}`}
                      onClick={onClose}
                      className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white"
                    >
                      <img src={item.image} alt={item.title} className="h-full w-full object-contain" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/products/${item.productId}`}
                          onClick={onClose}
                          className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 transition-colors hover:text-sun-orange"
                        >
                          {item.title}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.title} from cart`}
                          className="shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5 text-[13px]">
                        <span className="font-bold text-slate-800">{formatPrice(item.price)}</span>
                        {item.compareAtPrice && item.compareAtPrice > item.price && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(item.compareAtPrice)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="cursor-pointer text-slate-500 transition-colors hover:text-slate-900"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.maxStock}
                            aria-label="Increase quantity"
                            className="cursor-pointer text-slate-500 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-extrabold text-slate-900">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Link
                to="/cart"
                onClick={onClose}
                className="block pt-1 text-center text-xs font-semibold text-slate-500 transition-colors hover:text-sun-orange"
              >
                View full cart details
              </Link>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-white/60 px-5 pb-5 pt-3">
              {/* Discount accordion */}
              <button
                type="button"
                onClick={() => setIsDiscountOpen((v) => !v)}
                aria-expanded={isDiscountOpen}
                className="flex w-full cursor-pointer items-center justify-between border-b border-white/60 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
                  <Tag className="h-4 w-4 text-slate-400" />
                  Discount
                </span>
                <span className="text-lg font-medium text-slate-500">{isDiscountOpen ? '−' : '+'}</span>
              </button>
              {isDiscountOpen && (
                <div className="py-3">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-2 text-xs font-bold text-emerald-700">
                      <span className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        {appliedCoupon.code} applied
                      </span>
                      <button type="button" onClick={removeCoupon} className="cursor-pointer hover:underline">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Coupon code"
                        aria-label="Coupon code"
                        className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-mono uppercase text-slate-800 placeholder:normal-case focus:border-sun-orange focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="cursor-pointer rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                      >
                        Apply
                      </button>
                    </form>
                  )}
                  {couponError && <p className="mt-1.5 text-[11px] font-semibold text-rose-500">{couponError}</p>}
                </div>
              )}

              <div className="flex items-baseline justify-between py-2">
                <span className="text-sm font-semibold text-slate-700">Estimated total</span>
                <span className="font-outfit text-lg font-extrabold text-slate-900">
                  {formatPrice(grandTotal)}
                </span>
              </div>
              {discountTotal > 0 && (
                <p className="-mt-1 pb-1 text-right text-[11px] font-semibold text-emerald-600">
                  You save {formatPrice(discountTotal)}
                </p>
              )}
              <p className="pb-3 text-xs text-slate-500">Taxes and shipping calculated at checkout.</p>

              <button
                type="button"
                onClick={handleCheckout}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-sun-orange py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-[0.98]"
              >
                Check out
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </aside>
    </div>,
    document.body
  );
};
