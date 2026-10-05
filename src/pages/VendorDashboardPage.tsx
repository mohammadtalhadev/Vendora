import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Percent,
  Wallet,
  Clock,
  AlertTriangle,
  Plus,
  Package,
  ClipboardList,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import {
  DEFAULT_VENDOR_KPIS,
  getVendorSubOrders,
  advanceSubOrderStatus,
  getVendorProducts,
} from '../features/vendor/vendorData';
import type { SubOrder, SubOrderStatus, Product } from '../types/domain';
import { useAuthStore } from '../store/auth-store';

export const VendorDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const vendorId = user?.vendorId || 'vendor-tech-1';

  // Sub-Orders State
  const [orders, setOrders] = useState<SubOrder[]>(() => getVendorSubOrders(vendorId));
  const [products, setProducts] = useState<Product[]>(() => getVendorProducts(vendorId));
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');

  // Status badge styling helper
  const renderStatusBadge = (status: SubOrderStatus) => {
    switch (status) {
      case 'placed':
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">Placed</Badge>;
      case 'confirmed':
        return <Badge variant="secondary" className="bg-sky-50 text-sky-700 border-sky-200">Confirmed</Badge>;
      case 'packed':
        return <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">Packed</Badge>;
      case 'ready_for_pickup':
        return <Badge variant="vendora-platform">Ready for Pickup</Badge>;
      case 'delivered':
        return <Badge variant="in-stock">Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="discount-coral">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Advance sub-order status directly from dashboard
  const handleAdvanceStatus = (subOrderId: string, currentStatus: SubOrderStatus) => {
    let nextStatus: SubOrderStatus | null = null;
    let actionLabel = '';

    if (currentStatus === 'placed') {
      nextStatus = 'confirmed';
      actionLabel = 'Order confirmed by vendor';
    } else if (currentStatus === 'confirmed') {
      nextStatus = 'packed';
      actionLabel = 'Order packed in warehouse';
    } else if (currentStatus === 'packed') {
      nextStatus = 'ready_for_pickup';
      actionLabel = 'Package ready for courier collection';
    }

    if (nextStatus) {
      const updated = advanceSubOrderStatus(subOrderId, nextStatus, 'Vendor', actionLabel);
      setOrders((prev) =>
        prev.map((order) => (order.id === subOrderId ? updated : order)),
      );
    }
  };

  const handleProductSaved = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      title="Vendor Dashboard"
      subtitle="Overview of your store earnings, recent sales, and order fulfillment pipeline."
      sidebar={<VendorNav />}
    >
      <div className="space-y-6">
        {/* =========================================================================
            Top Quick Actions Toolbar
            ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#FF7A1A]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">SoundWave Direct Store Operations</h2>
              <p className="text-xs text-slate-500">
                All systems online • {products.length} catalog listings • Automatic order routing enabled
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="orange-cta"
              size="sm"
              onClick={() => setIsProductModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add New Product</span>
            </Button>

            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to="/vendor/orders">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                <span>Manage Orders</span>
              </Link>
            </Button>

            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to="/vendor/products">
                <Package className="h-4 w-4 text-slate-500" />
                <span>Inventory</span>
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link to={`/vendors/${vendorId}`} target="_blank" rel="noreferrer">
                <span>Public Storefront</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </Button>
          </div>
        </div>

        {/* =========================================================================
            KPI Metrics Cards (Required 5 KPIs)
            ========================================================================= */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Gross Sales */}
          <div
            data-testid="kpi-gross-sales"
            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Gross Sales
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                {DEFAULT_VENDOR_KPIS.grossSales}
              </div>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                <span>+14.2% vs last month</span>
              </p>
            </div>
          </div>

          {/* 2. Platform Commission Deducted */}
          <div
            data-testid="kpi-commission"
            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Platform Commission Deducted
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Percent className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                {DEFAULT_VENDOR_KPIS.commissionDeducted}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 font-medium">
                Standard 10% platform fee
              </p>
            </div>
          </div>

          {/* 3. Net Payout */}
          <div
            data-testid="kpi-net-payout"
            className="flex flex-col justify-between rounded-2xl border border-orange-200/70 bg-gradient-to-br from-white to-orange-50/30 p-5 shadow-xs transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#EA6C13]">
                Net Payout
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-[#FF7A1A]">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                {DEFAULT_VENDOR_KPIS.netPayout}
              </div>
              <p className="mt-1 text-[11px] font-semibold text-emerald-600">
                Scheduled for weekly deposit
              </p>
            </div>
          </div>

          {/* 4. Pending Orders */}
          <div
            data-testid="kpi-pending-orders"
            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pending Orders
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-slate-900">
                {DEFAULT_VENDOR_KPIS.pendingOrders}
              </div>
              <p className="mt-1 text-[11px] text-amber-600 font-semibold">
                Needs packing & dispatch
              </p>
            </div>
          </div>

          {/* 5. Low Stock */}
          <div
            data-testid="kpi-low-stock"
            className="flex flex-col justify-between rounded-2xl border border-rose-200/70 bg-rose-50/30 p-5 shadow-xs transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Low Stock
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-rose-700">
                {DEFAULT_VENDOR_KPIS.lowStockCount}
              </div>
              <p className="mt-1 text-[11px] text-rose-600 font-semibold">
                Items below restock threshold
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            Catmin Revenue Growth Chart Card
            ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Store Revenue & Net Payout Dynamics</h3>
              <p className="text-xs text-slate-500">Gross store revenue vs net weekly deposit</p>
            </div>

            {/* Range Selector Tabs */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1">
              {(['7D', '30D', '90D', '1Y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setChartRange(range)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    chartRange === range
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="mt-6 flex h-44 items-end justify-between gap-4 px-2 sm:px-6">
            {[
              { label: 'W1', gross: 5800, net: 5394, height: '58%' },
              { label: 'W2', gross: 7200, net: 6696, height: '72%' },
              { label: 'W3', gross: 6400, net: 5952, height: '64%' },
              { label: 'W4', gross: 9100, net: 8463, height: '90%' },
              { label: 'W5', gross: 10200, net: 9486, height: '100%' },
            ].map((pt, idx) => (
              <div key={idx} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                <div className="text-[10px] font-bold text-slate-500">
                  ${(pt.gross / 1000).toFixed(1)}k
                </div>
                <div className="flex items-end gap-1.5 w-full justify-center h-28">
                  <div
                    className="w-4 sm:w-8 rounded-t-lg bg-orange-500 transition-all duration-500 hover:bg-orange-600"
                    style={{ height: pt.height }}
                    title={`Gross: $${pt.gross.toLocaleString()}`}
                  />
                  <div
                    className="w-3 sm:w-5 rounded-t-lg bg-emerald-500 transition-all duration-500 hover:bg-emerald-600"
                    style={{ height: `${parseInt(pt.height) * 0.93}%` }}
                    title={`Net Payout: $${pt.net} (after 7% fee)`}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600">{pt.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-orange-500" />
              <span className="font-medium text-slate-600">Gross Volume</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-emerald-500" />
              <span className="font-medium text-slate-600">Net Weekly Payout (93%)</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            Recent Orders & Fulfillment Feed
            ========================================================================= */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Customer Sub-Orders</h3>
              <p className="text-xs text-slate-500">Live order stream split by multi-vendor checkout engine</p>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
              <Link to="/vendor/orders">
                <span>View All Orders</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Sub-Order ID</th>
                  <th className="py-3 px-4">Customer & Date</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Subtotal</th>
                  <th className="py-3 px-4">Net Vendor Payout</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((order) => {
                  const firstItem = order.items[0];
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{order.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {order.history[0]?.note?.replace('Order placed by customer ', '') || 'Customer'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {firstItem && (
                            <img
                              src={firstItem.image}
                              alt={firstItem.title}
                              className="h-8 w-8 rounded-lg object-cover border border-slate-200"
                            />
                          )}
                          <div className="max-w-[200px] truncate font-medium text-slate-800">
                            {firstItem?.title || 'Vendor Product'}
                            {order.items.length > 1 && (
                              <span className="text-slate-400 ml-1">+{order.items.length - 1} more</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        ${order.subtotal.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        ${order.netPayout.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        {renderStatusBadge(order.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {order.status === 'placed' && (
                          <Button
                            variant="orange-cta"
                            size="sm"
                            onClick={() => handleAdvanceStatus(order.id, order.status)}
                            className="text-xs h-8 px-3"
                          >
                            Confirm Order
                          </Button>
                        )}
                        {order.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdvanceStatus(order.id, order.status)}
                            className="text-xs h-8 px-3 border-orange-200 text-[#EA6C13] hover:bg-orange-50"
                          >
                            Mark Packed
                          </Button>
                        )}
                        {order.status === 'packed' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAdvanceStatus(order.id, order.status)}
                            className="text-xs h-8 px-3"
                          >
                            Ready for Rider Pickup
                          </Button>
                        )}
                        {order.status === 'ready_for_pickup' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600">
                            <Clock className="h-3 w-3" />
                            <span>Awaiting Rider</span>
                          </span>
                        )}
                        {order.status === 'delivered' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Completed</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Creation Modal */}
        <ProductFormModal
          open={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
          onSave={handleProductSaved}
        />
      </div>
    </WorkspaceLayout>
  );
};
