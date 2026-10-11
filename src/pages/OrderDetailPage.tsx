import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { SubOrder } from '../types/domain';
import { deriveOrderGroupStatus } from '../lib/order-state-machine';
import type { OrderGroupDerivedStatus } from '../lib/order-state-machine';
import { useOrderDetail, useUpdateSubOrderStatus, useIssueDeliveryCode } from '../features/orders/hooks/useOrders';
import { TrackingTimeline } from '../features/orders/components/TrackingTimeline';
import { QueryState } from '../components/common/QueryState';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../components/ui/dialog';
import {
  ArrowLeft,
  Printer,
  XCircle,
  RotateCcw,
  Store,
  MapPin,
  CreditCard,
  Calendar,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function getDerivedBadgeVariant(status: OrderGroupDerivedStatus): {
  label: string;
  variant: 'vendora-platform' | 'in-stock' | 'discount-coral' | 'vendor-verified' | 'secondary' | 'default';
} {
  switch (status) {
    case 'in_transit':
      return { label: 'In Transit', variant: 'vendora-platform' };
    case 'completed':
      return { label: 'Delivered', variant: 'in-stock' };
    case 'partially_delivered':
      return { label: 'Partially Delivered', variant: 'vendor-verified' };
    case 'cancelled':
      return { label: 'Cancelled', variant: 'discount-coral' };
    case 'refunded':
      return { label: 'Refunded', variant: 'secondary' };
    case 'processing':
      return { label: 'Processing', variant: 'secondary' };
    case 'pending':
    default:
      return { label: 'Pending', variant: 'default' };
  }
}

export const OrderDetailPage: React.FC = () => {
  const { id, orderId } = useParams();
  const effectiveOrderId = orderId || id || '';

  const { data, isLoading, isError, error, refetch } = useOrderDetail(effectiveOrderId);
  const updateStatusMutation = useUpdateSubOrderStatus();
  const issueCodeMutation = useIssueDeliveryCode(effectiveOrderId);

  // A handover code is stored hashed, so the page cannot read the one checkout showed.
  // Issuing a new one is the only honest recovery, and it invalidates the old code.
  const [issuedCode, setIssuedCode] = useState<{ subOrderId: string; code: string } | null>(null);

  // Cancel dialog state
  const [subOrderToCancel, setSubOrderToCancel] = useState<SubOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('Found better price / Ordered by mistake');

  // Return dialog state
  const [subOrderToReturn, setSubOrderToReturn] = useState<SubOrder | null>(null);
  const [returnReason, setReturnReason] = useState('Defective or not functioning as described');
  const [returnNotes, setReturnNotes] = useState('');

  const orderGroup = data?.orderGroup;
  const subOrders = data?.subOrders || [];

  const derivedStatus: OrderGroupDerivedStatus = subOrders.length > 0
    ? deriveOrderGroupStatus(subOrders.map((so) => so.status))
    : 'pending';

  const derivedBadge = getDerivedBadgeVariant(derivedStatus);

  // What the server recorded about settlement. A card is never named here unless the order
  // actually carries those digits, and COD stays a promise to pay the courier, not a payment.
  const paymentBadge: { label: string; variant: 'in-stock' | 'secondary' | 'discount-coral' } =
    orderGroup?.paymentStatus === 'succeeded'
      ? { label: 'Paid', variant: 'in-stock' }
      : orderGroup?.paymentStatus === 'pending'
        ? { label: 'Due on delivery', variant: 'secondary' }
        : orderGroup?.paymentStatus === 'failed'
          ? { label: 'Payment failed', variant: 'discount-coral' }
          : orderGroup?.paymentStatus === 'refunded'
            ? { label: 'Refunded', variant: 'secondary' }
            : { label: 'Settlement not recorded', variant: 'secondary' };

  // Financial calculations
  const itemsSubtotal = subOrders.reduce((sum, so) => sum + so.subtotal, 0);
  const totalShipping = subOrders.reduce((sum, so) => sum + so.shippingFee, 0);
  const grandTotal = itemsSubtotal + totalShipping;

  // Print Invoice handler
  const handlePrintInvoice = () => {
    window.print();
  };

  // The courier's handover code is only ever shown at checkout. Re-issuing mints a new one
  // and invalidates the old, so a customer who lost it can still prove the drop-off.
  const handleIssueCode = (subOrderId: string) => {
    issueCodeMutation.mutate(subOrderId, {
      onSuccess: (code) => setIssuedCode({ subOrderId, code }),
    });
  };

  // Confirm sub-order cancellation
  const handleConfirmCancel = () => {
    if (!subOrderToCancel) return;
    updateStatusMutation.mutate(
      {
        subOrderId: subOrderToCancel.id,
        nextStatus: 'cancelled',
        note: `Cancelled by customer: ${cancelReason}`,
      },
      {
        onSuccess: () => {
          setSubOrderToCancel(null);
        },
      },
    );
  };

  // Confirm sub-order return request
  const handleConfirmReturn = () => {
    if (!subOrderToReturn) return;
    const finalNote = returnNotes.trim()
      ? `${returnReason} - ${returnNotes.trim()}`
      : returnReason;

    updateStatusMutation.mutate(
      {
        subOrderId: subOrderToReturn.id,
        nextStatus: 'return_requested',
        note: `Customer return requested: ${finalNote}`,
      },
      {
        onSuccess: () => {
          setSubOrderToReturn(null);
          setReturnNotes('');
        },
      },
    );
  };

  // Helper to determine if a sub-order is cancellable (before shipped)
  const isSubOrderCancellable = (so: SubOrder): boolean => {
    if (so.type !== 'physical') return false;
    // Cancellable before shipment: placed, confirmed, or packed
    return (
      so.status === 'placed' ||
      so.status === 'confirmed' ||
      so.status === 'packed'
    );
  };

  // Helper to determine if a sub-order can request return (delivered)
  const isSubOrderReturnable = (so: SubOrder): boolean => {
    return so.status === 'delivered';
  };

  // Mirrors the statuses `issue_delivery_code` accepts; a closed delivery keeps its code.
  const isSubOrderCodeReissuable = (so: SubOrder): boolean => {
    if (so.type !== 'physical') return false;
    return (
      so.status === 'placed' ||
      so.status === 'confirmed' ||
      so.status === 'packed' ||
      so.status === 'ready_for_pickup' ||
      so.status === 'shipped' ||
      so.status === 'out_for_delivery'
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6">
      {/* 1. Breadcrumb & Back Link */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 shadow-xs hover:bg-slate-50"
            data-testid="back-to-orders-link"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Orders</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-slate-800">#{effectiveOrderId}</span>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintInvoice}
            className="gap-2 bg-white text-xs font-bold text-slate-800 shadow-xs print:hidden"
            data-testid="print-invoice-button"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Invoice</span>
          </Button>
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        isEmpty={!orderGroup}
        emptyTitle="Order not found"
        emptyMessage={`Could not find order records for ID "${effectiveOrderId}". Please check your order reference.`}
        emptyAction={
          <Button asChild variant="orange-cta" size="sm">
            <Link to="/orders">Return to Orders List</Link>
          </Button>
        }
        skeletonType="card"
      >
        {orderGroup && (
          <div className="space-y-8" data-testid="order-detail-view">
            {/* 2. Order Metadata & Overview Banner */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                      Order #{orderGroup.id}
                    </h1>
                    <Badge
                      variant={derivedBadge.variant}
                      size="default"
                      data-testid="order-derived-badge"
                    >
                      {derivedBadge.label}
                    </Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Placed on {formatTimestamp(orderGroup.createdAt)}</span>
                    <span>·</span>
                    <span>Contact: {orderGroup.customerEmail}</span>
                  </p>
                </div>

                {/* Financial Summary Pill Box */}
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Subtotal
                    </span>
                    <p className="font-bold text-slate-900">${itemsSubtotal.toFixed(2)}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Shipping
                    </span>
                    <p className="font-bold text-slate-900">
                      {totalShipping > 0 ? `$${totalShipping.toFixed(2)}` : 'FREE'}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Grand Total
                    </span>
                    <p className="text-base font-extrabold text-[#EA6C13]">
                      ${grandTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipping Address & Payment Method Cards */}
              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Shipping Address Card */}
                <div
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-xs"
                  data-testid="shipping-address-card"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-[#FF7A1A]">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Shipping Address
                    </h3>
                  </div>

                  {orderGroup.shippingAddress ? (
                    <div className="mt-3 text-xs text-slate-600 space-y-0.5">
                      <p className="font-bold text-slate-900">
                        {orderGroup.shippingAddress.fullName}
                      </p>
                      <p>{orderGroup.shippingAddress.street}</p>
                      <p>
                        {orderGroup.shippingAddress.city}, {orderGroup.shippingAddress.state}{' '}
                        {orderGroup.shippingAddress.zipCode}
                      </p>
                      <p>{orderGroup.shippingAddress.country}</p>
                      <p className="pt-1 text-slate-400">
                        Phone: {orderGroup.shippingAddress.phone}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Digital Asset fulfillment · Instant electronic delivery to account email.
                    </p>
                  )}
                </div>

                {/* Payment Method Card */}
                <div
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-xs"
                  data-testid="payment-method-card"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Payment Details
                    </h3>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 capitalize">
                        {orderGroup.paymentMethod === 'card'
                          ? orderGroup.paymentDetails?.last4
                            ? `${orderGroup.paymentDetails.brand || 'Card'} ending in •••• ${orderGroup.paymentDetails.last4}`
                            : 'Card'
                          : 'Cash on Delivery (COD)'}
                      </span>
                      <Badge variant={paymentBadge.variant} size="sm">
                        {paymentBadge.label}
                      </Badge>
                    </div>
                    <p className="text-slate-500">
                      Billing email: {orderGroup.customerEmail}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 pt-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Settled by the server at booking · Multi-vendor split payouts enabled</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Distinct Cards for each seller's Sub-Order */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                    Fulfillment Packages ({subOrders.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Each vendor packages and ships their goods independently with individual tracking.
                  </p>
                </div>
              </div>

              {subOrders.map((subOrder, subIndex) => {
                const canCancel = isSubOrderCancellable(subOrder);
                const canReturn = isSubOrderReturnable(subOrder);
                const canReissueCode = isSubOrderCodeReissuable(subOrder);
                const isCancelled = subOrder.status === 'cancelled';
                const isReturnRequested = subOrder.status === 'return_requested';
                const isReturnApproved = subOrder.status === 'return_approved';

                return (
                  <div
                    key={subOrder.id}
                    className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs"
                    data-testid={`sub-order-card-${subOrder.id}`}
                  >
                    {/* Sub-order Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-5 sm:px-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#FF7A1A]">
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              Package {subIndex + 1}: {subOrder.sellerName}
                            </h3>
                            <Badge
                              variant={
                                subOrder.sellerType === 'platform'
                                  ? 'vendora-platform'
                                  : 'vendor-verified'
                              }
                              size="sm"
                            >
                              {subOrder.sellerType === 'platform'
                                ? 'Vendora'
                                : 'Vendor Partner'}
                            </Badge>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">
                            Sub-Order ID: {subOrder.id}
                          </span>
                        </div>
                      </div>

                      {/* Package Level Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Cancel Sub-Order action (before shipped) */}
                        {canCancel && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setSubOrderToCancel(subOrder)}
                            disabled={updateStatusMutation.isPending}
                            className="text-xs font-bold"
                            data-testid={`cancel-sub-order-${subOrder.id}`}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Cancel Sub-Order</span>
                          </Button>
                        )}

                        {/* Request Return action (if delivered) */}
                        {canReturn && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSubOrderToReturn(subOrder)}
                            disabled={updateStatusMutation.isPending}
                            className="text-xs font-bold text-slate-800"
                            data-testid={`return-sub-order-${subOrder.id}`}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Request Return</span>
                          </Button>
                        )}

                        {isCancelled && (
                          <Badge variant="discount-coral" size="default">
                            Sub-Order Cancelled
                          </Badge>
                        )}

                        {isReturnRequested && (
                          <Badge variant="vendora-platform" size="default">
                            Return Pending Review
                          </Badge>
                        )}

                        {isReturnApproved && (
                          <Badge variant="in-stock" size="default">
                            Return Approved
                          </Badge>
                        )}
                      </div>
                    </div>

                    {canReissueCode && (
                      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/40 px-5 py-3 sm:px-6">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleIssueCode(subOrder.id)}
                          disabled={issueCodeMutation.isPending}
                          className="text-xs font-bold text-slate-800"
                          data-testid={`reissue-code-${subOrder.id}`}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>New handover code</span>
                        </Button>

                        {issuedCode?.subOrderId === subOrder.id ? (
                          <p className="text-xs text-slate-600">
                            New code:{' '}
                            <span className="font-mono text-sm font-black text-slate-900">{issuedCode.code}</span>{' '}
                            <span className="text-slate-400">Read it now — the old code no longer works.</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500">
                            Lost the code the courier asks for? Issue a new one.
                          </p>
                        )}

                        {issueCodeMutation.isError && issueCodeMutation.variables === subOrder.id && (
                          <p
                            className="w-full text-[11px] font-semibold text-rose-700"
                            data-testid={`reissue-code-error-${subOrder.id}`}
                          >
                            {issueCodeMutation.error.message}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="p-5 sm:p-6 space-y-6">
                      {/* Package Items List */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Package Items ({subOrder.items.length})
                        </h4>
                        <div className="mt-3 divide-y divide-slate-100">
                          {subOrder.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="h-14 w-14 rounded-2xl border border-slate-200 object-cover"
                                />
                                <div>
                                  <h5 className="text-xs font-bold text-slate-900 sm:text-sm">
                                    {item.title}
                                  </h5>
                                  <p className="text-[11px] text-slate-500">
                                    Qty: <strong>{item.quantity}</strong> × ${item.price.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Package Financial subtotal */}
                      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                        <span className="text-slate-600">
                          Package Subtotal ({subOrder.items.length} items) + Shipping:
                        </span>
                        <span className="font-bold text-slate-900">
                          ${subOrder.subtotal.toFixed(2)} +{' '}
                          {subOrder.shippingFee > 0
                            ? `$${subOrder.shippingFee.toFixed(2)}`
                            : 'FREE'}{' '}
                          ={' '}
                          <strong className="text-slate-900">
                            ${(subOrder.subtotal + subOrder.shippingFee).toFixed(2)}
                          </strong>
                        </span>
                      </div>

                      {/* FEATURED: TrackingTimeline Component */}
                      <div className="border-t border-slate-100 pt-6">
                        <TrackingTimeline subOrder={subOrder} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </QueryState>

      {/* 4. Cancel Sub-Order Modal Confirmation */}
      <Dialog
        open={Boolean(subOrderToCancel)}
        onOpenChange={(open) => !open && setSubOrderToCancel(null)}
      >
        <DialogContent data-testid="cancel-order-dialog">
          <DialogHeader>
            <DialogTitle>Cancel Sub-Order Package</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the package from{' '}
              <strong>{subOrderToCancel?.sellerName}</strong>? This action will halt fulfillment
              prior to dispatch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <label className="block font-semibold text-slate-700">Reason for cancellation</label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-[#FF7A1A] focus:outline-none"
            >
              <option value="Found better price / Ordered by mistake">
                Found better price / Ordered by mistake
              </option>
              <option value="Shipping time is longer than expected">
                Shipping time is longer than expected
              </option>
              <option value="Incorrect shipping address entered">
                Incorrect shipping address entered
              </option>
              <option value="Item no longer required">Item no longer required</option>
            </select>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Keep Sub-Order
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={updateStatusMutation.isPending}
              data-testid="confirm-cancel-button"
            >
              {updateStatusMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Request Return Modal */}
      <Dialog
        open={Boolean(subOrderToReturn)}
        onOpenChange={(open) => !open && setSubOrderToReturn(null)}
      >
        <DialogContent data-testid="return-order-dialog">
          <DialogHeader>
            <DialogTitle>Request Return for Package</DialogTitle>
            <DialogDescription>
              Submit a return request to <strong>{subOrderToReturn?.sellerName}</strong>. Our
              support and vendor teams review all requests within 24 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reason for return
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-[#FF7A1A] focus:outline-none"
              >
                <option value="Defective or not functioning as described">
                  Defective or not functioning as described
                </option>
                <option value="Wrong product or variant received">
                  Wrong product or variant received
                </option>
                <option value="Arrived damaged in transit">Arrived damaged in transit</option>
                <option value="Quality did not match expectations">
                  Quality did not match expectations
                </option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Additional details / description
              </label>
              <textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Provide photos or serial number details if applicable..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-[#FF7A1A] focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="orange-cta"
              size="sm"
              onClick={handleConfirmReturn}
              disabled={updateStatusMutation.isPending}
              data-testid="confirm-return-button"
            >
              {updateStatusMutation.isPending ? 'Submitting...' : 'Submit Return Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetailPage;
