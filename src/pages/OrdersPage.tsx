import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  Truck,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  User,
  Heart,
  ShoppingCart,
  ArrowRight,
  MapPin,
  CreditCard,
  KeyRound,
  AlertTriangle,
  Download,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useCurrency } from '../store/currency-store';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';
import { useOrders } from '../features/orders/hooks/useOrders';
import { updatePassword } from '../features/auth/api/session';
import { deriveOrderGroupStatus, type OrderGroupDerivedStatus } from '../lib/order-state-machine';
import type { CartItem, OrderGroup, ShippingAddress, SubOrder } from '../types/domain';
import { QueryState } from '../components/common/QueryState';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog';

type DashboardTab = 'orders' | 'returns' | 'addresses' | 'payments' | 'disputes' | 'security' | 'overview';

/**
 * A destination this account has actually been shipped to. There is no addresses table in
 * the schema, so the only real source is the `shipping_address` snapshot each order row
 * carries; nothing here can be added, defaulted or deleted.
 */
interface UsedAddress {
  key: string;
  address: ShippingAddress;
  orderGroupId: string;
  placedAt: string;
}

/**
 * A payment this account has actually been booked with. `orders` stores the method plus
 * only the card brand and last four digits, so that is all a row can show.
 */
interface UsedPayment {
  key: string;
  method: OrderGroup['paymentMethod'];
  brand: string;
  last4: string;
  status: OrderGroup['paymentStatus'];
  orderGroupId: string;
  placedAt: string;
}

/** One line from a real order group, offered back as a reorder. */
interface ReorderLine {
  line: CartItem;
  orderGroupId: string;
  placedAt: string;
}

const SECTION_TABS: { key: DashboardTab; label: string; note: string }[] = [
  { key: 'overview', label: 'Overview', note: 'Summary' },
  { key: 'addresses', label: 'Delivery Addresses', note: 'From orders' },
  { key: 'orders', label: 'Track Orders', note: 'History' },
  { key: 'returns', label: 'Returns & Refunds', note: 'Open' },
  { key: 'disputes', label: 'Disputes & Claims', note: 'Support' },
  { key: 'payments', label: 'Payment Methods', note: 'From orders' },
  { key: 'security', label: 'Security Settings', note: 'Password' },
];

const SECTION_TAB_KEYS: DashboardTab[] = SECTION_TABS.map((tab) => tab.key);

/**
 * The sidebar is a roving-tabindex tablist, so exactly one tab must always be selectable.
 * An unknown `?tab=` value in the URL would leave nothing selected, so it falls back.
 */
function readInitialTab(value: string | null): DashboardTab {
  return value !== null && (SECTION_TAB_KEYS as string[]).includes(value) ? (value as DashboardTab) : 'orders';
}

function formatPlacedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAddressLine(address: ShippingAddress): string {
  return [address.street, address.city, address.state, address.zipCode].filter(Boolean).join(', ');
}

const PAYMENT_STATUS_LABEL: Record<NonNullable<OrderGroup['paymentStatus']>, string> = {
  pending: 'Payment pending',
  succeeded: 'Payment captured',
  failed: 'Payment failed',
  refunded: 'Refunded on this order',
};

function paymentLabel(payment: UsedPayment): string {
  if (payment.method === 'cod') return 'Cash on delivery';
  const brand = payment.brand || 'Card';
  return payment.last4 ? `${brand} ending in ${payment.last4}` : brand;
}

