import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Printer,
  Ban,
  MessageSquare,
  MapPin,
  Barcode,
  Save,
  X,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { Button } from '../components/ui/button';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { useVendorData } from '../features/vendor/hooks/useVendorData';
import {
  useAdvancePackageStatus,
  useUpdatePackageTracking,
  useVendorPackage,
} from '../features/vendor/hooks/useVendorPackages';
import { useSendThreadMessage, useVendorThreads } from '../features/vendor/hooks/useVendorMessages';
import { useShippingSettings } from '../features/vendor/hooks/useVendorStore';
import type { SubOrderStatus } from '../types/domain';

/**
 * `advance_sub_order_status` only accepts a store-initiated 'cancelled' from these statuses;
 * once the courier holds the package, cancelling it is the rider's or the platform's call.
 */
const CANCEL_ELIGIBLE: SubOrderStatus[] = [
  'placed',
  'confirmed',
  'packed',
  'ready_for_pickup',
  'delivery_failed',
];

export const VendorOrderDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const packageQuery = useVendorPackage(id);
  const advanceStatus = useAdvancePackageStatus();
  const saveTracking = useUpdatePackageTracking();
  const threadsQuery = useVendorThreads();
  const sendMessage = useSendThreadMessage();
  const shippingQuery = useShippingSettings();
  const { activeProfile } = useVendorData();

  const subOrder = packageQuery.data;

  // Carrier tracking state
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingSaved, setTrackingSaved] = useState(false);

  // The form mirrors the row the database holds, once it lands.
  useEffect(() => {
    if (!subOrder) return;
    setCarrier(subOrder.carrierName ?? '');
    setTrackingNumber(subOrder.trackingNumber ?? '');
  }, [subOrder]);

  // Modals state
  const [isPackingSlipOpen, setIsPackingSlipOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Out of stock');
  const [cancelNotes, setCancelNotes] = useState('');

  // Message Customer Modal
  const [isMessageCustomerOpen, setIsMessageCustomerOpen] = useState(false);
  const [customerMessage, setCustomerMessage] = useState('');
  const [messageSentToast, setMessageSentToast] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // The handover PIN is hashed on the way in and verified by the rider, so no workspace
  // screen can read it back - there is nothing to display or copy here.
  const address = subOrder?.buyerAddress;
  const customerAddress = {
    fullName: address?.fullName || subOrder?.buyerEmail || 'Buyer',
    street: address?.street ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    zipCode: address?.zipCode ?? '',
    country: address?.country ?? '',
    phone: address?.phone ?? '',
    orderNotes: subOrder?.customerNotes ?? '',
  };

  // A thread is opened by the buyer (`threads_insert_customer`), so a store can only reply
  // inside one the buyer started for this order.
  const orderThread = (threadsQuery.data ?? []).find(
    (thread) => thread.orderRef === subOrder?.orderGroupId,
  );

  // The packing slip prints the store's own pickup origin, so an unsaved Shipping page
  // prints a warning rather than an invented warehouse.
  const origin = [
    shippingQuery.data?.warehouseName,
    shippingQuery.data?.street,
    shippingQuery.data?.city,
    shippingQuery.data?.state,
    shippingQuery.data?.zipCode,
  ].filter((part): part is string => Boolean(part));


  const handleAdvanceStatus = async (nextStatus: SubOrderStatus) => {
    setActionError(null);
    try {
      await advanceStatus.mutateAsync({
        subOrderId: subOrder!.id,
        nextStatus,
        note: `Status updated to ${nextStatus}`,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update this package.');
    }
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await saveTracking.mutateAsync({
        subOrderId: subOrder!.id,
        carrierName: carrier,
        trackingNumber,
      });
      setTrackingSaved(true);
      setTimeout(() => setTrackingSaved(false), 2500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not record the tracking details.');
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await advanceStatus.mutateAsync({
        subOrderId: subOrder!.id,
        nextStatus: 'cancelled',
        note: `Merchant cancelled: ${cancelReason}${cancelNotes ? `. Note: ${cancelNotes}` : ''}`,
      });
      setIsCancelModalOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not cancel this package.');
    }
  };

  if (packageQuery.isPending || !subOrder) {
    return (
      <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-xs font-semibold text-slate-600">
          {packageQuery.isError
            ? `This package could not be loaded: ${
                packageQuery.error instanceof Error ? packageQuery.error.message : 'unknown error'
              }`
            : 'Loading the package…'}
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout role="vendor" roleBadgeText="VENDOR PARTNER" sidebar={<VendorNav />}>
      <div className="space-y-6">
        {/* Top Breadcrumb & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/vendor/orders"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Sub-Order #{subOrder.id}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    subOrder.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-800'
                      : subOrder.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {subOrder.status === 'cancelled'
                    ? 'Order Cancelled'
                    : subOrder.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Master Group: #{subOrder.orderGroupId} • Placed on{' '}
                {new Date(subOrder.createdAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {subOrder.type === 'physical' && (
              <button
                type="button"
                onClick={() => setIsPackingSlipOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Print Packing Slip &amp; Label
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMessageCustomerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Message Customer
            </button>

            {/* A store may cancel only while the package is still its own to hold:
                `advance_sub_order_status` refuses 'cancelled' once the courier has it. */}
            {CANCEL_ELIGIBLE.includes(subOrder.status) && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {messageSentToast && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Message successfully sent to customer!
          </div>
        )}

        {actionError && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800 flex items-center gap-2">
            <Ban className="h-4 w-4" aria-hidden="true" />
            {actionError}
          </div>
        )}

        {/* Fulfillment Lifecycle Stepper Action Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Merchant Fulfillment Stepper
            </span>
            <span className="text-xs text-slate-500">
              Next Action Required:{' '}
              <strong className="text-slate-900 capitalize">
                {subOrder.status.replace(/_/g, ' ')}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {subOrder.type === 'digital' && (
              <span className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Package className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {subOrder.licenseKey
                  ? 'License key delivered to the buyer.'
                  : 'Nothing to pack or ship - this is a digital package, and the platform issues the key.'}
              </span>
            )}

            {subOrder.type === 'physical' && subOrder.status === 'placed' && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => handleAdvanceStatus('confirmed')}
              >
                Confirm Order
              </Button>
            )}

            {subOrder.type === 'physical' && subOrder.status === 'confirmed' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAdvanceStatus('packed')}
              >
                Mark Packed
              </Button>
            )}

            {subOrder.type === 'physical' && subOrder.status === 'packed' && (
              <Button
                type="button"
                variant="ink"
                size="sm"
                onClick={() => handleAdvanceStatus('ready_for_pickup')}
              >
                <Truck className="h-4 w-4" aria-hidden="true" />
                Ready for Rider Pickup
              </Button>
            )}

            {subOrder.status === 'ready_for_pickup' && (
              <span className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Truck className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Waiting for the courier to scan this package in. Handover is recorded by the rider, not by the store.
              </span>
            )}

            {(subOrder.status === 'shipped' || subOrder.status === 'out_for_delivery') && (
              <span className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Truck className="h-4 w-4 text-slate-400" aria-hidden="true" />
                In the courier&rsquo;s hands &mdash; the rider records every milestone from here to delivery.
              </span>
            )}

            {subOrder.status === 'delivered' && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Fulfillment Complete: the courier confirmed delivery.
              </span>
            )}

            {(subOrder.status === 'return_requested'
              || subOrder.status === 'return_approved'
              || subOrder.status === 'returned'
              || subOrder.status === 'return_rejected'
              || subOrder.status === 'refunded'
              || subOrder.status === 'delivery_failed'
              || subOrder.status === 'cancelled') && (
              <span className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Ban className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {subOrder.status === 'return_requested'
                  ? 'A return decision is made on the Returns page, not here.'
                  : subOrder.status === 'cancelled'
                    ? 'This package is cancelled - nothing further to do.'
                    : 'This package is outside the fulfilment steps - the platform handles what comes next.'}
              </span>
            )}
          </div>
        </div>

        {/* 2-Column Grid: Details & Courier Input */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Line Items & Financial Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Line Items Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-500" aria-hidden="true" />
                Package Line Items ({subOrder.items.length})
              </h3>

              <div className="divide-y divide-slate-100">
                {subOrder.items.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-16 w-16 rounded-xl object-cover bg-slate-100 border border-slate-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        SKU: <span className="font-mono">{item.productId.toUpperCase()}</span> • Unit
                        Price: ${item.price.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="font-bold text-slate-700">Qty: {item.quantity}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-extrabold text-slate-900">
                          Total: ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Ledger Split */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4">
                Financial Settlement Breakdown
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Merchandise Subtotal:</span>
                  <span className="font-semibold text-slate-900">
                    ${subOrder.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping Fee Allocated:</span>
                  <span className="font-semibold text-slate-900">
                    +${subOrder.shippingFee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>
                    <span>Platform Commission Deduction</span>
                    <span className="text-xs opacity-75"> ({(subOrder.commissionRate * 100).toFixed(0)}%)</span>
                  </span>
                  <span className="font-bold">-${subOrder.commissionAmount.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-black text-slate-900">
                  <span>Net Seller Payout</span>
                  <span className="text-emerald-600 text-base font-extrabold">
                    ${subOrder.netPayout.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Customer Details, Carrier Tracking & PIN */}
          <div className="space-y-6">
            {/* Courier & Tracking Assignment */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-500" aria-hidden="true" />
                {subOrder.type === 'physical' ? 'Shipping & Carrier Details' : 'Digital Delivery'}
              </h3>

              {subOrder.type === 'digital' && (
                <p className="text-xs text-slate-600">
                  {subOrder.licenseKey ? (
                    <>
                      License key issued to the buyer:{' '}
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {subOrder.licenseKey}
                      </span>
                    </>
                  ) : (
                    'Nothing to hand to a courier - this package is delivered as a license key, and the platform issues it.'
                  )}
                </p>
              )}

              {subOrder.type === 'physical' && (
                <>
                  <form onSubmit={handleSaveTracking} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Assigned Carrier</label>
                      <input
                        type="text"
                        list="vendor-carrier-options"
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                        placeholder="Courier you are handing this package to"
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-slate-50/50"
                        required
                      />
                      <datalist id="vendor-carrier-options">
                        {(activeProfile?.carriers ?? []).map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Courier Tracking Code</label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. TRACK-883921"
                        className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-slate-900"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 rounded-full bg-slate-900 text-white py-2.5 font-bold hover:bg-slate-800 transition-colors cursor-pointer text-xs"
                    >
                      <Save className="h-3.5 w-3.5" aria-hidden="true" />
                      Save Tracking
                    </button>
                    {trackingSaved && (
                      <p className="text-emerald-600 font-bold text-center mt-1">Tracking Saved!</p>
                    )}
                  </form>

                  <div className="mt-3 text-xs text-slate-600">
                    <span>Carrier: <strong>{carrier || 'not assigned'}</strong></span> •{' '}
                    <span>Tracking: <strong className="font-mono">{trackingNumber || 'none recorded'}</strong></span>
                  </div>
                </>
              )}
            </div>

            {/* Customer Details & Delivery Address */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs text-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" aria-hidden="true" />
                Customer Destination & Notes
              </h3>

              {address ? (
                <div>
                  <p className="font-bold text-slate-900 text-sm">{customerAddress.fullName}</p>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    {customerAddress.street}
                    <br />
                    {customerAddress.city}, {customerAddress.state} {customerAddress.zipCode}
                    <br />
                    {customerAddress.country}
                  </p>
                  <p className="text-slate-600 mt-1">Phone: {customerAddress.phone}</p>
                </div>
              ) : (
                <p className="text-slate-600">
                  {subOrder.buyerEmail || 'No buyer contact on this order.'} - nothing is shipped:
                  this package is fulfilled digitally.
                </p>
              )}

              {customerAddress.orderNotes && (
                <div className="pt-3 border-t border-slate-100 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                  <span className="font-bold text-amber-900 block mb-0.5">Buyer Order Notes:</span>
                  <p className="text-amber-800 italic">{customerAddress.orderNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal: Packing Slip & Shipping Label */}
        {isPackingSlipOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Barcode className="h-6 w-6 text-slate-900" aria-hidden="true" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Official Packing Slip & Shipping Label
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sun-orange">
                      {carrier || 'Carrier not assigned'} &bull;{' '}
                      {(subOrder.deliveryOption ?? 'standard').replace(/_/g, ' ')} manifest
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPackingSlipOpen(false)}
                  aria-label="Close packing slip"
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="py-6 space-y-6 text-xs">
                {/* The courier scans its own label into its network; this slip carries the
                    tracking code you recorded, printed as a barcode for the picker. */}
                <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="font-mono text-2xl tracking-widest font-black text-slate-900">
                    * ||| | |||| | ||| || ||| | *
                  </div>
                  <span className="font-mono text-xs text-slate-500">
                    {trackingNumber || 'No tracking code recorded yet'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold uppercase text-slate-400 block mb-1">
                      SHIP FROM (ORIGIN WAREHOUSE):
                    </span>
                    {origin.length > 0 ? (
                      <>
                        <p className="font-bold text-slate-900">{origin[0]}</p>
                        <p className="text-slate-600">{origin.slice(1).join(', ')}</p>
                      </>
                    ) : (
                      <p className="text-amber-800 italic">
                        No pickup address on file - add one under Shipping &amp; Logistics before
                        printing a label.
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="font-bold uppercase text-slate-400 block mb-1">
                      SHIP TO (DESTINATION RECIPIENT):
                    </span>
                    <p className="font-bold text-slate-900">{customerAddress.fullName}</p>
                    <p className="text-slate-600">
                      {customerAddress.street}
                      <br />
                      {customerAddress.city}, {customerAddress.state} {customerAddress.zipCode}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <table className="w-full text-left border-collapse border border-slate-200">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2 border border-slate-200">Item</th>
                      <th className="p-2 text-center border border-slate-200">Qty</th>
                      <th className="p-2 text-right border border-slate-200">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subOrder.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-200 font-medium">{it.title}</td>
                        <td className="p-2 text-center border border-slate-200">{it.quantity}</td>
                        <td className="p-2 text-right border border-slate-200">
                          ${it.price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPackingSlipOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl bg-sun-orange px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-sun-orange-600"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Print Document
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Cancel Order */}
        {isCancelModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Cancel Sub-Order #{subOrder.id}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Cancelling records the cancellation on this package and writes it into the order
                history. It does not restock the items and it does not refund the buyer &mdash;
                stock is adjusted from Inventory, and the platform issues the refund.
              </p>

              <form onSubmit={handleCancelOrder} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cancellation Reason</label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    <option value="Out of stock">Out of stock</option>
                    <option value="Pricing error">Pricing error</option>
                    <option value="Buyer requested">Buyer requested</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Explanation Notes</label>
                  <textarea
                    rows={3}
                    value={cancelNotes}
                    onChange={(e) => setCancelNotes(e.target.value)}
                    placeholder="Provide details for customer notification..."
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="rounded-full border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-rose-600 px-4 py-2 font-bold text-white shadow-md hover:bg-rose-700 cursor-pointer text-xs"
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Message Customer */}
        {isMessageCustomerOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Message Customer: {customerAddress.fullName}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Send an order notification or delivery update directly to the buyer.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const textToSend = customerMessage.trim();
                  if (!textToSend || !orderThread) return;
                  setActionError(null);
                  try {
                    await sendMessage.mutateAsync({ threadId: orderThread.id, body: textToSend });
                    setIsMessageCustomerOpen(false);
                    setCustomerMessage('');
                    setMessageSentToast(true);
                    setTimeout(() => setMessageSentToast(false), 3000);
                  } catch (err) {
                    setActionError(
                      err instanceof Error ? err.message : 'Could not send the message.',
                    );
                  }
                }}
                className="space-y-4 text-xs"
              >
                {!orderThread && (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600">
                    This buyer has not opened a conversation about the order, and only the buyer
                    can start one. Use the customer messages workspace to reply to threads that
                    exist, or contact the buyer through the order’s own support channel.
                  </p>
                )}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Message Content</label>
                  <textarea
                    rows={4}
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    placeholder="Type your message to the customer..."
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsMessageCustomerOpen(false)}
                    className="rounded-full border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!orderThread || sendMessage.isPending}
                    className="rounded-full bg-sun-orange px-5 py-2 font-bold text-white shadow-md hover:shadow-orange-glow hover:bg-sun-orange-600 cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendMessage.isPending ? 'Sending…' : 'Send Message to Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
