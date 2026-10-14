import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  PackageSearch,
  PackageCheck,
  Search,
  LogIn,
  CircleAlert,
  FileText,
  Truck,
  KeyRound,
  Bike,
  HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useCurrency } from '../store/currency-store';
import { useOrders } from '../features/orders/hooks/useOrders';
import { PHYSICAL_STAGES } from '../features/orders/components/TrackingTimeline';
import { StatusBadge } from '../components/ui/status-badge';
import type { OrderGroup, SubOrder } from '../types/domain';

/**
 * Track Your Order (/track-order, /track, /order-tracking).
 *
 * Batch 45 rebuilt this page honestly: the previous version rendered
 * hard-coded orders with an invented rider, OTP and a live-telemetry timer,
 * and synthesised a parcel for ANY number typed into the box. This version
 * reads only the signed-in customer's own orders (the same fetchOrders the
 * Orders page uses, owner-scoped by RLS) and renders what is actually on
 * those rows: package status on the shared 7-stage stepper, the recorded
 * history events, the carrier/tracking number when the seller recorded
 * one, and a courier note only when a rider is really assigned.
 *
 * A delivery code is never shown here: codes are stored hashed, so there
 * is nothing truthful to display — the page says so and points at the
 * order, where a fresh code can be issued.
 */

const CARD =
  'relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-[0_15px_35px_rgba(15,23,42,0.05)]';

