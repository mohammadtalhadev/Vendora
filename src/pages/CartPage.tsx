import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { useCartStore, useCartGroups, useCartCalculations } from '../store/cart-store';
import { useCurrency } from '../store/currency-store';
import { Badge } from '../components/ui/badge';
import { PageHeader } from '../components/common/PageHeader';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { fetchCouponByCode } from '../features/cart/api/promotions';
import { useCartServerQuote } from '../features/checkout/hooks/useCheckout';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { removeItem, updateQuantity, clearCart, applyCoupon, removeCoupon, appliedCoupon } = useCartStore();
  const groups = useCartGroups();
  const { subtotal, discountTotal, grandTotal, itemCount } = useCartCalculations();
  const { formatPrice } = useCurrency();

  // Shipping and the final total come from the server quote — the same
  // `checkout_quote` checkout books with — never from a local estimate.
  // Without a quote (guest, or the quote failed) the summary shows the
  // before-shipping total and says shipping is calculated at checkout.
  const quote = useCartServerQuote().data;
  const displaySubtotal = quote?.subtotal ?? subtotal;
  const displayDiscount = quote?.discountTotal ?? discountTotal;
  const displayGrandTotal = quote?.grandTotal ?? grandTotal;

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  // The same promotions path the cart drawer and checkout use: only live
  // codes from the database are accepted, and checkout_pricing re-checks
  // them server-side. (This replaces a hardcoded code that always worked.)
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    try {
      const coupon = await fetchCouponByCode(code, subtotal);
      applyCoupon(coupon);
      setCouponCode('');
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'That code could not be applied.');
    } finally {
      setCouponBusy(false);
    }
  };

  const couponKind = (coupon: NonNullable<typeof appliedCoupon>): string => {
    const type = coupon.type as string;
    if (type === 'percentage') return `${coupon.value}% off`;
    if (type === 'fixed') return `${formatPrice(coupon.value)} off`;
    return 'Free shipping';
  };

  if (itemCount === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-sun-orange">
          <Tag className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Your shopping cart is empty</h1>
        <p className="mt-2 text-xs text-slate-500">
          Explore products from Vendora and independent sellers to start building your order.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-sun-orange px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-sun-orange-600"
        >
          <span>Browse Catalog</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6">
      <PageHeader
        title={`Shopping Cart (${itemCount} items)`}
        description="Items partitioned by seller for fulfillment"
        action={
          <button
            onClick={() => setClearOpen(true)}
            className="text-xs font-semibold text-rose-600 hover:underline"
          >
            Clear Cart
          </button>
        }
      />

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear your cart?"
        description={`This removes all ${itemCount} ${itemCount === 1 ? 'item' : 'items'} from your cart. This cannot be undone.`}
        confirmLabel="Clear Cart"
        onConfirm={() => {
          clearCart();
          setClearOpen(false);
        }}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Seller-Grouped Items (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {groups.map((group) => {
            const isPlatform = group.sellerType === 'platform';
            return (
              <div
                key={group.sellerId}
                className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm"
              >
                {/* Seller Group Header */}
                <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Package from:</span>
                    {isPlatform ? (
                      <Badge variant="vendora-platform">Sold by Vendora Direct</Badge>
                    ) : (
                      <Link
                        to={`/vendors/${group.sellerId}`}
                        className="text-xs font-bold text-slate-800 hover:text-sun-orange underline"
                      >
                        {group.sellerName}
                      </Link>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-500">{group.fulfilmentNote}</span>
                </div>

                {/* Items in this group */}
                <div className="divide-y divide-slate-100">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex gap-4 py-4">
                      {/* Thumbnail */}
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      </div>

                      {/* Details */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex justify-between">
                          <div>
                            <Link
                              to={`/products/${item.productId}`}
                              className="text-sm font-semibold text-slate-800 hover:text-sun-orange"
                            >
                              {item.title}
                            </Link>
                            {item.type === 'digital' && (
                              <span className="ml-2 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
                                Digital License
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-bold text-slate-900">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="text-slate-500 hover:text-slate-900"
                              title="Decrease quantity"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="text-slate-500 hover:text-slate-900"
                              title="Increase quantity"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Seller Group Subtotal Footer */}
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-xs">
                  <span className="text-slate-500">
                    {`Group Subtotal (${group.items.reduce((n, i) => n + i.quantity, 0)} items):`}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatPrice(group.subtotal)}{' '}
                    {(() => {
                      const quoteGroup = quote?.groups.find(
                        (g) =>
                          g.sellerId === group.sellerId ||
                          (group.sellerType === 'platform' && g.sellerType === 'platform'),
                      );
                      if (quoteGroup) {
                        return quoteGroup.shippingFee > 0
                          ? `+ ${formatPrice(quoteGroup.shippingFee)} shipping`
                          : '· Free shipping';
                      }
                      return group.items.every((i) => i.type !== 'physical')
                        ? '· No shipping — digital delivery'
                        : '· Shipping calculated at checkout';
                    })()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Order Summary (4 cols) */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>

            {/* Price lines */}
            <div className="mt-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-900">{formatPrice(displaySubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-slate-900">
                  {quote
                    ? quote.shippingTotal > 0
                      ? formatPrice(quote.shippingTotal)
                      : 'FREE'
                    : 'Calculated at checkout'}
                </span>
              </div>

              {displayDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>-{formatPrice(displayDiscount)}</span>
                </div>
              )}

              <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-extrabold text-slate-900">
                <span>{quote ? 'Grand Total' : 'Total (before shipping)'}</span>
                <span>{formatPrice(displayGrandTotal)}</span>
              </div>
              {!quote && (
                <p className="text-[11px] text-slate-400">
                  Grand total is before shipping — the final shipping fee is quoted at checkout.
                </p>
              )}
            </div>

            {/* Coupon Code Input */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span>Code {appliedCoupon.code} applied ({couponKind(appliedCoupon)})</span>
                  <button onClick={removeCoupon} className="text-emerald-900 hover:underline">
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
                    className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-xs focus:border-sun-orange focus:outline-none uppercase"
                  />
                  <button
                    type="submit"
                    disabled={couponBusy}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {couponBusy ? 'Checking…' : 'Apply'}
                  </button>
                </form>
              )}
              {couponError && <p role="alert" className="mt-1 text-[11px] text-rose-500">{couponError}</p>}
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => navigate('/checkout')}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-sun-orange py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-sun-orange-600"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Security badges */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Secure checkout · COD Available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
