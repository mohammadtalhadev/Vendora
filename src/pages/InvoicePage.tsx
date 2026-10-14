import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useOrderDetail } from '../features/orders/hooks/useOrders';
import { QueryState } from '../components/common/QueryState';
import { useCurrency } from '../store/currency-store';
import { fetchPlatformSettings } from '../features/admin/api/settings';

/** What the server recorded at booking. Nothing here is inferred from the payment method. */
function settlementLine(status: string | undefined): { label: string; tone: string } {
  switch (status) {
    case 'succeeded':
      return { label: 'PAID · SETTLEMENT RECORDED', tone: 'text-emerald-600 dark:text-emerald-400 print:text-emerald-800' };
    case 'pending':
      return { label: 'DUE ON DELIVERY', tone: 'text-amber-600 dark:text-amber-400 print:text-amber-800' };
    case 'failed':
      return { label: 'PAYMENT FAILED', tone: 'text-rose-600 dark:text-rose-400 print:text-rose-800' };
    case 'refunded':
      return { label: 'REFUNDED', tone: 'text-slate-600 dark:text-slate-400 print:text-slate-600' };
    case 'voided':
      return { label: 'PAYMENT VOID · ORDER CANCELLED', tone: 'text-slate-600 dark:text-slate-400 print:text-slate-600' };
    default:
      return { label: 'SETTLEMENT NOT RECORDED', tone: 'text-slate-600 dark:text-slate-400 print:text-slate-600' };
  }
}

