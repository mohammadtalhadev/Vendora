import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore, useCartGroups, useCartCalculations } from '../store/cart-store';
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
} from 'lucide-react';

export const CheckoutPage: FC = () => {
  const items = useCartStore((s) => s.items);
  const groups = useCartGroups();
  const { itemCount, subtotal, shippingTotal, discountTotal, grandTotal } = useCartCalculations();
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-16 text-slate-800 antialiased">
      {/* ========================================================================= */}
      {/* Distraction-Free Header                                                   */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sun-orange to-[#FFA057] text-white shadow-md shadow-sun-orange/20 transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5 fill-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Vendora<span className="text-sun-orange">.</span>
            </span>
          </Link>

          {/* Security Badge */}
          <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-600 sm:flex">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>

          {/* Return to Cart Navigation */}
          <Link
            to="/cart"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Cart</span>
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* Main Checkout Area                                                        */}
      {/* ========================================================================= */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-sun-orange">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Your Cart is Empty</h2>
            <p className="mt-2 text-xs text-slate-500">
              There are no items currently waiting for checkout. Add products from the catalog to continue.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild variant="orange-cta" className="px-6">
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
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Checkout
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  Complete the 4-step verified checkout below to place your multi-vendor order.
                </p>
              </div>

              <AccordionCheckout />
            </div>

            {/* Right Column: Sticky Cart Preview Sidebar (4 Cols) */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Order Summary ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                    </h3>
                    <Badge variant="secondary" size="sm">
                      {groups.length} {groups.length === 1 ? 'Package' : 'Packages'}
                    </Badge>
                  </div>

                  {/* Items list grouped by vendor */}
                  <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto py-2 pr-1">
                    {groups.map((group) => (
                      <div key={group.sellerId} className="py-3">
                        <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span>{group.sellerName}</span>
                          <span className="text-slate-400">
                            {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="h-10 w-10 shrink-0 rounded-xl object-cover border border-slate-100"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-slate-800">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Qty: {item.quantity} · ${item.price.toFixed(2)} each
                                </p>
                              </div>
                              <span className="text-xs font-bold text-slate-900">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Price Totals Breakdown */}
                  <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Standard Shipping Estimate</span>
                      <span className="font-semibold text-slate-900">
                        {shippingTotal === 0 ? 'FREE' : `$${shippingTotal.toFixed(2)}`}
                      </span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex items-center justify-between text-emerald-600 font-medium">
                        <span>Coupon ({appliedCoupon.code})</span>
                        <span>-${discountTotal.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-base font-extrabold text-slate-900">
                      <span>Total Estimated</span>
                      <span className="text-sun-orange">${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Guarantee Cards */}
                  <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-[11px] text-slate-500">
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
      </main>
    </div>
  );
};
export default CheckoutPage;
