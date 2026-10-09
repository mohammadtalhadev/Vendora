import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { mockDb } from '../mocks/db';

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [order] = useState(() => {
    const found = mockDb.orderGroups.find((og) => og.id === id);
    if (found) return found;

    return {
      id: id || 'ORD-98421',
      customerId: 'usr-customer-1',
      customerEmail: 'customer@demo.test',
      shippingAddress: {
        fullName: 'Sarah Customer',
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
  });

  const subOrders = mockDb.subOrders.filter((so) => order.subOrderIds.includes(so.id));

  const totalGross = subOrders.reduce((sum, so) => sum + so.subtotal + so.shippingFee, 0) || 247.49;
  const totalCommission = subOrders.reduce((sum, so) => sum + so.commissionAmount, 0) || 23.90;
  const totalDisbursed = subOrders.reduce((sum, so) => sum + so.netPayout, 0) || 223.59;
  const totalTax = totalGross * 0.0825;

  const [adminActionMsg, setAdminActionMsg] = useState<string | null>(null);

  const handleForceRefund = () => {
    setAdminActionMsg('Full administrative refund of $' + totalGross.toFixed(2) + ' executed to buyer payment method.');
    setTimeout(() => setAdminActionMsg(null), 3500);
  };

  const handleForceCancel = () => {
    setAdminActionMsg('Order forcibly cancelled by Platform Admin governance.');
    setTimeout(() => setAdminActionMsg(null), 3500);
  };

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
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
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
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

          <div className="flex items-center gap-2">
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
                sellerName: 'Apex Audio & Gear',
                status: 'confirmed' as const,
                subtotal: 189.99,
                shippingFee: 8.50,
                commissionAmount: 18.99,
                netPayout: 179.50,
                deliveryCode: '4921',
                items: [
                  {
                    id: 'it-1',
                    title: 'Apex Pro Noise-Cancelling Wireless Headphones',
                    price: 189.99,
                    quantity: 1,
                    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
                  },
                ],
              },
              {
                id: 'SUB-98421-B',
                sellerName: 'Vendora Direct (Platform)',
                status: 'delivered' as const,
                subtotal: 49.00,
                shippingFee: 0.00,
                commissionAmount: 4.91,
                netPayout: 44.09,
                deliveryCode: '8812',
                items: [
                  {
                    id: 'it-2',
                    title: 'Ergonomic Desk Mat Ultra Smooth Surface',
                    price: 49.00,
                    quantity: 1,
                    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80',
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
                      <div key={i} className="flex items-center gap-3">
                        <img src={it.image} alt="" className="h-10 w-10 rounded-lg object-cover bg-slate-100" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 block truncate">{it.title}</span>
                          <span className="text-slate-400 text-[11px]">Qty: {it.quantity} • ${it.price.toFixed(2)} ea</span>
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
      </div>
    </WorkspaceLayout>
  );
};