const DERIVED_BADGE: Record<OrderGroupDerivedStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  processing: { label: 'Processing', className: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' },
  in_transit: { label: 'In Transit', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  partially_delivered: { label: 'Partially Delivered', className: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
  completed: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' },
  refunded: { label: 'Refunded', className: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
};

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = readInitialTab(searchParams.get('tab'));

  const { user } = useAuthStore();
  const displayName = user?.name || user?.email || 'there';
  const { formatPrice } = useCurrency();
  const { addItem } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const wishlistCount = wishlistItems.length;

  // The customer's real orders, read from the Supabase data layer through the same
  // query hook the order-detail page uses. Nothing here is hardcoded: if there are
  // no rows the list renders empty, and a failed read surfaces the server message.
  const ordersQuery = useOrders();
  const ordersData = ordersQuery.data;

  // Both arrays are held at the identity of the query result, so the derivations below
  // recompute when the rows change rather than on every render.
  const orderGroups = useMemo<OrderGroup[]>(() => ordersData?.orderGroups ?? [], [ordersData]);
  const subOrders = useMemo<SubOrder[]>(() => ordersData?.subOrders ?? [], [ordersData]);

  const subsByGroup = useMemo(() => {
    const map = new Map<string, SubOrder[]>();
    for (const so of subOrders) {
      const bucket = map.get(so.orderGroupId);
      if (bucket) bucket.push(so);
      else map.set(so.orderGroupId, [so]);
    }
    return map;
  }, [subOrders]);

  const groupStatus = (og: OrderGroup): OrderGroupDerivedStatus =>
    deriveOrderGroupStatus((subsByGroup.get(og.id) ?? []).map((s) => s.status));
  const groupTotal = (og: OrderGroup): number =>
    (subsByGroup.get(og.id) ?? []).reduce((sum, s) => sum + s.subtotal + s.shippingFee, 0);

  const groupStatuses = orderGroups.map(groupStatus);
  const activeCount = groupStatuses.filter((s) => s !== 'completed' && s !== 'cancelled' && s !== 'refunded').length;
  const completedCount = groupStatuses.filter((s) => s === 'completed').length;
  const deliveredSubs = subOrders.filter((s) => s.type === 'physical' && s.status === 'delivered');
  const openReturns = subOrders.filter((s) => s.status === 'return_requested' || s.status === 'return_approved');
  const licensedSubs = subOrders.filter((s) => s.type === 'digital' && s.licenseKey);
  const recordedValue = orderGroups.reduce((sum, og) => sum + groupTotal(og), 0);

  const transitGroups = orderGroups.filter((og) => groupStatus(og) === 'in_transit');
  const deliveredGroups = orderGroups.filter((og) => {
    const s = groupStatus(og);
    return s === 'completed' || s === 'partially_delivered';
  });
  const inTransitGroup = transitGroups[0];

  // Destinations read off the customer's own orders, newest booking first, deduplicated.
  const usedAddresses = useMemo<UsedAddress[]>(() => {
    const seen = new Set<string>();
    const rows: UsedAddress[] = [];
    for (const og of orderGroups) {
      const address = og.shippingAddress;
      if (!address) continue;
      const key = [address.fullName, address.street, address.city, address.state, address.zipCode, address.phone]
        .map((part) => part.trim().toLowerCase())
        .join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ key, address, orderGroupId: og.id, placedAt: og.createdAt });
    }
    return rows;
  }, [orderGroups]);

  // Payment rows the customer's orders actually recorded.
  const usedPayments = useMemo<UsedPayment[]>(() => {
    const seen = new Set<string>();
    const rows: UsedPayment[] = [];
    for (const og of orderGroups) {
      const brand = (og.paymentDetails.brand ?? '').trim();
      const last4 = (og.paymentDetails.last4 ?? '').trim();
      const key = `${og.paymentMethod}|${brand.toLowerCase()}|${last4}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        key,
        method: og.paymentMethod,
        brand,
        last4,
        status: og.paymentStatus,
        orderGroupId: og.id,
        placedAt: og.createdAt,
      });
    }
    return rows;
  }, [orderGroups]);

  // Reorder strip built from booked lines, so every card names a product on a real order.
  const reorderLines = useMemo<ReorderLine[]>(() => {
    const byProduct = new Map<string, ReorderLine>();
    for (const so of subOrders) {
      for (const item of so.items) {
        if (!item.productId || byProduct.has(item.productId)) continue;
        byProduct.set(item.productId, { line: item, orderGroupId: so.orderGroupId, placedAt: so.createdAt });
      }
    }
    return Array.from(byProduct.values()).slice(0, 8);
  }, [subOrders]);

  const [activeSection, setActiveSection] = useState<DashboardTab>(initialTab);
  const [orderFilterTab, setOrderFilterTab] = useState<'all' | 'transit' | 'delivered'>('all');
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const [addedProductIds, setAddedProductIds] = useState<Record<string, boolean>>({});
  const [cartError, setCartError] = useState<string | null>(null);

  // Password change drives the real Supabase auth update; it awaits the server result.
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const visibleGroups =
    orderFilterTab === 'transit' ? transitGroups : orderFilterTab === 'delivered' ? deliveredGroups : orderGroups;

  const handleTabChange = (tab: DashboardTab) => {
    setActiveSection(tab);
    setSearchParams({ tab });
  };

  const tabRefs = useRef<Partial<Record<DashboardTab, HTMLButtonElement | null>>>({});

  // A tablist with roving tabindex must answer the arrow keys; the panel it drives is the
  // only one mounted, so focus moves with the selection.
  const handleTabListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = SECTION_TAB_KEYS.indexOf(activeSection);
    let next = -1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (current + 1) % SECTION_TAB_KEYS.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
      next = (current - 1 + SECTION_TAB_KEYS.length) % SECTION_TAB_KEYS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = SECTION_TAB_KEYS.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const tab = SECTION_TAB_KEYS[next];
    handleTabChange(tab);
    tabRefs.current[tab]?.focus();
  };

  const reorder = async (entry: ReorderLine) => {
    const line = entry.line;
    try {
      // The booked line carries the real seller, type and image; its stock ceiling is the
      // quantity that order booked, which is all the snapshot can know.
      await addItem(
        {
          id: line.id,
          productId: line.productId,
          variantId: line.variantId,
          title: line.title,
          price: line.price,
          compareAtPrice: line.compareAtPrice,
          maxStock: line.maxStock,
          image: line.image,
          sellerId: line.sellerId,
          sellerName: line.sellerName,
          sellerType: line.sellerType,
          type: line.type,
        },
        1,
      );
      setCartError(null);
      setAddedProductIds((prev) => ({ ...prev, [line.productId]: true }));
      window.setTimeout(() => {
        setAddedProductIds((prev) => ({ ...prev, [line.productId]: false }));
      }, 1500);
    } catch (cause) {
      setCartError(cause instanceof Error ? cause.message : 'That item could not be added to your cart.');
    }
  };

  const submitPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ kind: 'error', text: 'The two passwords do not match.' });
      return;
    }
    setPasswordBusy(true);
    setPasswordMessage(null);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage({
        kind: 'ok',
        text: 'Password updated. This session keeps working until it expires.',
      });
    } catch (cause) {
      setPasswordMessage({
        kind: 'error',
        text: cause instanceof Error ? cause.message : 'Your password could not be updated.',
      });
    } finally {
      setPasswordBusy(false);
    }
  };

  const filterButtons: { key: typeof orderFilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: orderGroups.length },
    { key: 'transit', label: 'In Transit', count: transitGroups.length },
    { key: 'delivered', label: 'Delivered', count: deliveredGroups.length },
  ];

  const latestAddress = usedAddresses[0];
  const latestPayment = usedPayments[0];

  const sidebarChipClass = (active: boolean, tone: 'plain' | 'count') =>
    active
      ? tone === 'count'
        ? 'rounded-full px-2 py-0.5 text-xs font-bold bg-white/20 text-white'
        : 'text-xs text-white/90 font-semibold'
      : tone === 'count'
        ? 'rounded-full px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
        : 'text-xs text-slate-500 dark:text-slate-500 font-semibold';

  return (
    <div className="space-y-6">
      {/* Content column only: AccountLayout carries the account sidebar and
          the full-width storefront container (max-w-[1600px]) now. */}
        {/* ========================================================================= */}
        {/* 1. Header Banner                                                          */}
        {/* ========================================================================= */}
        <div className="overflow-hidden rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl overflow-hidden border-2 border-sun-orange shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Welcome back, {displayName}
                  </h1>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  Signed in as {user?.email || 'guest'}
                </p>
            </div>
          </div>

          {/* Metrics strip — every figure counted from the rows above */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
            <button
              type="button"
              onClick={() => handleTabChange('orders')}
              className="text-left rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 cursor-pointer hover:border-sun-orange/40 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Active Orders</span>
                <Truck className="h-4 w-4 text-sun-orange" aria-hidden="true" />
              </div>
              <div className="font-outfit text-2xl font-black text-slate-900 dark:text-white">{activeCount}</div>
              <span className="text-xs font-semibold text-slate-500">
                {ordersQuery.isLoading
                  ? 'Loading…'
                  : activeCount === 0
                    ? 'Nothing open right now'
                    : `${activeCount} not delivered, cancelled or refunded`}
              </span>
            </button>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Delivered</span>
                <CheckCircle2 className="h-4 w-4 text-purple-500" aria-hidden="true" />
              </div>
              <div className="font-outfit text-2xl font-black text-slate-900 dark:text-white">{completedCount}</div>
              <span className="text-xs text-slate-500">
                {completedCount === 0 ? 'No order group fully delivered yet' : 'Order groups fully delivered'}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
                <Package className="h-4 w-4 text-rose-500" aria-hidden="true" />
              </div>
              <div className="font-outfit text-2xl font-black text-slate-900 dark:text-white">{orderGroups.length}</div>
              <span className="text-xs text-slate-500">
                {orderGroups.length === 0 ? 'No orders on this account' : 'On your account'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/wishlist')}
              className="text-left rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 cursor-pointer hover:border-rose-400 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Saved Wishlist</span>
                <Heart className="h-4 w-4 text-rose-400" aria-hidden="true" />
              </div>
              <div className="font-outfit text-2xl font-black text-slate-900 dark:text-white">{wishlistCount}</div>
              <span className="text-xs text-slate-500">
                {wishlistCount === 0 ? 'Nothing saved yet' : 'Items you saved'}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. Section tabs + panels                                                             */}
        {/* ========================================================================= */}
        {/* Section tabs: this page’s own sections as a horizontal tab bar.
            The account sidebar itself belongs to AccountLayout now. */}
        <div
          role="tablist"
          aria-orientation="horizontal"
          aria-label="Account sections"
          onKeyDown={handleTabListKeyDown}
          className="flex gap-1.5 overflow-x-auto rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-2 shadow-sm"
        >
              {SECTION_TABS.map((tab) => {
                const active = activeSection === tab.key;
                const chip =
                  tab.key === 'returns'
                    ? { text: `${openReturns.length} open`, tone: 'count' as const }
                    : tab.key === 'payments'
                      ? { text: String(usedPayments.length), tone: 'count' as const }
                      : tab.key === 'addresses'
                        ? { text: String(usedAddresses.length), tone: 'count' as const }
                        : { text: tab.note, tone: 'plain' as const };
                return (
                  <button
                    key={tab.key}
                    ref={(el) => {
                      tabRefs.current[tab.key] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`section-tab-${tab.key}`}
                    aria-selected={active}
                    aria-controls={`section-panel-${tab.key}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => handleTabChange(tab.key)}
                    className={`flex shrink-0 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs font-semibold transition-all ${
                      active
                        ? 'bg-gradient-to-r from-sun-orange to-[#FF9040] text-white font-bold shadow-md shadow-orange-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={sidebarChipClass(active, chip.tone)}>{chip.text}</span>
                  </button>
                );
              })}
            </div>


        <div className="space-y-6">
            {/* ========================================================================= */}
            {/* TAB: MY ORDERS & TRACKING                                                 */}
            {/* ========================================================================= */}
            {activeSection === 'orders' && (
              <section
                role="tabpanel"
                id="section-panel-orders"
                aria-labelledby="section-tab-orders"
                tabIndex={0}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-outfit text-base font-extrabold text-slate-900 dark:text-white">
                      Recent &amp; Active Consignments
                    </h2>
                    <p className="text-xs text-slate-500">Every order and package on your account, tracked to its real status.</p>
                  </div>

                  <div
                    role="group"
                    aria-label="Filter orders"
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-1 text-xs font-bold"
                  >
                    {filterButtons.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        aria-pressed={orderFilterTab === f.key}
                        onClick={() => setOrderFilterTab(f.key)}
                        className={`rounded-lg px-3 py-1 transition-all ${
                          orderFilterTab === f.key
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {f.label} ({f.count})
                      </button>
                    ))}
                  </div>
                </div>

                <QueryState
                  isLoading={ordersQuery.isLoading}
                  isError={ordersQuery.isError}
                  error={ordersQuery.error}
                  onRetry={() => ordersQuery.refetch()}
                  isEmpty={visibleGroups.length === 0}
                  emptyTitle={orderGroups.length === 0 ? 'No orders yet' : 'No orders match this filter'}
                  emptyMessage={
                    orderGroups.length === 0
                      ? 'You have not placed any orders. They will appear here once you check out.'
                      : 'Try a different filter to see your other orders.'
                  }
                  skeletonType="list"
                  skeletonCount={2}
                >
                  <div className="space-y-5">
                    {visibleGroups.map((og) => {
                      const subs = subsByGroup.get(og.id) ?? [];
                      const status = groupStatus(og);
                      const badge = DERIVED_BADGE[status];

                      return (
                        <div
                          key={og.id}
                          className="overflow-hidden rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                                  Order #{og.id}
                                </h3>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badge.className}`}>
                                  {badge.label}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                Placed {formatPlacedDate(og.createdAt)} • {subs.length} package{subs.length === 1 ? '' : 's'}
                                {' • '}
                                {og.paymentMethod === 'cod' ? 'Cash on delivery' : 'Card'}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                                Total: {formatPrice(groupTotal(og))}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {subs.map((so) => (
                              <div key={so.id} className="flex items-center gap-4">
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white p-1 shadow-xs">
                                  <img
                                    src={so.items[0]?.image || '/images/placeholder.png'}
                                    alt={so.items[0]?.title || so.sellerName}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                    {so.sellerType === 'platform' ? 'Vendora' : so.sellerName}
                                  </span>
                                  <h4 className="font-outfit text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                                    {so.items[0]?.title || `${so.items.length} item${so.items.length === 1 ? '' : 's'}`}
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    {DERIVED_BADGE[deriveOrderGroupStatus([so.status])].label} •{' '}
                                    {so.items.length} line{so.items.length === 1 ? '' : 's'}
                                    {/* Carrier and tracking are only stated when the row records them. */}
                                    {so.carrierName ? ` • ${so.carrierName}` : ''}
                                    {so.trackingNumber ? ` • ${so.trackingNumber}` : ''}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-outfit text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                                    {formatPrice(so.subtotal + so.shippingFee)}
                                  </div>
                                  {so.shippingFee === 0 && (
                                    <span className="text-xs font-semibold text-emerald-600">Free delivery</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end pt-1">
                            <Link
                              to={`/orders/${og.id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sun-orange-600"
                            >
                              <span>View order &amp; tracking</span>
                              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </QueryState>

                {/* Reorder strip: built from lines on this account's own orders */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-outfit text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        Reorder From Your History
                      </h3>
                      <p className="text-xs text-slate-500">
                        The products on packages you have already booked, at the price they booked at.
                      </p>
                    </div>
                    <Link to="/products" className="text-xs font-bold text-sun-orange hover:underline flex items-center gap-1">
                      <span>Explore Store</span>
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>

                  {cartError && (
                    <p
                      role="alert"
                      aria-live="assertive"
                      className="mb-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/40 p-3 text-xs font-bold text-rose-700 dark:text-rose-300"
                    >
                      {cartError}
                    </p>
                  )}

                  <QueryState
                    isLoading={ordersQuery.isLoading}
                    isError={ordersQuery.isError}
                    error={ordersQuery.error}
                    onRetry={() => ordersQuery.refetch()}
                    isEmpty={reorderLines.length === 0}
                    emptyTitle="Nothing to reorder yet"
                    emptyMessage="Once you have an order, the products in it are listed here."
                    skeletonType="grid"
                    skeletonCount={2}
                    className="border-none bg-transparent p-0"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {reorderLines.map((entry) => {
                        const added = !!addedProductIds[entry.line.productId];
                        return (
                          <div
                            key={`${entry.orderGroupId}-${entry.line.id}`}
                            className="group relative flex flex-col justify-between rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-3.5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                          >
                            <div>
                              <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-2 flex items-center justify-center">
                                <span className="absolute top-2 left-2 z-10 rounded-md px-2 py-0.5 text-[9px] font-bold border shadow-xs bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                  Ordered {formatPlacedDate(entry.placedAt)}
                                </span>

                                <img
                                  src={entry.line.image || '/images/placeholder.png'}
                                  alt={entry.line.title}
                                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                                />
                              </div>

                              <h4 className="font-outfit mt-3 text-xs font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-sun-orange transition-colors">
                                {entry.line.title}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {entry.line.sellerType === 'platform' ? 'Sold by Vendora' : `Sold by ${entry.line.sellerName}`}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="font-outfit text-sm font-extrabold text-slate-900 dark:text-white">
                                  {formatPrice(entry.line.price)}
                                </span>
                                <Link
                                  to={`/products/${entry.line.productId}`}
                                  className="block text-xs font-bold text-sun-orange hover:underline"
                                >
                                  Live price &amp; stock
                                </Link>
                              </div>

                              <button
                                type="button"
                                aria-label={`Add ${entry.line.title} to cart`}
                                onClick={() => void reorder(entry)}
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all cursor-pointer ${
                                  added
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-sun-orange hover:bg-sun-orange-600 text-white shadow-xs'
                                }`}
                              >
                                {added ? (
                                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </QueryState>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB: OVERVIEW                                                             */}
            {/* ========================================================================= */}
            {activeSection === 'overview' && (
              <section
                role="tabpanel"
                id="section-panel-overview"
                aria-labelledby="section-tab-overview"
                tabIndex={0}
                className="space-y-6"
              >
                <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-outfit text-lg font-bold text-slate-900 dark:text-white">
                        Account Summary
                      </h2>
                      <p className="text-xs text-slate-500">
                        Every figure below is counted from your own orders, saved items and profile.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40 text-xs font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {orderGroups.length === 0
                        ? 'No orders recorded yet'
                        : `${completedCount} of ${orderGroups.length} order groups delivered`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        Address On Your Latest Order
                      </div>
                      {latestAddress ? (
                        <>
                          <div className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                            {formatAddressLine(latestAddress.address)}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {latestAddress.address.fullName}
                            {latestAddress.address.phone ? ` • ${latestAddress.address.phone}` : ''}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">Used on order #{latestAddress.orderGroupId}</p>
                        </>
                      ) : (
                        <p
                          role="status"
                          aria-live="polite"
                          className="mt-2 text-xs text-slate-500 leading-relaxed"
                        >
                          {ordersQuery.isLoading
                            ? 'Loading your orders…'
                            : 'No delivery address yet. Digital-only orders book none.'}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTabChange('addresses')}
                        className="mt-3 text-xs font-bold text-sun-orange hover:underline"
                      >
                        Addresses used →
                      </button>
                    </div>

                    <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                        Payment On Your Latest Order
                      </div>
                      {latestPayment ? (
                        <>
                          <div className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                            {paymentLabel(latestPayment)}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {latestPayment.status ? PAYMENT_STATUS_LABEL[latestPayment.status] : 'No payment status recorded'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">Recorded on order #{latestPayment.orderGroupId}</p>
                        </>
                      ) : (
                        <p
                          role="status"
                          aria-live="polite"
                          className="mt-2 text-xs text-slate-500 leading-relaxed"
                        >
                          {ordersQuery.isLoading
                            ? 'Loading your orders…'
                            : 'No payment recorded yet — a payment row exists once you place an order.'}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTabChange('payments')}
                        className="mt-3 text-xs font-bold text-sun-orange hover:underline"
                      >
                        Payments used →
                      </button>
                    </div>

                    <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                        Digital Licences
                      </div>
                      <div className="mt-2 font-outfit text-xl font-black text-slate-900 dark:text-white">
                        {licensedSubs.length}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {licensedSubs.length === 0
                          ? 'No licence has been issued to this account yet.'
                          : 'Issued on packages you bought.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/downloads')}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sun-orange hover:underline"
                      >
                        <Download className="h-3 w-3" aria-hidden="true" />
                        My Downloads →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                        Live Consignment Status
                      </h3>
                      <p className="text-xs text-slate-500" role="status" aria-live="polite">
                        {ordersQuery.isLoading
                          ? 'Loading your shipments…'
                          : inTransitGroup
                            ? `Order #${inTransitGroup.id} is in transit`
                            : 'No shipments are in transit right now'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {orderGroups.length === 0
                          ? 'No order value recorded yet.'
                          : `Booked total across your ${orderGroups.length} order group${orderGroups.length === 1 ? '' : 's'}: ${formatPrice(recordedValue)}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTabChange('orders')}
                      className="rounded-xl bg-sun-orange px-3.5 py-1.5 text-xs font-bold text-white hover:bg-sun-orange-600"
                    >
                      View Orders
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB: RETURNS & REFUNDS                                                    */}
            {/* ========================================================================= */}
            {activeSection === 'returns' && (
              <section
                role="tabpanel"
                id="section-panel-returns"
                aria-labelledby="section-tab-returns"
                tabIndex={0}
                className="space-y-6"
              >
                <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Returns &amp; Replacements Center
                      </h2>
                      <p className="text-xs text-slate-500">
                        Open a return from any delivered package; the vendor reviews it on the order page.
                      </p>
                    </div>
                    <Link
                      to="/orders"
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-sun-orange hover:bg-sun-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span>Go to My Orders</span>
                    </Link>
                  </div>

                  {/* Return & Refund Process */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-1.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-sun-orange">
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">1. Request a Return</div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Delivered items can be submitted for return directly from your order details within 30 days of arrival.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-1.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">2. Vendor Verification</div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        The vendor reviews your request and issues prepaid shipping instructions for return transit.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-1.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <Truck className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">3. Prompt Reimbursement</div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Once received and verified, your refund is credited directly to your original payment method.
                      </p>
                    </div>
                  </div>

                  {/* Active Return Requests (real packages awaiting vendor review) */}
                  <div>
                    <h3 className="font-outfit text-xs font-bold text-slate-400 mb-3">
                      Active Return Requests ({openReturns.length})
                    </h3>
                    {ordersQuery.isLoading ? (
                      <p className="text-xs text-slate-500" role="status" aria-live="polite">
                        Loading your returns…
                      </p>
                    ) : openReturns.length === 0 ? (
                      <p className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 text-xs text-slate-500">
                        You have no returns open right now.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {openReturns.map((so) => (
                          <div key={so.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-orange-200/80 bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/20 p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-xl bg-white p-1 border border-slate-200 shrink-0">
                                <img
                                  src={so.items[0]?.image || '/images/placeholder.png'}
                                  alt={so.items[0]?.title || so.sellerName}
                                  className="h-full w-full object-contain"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {so.items[0]?.title || so.sellerName}
                                </h4>
                                <p className="text-xs text-slate-500">
                                  Order #{so.orderGroupId} • {so.status === 'return_approved' ? 'Approved by seller' : 'Awaiting seller review'}
                                </p>
                                {so.returnReason && <p className="text-xs text-slate-500">Reason: {so.returnReason}</p>}
                              </div>
                            </div>
                            <div className="text-right shrink-0 text-xs font-bold text-slate-900 dark:text-white">
                              {formatPrice(so.subtotal + so.shippingFee)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delivered items eligible to open a return (real delivered packages) */}
                  <div>
                    <h3 className="font-outfit text-xs font-bold text-slate-400 mb-3">
                      Delivered Items Eligible for Return ({deliveredSubs.length})
                    </h3>
                    {ordersQuery.isLoading ? (
                      <p className="text-xs text-slate-500" role="status" aria-live="polite">
                        Loading your delivered packages…
                      </p>
                    ) : deliveredSubs.length === 0 ? (
                      <p className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 text-xs text-slate-500">
                        No delivered packages are eligible for a return yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {deliveredSubs.map((so) => (
                          <div key={so.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-xl bg-white p-1 border border-slate-200 shrink-0">
                                <img
                                  src={so.items[0]?.image || '/images/placeholder.png'}
                                  alt={so.items[0]?.title || so.sellerName}
                                  className="h-full w-full object-contain"
                                />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{so.items[0]?.title || so.sellerName}</h4>
                                <p className="text-xs text-slate-500">
                                  Order #{so.orderGroupId} • {so.sellerName} • {formatPrice(so.subtotal + so.shippingFee)}
                                  {so.carrierName ? ` • ${so.carrierName}` : ''}
                                  {so.trackingNumber ? ` • ${so.trackingNumber}` : ''}
                                </p>
                              </div>
                            </div>
                            <Link
                              to={`/orders/${so.orderGroupId}`}
                              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                            >
                              Request Return / Replacement
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB: ADDRESSES USED ON ORDERS                                             */}
            {/* ========================================================================= */}
            {activeSection === 'addresses' && (
              <section
                role="tabpanel"
                id="section-panel-addresses"
                aria-labelledby="section-tab-addresses"
                tabIndex={0}
                className="space-y-6"
              >
                <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Delivery Addresses On Your Orders
                    </h2>
                    <p className="text-xs text-slate-500">
                      Each address below is the one an order was shipped to. The database keeps no address
                      book, so nothing here can be saved, defaulted or deleted — you enter a destination
                      again on the checkout page.
                    </p>
                  </div>

                  <QueryState
                    isLoading={ordersQuery.isLoading}
                    isError={ordersQuery.isError}
                    error={ordersQuery.error}
                    onRetry={() => ordersQuery.refetch()}
                    isEmpty={usedAddresses.length === 0}
                    emptyTitle="No delivery address on record"
                    emptyMessage="Digital-only orders book no address. Your first physical order will appear here."
                    skeletonType="list"
                    skeletonCount={2}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {usedAddresses.map((entry) => (
                        <div
                          key={entry.key}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-800/40 p-5 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                              <MapPin className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                              <span className="font-outfit text-xs font-bold">
                                {formatPlacedDate(entry.placedAt)}
                              </span>
                            </div>
                            <Link
                              to={`/orders/${entry.orderGroupId}`}
                              className="text-xs font-bold text-sun-orange hover:underline"
                            >
                              Order #{entry.orderGroupId}
                            </Link>
                          </div>

                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {entry.address.fullName}
                              {entry.address.phone ? (
                                <span className="text-slate-500 font-normal"> • {entry.address.phone}</span>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                              {formatAddressLine(entry.address)}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {[entry.address.city, entry.address.state].filter(Boolean).join(', ')}
                              {entry.address.country ? ` • ${entry.address.country}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </QueryState>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB: PAYMENTS USED ON ORDERS                                              */}
            {/* ========================================================================= */}
            {activeSection === 'payments' && (
              <section
                role="tabpanel"
                id="section-panel-payments"
                aria-labelledby="section-tab-payments"
                tabIndex={0}
                className="space-y-6"
              >
                <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Payment Methods On Your Orders
                    </h2>
                    <p className="text-xs text-slate-500">
                      The account stores no wallet or card book. What it does store, per order, is the method
                      that order was booked with.
                    </p>
                  </div>

                  <QueryState
                    isLoading={ordersQuery.isLoading}
                    isError={ordersQuery.isError}
                    error={ordersQuery.error}
                    onRetry={() => ordersQuery.refetch()}
                    isEmpty={usedPayments.length === 0}
                    emptyTitle="No payment recorded yet"
                    emptyMessage="A method appears here as soon as you place an order."
                    skeletonType="list"
                    skeletonCount={2}
                  >
                    <div className="space-y-3">
                      {usedPayments.map((payment) => (
                        <div
                          key={payment.key}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-800/40 p-4"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-700">
                              <CreditCard className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div>
                              <h4 className="font-outfit text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                {paymentLabel(payment)}
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {payment.status ? PAYMENT_STATUS_LABEL[payment.status] : 'No payment status recorded'} •{' '}
                                first booked {formatPlacedDate(payment.placedAt)} on order #{payment.orderGroupId}
                              </p>
                            </div>
                          </div>
                          <Link
                            to={`/orders/${payment.orderGroupId}`}
                            className="shrink-0 text-xs font-bold text-sun-orange hover:underline"
                          >
                            View that order
                          </Link>
                        </div>
                      ))}
                    </div>
                  </QueryState>

                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-4 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-sun-orange shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      Card bookings record only the brand and the last four digits, which is all this page can
                      show; the number itself never reaches the database. A cash-on-delivery order records no
                      card at all.
                    </span>
                  </div>

                  <Link
                    to="/cart"
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-sun-orange px-4 py-2 text-xs font-bold text-sun-orange hover:bg-orange-50/60 dark:hover:bg-orange-950/20"
                  >
                    <span>Choose how to pay at checkout</span>
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB: DISPUTE RESOLUTION                                                   */}
            {/* ========================================================================= */}
            {activeSection === 'disputes' && (
              <section
                role="tabpanel"
                id="section-panel-disputes"
                aria-labelledby="section-tab-disputes"
                tabIndex={0}
                className="space-y-6"
              >
                <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Customer Dispute Resolution Center
                      </h2>
                      <p className="text-xs text-slate-500">
                        This screen has no read of your dispute rows, so it lists none.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => setShowDisputeModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-sun-orange hover:bg-sun-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      <span>How disputes are opened</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-6 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      No dispute list is available to this page
                    </p>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Disputes are opened and frozen by the support desk from their console, and this build
                      exposes no customer-side read of them, so there is nothing to show or count here. The
                      support desk can raise a case for any package on your account.
                    </p>
                    <div className="pt-3 flex items-center justify-center gap-2">
                      <Link
                        to="/help"
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                      >
                        Help Centre
                      </Link>
                      <Link
                        to="/contact"
                        className="rounded-xl bg-sun-orange px-3.5 py-1.5 text-xs font-bold text-white hover:bg-sun-orange-600"
                      >
                        Contact Support
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB: SECURITY SETTINGS                                                    */}
            {/* ========================================================================= */}
            {activeSection === 'security' && (
              <section
                role="tabpanel"
                id="section-panel-security"
                aria-labelledby="section-tab-security"
                tabIndex={0}
                className="space-y-6"
              >
                <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h2 className="font-outfit text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Security
                    </h2>
                    <p className="text-xs text-slate-500">
                      Changing your passcode is the one account setting this build writes for you.
                    </p>
                  </div>

                  {/* Password change form — awaits the real Supabase auth update */}
                  <form
                    onSubmit={(event) => void submitPassword(event)}
                    className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-5 space-y-3"
                  >
                    <h3 className="font-outfit text-xs font-bold text-slate-600 dark:text-slate-300">
                      Update Account Password
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="new-password"
                          className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase"
                        >
                          New Password
                        </label>
                        <input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          autoComplete="new-password"
                          required
                          minLength={8}
                          placeholder="At least 8 characters"
                          className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-sun-orange"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="confirm-password"
                          className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase"
                        >
                          Confirm New Password
                        </label>
                        <input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          autoComplete="new-password"
                          required
                          minLength={8}
                          placeholder="Repeat it"
                          className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-sun-orange"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      {passwordMessage ? (
                        <p
                          role={passwordMessage.kind === 'ok' ? 'status' : 'alert'}
                          aria-live={passwordMessage.kind === 'ok' ? 'polite' : 'assertive'}
                          className={`text-xs font-bold ${
                            passwordMessage.kind === 'ok' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {passwordMessage.text}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Supabase verifies this request with your signed-in session, so there is no current
                          password field; it may ask you to sign in again first.
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={passwordBusy}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sun-orange hover:bg-sun-orange-600 px-4 py-2 text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500"
                      >
                        {passwordBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                        <span>{passwordBusy ? 'Saving…' : 'Update Password'}</span>
                      </button>
                    </div>
                  </form>

                  <p className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 text-xs text-slate-500 leading-relaxed">
                    Two-factor sign-in, biometric or passkey login and a device or session list are not
                    offered: this backend exposes no factor enrolment and no session-termination endpoint, so
                    a switch here would report a state it cannot change.
                  </p>
                  {/* Active sessions intentionally omitted: there is no session-termination
                      backend, so a list of devices or a "log out / revoke" action would lie. */}
                </div>
              </section>
            )}
          </div>
        </div>

      {/* Buyer Protection & Guarantees */}
      <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/70 dark:border-indigo-900/40 dark:bg-indigo-950/30 p-5 space-y-3">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <h4 className="font-outfit text-xs font-bold">Buyer Protection &amp; Guarantees</h4>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Every shipment is backed by Vendora Buyer Protection. Orders are securely tracked from vendor dispatch
          through final doorstep delivery, with full refund coverage on eligible returns.
        </p>
        <Link
          to="/terms"
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <span>Terms &amp; Refund Policies</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* DIALOG: HOW DISPUTES ARE OPENED (no customer-side filing service exists)  */}
      {/* ========================================================================= */}
      <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
        <DialogContent aria-labelledby="dispute-dialog-title" aria-describedby="dispute-dialog-description">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <DialogTitle id="dispute-dialog-title" className="font-outfit text-base font-bold text-slate-900 dark:text-white">
              Opening A Dispute
            </DialogTitle>
          </div>

          <DialogDescription id="dispute-dialog-description" className="text-xs text-slate-500 leading-relaxed">
            The packages on your account, and how a claim is actually raised.
          </DialogDescription>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                Packages on your account
              </span>
              {subOrders.length === 0 ? (
                <p className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-500">
                  You have no packages yet, so there is nothing to raise a claim against.
                </p>
              ) : (
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-600 dark:text-slate-300">
                  {subOrders.map((so) => (
                    <li key={so.id}>
                      Order #{so.orderGroupId} — {so.items[0]?.title || so.sellerName} (
                      {formatPrice(so.subtotal + so.shippingFee)})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/40 p-3 text-xs text-amber-800 dark:text-amber-300">
              Filing a dispute from here isn&apos;t available: the platform has no customer-side
              dispute-creation service, so submitting would not open a case or freeze any payout. Our support
              desk opens and freezes disputes from their console — please contact support to raise a claim.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Link
              to="/contact"
              className="rounded-xl bg-sun-orange hover:bg-sun-orange-600 px-5 py-2 text-xs font-bold text-white shadow-sm"
            >
              Contact Support
            </Link>
            <button
              type="button"
              onClick={() => setShowDisputeModal(false)}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersPage;
