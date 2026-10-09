import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Printer,
  Ban,
  MessageSquare,
  Copy,
  Check,
  MapPin,
  Barcode,
  Save,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { mockDb } from '../mocks/db';
import type { SubOrder, SubOrderStatus } from '../types/domain';

export const VendorOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Find sub-order or fallback to realistic mock
  const [subOrder, setSubOrder] = useState<SubOrder>(() => {
    const found = mockDb.subOrders.find(
      (so) => so.id.toLowerCase() === id?.toLowerCase() || so.id === id,
    );
    if (found) return found;

    return {
      id: id || 'sub-98421-A',
      orderGroupId: 'ord-98421',
      sellerId: 'vendor-tech-1',
      sellerName: 'SoundWave Direct',
      sellerType: 'vendor',
      type: 'physical',
      items: [
        {
          id: 'item-1',
          productId: 'prod-v-1',
          title: 'Nova Pro Wireless ANC Headphones',
          price: 229.0,
          quantity: 1,
          maxStock: 25,
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
          sellerId: 'vendor-tech-1',
          sellerName: 'SoundWave Direct',
          sellerType: 'vendor',
          type: 'physical',
        },
      ],
      subtotal: 229.0,
      shippingFee: 8.5,
      commissionRate: 0.1, // 10% platform commission
      commissionAmount: 22.9,
      netPayout: 214.6,
      status: 'confirmed',
      deliveryCode: '4921',
      history: [
        { status: 'placed', timestamp: '2026-10-08T10:15:00Z', actor: 'Customer', note: 'Order placed by buyer' },
        { status: 'confirmed', timestamp: '2026-10-08T10:45:00Z', actor: 'Vendor', note: 'Order accepted by merchant' },
      ],
      createdAt: '2026-10-08T10:15:00Z',
    };
  });

  // Carrier tracking state
  const [carrier, setCarrier] = useState('Vendora Express Rider');
  const [trackingNumber, setTrackingNumber] = useState('TRK-98421-VND');
  const [trackingSaved, setTrackingSaved] = useState(false);

  // Modals state
  const [isPackingSlipOpen, setIsPackingSlipOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Out of stock');
  const [cancelNotes, setCancelNotes] = useState('');
  const [copiedPIN, setCopiedPIN] = useState(false);

  // Message Customer Modal
  const [isMessageCustomerOpen, setIsMessageCustomerOpen] = useState(false);
  const [customerMessage, setCustomerMessage] = useState('');
  const [messageSentToast, setMessageSentToast] = useState(false);

  const customerAddress = {
    fullName: 'Sarah Customer',
    street: '742 Evergreen Terrace, Apt 4B',
    city: 'Springfield',
    state: 'OR',
    zipCode: '97477',
    country: 'United States',
    phone: '+1 (555) 019-2834',
    orderNotes: 'Please leave the package by the front door behind the planter box.',
  };

  const handleAdvanceStatus = (nextStatus: SubOrderStatus) => {
    const updated: SubOrder = {
      ...subOrder,
      status: nextStatus,
      history: [
        ...subOrder.history,
        {
          status: nextStatus,
          timestamp: new Date().toISOString(),
          actor: 'Vendor',
          note: `Status updated to ${nextStatus}`,
        },
      ],
    };
    setSubOrder(updated);
  };

  const handleSaveTracking = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingSaved(true);
    setTimeout(() => setTrackingSaved(false), 2500);
  };

  const handleCancelOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SubOrder = {
      ...subOrder,
      status: 'cancelled',
      returnReason: cancelReason,
      history: [
        ...subOrder.history,
        {
          status: 'cancelled',
          timestamp: new Date().toISOString(),
          actor: 'Vendor',
          note: `Merchant cancelled order: ${cancelReason}. Note: ${cancelNotes}`,
        },
      ],
    };
    setSubOrder(updated);
    setIsCancelModalOpen(false);
  };

  const handleCopyPIN = () => {
    if (subOrder.deliveryCode) {
      navigator.clipboard.writeText(subOrder.deliveryCode);
      setCopiedPIN(true);
      setTimeout(() => setCopiedPIN(false), 2000);
    }
  };

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
            <button
              type="button"
              onClick={() => setIsPackingSlipOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              Print Packing Slip & Label
            </button>

            <button
              type="button"
              onClick={() => setIsMessageCustomerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
              Message Customer
            </button>

            {subOrder.status !== 'cancelled' && subOrder.status !== 'delivered' && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {messageSentToast && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Message successfully sent to customer!
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
            {subOrder.status === 'placed' && (
              <button
                type="button"
                onClick={() => handleAdvanceStatus('confirmed')}
                className="rounded-xl bg-[#FF7A1A] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C] transition-all cursor-pointer"
              >
                Confirm Order
              </button>
            )}

            {subOrder.status === 'confirmed' && (
              <button
                type="button"
                onClick={() => handleAdvanceStatus('packed')}
                className="rounded-xl bg-[#FF7A1A] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#EA580C] transition-all cursor-pointer"
              >
                Mark Packed
              </button>
            )}

            {subOrder.status === 'packed' && (
              <button
                type="button"
                onClick={() => handleAdvanceStatus('ready_for_pickup')}
                className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Truck className="h-4 w-4" />
                Ready for Rider Pickup
              </button>
            )}

            {subOrder.status === 'ready_for_pickup' && (
              <button
                type="button"
                onClick={() => handleAdvanceStatus('shipped')}
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Shipped
              </button>
            )}

            {subOrder.status === 'shipped' && (
              <button
                type="button"
                onClick={() => handleAdvanceStatus('delivered')}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Delivered
              </button>
            )}

            {subOrder.status === 'delivered' && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Fulfillment Complete: Customer confirmed delivery.
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
                <Package className="h-4 w-4 text-slate-500" />
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
                <Truck className="h-4 w-4 text-slate-500" />
                Shipping & Carrier Details
              </h3>

              <form onSubmit={handleSaveTracking} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Carrier</label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-slate-50/50"
                  >
                    <option value="Vendora Express Rider">Vendora Express Rider</option>
                    <option value="FedEx">FedEx</option>
                    <option value="DHL">DHL</option>
                    <option value="UPS">UPS</option>
                    <option value="USPS">USPS</option>
                  </select>
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
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-white py-2.5 font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Tracking
                </button>
                {trackingSaved && (
                  <p className="text-emerald-600 font-bold text-center mt-1">Tracking Saved!</p>
                )}
              </form>

              <div className="mt-3 text-xs text-slate-600">
                <span>Carrier: <strong>{carrier}</strong></span> •{' '}
                <span>Tracking: <strong className="font-mono">{trackingNumber}</strong></span>
                {trackingSaved && (
                  <span className="ml-2 font-bold text-emerald-600 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Saved!
                  </span>
                )}
              </div>

              {subOrder.deliveryCode && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Rider Handover PIN:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {subOrder.deliveryCode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPIN}
                        className="text-slate-400 hover:text-slate-600 p-1"
                        title="Copy PIN"
                      >
                        {copiedPIN ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Details & Delivery Address */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs text-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" />
                Customer Destination & Notes
              </h3>

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
                  <Barcode className="h-6 w-6 text-slate-900" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Official Packing Slip & Shipping Label
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7A1A]">
                      VENDORA EXPRESS • PRIORITY GROUND AIRWAY MANIFEST
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPackingSlipOpen(false)}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="py-6 space-y-6 text-xs">
                {/* Simulated Barcode */}
                <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="font-mono text-2xl tracking-widest font-black text-slate-900">
                    * ||| | |||| | ||| || ||| | *
                  </div>
                  <span className="font-mono text-xs text-slate-500">{trackingNumber}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold uppercase text-slate-400 block mb-1">
                      SHIP FROM (ORIGIN WAREHOUSE):
                    </span>
                    <p className="font-bold text-slate-900">{subOrder.sellerName}</p>
                    <p className="text-slate-600">
                      120 Industrial Parkway, Warehouse 4<br />
                      San Leandro, CA 94577
                    </p>
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
                  className="flex items-center gap-1.5 rounded-xl bg-[#FF7A1A] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#EA580C]"
                >
                  <Printer className="h-4 w-4" />
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
                Cancelling this order will release all customer funds and issue a full automated
                refund.
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
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white shadow-md hover:bg-rose-700"
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
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsMessageCustomerOpen(false);
                  setCustomerMessage('');
                  setMessageSentToast(true);
                  setTimeout(() => setMessageSentToast(false), 3000);
                }}
                className="space-y-4 text-xs"
              >
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
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMessageCustomerOpen(false);
                      setCustomerMessage('');
                      setMessageSentToast(true);
                      setTimeout(() => setMessageSentToast(false), 3000);
                    }}
                    className="rounded-xl bg-[#FF7A1A] px-4 py-2 font-bold text-white shadow-md hover:bg-[#EA580C]"
                  >
                    Send Message to Customer
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
