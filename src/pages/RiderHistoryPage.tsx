import React, { useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, History, Inbox, Loader2, MapPin, RotateCcw, Store } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { RiderNav } from '../features/rider/components/RiderNav';
import { useRiderActions, useRiderHistory, useRiderLedger } from '../features/rider/hooks/useRider';
import type { RiderHistoryRow } from '../features/rider/api/history';
import { StatusBadge } from '../components/ui/status-badge';
import { useCurrency } from '../store/currency-store';

const shortId = (id: string): string => (id.length > 8 ? id.slice(0, 8) : id).toUpperCase();

const stamp = (iso: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * The rider's closed parcels: delivered handovers and reported failures, read from
 * their own `deliveries` rows. The board only carries open work, so a parcel appears
 * here the moment it leaves the board - and a parcel dispatch gave another rider
 * never appears at all.
 */
/**
 * The COD block on a closed parcel. The order's payment method
 * comes from the delivered ledger (orders holds it, and no rider policy opens
 * that table); the cash state comes from the delivery row's own stamps. The
 * amount offered is the parcel's booked gross - the order total the buyer was
 * charged - and the rider can correct it to what was actually handed over
 * before recording it. Once the desk confirms the handover, the row only
 * reports the figure; the RPC refuses further writes.
 */
const CodBlock: React.FC<{ row: RiderHistoryRow; isCod: boolean }> = ({ row, isCod }) => {
  const actions = useRiderActions();
  const { formatPrice } = useCurrency();
  const [amount, setAmount] = useState<string>(String(row.gross));
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isCod || row.status !== 'delivered') return null;

  if (row.codHandedOverAt) {
    return (
      <div
        data-testid="cod-handed-over"
        className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        <span>
          COD cash of {formatPrice(row.codCollectedAmount ?? 0)} handed over to the desk on{' '}
          {stamp(row.codHandedOverAt)}.
        </span>
      </div>
    );
  }

  if (row.codCollectedAt) {
    return (
      <div
        data-testid="cod-collected"
        className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900"
      >
        <Banknote className="h-3.5 w-3.5 text-amber-600" />
        <span>
          Cash collected: {formatPrice(row.codCollectedAmount ?? 0)} at {stamp(row.codCollectedAt)} -
          awaiting desk handover.
        </span>
      </div>
    );
  }

  const submit = () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setLocalError('Enter the amount of cash you actually collected.');
      return;
    }
    setLocalError(null);
    actions.cod.mutate({ deliveryId: row.id, amount: parsed });
  };

  const serverError =
    actions.cod.isError && actions.cod.error instanceof Error ? actions.cod.error.message : null;

  return (
    <div data-testid="cod-collect" className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
          <Banknote className="h-3.5 w-3.5 text-amber-600" />
          COD to collect: {formatPrice(row.gross)}
          <span className="font-medium text-amber-700">(order total)</span>
        </span>
        <span className="ml-auto flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Cash amount collected"
            data-testid="cod-amount-input"
            className="h-9 w-28 rounded-lg border border-amber-300 bg-white px-2 text-right font-mono text-xs font-bold text-slate-900 focus:border-sun-orange focus:outline-none"
          />
          <button
            type="button"
            data-testid="btn-mark-cod-collected"
            disabled={actions.cod.isPending}
            onClick={submit}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-all hover:bg-amber-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actions.cod.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            <span>Mark cash collected</span>
          </button>
        </span>
      </div>
      {(localError || serverError) && (
        <p role="alert" className="mt-1.5 text-[11px] font-medium text-rose-700">
          {localError ?? serverError}
        </p>
      )}
    </div>
  );
};

export const RiderHistoryPage: React.FC = () => {
  const history = useRiderHistory();
  const ledger = useRiderLedger();
  const { formatPrice } = useCurrency();
  const rows = history.data ?? [];
  /** Payment method per delivered parcel, from the ledger read (see CodBlock). */
  const paymentMethodByDelivery = new Map(
    (ledger.data ?? []).map((row) => [row.deliveryId, row.paymentMethod] as const),
  );

  const readError =
    history.isError && history.error instanceof Error
      ? history.error.message
      : 'Your delivery history could not be read.';

  return (
    <WorkspaceLayout
      role="rider"
      roleBadgeText="DELIVERY RIDER"
      title="Delivery History"
      subtitle="Every parcel you have closed - delivered handovers and reported failures"
      sidebar={<RiderNav />}
    >
      <div className="w-full space-y-4 pb-10 sm:space-y-6">
        {history.isError ? (
          <section
            role="alert"
            data-testid="history-error"
            className="space-y-4 rounded-3xl border-2 border-rose-300 bg-rose-50 p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-rose-950">Your history could not be read</p>
                <p className="mt-1 text-xs font-medium text-rose-900">{readError}</p>
              </div>
            </div>
            <button
              type="button"
              data-testid="btn-retry-history"
              disabled={history.isFetching}
              onClick={() => void history.refetch()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {history.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              <span>Retry</span>
            </button>
          </section>
        ) : history.isPending ? (
          <div data-testid="history-loading" className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-sun-orange" />
              Reading your closed parcels…
            </div>
            {[0, 1, 2].map((slot) => (
              <div key={slot} className="h-20 animate-pulse rounded-2xl border border-slate-200/80 bg-white/70" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div
            data-testid="history-empty"
            className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-xs"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <Inbox className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No closed parcels yet</h3>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              Parcels you deliver or report appear here once they leave your board. Nothing is
              listed, because dispatch has not closed a parcel with you yet.
            </p>
          </div>
        ) : (
          <section aria-label="Your closed deliveries" className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-400">
              <History className="h-3.5 w-3.5" />
              <span>{rows.length} closed parcels</span>
            </div>
            <div className="space-y-3">
              {rows.map((row) => (
                <article
                  key={row.id}
                  data-testid="history-row"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <Store className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {row.storeName || 'Store'}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] font-semibold text-slate-500">
                        <span>Parcel {shortId(row.subOrderId)}</span>
                        {row.city && (
                          <span className="inline-flex items-center gap-1 font-sans font-medium normal-case">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {row.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-sm font-black text-slate-900">{formatPrice(row.gross)}</div>
                      <div className="text-[11px] font-medium text-slate-500">
                        {stamp(row.deliveredAt ?? row.createdAt)}
                      </div>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  {paymentMethodByDelivery.get(row.id) === 'cod' && row.status === 'delivered' && (
                    <div className="basis-full">
                      <CodBlock row={row} isCod />
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </WorkspaceLayout>
  );
};
