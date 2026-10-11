import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import { mockDb } from '../mocks/db';
import { useMarketplaceStore } from '../store/marketplace-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const storeSubOrders = useMarketplaceStore((state) => state.subOrders);
  const advanceSubOrderStatus = useMarketplaceStore((state) => state.advanceSubOrderStatus);
  const refundOrder = useMarketplaceStore((state) => state.refundOrder);
  const syncWithDatabase = useMarketplaceStore((state) => state.syncWithDatabase);

  useEffect(() => {
    syncWithDatabase();
  }, [syncWithDatabase]);

  const order = useMemo(() => {
    const found = mockDb.orderGroups.find((og) => og.id === id || og.id.toLowerCase() === id?.toLowerCase());
    if (found) return found;

    const matchedSub = storeSubOrders.find(
      (so) => so.id === id || so.id.toLowerCase() === id?.toLowerCase() || so.orderGroupId === id
    );
    if (matchedSub) {
      const parentGroup = mockDb.orderGroups.find((og) => og.id === matchedSub.orderGroupId);
      if (parentGroup) return parentGroup;
      return {
        id: matchedSub.orderGroupId || id || 'ORD-98421',
        customerId: 'usr-customer-1',
        customerEmail: 'customer@vendora.market',
        shippingAddress: matchedSub.shippingAddress || {
          fullName: 'Verified Buyer',
          street: '123 Market Street, Suite 400',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'United States',
          phone: '+1 (555) 019-2834',
        },
        paymentMethod: 'card' as const,
        paymentDetails: {
          brand: 'Visa',
          last4: '4242',
        },
        subOrderIds: [matchedSub.id],
        createdAt: matchedSub.createdAt || new Date().toISOString(),
      };
    }

    return {
      id: id || 'ORD-98421',
      customerId: 'usr-customer-1',
      customerEmail: 'customer@vendora.market',
      shippingAddress: {
        fullName: 'Sarah Jenkins',
        street: '742 Evergreen Terrace, Apt 4B',
        city: 'Springfield',
        state: 'OR',
        zipCode: '97477',
        country: 'United States',
        phone: '+1 (555) 019-2834',
      },
      paymentMethod: 'card' as const,
      paymentDetails: {
        brand: 'Visa',
        last4: '4242',
      },
      subOrderIds: ['SUB-98421-A', 'SUB-98421-B'],
      createdAt: '2026-10-06T14:30:00Z',
    };
  }, [id, storeSubOrders]);

  const subOrders = useMemo(() => {
    const matching = storeSubOrders.filter(
      (so) => order.subOrderIds?.includes(so.id) || so.orderGroupId === order.id || so.id === order.id
    );
    if (matching.length > 0) return matching;

    const fromMock = mockDb.subOrders.filter(
      (so) => order.subOrderIds?.includes(so.id) || so.orderGroupId === order.id
    );
    if (fromMock.length > 0) return fromMock;

    return [];
  }, [order, storeSubOrders]);

  const totalGross = subOrders.reduce((sum, so) => sum + so.subtotal + so.shippingFee, 0) || 1598.00;
  const totalCommission = subOrders.reduce((sum, so) => sum + so.commissionAmount, 0) || 159.80;
  const totalDisbursed = subOrders.reduce((sum, so) => sum + so.netPayout, 0) || 1438.20;
  const totalTax = totalGross * 0.0825;

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [adminActionMsg, setAdminActionMsg] = useState<string | null>(null);

  const handleForceRefund = () => {
    subOrders.forEach((so) => {
      refundOrder(so.id, 'Platform administrative refund');
    });
    setAdminActionMsg('Full administrative refund of $' + (totalGross + totalTax).toFixed(2) + ' executed to buyer payment method.');
    setTimeout(() => setAdminActionMsg(null), 3500);
  };

  const handleForceCancel = () => {
    subOrders.forEach((so) => {
      advanceSubOrderStatus(so.id, 'cancelled', 'Super Admin', 'Platform administrative cancellation');
    });
    setAdminActionMsg('Order forcibly cancelled by Platform Admin governance.');
    setTimeout(() => setAdminActionMsg(null), 3500);
  };

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Order Details" sidebar={<AdminNav />}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/orders"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-outfit">
                  Master Order #{order.id}
                </h1>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                  Multi-Vendor Split
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Placed on {new Date(order.createdAt).toLocaleDateString()} by {order.shippingAddress?.fullName} ({order.customerEmail})
              </p>
            </div>
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
              onClick={handleForceRefund}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Force Full Refund
            </button>

            <button
              type="button"
              onClick={handleForceCancel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
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

        {/* Financial Split Ledger */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Platform Financial Split Ledger
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Customer Gross Paid</span>
              <div className="text-xl font-black text-slate-900 mt-1">${(totalGross + totalTax).toFixed(2)}</div>
              <span className="text-slate-500 text-[11px]">Via {order.paymentDetails.brand} •••• {order.paymentDetails.last4}</span>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200/60">
              <span className="text-purple-600 font-bold uppercase text-[10px]">Frozen Platform Fee</span>
              <div className="text-xl font-black text-purple-900 mt-1">${totalCommission.toFixed(2)}</div>
              <span className="text-purple-700 text-[11px]">Retained marketplace commission</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/60">
              <span className="text-emerald-600 font-bold uppercase text-[10px]">Disbursed to Merchants</span>
              <div className="text-xl font-black text-emerald-900 mt-1">${totalDisbursed.toFixed(2)}</div>
              <span className="text-emerald-700 text-[11px]">Across {subOrders.length || 2} independent vendors</span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200/60">
              <span className="text-blue-600 font-bold uppercase text-[10px]">Facilitator Tax Withheld</span>
              <div className="text-xl font-black text-blue-900 mt-1">${totalTax.toFixed(2)}</div>
              <span className="text-blue-700 text-[11px]">Remitted to state tax authorities</span>
            </div>
          </div>
        </div>

        {/* Child Sub-Orders Split */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Partitioned Child Sub-Orders ({subOrders.length || 2})
          </h3>

          <div className="space-y-4">
            {(subOrders.length > 0 ? subOrders : [
              {
                id: 'SUB-98421-A',
                sellerName: 'Apple Official Store',
                status: 'confirmed' as const,
                subtotal: 1199.00,
                shippingFee: 0.00,
                commissionAmount: 119.90,
                netPayout: 1079.10,
                deliveryCode: '4921',
                items: [
                  {
                    id: 'it-1',
                    title: 'Apple iPhone 15 Pro Max (256GB Titanium)',
                    price: 1199.00,
                    quantity: 1,
                    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80',
                  },
                ],
              },
              {
                id: 'SUB-98421-B',
                sellerName: 'Sony Electronics',
                status: 'delivered' as const,
                subtotal: 399.00,
                shippingFee: 0.00,
                commissionAmount: 39.90,
                netPayout: 359.10,
                deliveryCode: '8812',
                items: [
                  {
                    id: 'it-2',
                    title: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones',
                    price: 399.00,
                    quantity: 1,
                    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
                  },
                ],
              },
            ]).map((sub) => (
              <div key={sub.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">
                      {sub.sellerName}
                    </span>
                    <span className="font-mono text-slate-400 text-xs ml-2">#{sub.id}</span>
                  </div>

                  <span className="rounded-full bg-orange-100 text-[#FF7A1A] px-2.5 py-0.5 text-[10px] font-bold uppercase">
                    {sub.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Items */}
                  <div className="md:col-span-2 space-y-2">
                    {sub.items.map((it, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                        <img src={it.image} alt="" className="h-12 w-12 rounded-lg object-cover bg-slate-100 border border-slate-200" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 block truncate">{it.title}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-slate-600 text-[11px]">
                              Qty: <strong className="text-slate-900">{it.quantity}</strong> × ${it.price.toFixed(2)} each (Unit Price)
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-bold text-slate-900 text-xs font-mono">
                              Subtotal: ${(it.quantity * it.price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Splits */}
                  <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 border border-slate-200/60">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-slate-900">${sub.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Platform Cut:</span>
                      <span className="font-bold text-purple-700">-${sub.commissionAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Net Merchant Disbursal:</span>
                      <span className="font-bold text-emerald-700">${sub.netPayout.toFixed(2)}</span>
                    </div>
                    {sub.deliveryCode && (
                      <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60 font-mono text-[11px]">
                        <span>Rider PIN:</span>
                        <span className="font-bold text-slate-900">{sub.deliveryCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deep Customer Delivery & Escrow Tracking Dossier */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <MapPin className="h-4 w-4 text-[#FF7A1A]" />
              <span>Delivery Destination</span>
            </div>
            <p className="font-bold text-slate-800">{order.shippingAddress?.fullName}</p>
            <p className="text-slate-500">{order.shippingAddress?.street}</p>
            <p className="text-slate-500">{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</p>
            <p className="text-slate-400 font-mono text-[11px]">Phone: {order.shippingAddress?.phone}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Payment & Escrow Protection</span>
            </div>
            <p className="text-slate-700">Method: <strong>{order.paymentDetails?.brand || 'Credit Card'} •••• {order.paymentDetails?.last4 || '4242'}</strong></p>
            <p className="text-slate-500">Escrow Hold: <span className="font-bold text-emerald-700">Secured (Auto-release on delivery)</span></p>
            <p className="text-slate-500">Gateway Auth: <span className="font-mono text-[11px] text-slate-600">tx_auth_9824_settled</span></p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Truck className="h-4 w-4 text-blue-600" />
              <span>Logistics & Fulfillment Status</span>
            </div>
            <p className="text-slate-700">Fulfillment Pipeline: <strong>Multi-Store Hub Dispatch</strong></p>
            <p className="text-slate-500">Order Stage: <span className="font-bold text-blue-700">Dispatched & In Transit</span></p>
            <p className="text-slate-400 text-[11px]">Guaranteed Delivery SLA: <strong>Within 48 hours</strong></p>
          </div>
        </div>

        {/* ── Official Invoice & Packing Slip Modal Popup ── */}
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
                      Official Tax Invoice &amp; Settlement Receipt
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-400">
                      Master Order #{order.id} • Registered Platform Transaction
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
                  <p className="font-bold text-slate-900">{order.shippingAddress?.fullName}</p>
                  <p className="text-slate-500">{order.customerEmail}</p>
                  <p className="text-slate-500">{order.shippingAddress?.street}</p>
                  <p className="text-slate-500">{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Marketplace Facilitator
                  </span>
                  <p className="font-bold text-slate-900">Vendora Marketplace Inc.</p>
                  <p className="text-slate-500">Tax ID: US-EIN-94821092</p>
                  <p className="text-slate-500">Invoice Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                  <p className="text-slate-500 font-mono text-[11px]">Payment: {order.paymentDetails?.brand} •••• {order.paymentDetails?.last4}</p>
                </div>
              </div>

              {/* Itemized List */}
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
                    {subOrders.flatMap((so) => so.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{it.title}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Merchant: {so.sellerName}</p>
                        </td>
                        <td className="p-3 text-center font-bold">{it.quantity}</td>
                        <td className="p-3 text-right font-mono">${it.price.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold font-mono">${(it.quantity * it.price).toFixed(2)}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation Breakdown */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">${totalGross.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (8.25%):</span>
                    <span className="font-mono">${totalTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping:</span>
                    <span className="font-mono">$0.00</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-2 text-sm">
                    <span>Total Amount:</span>
                    <span className="font-mono text-emerald-700">${(totalGross + totalTax).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close Invoice
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
