import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  DollarSign,
  Ban,
  RotateCcw,
  FileText,
  Printer,
  Truck,
  MapPin,
  CreditCard,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useAdminOrderDetail } from '../features/admin/hooks/useAdminQueries';
import { refundSubOrder } from '../features/admin/api/disputes';
import { advanceSubOrderStatus } from '../features/orders/api/orders';
import { formatPrice } from '../store/currency-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';

const TERMINAL_STATUSES = new Set(['delivered', 'cancelled', 'refunded', 'returned', 'available']);

/**
 * Admin order dossier, read from the `admin_order_detail` RPC (the typed
 * replacement for the old mock-backed version, which fabricated a
 * fallback order, an 8.25% "facilitator tax" and escrow/gateway strings when it
 * could not find the order). Every number here is a database number; an unknown
 * id is an error state, not an invented order.
 */
export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: order, isLoading, isError, error, refetch } = useAdminOrderDetail(id ?? '');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [adminActionMsg, setAdminActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
    void refetch();
  };

  const refundMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      for (const pkg of order.packages) {
        if (pkg.status === 'refunded' || pkg.status === 'cancelled') continue;
        await refundSubOrder(pkg.id, pkg.subtotal + pkg.shippingFee, 'Platform administrative refund');
      }
    },
    onSuccess: () => {
      setActionError(null);
      setAdminActionMsg('Administrative refund executed for every refundable package on this order.');
      refresh();
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Refund failed.'),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      for (const pkg of order.packages) {
        if (TERMINAL_STATUSES.has(pkg.status)) continue;
        await advanceSubOrderStatus(pkg.id, 'cancelled', 'Platform administrative cancellation');
      }
    },
    onSuccess: () => {
      setActionError(null);
      setAdminActionMsg('Order forcibly cancelled by Platform Admin governance.');
      refresh();
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Cancellation failed.'),
  });

  const totalDisbursed = order ? order.packages.reduce((sum, p) => sum + p.netPayout, 0) : 0;
  const totalShipping = order ? order.packages.reduce((sum, p) => sum + p.shippingFee, 0) : 0;
  const paymentLabel = order
    ? order.paymentMethod === 'card'
      ? `${order.paymentDetails.brand ?? 'Card'} •••• ${order.paymentDetails.last4 ?? ''}`
      : 'Cash on Delivery'
    : '';

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Order Details" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
            Order Details
          </h1>
        </div>

        {isLoading && (
          <p className="text-sm text-slate-500" role="status">
            Loading order…
          </p>
        )}

        {isError && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-900" role="alert">
            {error instanceof Error ? error.message : 'This order could not be loaded.'}
            <button type="button" onClick={() => void refetch()} className="ml-3 underline">
              Retry
            </button>
          </div>
        )}

        {order && (
          <>
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-outfit">
                    Master Order #{order.id}
                  </h2>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                    {order.paymentStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Placed on {new Date(order.createdAt).toLocaleDateString()} by {order.customerEmail}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  View Official Invoice (Popup)
                </button>

                <button
                  type="button"
                  disabled={refundMutation.isPending}
                  onClick={() => refundMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Force Full Refund
                </button>

                <button
                  type="button"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  <Ban className="h-3.5 w-3.5 text-rose-500" />
                  Administrative Cancel
                </button>
              </div>
            </div>

            {adminActionMsg && (
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-xs font-bold text-blue-900 animate-in fade-in">
                {adminActionMsg}
              </div>
            )}
            {actionError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-900" role="alert">
                {actionError}
              </div>
            )}

            {/* Financial Split Ledger — database figures only */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Platform Financial Split Ledger
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Customer Gross Paid</span>
                  <div className="text-xl font-black text-slate-900 mt-1">{formatPrice(order.gross)}</div>
                  <span className="text-slate-500 text-[11px]">Via {paymentLabel}</span>
                </div>

                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200/60">
                  <span className="text-purple-600 font-bold uppercase text-[10px]">Frozen Platform Fee</span>
                  <div className="text-xl font-black text-purple-900 mt-1">{formatPrice(order.commission)}</div>
                  <span className="text-purple-700 text-[11px]">Retained marketplace commission</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/60">
                  <span className="text-emerald-600 font-bold uppercase text-[10px]">Disbursed to Merchants</span>
                  <div className="text-xl font-black text-emerald-900 mt-1">{formatPrice(totalDisbursed)}</div>
                  <span className="text-emerald-700 text-[11px]">Across {order.packages.length} independent vendors</span>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200/60">
                  <span className="text-blue-600 font-bold uppercase text-[10px]">Refunded to Buyer</span>
                  <div className="text-xl font-black text-blue-900 mt-1">{formatPrice(order.refunded)}</div>
                  <span className="text-blue-700 text-[11px]">{order.refunds.length} refund record(s) on this order</span>
                </div>
              </div>
            </div>

            {/* Child Packages */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Partitioned Child Sub-Orders ({order.packages.length})
              </h3>

              <div className="space-y-4">
                {order.packages.map((sub) => (
                  <div key={sub.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{sub.storeName}</span>
                        <span className="font-mono text-slate-400 text-xs ml-2">#{sub.id}</span>
                      </div>
                      <span className="rounded-full bg-orange-100 text-sun-orange px-2.5 py-0.5 text-[10px] font-bold uppercase">
                        {sub.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        {sub.items.map((it, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                            {it.image && (
                              <img src={it.image} alt="" className="h-12 w-12 rounded-lg object-cover bg-slate-100 border border-slate-200" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{it.title}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-slate-600 text-[11px]">
                                  Qty: <strong className="text-slate-900">{it.quantity}</strong> × {formatPrice(it.price)} each
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="font-bold text-slate-900 text-xs font-mono">
                                  Subtotal: {formatPrice(it.quantity * it.price)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {sub.items.length === 0 && (
                          <p className="text-slate-400">No line items recorded for this package.</p>
                        )}
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 border border-slate-200/60">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal:</span>
                          <span className="font-semibold text-slate-900">{formatPrice(sub.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Shipping:</span>
                          <span className="font-semibold text-slate-900">{formatPrice(sub.shippingFee)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Platform Cut:</span>
                          <span className="font-bold text-purple-700">-{formatPrice(sub.commissionAmount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Net Merchant Disbursal:</span>
                          <span className="font-bold text-emerald-700">{formatPrice(sub.netPayout)}</span>
                        </div>
                        {sub.trackingNumber && (
                          <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60 font-mono text-[11px]">
                            <span>Tracking:</span>
                            <span className="font-bold text-slate-900">{sub.trackingNumber}</span>
                          </div>
                        )}
                        {sub.licenseKey && (
                          <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60 font-mono text-[11px]">
                            <span>License:</span>
                            <span className="font-bold text-slate-900">{sub.licenseKey}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery / Payment / Logistics — real fields only */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <MapPin className="h-4 w-4 text-sun-orange" />
                  <span>Delivery Destination</span>
                </div>
                {order.shippingAddress ? (
                  <>
                    <p className="font-bold text-slate-800">{order.shippingAddress.fullName}</p>
                    <p className="text-slate-500">{order.shippingAddress.street}</p>
                    <p className="text-slate-500">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </p>
                    <p className="text-slate-400 font-mono text-[11px]">Phone: {order.shippingAddress.phone}</p>
                  </>
                ) : (
                  <p className="text-slate-500">Digital order — nothing was shipped to a physical address.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <span>Payment</span>
                </div>
                <p className="text-slate-700">
                  Method: <strong>{paymentLabel}</strong>
                </p>
                <p className="text-slate-500">
                  Payment status: <span className="font-bold text-slate-700">{order.paymentStatus}</span>
                </p>
                <p className="text-slate-500">
                  Refunded so far: <span className="font-bold text-slate-700">{formatPrice(order.refunded)}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span>Logistics &amp; Fulfillment Status</span>
                </div>
                {order.packages.map((p) => (
                  <p key={p.id} className="text-slate-500">
                    {p.storeName}:{' '}
                    <span className="font-bold text-blue-700">
                      {p.delivery ? `${p.delivery.status}${p.delivery.deliveredAt ? ` · delivered ${new Date(p.delivery.deliveredAt).toLocaleDateString()}` : ''}` : p.status}
                    </span>
                  </p>
                ))}
              </div>
            </div>

            {/* Invoice Modal */}
            <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
              <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl shadow-2xl border border-slate-200">
                <DialogHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-sm">
                        V
                      </div>
                      <div>
                        <DialogTitle className="text-lg font-black text-slate-900">
                          Invoice &amp; Settlement Receipt
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400">
                          Master Order #{order.id} • Platform Transaction
                        </DialogDescription>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Billed To
                      </span>
                      <p className="font-bold text-slate-900">{order.shippingAddress?.fullName ?? 'Digital delivery'}</p>
                      <p className="text-slate-500">{order.customerEmail}</p>
                      {order.shippingAddress && (
                        <>
                          <p className="text-slate-500">{order.shippingAddress.street}</p>
                          <p className="text-slate-500">
                            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                          </p>
                        </>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Marketplace Facilitator
                      </span>
                      <p className="font-bold text-slate-900">Vendora Marketplace</p>
                      <p className="text-slate-500">Invoice Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                      <p className="text-slate-500 font-mono text-[11px]">Payment: {paymentLabel}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="p-3">Item / Merchant</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-right">Unit Price</th>
                          <th className="p-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.packages.flatMap((pkg) =>
                          pkg.items.map((it, i) => (
                            <tr key={`${pkg.id}-${i}`}>
                              <td className="p-3">
                                <p className="font-bold text-slate-900">{it.title}</p>
                                <p className="text-[10px] text-slate-400 font-medium">Merchant: {pkg.storeName}</p>
                              </td>
                              <td className="p-3 text-center font-bold">{it.quantity}</td>
                              <td className="p-3 text-right font-mono">{formatPrice(it.price)}</td>
                              <td className="p-3 text-right font-bold font-mono">{formatPrice(it.quantity * it.price)}</td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-64 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal + Shipping:</span>
                        <span className="font-mono">{formatPrice(order.gross)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping (included):</span>
                        <span className="font-mono">{formatPrice(totalShipping)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Refunded:</span>
                        <span className="font-mono">{formatPrice(order.refunded)}</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-2 text-sm">
                        <span>Total Amount:</span>
                        <span className="font-mono text-emerald-700">{formatPrice(order.gross - order.refunded)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ink"
                    size="sm"
                    onClick={() => setIsInvoiceModalOpen(false)}
                  >
                    Close Invoice
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
};