export const InvoicePage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { orderId } = useParams<{ orderId: string }>();
  const effectiveOrderId = orderId ?? '';

  const { data, isLoading, isError, error, refetch } = useOrderDetail(effectiveOrderId);

  // The letterhead is read from the platform settings row — the settings
  // model carries a platform name and a support email, and nothing else
  // letterhead-shaped. (The block this replaces printed an invented
  // street address and VAT ID; there is no such data to print.)
  const settingsQuery = useQuery({
    queryKey: ['platform-settings'],
    queryFn: ({ signal }) => fetchPlatformSettings(signal),
    staleTime: 1000 * 60 * 10,
  });
  const platformName = settingsQuery.data?.platformName || 'Vendora';
  const supportEmail = settingsQuery.data?.supportEmail || '';

  const order = data?.orderGroup;
  const subOrders = data?.subOrders ?? [];
  const items = subOrders.flatMap((so) => so.items);

  // `sub_orders.subtotal` holds the post-discount net, so the gap between the printed line
  // prices and that net is the discount the coupon earned. There is no tax column to read.
  const grossLineTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const netSubtotal = subOrders.reduce((sum, so) => sum + so.subtotal, 0);
  const discount = Math.max(0, Math.round((grossLineTotal - netSubtotal) * 100) / 100);
  const shippingTotal = subOrders.reduce((sum, so) => sum + so.shippingFee, 0);
  const grandTotal = netSubtotal + shippingTotal;

  const settlement = settlementLine(order?.paymentStatus);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="py-10 print:p-0">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 print:px-0">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            to={`/orders/${effectiveOrderId}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/15 bg-white/90 dark:bg-slate-800/90 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Order Tracking</span>
          </Link>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-full bg-sun-orange px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 hover:bg-sun-orange-600 transition-all cursor-pointer active:scale-95"
          >
            <Printer className="h-4 w-4" />
            <span>Print Invoice (PDF)</span>
          </button>
        </div>

        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          isEmpty={!order}
          emptyTitle="Invoice not found"
          emptyMessage={`No booked order matches "${effectiveOrderId}". Invoices are only available for your own orders.`}
          emptyAction={
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 rounded-full bg-sun-orange px-5 py-2.5 text-xs font-extrabold text-white"
            >
              Return to Orders
            </Link>
          }
          skeletonType="card"
        >
          {order && (
            // Invoice Paper Document
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 p-8 sm:p-12 shadow-2xl print:shadow-none print:border-none print:p-0 print:bg-white text-slate-800 dark:text-slate-200 print:text-black">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-slate-200 dark:border-white/10 print:border-slate-300">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="font-outfit text-2xl font-black text-slate-900 dark:text-white print:text-black tracking-tight">
                      Vendora<span className="text-sun-orange">.</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 leading-relaxed">
                    {platformName} — multi-vendor marketplace
                    {supportEmail && (
                      <>
                        <br />
                        Support: {supportEmail}
                      </>
                    )}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="inline-block rounded-full bg-orange-50 dark:bg-orange-950/60 print:bg-slate-100 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-sun-orange print:text-black mb-1">
                    Invoice
                  </span>
                  <h2 className="font-outfit text-2xl font-black text-slate-900 dark:text-white print:text-black">
                    #{order.id}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 mt-1">
                    Issued: {new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
                  </p>
                  <div className={`flex items-center sm:justify-end gap-1.5 mt-1 text-xs font-bold ${settlement.tone}`}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{settlement.label}</span>
                  </div>
                </div>
              </div>

              {/* Billing & Shipping Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-200 dark:border-white/10 print:border-slate-300 text-xs">
                <div>
                  <h3 className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Billed To</h3>
                  <p className="font-bold text-slate-900 dark:text-white print:text-black text-sm">
                    {order.shippingAddress?.fullName || order.customerEmail || 'Vendora account holder'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 print:text-slate-600 mt-0.5">{order.customerEmail}</p>
                  <p className="text-slate-600 dark:text-slate-400 print:text-slate-600">{order.shippingAddress?.phone}</p>
                </div>

                <div>
                  <h3 className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Delivered To</h3>
                  {order.shippingAddress ? (
                    <>
                      <p className="font-bold text-slate-900 dark:text-white print:text-black text-sm">{order.shippingAddress.fullName}</p>
                      <p className="text-slate-600 dark:text-slate-400 print:text-slate-600 mt-0.5">{order.shippingAddress.street}</p>
                      <p className="text-slate-600 dark:text-slate-400 print:text-slate-600">
                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 print:text-slate-600">{order.shippingAddress.country}</p>
                    </>
                  ) : (
                    <p className="text-slate-600 dark:text-slate-400 print:text-slate-600">
                      Digital order · nothing to deliver
                    </p>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-8 border-b border-slate-200 dark:border-white/10 print:border-slate-300">
                <h3 className="font-bold text-slate-400 dark:text-slate-500 text-xs mb-4">
                  Order Packages & Line Items
                </h3>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 print:border-slate-300 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                      <th className="pb-3">Description</th>
                      <th className="pb-3">Fulfillment Origin</th>
                      <th className="pb-3 text-center">Qty</th>
                      <th className="pb-3 text-right">Unit Price</th>
                      <th className="pb-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 print:divide-slate-200">
                    {items.map((item, idx) => (
                      <tr key={`${item.id}-${idx}`} className="py-3.5">
                        <td className="py-3.5 font-bold text-slate-900 dark:text-white print:text-black">{item.title}</td>
                        <td className="py-3.5 text-slate-600 dark:text-slate-400 print:text-slate-600">
                          {item.sellerType === 'platform' ? 'Vendora Central Fulfillment' : item.sellerName}
                        </td>
                        <td className="py-3.5 text-center text-slate-700 dark:text-slate-300 print:text-black font-semibold">{item.quantity}</td>
                        <td className="py-3.5 text-right text-slate-700 dark:text-slate-300 print:text-black">{formatPrice(item.price)}</td>
                        <td className="py-3.5 text-right font-black text-slate-900 dark:text-white print:text-black">
                          {formatPrice(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Payment Summary */}
              <div className="pt-8 flex flex-col sm:flex-row justify-between gap-8 text-xs">
                <div className="space-y-3 max-w-xs">
                  <h4 className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Payment Breakdown</h4>
                  <p className="text-slate-700 dark:text-slate-300 print:text-black leading-relaxed">
                    Method:{' '}
                    <strong className="text-slate-900 dark:text-white print:text-black capitalize">
                      {order.paymentMethod === 'card'
                        ? order.paymentDetails?.last4
                          ? `${order.paymentDetails.brand || 'Card'} ending in •••• ${order.paymentDetails.last4}`
                          : 'Card'
                        : order.paymentMethod === 'cod'
                          ? 'Cash on Delivery (COD)'
                          : 'Recorded at booking'}
                    </strong>
                  </p>
                  <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 print:text-slate-600">
                    <p className="leading-relaxed">
                      Each package is priced by the platform at booking, from the seller&apos;s live rules.
                      Vendora records no sales tax on this invoice.
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-72 space-y-2 text-right">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-slate-600">
                    <span>Items ({items.length}):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black">{formatPrice(grossLineTotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-slate-600">
                      <span>Discount applied:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 print:text-emerald-800">−{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-slate-600">
                    <span>Shipping ({subOrders.length} {subOrders.length === 1 ? 'package' : 'packages'}):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                      {shippingTotal > 0 ? formatPrice(shippingTotal) : 'FREE'}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-white/10 print:border-slate-300 pt-3 flex justify-between text-base font-black text-slate-900 dark:text-white print:text-black">
                    <span>Grand Total:</span>
                    <span className="text-sun-orange text-lg">{formatPrice(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="mt-12 pt-6 border-t border-slate-100 dark:border-white/10 print:border-slate-300 text-center text-[11px] text-slate-400 dark:text-slate-500 print:text-slate-500 leading-relaxed">
                Thank you for shopping on Vendora. If you have any inquiries regarding this order, please visit our Help Center or file a claim in the Claims Center within 14 days of delivery.
              </div>
            </div>
          )}
        </QueryState>
      </div>
    </div>
  );
};