function normalise(value: string): string {
  return value.trim().replace(/^#/, '').toLowerCase();
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** The highest physical stage a package has reached, history included. */
function resolvedStageIndex(subOrder: SubOrder): number {
  if (subOrder.status === 'delivered') return PHYSICAL_STAGES.length - 1;
  const direct = PHYSICAL_STAGES.findIndex((s) => s.key === subOrder.status);
  if (direct >= 0) return direct;
  for (let i = subOrder.history.length - 1; i >= 0; i--) {
    const idx = PHYSICAL_STAGES.findIndex((s) => s.key === subOrder.history[i].status);
    if (idx >= 0) return idx;
  }
  return 0;
}

const PackageStepper: React.FC<{ subOrder: SubOrder }> = ({ subOrder }) => {
  const active = resolvedStageIndex(subOrder);
  const delivered = subOrder.status === 'delivered';
  return (
    <ol className="grid grid-cols-1 gap-4 md:grid-cols-7 md:gap-2" aria-label="Delivery progress">
      {PHYSICAL_STAGES.map((stage, idx) => {
        const done = delivered || idx < active;
        const current = !delivered && idx === active;
        const Icon = stage.icon;
        return (
          <li key={stage.key} className="flex items-start gap-3 md:flex-col md:items-center md:text-center">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                done
                  ? 'bg-emerald-500 text-white'
                  : current
                    ? 'bg-sun-orange text-white ring-4 ring-orange-100 dark:ring-orange-950/40'
                    : 'border-2 border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span
                className={`block text-xs font-extrabold ${
                  current ? 'text-sun-orange' : done ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                }`}
              >
                {stage.shortLabel}
              </span>
              <span className="block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {done ? 'Done' : current ? 'In progress' : 'Upcoming'}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const PackageCard: React.FC<{ subOrder: SubOrder; group: OrderGroup }> = ({ subOrder, group }) => {
  const { formatPrice } = useCurrency();
  const inTransit =
    subOrder.status === 'shipped' || subOrder.status === 'out_for_delivery';
  return (
    <div className={`${CARD} p-5 sm:p-7`} data-testid="tracked-package">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-white/10">
        <div>
          <h3 className="font-outfit text-base font-extrabold text-slate-900 dark:text-white">
            Package from {subOrder.sellerName || 'your seller'}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Ordered {formatDateTime(group.createdAt)}
            {group.shippingAddress?.city ? ` · Delivering to ${group.shippingAddress.city}` : ''}
          </p>
        </div>
        <StatusBadge status={subOrder.status} />
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-white/5">
        {subOrder.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3.5 py-3">
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-white/10"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Qty {item.quantity}</p>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatPrice(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {subOrder.type === 'physical' ? (
        <div className="pt-2">
          <PackageStepper subOrder={subOrder} />
        </div>
      ) : (
        <p className="pt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          This is a digital package — its licence and download live under{' '}
          <Link to="/downloads" className="font-bold text-sun-orange hover:underline">
            Your Downloads
          </Link>
          .
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {subOrder.carrierName || subOrder.trackingNumber ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-white/10 dark:bg-slate-800/40">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-sun-orange" aria-hidden="true" />
            <div className="text-xs">
              <p className="font-bold text-slate-900 dark:text-white">{subOrder.carrierName ?? 'Courier'}</p>
              {subOrder.trackingNumber ? (
                <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                  Tracking number: <span className="font-mono font-semibold">{subOrder.trackingNumber}</span>
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {subOrder.riderId && subOrder.type === 'physical' && subOrder.status !== 'delivered' ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-white/10 dark:bg-slate-800/40">
            <Bike className="mt-0.5 h-4 w-4 shrink-0 text-sun-orange" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              A courier has been assigned to this package.
              {inTransit ? ' It is on its way to you.' : ' They will collect it when it is ready.'}
            </p>
          </div>
        ) : null}

        {inTransit ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-orange-200/80 bg-orange-50/60 p-3.5 dark:border-orange-900/30 dark:bg-orange-950/20">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-sun-orange" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              The rider will ask for your delivery code at the door. Codes are stored hashed, so this page
              cannot show yours — if you no longer have it, open the{' '}
              <Link to={`/orders/${group.id}`} className="font-bold text-sun-orange hover:underline">
                order details
              </Link>{' '}
              to issue a new one.
            </p>
          </div>
        ) : null}
      </div>

      {subOrder.history.length > 0 ? (
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/10">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            What has happened so far
          </h4>
          <ul className="mt-2.5 space-y-2">
            {[...subOrder.history].reverse().map((event, i) => (
              <li key={`${event.status}-${i}`} className="flex items-start justify-between gap-3 text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  <span className="font-bold capitalize text-slate-900 dark:text-white">
                    {event.status.replace(/_/g, ' ')}
                  </span>
                  {event.note ? <span> — {event.note}</span> : null}
                </span>
                <time className="shrink-0 font-mono text-[11px] text-slate-400">
                  {formatDateTime(event.timestamp)}
                </time>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export const TrackOrderPage: React.FC = () => {
  const { trackingNumber: paramTracking } = useParams();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const initialQuery = paramTracking || searchParams.get('trk') || '';
  const [input, setInput] = useState(initialQuery);
  const [submitted, setSubmitted] = useState<string | null>(
    initialQuery ? normalise(initialQuery) : null,
  );

  const ordersQuery = useOrders();
  const orderGroups = useMemo(() => ordersQuery.data?.orderGroups ?? [], [ordersQuery.data]);
  const subOrders = useMemo(() => ordersQuery.data?.subOrders ?? [], [ordersQuery.data]);

  useEffect(() => {
    if (paramTracking) {
      setInput(paramTracking);
      setSubmitted(normalise(paramTracking));
    }
  }, [paramTracking]);

  const match = useMemo(() => {
    if (!submitted) return null;
    const group = orderGroups.find((g) => normalise(g.id) === submitted);
    if (group) {
      return { group, packages: subOrders.filter((so) => so.orderGroupId === group.id) };
    }
    const sub = subOrders.find(
      (so) =>
        normalise(so.id) === submitted ||
        (so.trackingNumber ? normalise(so.trackingNumber) === submitted : false),
    );
    if (sub) {
      const owner = orderGroups.find((g) => g.id === sub.orderGroupId);
      if (owner) return { group: owner, packages: [sub] };
    }
    return null;
  }, [submitted, orderGroups, subOrders]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = normalise(input);
    if (!q) return;
    setSubmitted(q);
  };

  const recentOrders = orderGroups.slice(0, 3);

  return (
    <div className="pb-12">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
        >
          <Link to="/" className="transition-colors hover:text-sun-orange">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
          <Link to="/help" className="transition-colors hover:text-sun-orange">
            Care &amp; Support
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">Track Your Order</span>
        </nav>

        <div className={`${CARD} p-6 sm:p-8`}>
          <div className="relative z-10 max-w-3xl space-y-2.5">
            <h1 className="font-outfit text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl md:text-4xl">
              Track Your Order
            </h1>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
              Enter the order ID from your confirmation — or a package tracking number a seller gave you —
              and we will show the real status recorded on your order.
            </p>
          </div>
        </div>

        {!user ? (
          <div className={`${CARD} p-6 text-center sm:p-10`} data-testid="track-guest">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-sun-orange dark:bg-orange-950/40">
              <LogIn className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-outfit text-lg font-extrabold text-slate-900 dark:text-white">
              Sign in to track your order
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
              Tracking reads the orders on your account, so it only works signed in — and only for orders
              placed with this account. If you checked out with a different email, sign in with that one.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-sun-orange px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-sun-orange-600"
            >
              <span>Sign in</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <div className={`${CARD} p-5 sm:p-7`}>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <label
                    htmlFor="track-query"
                    className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Order ID or tracking number
                  </label>
                  <input
                    id="track-query"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Paste the order ID from your confirmation"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-bold text-slate-900 shadow-inner transition-all placeholder:text-slate-400 focus:border-sun-orange focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-800/70 dark:text-white dark:focus:bg-slate-900 sm:text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sun-orange to-[#EA580C] px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/35 active:scale-[0.98] sm:text-sm"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <span>Track package</span>
                </button>
              </form>

              {recentOrders.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Your recent orders:</span>
                  {recentOrders.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setInput(g.id);
                        setSubmitted(normalise(g.id));
                      }}
                      className={`rounded-full border px-3 py-1 font-mono text-[11px] font-bold transition-all ${
                        submitted === normalise(g.id)
                          ? 'border-orange-300 bg-orange-100 text-sun-orange dark:border-orange-700 dark:bg-orange-950/60'
                          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-sun-orange dark:border-white/10 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      #{g.id.slice(0, 8)}… · {formatDateTime(g.createdAt)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {ordersQuery.isLoading ? (
              <div className={`${CARD} p-10 text-center`} role="status">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Loading your orders…</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tracking reads your real order records.
                </p>
              </div>
            ) : ordersQuery.isError ? (
              <div className={`${CARD} p-10 text-center`}>
                <CircleAlert className="mx-auto h-8 w-8 text-rose-500" aria-hidden="true" />
                <h2 className="mt-3 font-outfit text-lg font-extrabold text-slate-900 dark:text-white">
                  Your orders could not be loaded
                </h2>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {ordersQuery.error instanceof Error
                    ? ordersQuery.error.message
                    : 'Something went wrong while reading your orders.'}
                </p>
                <button
                  type="button"
                  onClick={() => void ordersQuery.refetch()}
                  className="mt-4 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  Try again
                </button>
              </div>
            ) : submitted && !match ? (
              <div className={`${CARD} p-10 text-center`} data-testid="track-not-found">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800">
                  <PackageSearch className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-outfit text-lg font-extrabold text-slate-900 dark:text-white">
                  No order in your account matches that
                </h2>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
                  We checked your orders for “{input.trim()}” and found nothing. Check the ID on your order
                  confirmation, and make sure you are signed in with the account that placed the order —
                  tracking cannot show another account&apos;s orders.
                </p>
                <Link
                  to="/orders"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-sun-orange px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-sun-orange-600"
                >
                  <span>See all your orders</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : match ? (
              <div className="space-y-5">
                <div className={`${CARD} flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center sm:p-6`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-orange text-white">
                      <PackageCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="font-outfit text-base font-extrabold text-slate-900 dark:text-white">
                        Order #{match.group.id}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Placed {formatDateTime(match.group.createdAt)} ·{' '}
                        {match.packages.length === 1
                          ? '1 package'
                          : `${match.packages.length} packages`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/orders/${match.group.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-all hover:border-orange-400 hover:text-sun-orange dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Order details
                    </Link>
                    <Link
                      to={`/orders/${match.group.id}/invoice`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-all hover:border-orange-400 hover:text-sun-orange dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Invoice</span>
                    </Link>
                  </div>
                </div>
                {match.packages.map((subOrder) => (
                  <PackageCard key={subOrder.id} subOrder={subOrder} group={match.group} />
                ))}
              </div>
            ) : (
              <div className={`${CARD} p-10 text-center`}>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-sun-orange dark:bg-orange-950/40">
                  <PackageSearch className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-outfit text-lg font-extrabold text-slate-900 dark:text-white">
                  {orderGroups.length > 0 ? 'Pick an order above, or search by ID' : 'You have no orders yet'}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
                  {orderGroups.length > 0
                    ? 'Your recent orders are listed above the search — tap one to see its live status, or paste any order ID or package tracking number.'
                    : 'When you place an order it will appear here with its real delivery status.'}
                </p>
              </div>
            )}
          </>
        )}

        <div className={`${CARD} flex flex-col items-start justify-between gap-4 p-6 sm:p-8 lg:flex-row lg:items-center`}>
          <div className="max-w-xl space-y-1.5">
            <h2 className="font-outfit text-xl font-black text-slate-900 dark:text-white">
              Need help with a delivery?
            </h2>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">
              If a package is late, damaged, or the status looks wrong, the fastest routes are your order
              details — where returns and disputes start — and the help centre.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 rounded-full bg-sun-orange px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-sun-orange-600"
            >
              <span>Your orders</span>
            </Link>
            <Link
              to="/faq"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-extrabold text-slate-700 transition-all hover:border-orange-400 hover:text-sun-orange dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
              <span>Help centre</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrderPage;
