import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore, useCartGroups, useCartCalculations } from '../store/cart-store';
import { useAuthStore } from '../store/auth-store';
import { useCheckoutTotals } from '../features/checkout/hooks/useCheckout';
import { AccordionCheckout } from '../features/checkout/components/AccordionCheckout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  ShieldCheck,
  Lock,
  ArrowLeft,
  ShoppingBag,
  Truck,
  RotateCcw,
  Sparkles,
  Loader2,
} from 'lucide-react';

export const CheckoutPage: FC = () => {
  const items = useCartStore((s) => s.items);
  const groups = useCartGroups();
  const { itemCount } = useCartCalculations();
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // The same quote the accordion is priced from, so the two halves of the page cannot disagree.
  const totals = useCheckoutTotals();
  const quote = totals.data;

  const price = (value: number | undefined) => (value === undefined ? '—' : `$${value.toFixed(2)}`);

  return (
    <div className="relative min-h-screen bg-slate-50/70 dark:bg-[#0b1120] pb-16 text-slate-800 dark:text-slate-200 antialiased overflow-hidden transition-colors">
      {/* Ambient luminous glow orbs */}
      <div className="ambient-glow-wrapper" aria-hidden="true">
        <div className="ambient-orb-orange -top-24 -left-24 opacity-40" />
        <div className="ambient-orb-aqua top-1/3 -right-32 opacity-40" />
        <div className="ambient-orb-indigo bottom-10 left-1/3 opacity-30" />
      </div>

      {/* ========================================================================= */}
      {/* Distraction-Free Frosted Header                                            */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sun-orange to-[#FFA057] text-white shadow-md shadow-sun-orange/20 transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5 fill-white" />
            </div>
            <span className="font-outfit text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Vendora<span className="text-sun-orange">.</span>
            </span>
          </Link>

          {/* Security Badge */}
          <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 sm:flex shadow-xs">
            <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>

          {/* Return to Cart Navigation */}
          <Link
            to="/cart"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs transition-colors hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Cart</span>
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* Main Checkout Area                                                        */}
      {/* ========================================================================= */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="mx-auto max-w-md rounded-3xl glass-panel p-10 text-center shadow-2xl border border-white/80 dark:border-white/10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/50 text-sun-orange">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="font-outfit text-xl font-black text-slate-900 dark:text-white">Your Cart is Empty</h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              There are no items currently waiting for checkout. Add products from the catalog to continue.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild variant="orange-cta" className="px-6 rounded-full font-bold">
                <Link to="/products">Explore Products</Link>
              </Button>
            </div>
          </div>
        ) : (
          /* Active Checkout 2-Column Grid */
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Column: 4-Step Accordion Flow (8 Cols) */}
            <div className="lg:col-span-8">
              <div className="mb-6">
                <h1 className="font-outfit text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  Verified Checkout
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Complete the 4-step verified checkout below to place your multi-vendor order.
                </p>
              </div>

              <AccordionCheckout />
            </div>

            {/* Right Column: Sticky Cart Preview Sidebar (4 Cols) */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                <div className="glass-panel-elevated rounded-3xl p-6 shadow-2xl border border-white/90 dark:border-white/15">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                    <h3 className="font-outfit text-sm font-black text-slate-900 dark:text-white">
                      Order Summary ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                    </h3>
                    <Badge variant="secondary" size="sm">
                      {groups.length} {groups.length === 1 ? 'Package' : 'Packages'}
                    </Badge>
                  </div>

                  {/* Items list grouped by vendor */}
                  <div className="max-h-72 divide-y divide-slate-100 dark:divide-white/5 overflow-y-auto py-2 pr-1">
                    {groups.map((group) => (
                      <div key={group.sellerId} className="py-3">
                        <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span>{group.sellerName}</span>
                          <span className="text-slate-400">
                            {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <div className="space-y-2.5">
                          {group.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="h-11 w-11 shrink-0 rounded-xl object-cover border border-slate-100 dark:border-white/10 shadow-xs"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Qty: {item.quantity} · ${item.price.toFixed(2)} each
                                </p>
                              </div>
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Price Totals Breakdown — every number is the one place_order will charge */}
                  {!quote ? (
                    <div className="border-t border-slate-100 dark:border-white/10 pt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                      {isAuthenticated ? (
                        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-sun-orange" />
                          <span>Repricing your cart…</span>
                        </div>
                      ) : (
                        <p className="font-bold text-slate-900 dark:text-white">
                          <Link to="/login" className="text-sun-orange hover:underline">
                            Sign in
                          </Link>{' '}
                          to see your exact total.
                        </p>
                      )}
                      <p className="text-[11px] leading-relaxed">
                        Shipping is charged per seller from their own delivery rules and coupons are applied
                        by the server, so nothing in this column would be an estimate.
                      </p>
                      {totals.error && (
                        <p className="text-[11px] font-semibold text-rose-600" data-testid="quote-error">
                          {totals.error instanceof Error
                            ? totals.error.message
                            : 'Checkout could not price your cart.'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="border-t border-slate-100 dark:border-white/10 pt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-bold text-slate-900 dark:text-white">{price(quote.subtotal)}</span>
                      </div>

                      <div className="flex justify-between">
                        <span>
                          Shipping ({quote.groups.length} {quote.groups.length === 1 ? 'package' : 'packages'})
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {quote.shippingTotal === 0 ? 'FREE' : price(quote.shippingTotal)}
                        </span>
                      </div>

                      {quote.discountTotal > 0 && (
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                          <span>Coupon ({quote.couponCode ?? appliedCoupon?.code})</span>
                          <span>-{price(quote.discountTotal)}</span>
                        </div>
                      )}

                      <div className="border-t border-slate-100 dark:border-white/10 pt-3 flex items-center justify-between text-base font-black text-slate-900 dark:text-white">
                        <span>Total to pay</span>
                        <span className="text-sun-orange text-xl font-black">{price(quote.grandTotal)}</span>
                      </div>

                      {totals.isFetching && (
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Repricing after your latest change…</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Guarantee Badges */}
                  <div className="mt-6 space-y-2.5 border-t border-slate-100 dark:border-white/10 pt-5 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>256-Bit Bank Grade SSL Encryption</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-sun-orange" />
                      <span>Direct Multi-Vendor Split Fulfilment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-aqua" />
                      <span>30-Day Hassle-Free Returns & Protection</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
