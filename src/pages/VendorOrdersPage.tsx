import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Hash,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  getVendorSubOrders,
  advanceSubOrderStatus,
} from '../features/vendor/vendorData';
import type { SubOrder, SubOrderStatus } from '../types/domain';
import { useAuthStore } from '../store/auth-store';
import { cn } from '../lib/utils';

type FilterStatus = 'all' | SubOrderStatus;

export const VendorOrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const vendorId = user?.vendorId || 'vendor-tech-1';

  const [orders, setOrders] = useState<SubOrder[]>(() => getVendorSubOrders(vendorId));
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Status advancement handler
  const handleAdvanceOrder = (subOrderId: string, currentStatus: SubOrderStatus) => {
    let nextStatus: SubOrderStatus | null = null;
    let note = '';

    if (currentStatus === 'placed') {
      nextStatus = 'confirmed';
      note = 'Order confirmed by vendor';
    } else if (currentStatus === 'confirmed') {
      nextStatus = 'packed';
      note = 'Order packed in secure parcel';
    } else if (currentStatus === 'packed') {
      nextStatus = 'ready_for_pickup';
      note = 'Order marked ready for rider pickup';
    }

    if (nextStatus) {
      const updated = advanceSubOrderStatus(subOrderId, nextStatus, 'Vendor', note);
      setOrders((prev) =>
        prev.map((order) => (order.id === subOrderId ? updated : order)),
      );
    }
  };

  // Filter & Search logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      if (selectedFilter !== 'all' && order.status !== selectedFilter) {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesItems = order.items.some((i) =>
          i.title.toLowerCase().includes(query),
        );
        const matchesCustomer = order.history.some((h) =>
          h.note?.toLowerCase().includes(query),
        );
        if (!matchesId && !matchesItems && !matchesCustomer) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedFilter, searchQuery]);

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: orders.length,
      placed: orders.filter((o) => o.status === 'placed').length,
      confirmed: orders.filter((o) => o.status === 'confirmed').length,
      packed: orders.filter((o) => o.status === 'packed').length,
      ready_for_pickup: orders.filter((o) => o.status === 'ready_for_pickup').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };
  }, [orders]);

  const renderStatusBadge = (status: SubOrderStatus) => {
    switch (status) {
      case 'placed':
        return (
          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
            Placed
          </Badge>
        );
      case 'confirmed':
        return (
          <Badge variant="secondary" className="bg-sky-50 text-sky-700 border-sky-200">
            Confirmed
          </Badge>
        );
      case 'packed':
        return (
          <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
            Packed
          </Badge>
        );
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

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      title="Vendor Orders"
      subtitle="Manage fulfillment lifecycle for all sub-orders assigned to your store."
      sidebar={<VendorNav />}
    >
      <div className="space-y-6">
        {/* Header Search & Filter Pills */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID, customer, or product..."
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="text-xs text-slate-500 font-medium self-center">
              Showing {filteredOrders.length} of {orders.length} sub-orders
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                selectedFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              <span>All</span>
              <span className="rounded-full bg-slate-800/40 px-1.5 py-0.2 text-[10px] text-white">
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('placed')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                selectedFilter === 'placed'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
              )}
            >
              <Clock className="h-3 w-3" />
              <span>Placed</span>
              <span className="rounded-full bg-white/30 px-1.5 py-0.2 text-[10px]">
                {counts.placed}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('confirmed')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                selectedFilter === 'confirmed'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100',
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              <span>Confirmed</span>
              <span className="rounded-full bg-white/30 px-1.5 py-0.2 text-[10px]">
                {counts.confirmed}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('packed')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                selectedFilter === 'packed'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100',
              )}
            >
              <Package className="h-3 w-3" />
              <span>Packed</span>
              <span className="rounded-full bg-white/30 px-1.5 py-0.2 text-[10px]">
                {counts.packed}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('ready_for_pickup')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                selectedFilter === 'ready_for_pickup'
                  ? 'bg-[#FF7A1A] text-white shadow-xs'
                  : 'bg-orange-50 text-[#EA6C13] hover:bg-orange-100',
              )}
            >
              <Truck className="h-3 w-3" />
              <span>Ready for Pickup</span>
              <span className="rounded-full bg-white/30 px-1.5 py-0.2 text-[10px]">
                {counts.ready_for_pickup}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('delivered')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                selectedFilter === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Delivered</span>
              <span className="rounded-full bg-white/30 px-1.5 py-0.2 text-[10px]">
                {counts.delivered}
              </span>
            </button>

            {counts.cancelled > 0 && (
              <button
                type="button"
                onClick={() => setSelectedFilter('cancelled')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                  selectedFilter === 'cancelled'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
                )}
              >
                <XCircle className="h-3 w-3" />
                <span>Cancelled</span>
                <span className="rounded-full bg-white/30 px-1.5 py-0.2 text-[10px]">
                  {counts.cancelled}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Orders Listing */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
              <ClipboardList className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-base font-bold text-slate-700">No Sub-Orders Found</h3>
              <p className="text-xs text-slate-400 mt-1">
                There are currently no orders matching your selected filters.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;

              return (
                <div
                  key={order.id}
                  data-testid={`sub-order-card-${order.id}`}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-4 w-4 text-slate-400" />
                        <span className="font-mono text-sm font-extrabold text-slate-900">
                          {order.id}
                        </span>
                      </div>
                      {renderStatusBadge(order.status)}
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                      {order.deliveryCode && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-700 border border-slate-200">
                          PIN: {order.deliveryCode}
                        </span>
                      )}
                    </div>

                    {/* Status Action Buttons */}
                    <div className="flex items-center gap-2">
                      {order.status === 'placed' && (
                        <Button
                          variant="orange-cta"
                          size="sm"
                          onClick={() => handleAdvanceOrder(order.id, 'placed')}
                          className="text-xs font-semibold"
                        >
                          Confirm Order
                        </Button>
                      )}

                      {order.status === 'confirmed' && (
                        <Button
                          variant="orange-cta"
                          size="sm"
                          onClick={() => handleAdvanceOrder(order.id, 'confirmed')}
                          className="text-xs font-semibold"
                        >
                          Mark Packed
                        </Button>
                      )}

                      {order.status === 'packed' && (
                        <Button
                          variant="orange-cta"
                          size="sm"
                          onClick={() => handleAdvanceOrder(order.id, 'packed')}
                          className="text-xs font-semibold"
                        >
                          Ready for Rider Pickup
                        </Button>
                      )}

                      {order.status === 'ready_for_pickup' && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
                          <Truck className="h-3.5 w-3.5" />
                          <span>Awaiting Rider Pickup</span>
                        </div>
                      )}

                      {order.status === 'delivered' && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Completed</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedOrderId(isExpanded ? null : order.id)
                        }
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        aria-label={isExpanded ? 'Collapse order' : 'Expand order'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Order Items & Financials Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    {/* Items */}
                    <div className="md:col-span-2 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Package Contents
                      </div>
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-10 w-10 rounded-xl object-cover border border-slate-200"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate">
                              {item.title}
                            </h4>
                            <div className="text-[11px] text-slate-500">
                              Qty: {item.quantity} • ${item.price.toFixed(2)} each
                            </div>
                          </div>
                          <div className="text-xs font-bold text-slate-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Financial Payout Summary */}
                    <div className="rounded-2xl bg-slate-50/70 border border-slate-200/80 p-3.5 text-xs space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Settlement Breakdown
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Items Subtotal:</span>
                        <span className="font-semibold text-slate-800">
                          ${order.subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Platform Fee ({(order.commissionRate * 100).toFixed(0)}%):</span>
                        <span className="text-amber-700 font-semibold">
                          -${order.commissionAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping Fee:</span>
                        <span className="font-semibold text-slate-800">
                          ${order.shippingFee.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                        <span>Net Vendor Payout:</span>
                        <span className="text-emerald-600 text-sm">
                          ${order.netPayout.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Audit Trail History */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Order Lifecycle History
                      </div>
                      <div className="space-y-2">
                        {order.history.map((event, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2.5 text-xs text-slate-600"
                          >
                            <span className="h-2 w-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <span className="font-semibold text-slate-900">
                                {event.actor}:
                              </span>{' '}
                              <span>{event.note || `Status changed to ${event.status}`}</span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {new Date(event.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
};
