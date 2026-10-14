import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  MapPin,
  Package,
  ShieldAlert,
} from 'lucide-react';
import { useOrderDetail } from '../features/orders/hooks/useOrders';
import { StatusBadge } from '../components/ui/status-badge';
import { useCurrency } from '../store/currency-store';

/**
 * Order Confirmation (/order-confirmation/:orderId) — the thank-you page
 * both checkout flows land on after place_order succeeds. Everything on it
 * is read back from the placed order itself (items, totals, payment method,
 * delivery address); the delivery-code reminder mirrors the rule the FAQ
 * and the rider flow state.
 */
export const OrderConfirmationPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { data, isLoading, isError } = useOrderDetail(orderId);
  const { formatPrice } = useCurrency();

  const totals = useMemo(() => {
    const subOrders = data?.subOrders ?? [];
    const itemsSubtotal = subOrders.reduce((sum, so) => sum + so.subtotal, 0);
    const shipping = subOrders.reduce((sum, so) => sum + so.shippingFee, 0);
    return { itemsSubtotal, shipping, total: itemsSubtotal + shipping };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center p-8">
        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-sun-orange border-t-transparent" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Loading your order…
        </span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex min-h-[55vh] w-full max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
        <ShieldAlert className="mb-3 h-10 w-10 text-slate-400" aria-hidden="true" />
        <h1 className="font-outfit text-3xl font-black text-slate-900 dark:text-white">
          We could not load this order
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          The order may belong to another account, or it is still being written. Your
          orders list always shows everything we have for you.
        </p>
        <Link
          to="/orders"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-sun-orange px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-95 sm:text-sm"
        >
          Go to My Orders
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const { orderGroup, subOrders } = data;
  const address = orderGroup.shippingAddress;
  const isCod = orderGroup.paymentMethod === 'cod';

  return (
    <div className="pb-16 pt-8 sm:pt-12">
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 sm:px-6">
        {/* Success header */}
        <div className="space-y-3 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 shadow-sm dark:bg-emerald-950/40">
            <CheckCircle2 className="h-9 w-9 text-emerald-500" aria-hidden="true" />
          </span>
          <h1 className="font-outfit text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Thank you — your order is placed!
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Order reference{' '}
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              #{orderGroup.id.slice(0, 8).toUpperCase()}
            </span>
            {orderGroup.customerEmail && (
              <>
                {' '}
                · a receipt was sent to{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {orderGroup.customerEmail}
                </span>
              </>
            )}
            . Track it any time from your orders.
          </p>
          {isCod && (
            <p className="mx-auto flex max-w-xl items-start justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-left text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <Banknote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              You chose Cash on Delivery — please keep{' '}
              <strong>{formatPrice(totals.total)}</strong> ready for the rider. Share the
              delivery code from your order only when the parcel is in your hands.
            </p>
          )}
        </div>

        {/* Order facts */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/80 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              {isCod ? (
                <Banknote className="h-4 w-4 text-sun-orange" aria-hidden="true" />
              ) : (
                <CreditCard className="h-4 w-4 text-sun-orange" aria-hidden="true" />
              )}
              Payment
            </span>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              {isCod
                ? 'Cash on Delivery'
                : `Card${orderGroup.paymentDetails.brand ? ` · ${orderGroup.paymentDetails.brand}` : ''}${
                    orderGroup.paymentDetails.last4
                      ? ` •••• ${orderGroup.paymentDetails.last4}`
                      : ''
                  }`}
            </p>
            {orderGroup.paymentStatus && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Status: {orderGroup.paymentStatus}
              </p>
            )}
          </div>
          <div className="rounded-3xl border border-white/80 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <Package className="h-4 w-4 text-sun-orange" aria-hidden="true" />
              Packages
            </span>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              {subOrders.length} package{subOrders.length === 1 ? '' : 's'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subOrders.length > 1
                ? 'One per seller — each is dispatched and tracked separately.'
                : 'Dispatched and tracked from your orders.'}
            </p>
          </div>
          <div className="rounded-3xl border border-white/80 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <MapPin className="h-4 w-4 text-sun-orange" aria-hidden="true" />
              Deliver to
            </span>
            {address ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                <span className="font-bold text-slate-900 dark:text-white">{address.fullName}</span>
                <br />
                {address.street}
                {address.city ? `, ${address.city}` : ''}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Digital delivery — see My Downloads.</p>
            )}
          </div>
        </section>

        {/* Items by package */}
        <section className="space-y-4">
          {subOrders.map((subOrder) => (
            <div
              key={subOrder.id}
              className="overflow-hidden rounded-3xl border border-white/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-white/5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Sold by{' '}
                  <span className="text-slate-900 dark:text-white">{subOrder.sellerName}</span>
                </span>
                <StatusBadge status={subOrder.status} />
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {subOrder.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-12 w-12 shrink-0 rounded-xl bg-slate-100 object-cover dark:bg-slate-800"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                      <span className="text-xs text-slate-500">Qty {item.quantity}</span>
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Totals */}
          <div className="rounded-3xl border border-white/80 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Items subtotal</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">
                  {formatPrice(totals.itemsSubtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Shipping</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">
                  {totals.shipping > 0 ? formatPrice(totals.shipping) : 'Free'}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base dark:border-white/5">
                <dt className="font-black text-slate-900 dark:text-white">Total</dt>
                <dd className="font-black text-slate-900 dark:text-white">
                  {formatPrice(totals.total)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={`/orders/${orderGroup.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-sun-orange px-6 py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-95 sm:text-sm"
          >
            Track &amp; view order details
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-xs font-bold text-slate-800 shadow-xs transition-all hover:border-sun-orange hover:text-sun-orange sm:text-sm dark:border-white/15 dark:bg-transparent dark:text-slate-100"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
