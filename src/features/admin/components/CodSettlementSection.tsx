import React from 'react';
import { Banknote, CheckCircle2, Loader2 } from 'lucide-react';
import { formatPrice } from '../../../store/currency-store';
import { useCodSettlements } from '../hooks/useAdminQueries';
import { useAdminActions } from '../hooks/useAdminActions';
import type { CodSettlementRow } from '../api/logistics';

const shortId = (id: string): string => (id.length > 8 ? id.slice(0, 8) : id).toUpperCase();

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const SettlementRow: React.FC<{
  row: CodSettlementRow;
  confirming: boolean;
  onConfirm?: (deliveryId: string) => void;
}> = ({ row, confirming, onConfirm }) => (
  <div
    data-testid="cod-settlement-row"
    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5"
  >
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 text-xs">
        <span className="font-bold text-slate-900">{row.storeName || 'Store'}</span>
        <span className="font-mono text-[11px] font-semibold text-slate-500">
          order {row.orderId ? shortId(row.orderId) : '—'}
        </span>
      </div>
      <div className="mt-0.5 text-[11px] text-slate-500">
        Rider {row.riderName || 'unknown'} · collected {formatDate(row.collectedAt)}
        {row.handedOverAt ? ` · handed over ${formatDate(row.handedOverAt)}` : ''}
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="font-mono text-sm font-black text-slate-900">{formatPrice(row.amount)}</span>
      {onConfirm && (
        <button
          type="button"
          data-testid="btn-confirm-cod-handover"
          disabled={confirming}
          onClick={() => onConfirm(row.deliveryId)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-all hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirming ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          <span>Confirm handover</span>
        </button>
      )}
    </div>
  </div>
);

/**
 * COD cash settlements (Batch 42): the desk's half of the cash trail. A row
 * sits in "awaiting handover" from the moment the rider stamps the cash they
 * collected until an admin confirms here that the desk physically received
 * it - `confirm_cod_handover` writes that stamp (and refuses a second one).
 * The section reads its own query, so it renders inside the logistics page
 * without disturbing the dispatch board above it.
 */
export const CodSettlementSection: React.FC = () => {
  const settlements = useCodSettlements();
  const actions = useAdminActions();
  const data = settlements.data;

  const actionError =
    actions.confirmCodHandover.isError && actions.confirmCodHandover.error instanceof Error
      ? actions.confirmCodHandover.error.message
      : null;

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 text-xs"
      data-testid="cod-settlements"
    >
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <Banknote className="h-4 w-4 text-sun-orange" />
        COD Cash Settlements
      </h3>

      {settlements.isPending ? (
        <p className="flex items-center gap-2 py-4 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-sun-orange" />
          Reading the cash trail…
        </p>
      ) : settlements.isError || !data ? (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
          <span className="font-semibold">The COD settlements could not be read. </span>
          <button
            type="button"
            onClick={() => void settlements.refetch()}
            className="font-bold underline hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {actionError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 font-medium text-rose-800">
              {actionError}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-400">
              Awaiting handover ({data.pending.length})
            </h4>
            {data.pending.length === 0 ? (
              <p className="py-3 text-center text-slate-400">
                No rider is holding collected cash right now.
              </p>
            ) : (
              data.pending.map((row) => (
                <SettlementRow
                  key={row.deliveryId}
                  row={row}
                  confirming={
                    actions.confirmCodHandover.isPending &&
                    actions.confirmCodHandover.variables === row.deliveryId
                  }
                  onConfirm={(deliveryId) => actions.confirmCodHandover.mutate(deliveryId)}
                />
              ))
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-400">
              Handed over ({data.handedOver.length})
            </h4>
            {data.handedOver.length === 0 ? (
              <p className="py-3 text-center text-slate-400">No handovers have been confirmed yet.</p>
            ) : (
              data.handedOver.map((row) => (
                <SettlementRow key={row.deliveryId} row={row} confirming={false} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
