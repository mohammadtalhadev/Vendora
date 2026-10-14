import React, { useMemo } from 'react';
import { AlertTriangle, Banknote, CalendarDays, CheckCircle2, Loader2, RotateCcw, Truck } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { RiderNav } from '../features/rider/components/RiderNav';
import { useRiderLedger } from '../features/rider/hooks/useRider';
import { summariseLedger } from '../features/rider/api/history';
import { useCurrency } from '../store/currency-store';
import { cn } from '../lib/utils';

const Tile: React.FC<{
  testId: string;
  label: string;
  count: number;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: string;
}> = ({ testId, label, count, value, hint, icon, tone }) => (
  <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs sm:p-5">
    <div className="flex items-center justify-between text-slate-500">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={cn('flex h-7 w-7 items-center justify-center rounded-xl', tone)}>{icon}</span>
    </div>
    <div className="mt-2 flex items-baseline gap-1.5">
      <span data-testid={testId} className="font-mono text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
        {value}
      </span>
    </div>
    <div className="mt-1 text-[11px] font-medium text-slate-500">
      {count} {count === 1 ? 'delivery' : 'deliveries'} · {hint}
    </div>
  </div>
);

/**
 * What the parcels this rider delivered were worth, and how much of it was cash.
 *
 * Every figure is a sum over the rider's own delivered deliveries (the
 * `rider_delivery_ledger` read). Vendora records no per-delivery rider fee or pay
 * rate anywhere in the schema, so this screen reports delivery totals only and
 * never presents them as pay.
 */
export const RiderEarningsPage: React.FC = () => {
  const ledger = useRiderLedger();
  const { formatPrice } = useCurrency();
  const summary = useMemo(() => summariseLedger(ledger.data ?? []), [ledger.data]);

  const readError =
    ledger.isError && ledger.error instanceof Error
      ? ledger.error.message
      : 'Your delivery totals could not be read.';

  return (
    <WorkspaceLayout
      role="rider"
      roleBadgeText="DELIVERY RIDER"
      title="Earnings"
      subtitle="The value of the parcels you have delivered, and the cash you have handled"
      sidebar={<RiderNav />}
    >
      <div className="w-full space-y-4 pb-10 sm:space-y-6">
        {ledger.isError ? (
          <section
            role="alert"
            data-testid="earnings-error"
            className="space-y-4 rounded-3xl border-2 border-rose-300 bg-rose-50 p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-rose-950">Your delivery totals could not be read</p>
                <p className="mt-1 text-xs font-medium text-rose-900">{readError}</p>
              </div>
            </div>
            <button
              type="button"
              data-testid="btn-retry-earnings"
              disabled={ledger.isFetching}
              onClick={() => void ledger.refetch()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ledger.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              <span>Retry</span>
            </button>
          </section>
        ) : ledger.isPending ? (
          <div data-testid="earnings-loading" className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-sun-orange" />
              Totalling your delivered parcels…
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((slot) => (
                <div key={slot} className="h-28 animate-pulse rounded-3xl border border-slate-200/80 bg-white/70" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              <Tile
                testId="earnings-today"
                label="Delivered today"
                count={summary.today.count}
                value={formatPrice(summary.today.value)}
                hint="Parcel value closed today"
                tone="bg-emerald-50 text-emerald-600"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <Tile
                testId="earnings-week"
                label="This week"
                count={summary.week.count}
                value={formatPrice(summary.week.value)}
                hint="Parcel value since Monday"
                tone="bg-sky-50 text-sky-600"
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <Tile
                testId="earnings-all-time"
                label="All time"
                count={summary.allTime.count}
                value={formatPrice(summary.allTime.value)}
                hint="Every parcel you have delivered"
                tone="bg-orange-50 text-sun-orange-600"
                icon={<Truck className="h-4 w-4" />}
              />
              <Tile
                testId="earnings-cod"
                label="COD cash handled"
                count={summary.cod.count}
                value={formatPrice(summary.cod.value)}
                hint="Cash collected on cash-on-delivery parcels"
                tone="bg-amber-50 text-amber-600"
                icon={<Banknote className="h-4 w-4" />}
              />
            </div>

            {summary.allTime.count === 0 ? (
              <div
                data-testid="earnings-empty"
                className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-xs"
              >
                <h3 className="text-sm font-bold text-slate-900">No delivered parcels yet</h3>
                <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                  Totals appear here after your first handover is closed with a buyer code.
                </p>
              </div>
            ) : null}

            <p className="max-w-2xl text-[11px] leading-relaxed text-slate-500">
              These are delivery totals - the booked value of the parcels you delivered - not a
              pay statement. Vendora does not record a per-delivery rider fee, so no earnings or
              pay figure is calculated here; COD cash handled is the cash buyers paid you at the
              door on cash-on-delivery orders.
            </p>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
};
