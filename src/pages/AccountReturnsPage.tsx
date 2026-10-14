import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useOrders } from '../features/orders/hooks/useOrders';
import { StatusBadge } from '../components/ui/status-badge';
import { useCurrency } from '../store/currency-store';
import type { SubOrder } from '../types/domain';

/**
 * My Returns (/account/returns) — the customer's return cases in one place.
 * A return is a package (sub-order) in a return state, so this page filters
 * the customer's own orders to those packages and shows what the seller's
 * decision recorded: status, RMA code, refund amount, rejection reason.
 * Starting a return still happens from the order / Returns page, as before.
 */
const RETURN_STATUSES: ReadonlySet<string> = new Set([
  'return_requested',
  'return_approved',
  'return_rejected',
  'returned',
  'refunded',
]);

interface ReturnCase {
  subOrder: SubOrder;
  orderId: string;
}

export const AccountReturnsPage: React.FC = () => {
  const { data, isLoading, isError } = useOrders();
  const { formatPrice } = useCurrency();

  const cases: ReturnCase[] = useMemo(() => {
    if (!data) return [];
    const orderBySubOrder = new Map<string, string>();
    for (const group of data.orderGroups) {
      for (const subOrderId of group.subOrderIds) orderBySubOrder.set(subOrderId, group.id);
    }
    return data.subOrders
      .filter((so) => RETURN_STATUSES.has(so.status))
      .map((so) => ({ subOrder: so, orderId: orderBySubOrder.get(so.id) ?? so.orderGroupId }))
      .sort((a, b) => b.subOrder.createdAt.localeCompare(a.subOrder.createdAt));
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-outfit text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
          My Returns
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Every return you have requested, with its current status.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4" aria-label="Loading your returns">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-white/80 bg-white/80 p-8 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
          <h2 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
            Your returns could not be loaded
          </h2>
          <p className="mt-1 text-xs text-slate-500">Please refresh the page in a moment.</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-3xl border border-white/80 bg-white/80 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
          <RotateCcw className="mx-auto mb-2 h-10 w-10 text-slate-400" aria-hidden="true" />
          <h2 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
            No returns yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            Most items can be returned within 30 days of delivery. When you start a return
            from an order, it will appear here with live status.
          </p>
          <Link
            to="/returns"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-sun-orange-600"
          >
            Start a return
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map(({ subOrder, orderId }) => (
            <article
              key={subOrder.id}
              className="rounded-3xl border border-white/80 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Sold by{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {subOrder.sellerName}
                  </span>{' '}
                  ·{' '}
                  {new Date(subOrder.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <StatusBadge status={subOrder.status} />
              </div>

              <ul className="mt-3 space-y-2">
                {subOrder.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-11 w-11 shrink-0 rounded-xl bg-slate-100 object-cover dark:bg-slate-800"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </span>
                    <span className="text-xs text-slate-500">Qty {item.quantity}</span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs dark:border-white/5">
                {subOrder.returnReason && (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 font-bold text-slate-400">Reason</dt>
                    <dd className="text-slate-600 dark:text-slate-300">
                      {subOrder.returnReason}
                    </dd>
                  </div>
                )}
                {subOrder.rmaCode && (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 font-bold text-slate-400">RMA code</dt>
                    <dd className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {subOrder.rmaCode}
                    </dd>
                  </div>
                )}
                {subOrder.refundAmount !== undefined && (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 font-bold text-slate-400">Refund</dt>
                    <dd className="font-semibold text-slate-700 dark:text-slate-200">
                      {formatPrice(subOrder.refundAmount)}
                    </dd>
                  </div>
                )}
                {subOrder.status === 'return_rejected' && subOrder.returnRejectReason && (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 font-bold text-slate-400">
                      Seller&apos;s note
                    </dt>
                    <dd className="text-slate-600 dark:text-slate-300">
                      {subOrder.returnRejectReason}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex justify-end">
                <Link
                  to={`/orders/${orderId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-sun-orange hover:underline"
                >
                  View the order
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AccountReturnsPage;
