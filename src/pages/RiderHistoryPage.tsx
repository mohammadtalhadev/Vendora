import React from 'react';
import { AlertTriangle, History, Inbox, Loader2, MapPin, RotateCcw, Store } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { RiderNav } from '../features/rider/components/RiderNav';
import { useRiderHistory } from '../features/rider/hooks/useRider';
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
export const RiderHistoryPage: React.FC = () => {
  const history = useRiderHistory();
  const { formatPrice } = useCurrency();
  const rows = history.data ?? [];

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
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
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
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </WorkspaceLayout>
  );
};
