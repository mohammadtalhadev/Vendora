import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { SubOrder } from '../types/domain';
import { deriveOrderGroupStatus } from '../lib/order-state-machine';
import type { OrderGroupDerivedStatus } from '../lib/order-state-machine';
import { useOrders, useCreateOrder } from '../features/orders/hooks/useOrders';
import { useAuthStore } from '../store/auth-store';
import { QueryState } from '../components/common/QueryState';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Package,
  ArrowRight,
  Store,
  ChevronRight,
  Sparkles,
  User,
} from 'lucide-react';

export type StatusFilter = 'all' | 'in_transit' | 'delivered' | 'cancelled';

function formatOrderDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function getDerivedStatusBadgeProps(status: OrderGroupDerivedStatus): {
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

export const OrdersPage: React.FC = () => {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const { user, loginAsDemoRole } = useAuthStore();
  const { data, isLoading, isError, error, refetch } = useOrders();
  const createOrderMutation = useCreateOrder();

  const orderGroups = data?.orderGroups || [];
  const allSubOrders = data?.subOrders || [];

  // Map sub-orders by orderGroupId for fast lookup
  const subOrdersByGroupId = useMemo(() => {
    const map = new Map<string, SubOrder[]>();
    for (const so of allSubOrders) {
      const list = map.get(so.orderGroupId) || [];
      list.push(so);
      map.set(so.orderGroupId, list);
    }
    return map;
  }, [allSubOrders]);

  // Derive status and filter order groups
  const enrichedOrders = useMemo(() => {
    return orderGroups.map((group) => {
      const subOrders = subOrdersByGroupId.get(group.id) || [];
      const statuses = subOrders.map((so) => so.status);
      const derivedStatus = deriveOrderGroupStatus(statuses);
      const grandTotal = subOrders.reduce(
        (sum, so) => sum + so.subtotal + so.shippingFee,
        0,
      );
      return {
        group,
        subOrders,
        derivedStatus,
        grandTotal,
      };
    });
  }, [orderGroups, subOrdersByGroupId]);

  const filteredOrders = useMemo(() => {
    return enrichedOrders.filter(({ derivedStatus, subOrders }) => {
      if (filter === 'all') return true;
      if (filter === 'in_transit') {
        return (
          derivedStatus === 'in_transit' ||
          subOrders.some((s) => s.status === 'shipped' || s.status === 'out_for_delivery')
        );
      }
      if (filter === 'delivered') {
        return (
          derivedStatus === 'completed' ||
          derivedStatus === 'partially_delivered' ||
          subOrders.some((s) => s.status === 'delivered' || s.status === 'available')
        );
      }
      if (filter === 'cancelled') {
        return (
          derivedStatus === 'cancelled' ||
          subOrders.some((s) => s.status === 'cancelled')
        );
      }
      return true;
    });
  }, [enrichedOrders, filter]);

  // Generate Sample Multi-Vendor Order for Dogfooding / Demo Testing
  const handleCreateDemoOrder = () => {
    createOrderMutation.mutate({
      customerId: user?.id || 'usr-customer-1',
      customerEmail: user?.email || 'customer@demo.test',
      items: [
        {
          id: 'prod-v-1-main',
          productId: 'prod-v-1',
          title: 'Vendora One Wireless ANC Flagship Headphones',
          price: 249.0,
          quantity: 1,
          maxStock: 50,
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
          sellerId: 'platform',
          sellerName: 'Vendora Direct',
          sellerType: 'platform',
          type: 'physical',
        },
        {
          id: 'prod-digi-1-main',
          productId: 'prod-digi-1',
          title: 'Vendora Glass Design System UI Kit & Figma Tokens',
          price: 59.0,
          quantity: 1,
          maxStock: 9999,
          image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
          sellerId: 'vendor-design-1',
          sellerName: 'StudioCraft Assets',
          sellerType: 'vendor',
          type: 'digital',
        },
      ],
      shippingAddress: {
        fullName: 'Sarah Customer',
        street: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'OR',
        zipCode: '97477',
        country: 'United States',
        phone: '+1 (555) 019-2834',
      },
      paymentMethod: 'card',
      paymentBrand: 'Visa',
      last4: '4242',
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6">
      {/* 1. Header & Navigation breadcrumb */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link to="/" className="hover:text-slate-900">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900">Customer Orders</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            My Orders & Tracking
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            View orders, track delivery milestones for each seller package, and manage returns.
          </p>
        </div>

        {/* Demo Quick Order Generator */}
        <div className="flex items-center gap-3">
          <Button
            variant="glass-pill"
            size="sm"
            onClick={handleCreateDemoOrder}
            disabled={createOrderMutation.isPending}
            className="gap-2 text-xs font-semibold text-slate-800"
            data-testid="create-demo-order-button"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#FF7A1A]" />
            <span>
              {createOrderMutation.isPending ? 'Generating...' : '+ Demo Multi-Seller Order'}
            </span>
          </Button>
        </div>
      </div>

      {/* 2. Authentication Prompt if user is not logged in */}
      {!user && (
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-orange-200 bg-orange-50/80 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A1A] text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sign in to view your orders</h3>
              <p className="text-xs text-slate-600">
                You are currently in guest mode. Log in as demo customer to sync order history.
              </p>
            </div>
          </div>
          <Button
            variant="orange-cta"
            size="sm"
            onClick={() => {
              loginAsDemoRole('customer');
              refetch();
            }}
            className="shrink-0 text-xs"
          >
            Log In as Customer
          </Button>
        </div>
      )}

      {/* 3. Status Filter Pills */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {(
          [
            { id: 'all', label: 'All Orders', count: enrichedOrders.length },
            {
              id: 'in_transit',
              label: 'In Transit',
              count: enrichedOrders.filter(
                (o) =>
                  o.derivedStatus === 'in_transit' ||
                  o.subOrders.some((s) => s.status === 'shipped' || s.status === 'out_for_delivery'),
              ).length,
            },
            {
              id: 'delivered',
              label: 'Delivered',
              count: enrichedOrders.filter(
                (o) =>
                  o.derivedStatus === 'completed' ||
                  o.derivedStatus === 'partially_delivered' ||
                  o.subOrders.some((s) => s.status === 'delivered' || s.status === 'available'),
              ).length,
            },
            {
              id: 'cancelled',
              label: 'Cancelled',
              count: enrichedOrders.filter(
                (o) =>
                  o.derivedStatus === 'cancelled' ||
                  o.subOrders.some((s) => s.status === 'cancelled'),
              ).length,
            },
          ] as const
        ).map(({ id, label, count }) => {
          const isActive = filter === id;
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all select-none ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'border border-slate-200 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 shadow-xs'
              }`}
              data-testid={`filter-pill-${id}`}
            >
              <span>{label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. QueryState container for Orders List */}
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        isEmpty={filteredOrders.length === 0}
        emptyTitle={filter === 'all' ? 'No orders placed yet' : `No ${filter.replace('_', ' ')} orders`}
        emptyMessage={
          filter === 'all'
            ? 'When you checkout items from Vendora or marketplace sellers, your split order tracking will appear here.'
            : `There are currently no orders matching the "${filter.replace('_', ' ')}" filter.`
        }
        emptyAction={
          filter === 'all' ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="orange-cta" size="sm">
                <Link to="/products">Browse Catalog</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateDemoOrder}
                disabled={createOrderMutation.isPending}
              >
                Generate Demo Order
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
              Show All Orders
            </Button>
          )
        }
        skeletonType="list"
        skeletonCount={3}
      >
        <div className="space-y-4" data-testid="orders-list">
          {filteredOrders.map(({ group, subOrders, derivedStatus, grandTotal }) => {
            const statusBadgeProps = getDerivedStatusBadgeProps(derivedStatus);
            const sellerNames = Array.from(new Set(subOrders.map((s) => s.sellerName)));
            const allItems = subOrders.flatMap((s) => s.items);

            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs transition-shadow hover:shadow-md"
                data-testid={`order-group-card-${group.id}`}
              >
                {/* Order Group Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 text-xs text-slate-600 sm:px-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Order Placed
                      </span>
                      <p className="font-bold text-slate-900">{formatOrderDate(group.createdAt)}</p>
                    </div>

                    <div className="hidden sm:block">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Order Number
                      </span>
                      <p className="font-mono font-bold text-slate-900">#{group.id}</p>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Total Amount
                      </span>
                      <p className="font-extrabold text-slate-900">
                        ${grandTotal > 0 ? grandTotal.toFixed(2) : '0.00'}
                      </p>
                    </div>
                  </div>

                  {/* Derived Status Badge */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={statusBadgeProps.variant}
                      size="default"
                      data-testid={`derived-status-badge-${group.id}`}
                    >
                      {statusBadgeProps.label}
                    </Badge>
                  </div>
                </div>

                {/* Order Group Body: Sub-order summary & Items thumbnail preview */}
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    {/* Left: Packages and Sellers info */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <Package className="h-4 w-4 text-[#FF7A1A]" />
                        <span>
                          {subOrders.length}{' '}
                          {subOrders.length === 1 ? 'Sub-Order Package' : 'Sub-Order Packages'}{' '}
                          across {sellerNames.length}{' '}
                          {sellerNames.length === 1 ? 'Seller' : 'Sellers'}
                        </span>
                      </div>

                      {/* Seller breakdown pills */}
                      <div className="flex flex-wrap items-center gap-2">
                        {subOrders.map((so) => (
                          <div
                            key={so.id}
                            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs"
                          >
                            <Store className="h-3 w-3 text-slate-400" />
                            <span className="font-medium text-slate-800">{so.sellerName}</span>
                            <span className="text-slate-400">·</span>
                            <span className="font-semibold text-slate-600 capitalize">
                              {so.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Thumbnails preview */}
                      <div className="flex items-center gap-3 overflow-x-auto pt-1 no-scrollbar">
                        {allItems.slice(0, 4).map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                            title={`${item.title} (Qty: ${item.quantity})`}
                          >
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                            {item.quantity > 1 && (
                              <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white">
                                {item.quantity}
                              </span>
                            )}
                          </div>
                        ))}

                        {allItems.length > 4 && (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs font-bold text-slate-500">
                            +{allItems.length - 4}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Action link to detail */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-2 pt-2 lg:pt-0">
                      <Button
                        asChild
                        variant="orange-cta"
                        size="default"
                        className="gap-2 shadow-sm"
                        data-testid={`view-order-details-${group.id}`}
                      >
                        <Link to={`/orders/${group.id}`}>
                          <span>View Details & Tracking</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>

                      <span className="text-center text-[11px] text-slate-400">
                        Detailed 7-stage tracking & invoices
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </QueryState>
    </div>
  );
};

export default OrdersPage;
