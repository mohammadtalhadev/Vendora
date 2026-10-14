import React from 'react';
import { AlertTriangle, MapPin, Navigation } from 'lucide-react';
import { useRiderLocationSharing } from '../hooks/useLocationSharing';
import { freshnessLabel } from '../api/location';

const SHARABLE_STATUSES = ['picked_up', 'in_transit', 'out_for_delivery'];

/**
 * The rider's live-location toggle for one parcel (Batch 42). Rendered only
 * while the parcel is on the road; sharing is always the rider's tap, never
 * automatic, and the line under the button says what last reached Postgres -
 * a share that is sending nothing shows its error instead of a green dot.
 */
export const LocationShareControl: React.FC<{ deliveryId: string; status: string }> = ({
  deliveryId,
  status,
}) => {
  const active = SHARABLE_STATUSES.includes(status);
  const { sharing, lastSentAt, error, start, stop } = useRiderLocationSharing(deliveryId, active);

  if (!active) return null;

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3" data-testid="location-share">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <MapPin className="h-3.5 w-3.5 text-sky-600" />
          Live location for this delivery
        </span>
        {sharing ? (
          <button
            type="button"
            data-testid="btn-stop-location-share"
            onClick={stop}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-all hover:bg-sky-700 active:scale-95"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span>Sharing - tap to stop</span>
          </button>
        ) : (
          <button
            type="button"
            data-testid="btn-share-location"
            onClick={start}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-bold text-sky-700 shadow-2xs transition-all hover:bg-sky-50 active:scale-95"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Share live location</span>
          </button>
        )}
      </div>
      {sharing && (
        <p className="mt-1.5 text-[11px] font-medium text-slate-500" data-testid="location-share-state">
          Sharing live location
          {lastSentAt
            ? ` • last sent ${freshnessLabel(lastSentAt.toISOString())}`
            : ' • waiting for the first fix…'}
        </p>
      )}
      {error && (
        <p
          role="alert"
          data-testid="location-share-error"
          className="mt-1.5 flex items-start gap-1.5 text-[11px] font-medium text-rose-700"
        >
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
