import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, ShieldCheck } from 'lucide-react';
import { mockDb } from '../mocks/db';

export const InvoicePage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  // Fetch or mock order details
  const order = mockDb.orderGroups.find((og) => og.id === orderId) || {
    id: orderId || 'ORD-98421',
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

  // Find suborders
  const subOrders = mockDb.subOrders.filter((so) => order.subOrderIds.includes(so.id));

  // Items fallback if none found
  const items = subOrders.flatMap((so) => so.items);
  const totalSubtotal = subOrders.reduce((sum, so) => sum + so.subtotal, 0) || 189.98;
  const totalShipping = subOrders.reduce((sum, so) => sum + so.shippingFee, 0) || 12.50;
  const estimatedTax = totalSubtotal * 0.0825;
  const grandTotal = totalSubtotal + totalShipping + estimatedTax;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 py-10 px-4 sm:px-6 print:p-0 print:bg-white">
      <div className="mx-auto max-w-4xl">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            to={`/orders/${order.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Order Tracking
          </Link>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-full bg-[#FF7A1A] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#EA580C] transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Print Invoice
          </button>
        </div>

        {/* Invoice Paper Document */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 sm:p-12 shadow-xl print:shadow-none print:border-none print:p-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-8 h-8 text-[#FF7A1A] fill-current" viewBox="0 0 24 24">
                  <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-3 0v-3.5A1.5 1.5 0 0 1 12 2zm0 13.5a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-3 0V17a1.5 1.5 0 0 1 1.5-1.5zm8.5-4.5a1.5 1.5 0 0 1-1.5 1.5h-3.5a1.5 1.5 0 0 1 0-3H19a1.5 1.5 0 0 1 1.5 1.5zM7 12.5a1.5 1.5 0 0 1-1.5 1.5H2a1.5 1.5 0 0 1 0-3h3.5A1.5 1.5 0 0 1 7 12.5zm10.78-6.72a1.5 1.5 0 0 1 0 2.12l-2.47 2.47a1.5 1.5 0 1 1-2.12-2.12l2.47-2.47a1.5 1.5 0 0 1 2.12 0zm-8.2 8.2a1.5 1.5 0 0 1 0 2.12L7.1 18.57a1.5 1.5 0 1 1-2.12-2.12l2.47-2.47a1.5 1.5 0 0 1 2.12 0zm8.2 2.12a1.5 1.5 0 0 1-2.12 0l-2.47-2.47a1.5 1.5 0 1 1 2.12-2.12l2.47 2.47a1.5 1.5 0 0 1 0 2.12zM8.78 5.78a1.5 1.5 0 0 1-2.12 2.12L4.19 5.43a1.5 1.5 0 1 1 2.12-2.12l2.47 2.47z" />
                </svg>
                <span className="text-2xl font-black text-slate-900 tracking-tight">Vendora</span>
              </div>
              <p className="text-xs text-slate-500">
                Vendora Multi-Vendor Commerce Platform Inc.<br />
                100 Market Street, Suite 400<br />
                San Francisco, CA 94105 USA<br />
                VAT / Tax ID: US-948210492
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block rounded-md bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#FF7A1A] mb-1">
                Official Receipt / Invoice
              </span>
              <h2 className="text-xl font-black text-slate-900">#{order.id}</h2>
              <p className="text-xs text-slate-500 mt-1">
                Date: {new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
              </p>
              <p className="text-xs text-slate-500">
                Status: <span className="text-emerald-600 font-bold">PAID</span>
              </p>
            </div>
          </div>

          {/* Billing & Shipping Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-200 text-xs">
            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-400 mb-2">Billed To</h3>
              <p className="font-bold text-slate-900 text-sm">{order.shippingAddress?.fullName}</p>
              <p className="text-slate-600">{order.customerEmail}</p>
              <p className="text-slate-600">{order.shippingAddress?.phone}</p>
            </div>

            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-400 mb-2">Delivered To</h3>
              <p className="font-bold text-slate-900 text-sm">{order.shippingAddress?.fullName}</p>
              <p className="text-slate-600">{order.shippingAddress?.street}</p>
              <p className="text-slate-600">
                {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}
              </p>
              <p className="text-slate-600">{order.shippingAddress?.country}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-8 border-b border-slate-200">
            <h3 className="font-bold uppercase tracking-wider text-slate-400 text-xs mb-4">
              Order Packages & Line Items
            </h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Seller</th>
                  <th className="pb-3 text-center">Qty</th>
                  <th className="pb-3 text-right">Unit Price</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <tr key={idx} className="py-3">
                      <td className="py-3 font-medium text-slate-900">{item.title}</td>
                      <td className="py-3 text-slate-600">
                        {item.sellerType === 'platform' ? 'Sold by Vendora' : item.sellerName}
                      </td>
                      <td className="py-3 text-center text-slate-700">{item.quantity}</td>
                      <td className="py-3 text-right text-slate-700">${item.price.toFixed(2)}</td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="py-3">
                      <td className="py-3 font-medium text-slate-900">
                        Premium Noise-Cancelling Wireless Headphones
                      </td>
                      <td className="py-3 text-slate-600">Sold by Vendora</td>
                      <td className="py-3 text-center text-slate-700">1</td>
                      <td className="py-3 text-right text-slate-700">$129.99</td>
                      <td className="py-3 text-right font-bold text-slate-900">$129.99</td>
                    </tr>
                    <tr className="py-3">
                      <td className="py-3 font-medium text-slate-900">
                        Ergonomic Wireless Optical Mouse
                      </td>
                      <td className="py-3 text-slate-600">Apex Tech Accessories</td>
                      <td className="py-3 text-center text-slate-700">2</td>
                      <td className="py-3 text-right text-slate-700">$29.99</td>
                      <td className="py-3 text-right font-bold text-slate-900">$59.98</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Payment Summary */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between gap-8 text-xs">
            <div className="space-y-2 max-w-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-400">Payment Information</h4>
              <p className="text-slate-700">
                Method:{' '}
                <strong className="text-slate-900 capitalize">
                  {order.paymentMethod === 'card'
                    ? `${order.paymentDetails.brand} ending in ${order.paymentDetails.last4}`
                    : 'Cash on Delivery (COD)'}
                </strong>
              </p>
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold pt-1">
                <ShieldCheck className="h-4 w-4" />
                Verified & Processed Securely
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-right">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-800">${totalSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Shipping:</span>
                <span className="font-medium text-slate-800">${totalShipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax (8.25%):</span>
                <span className="font-medium text-slate-800">${estimatedTax.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span className="text-[#FF7A1A] text-base">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-12 pt-6 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Thank you for shopping on Vendora. If you have any inquiries regarding this order, please visit our Help Center or file a dispute within 14 days of receipt.
          </div>
        </div>
      </div>
    </div>
  );
};
