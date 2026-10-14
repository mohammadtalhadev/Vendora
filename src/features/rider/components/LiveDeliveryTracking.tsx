import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { useOrderDeliveryLive } from '../hooks/useDeliveryLive';
import {
  fetchProofPhotoSignedUrl,
  freshnessLabel,
  mapsUrl,
  osmEmbedUrl,
  type OrderDeliveryLive,
} from '../api/location';

/**
 * Customer-side live tracking + photo proof for one order (Batch 42).
 *
 * Everything here comes from `get_order_delivery_live`: the order's own
 * deliveries, the rider's shared position while a parcel is on the road, and
 * the proof photo's storage path once the drop is closed. When the RPC
 * returns no position and no photo - the rider never shared, or the order is
 * not the caller's - this renders nothing at all rather than a decorative
 * map, and the ordinary status timeline remains the tracking story.
 */

const MOVING_STATUSES = ['picked_up', 'in_transit', 'out_for_delivery'];

const ProofPhoto: React.FC<{ path: string }> = ({ path }) => {
  const signed = useQuery({
    queryKey: ['rider', 'proof-photo', path] as const,
    queryFn: () => fetchProofPhotoSignedUrl(path),
    staleTime: 50 * 60_000,
  });

  if (signed.isPending) {
    return <p className="text-[11px] font-medium text-slate-500">Loading the delivery photo…</p>;
  }
  if (!signed.data) {
    return (
      <p className="text-[11px] font-medium text-slate-500">
        A photo proof was recorded for this delivery, but it cannot be displayed right now.
      </p>
    );
  }
  return (
    <img
      src={signed.data}
      alt="Photo proof of this delivery, taken by the rider at the door"
      className="max-h-64 w-full rounded-xl border border-slate-200 object-cover"
      data-testid="proof-photo"
    />
  );
};

const LiveRow: React.FC<{ row: OrderDeliveryLive }> = ({ row }) => {
  const riderName = row.riderFirstName ?? 'Your rider';
  return (
    <div className="space-y-3" data-testid="live-tracking-row">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Navigation className="h-3.5 w-3.5 text-sun-orange" />
          {riderName} is on the way
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Updated {freshnessLabel(row.locationUpdatedAt)}
        </span>
      </div>
      {row.lat !== null && row.lng !== null && (
        <>
          <iframe
            title={`Live map of ${riderName}'s position`}
            src={osmEmbedUrl(row.lat, row.lng)}
            className="h-56 w-full rounded-xl border border-slate-200"
            loading="lazy"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400" />
              {row.lat.toFixed(5)}, {row.lng.toFixed(5)}
              {row.accuracyM !== null ? ` • accurate to about ${Math.round(row.accuracyM)} m` : ''}
            </span>
            <a
              href={mapsUrl(row.lat, row.lng)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-sun-orange-600 hover:underline"
            >
              Open in maps
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </>
      )}
    </div>
  );
};

export const LiveDeliveryTrackingCard: React.FC<{ orderId: string }> = ({ orderId }) => {
  const live = useOrderDeliveryLive(orderId);
  const rows = live.data ?? [];

  const moving = rows.filter(
    (row) => MOVING_STATUSES.includes(row.status) && row.lat !== null && row.lng !== null,
  );
  const proofs = rows.filter((row) => row.status === 'delivered' && row.proofPhotoUrl);

  if (moving.length === 0 && proofs.length === 0) return null;

  return (
    <section
      aria-label="Live delivery tracking"
      data-testid="live-tracking-card"
      className="space-y-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-sun-orange">
          <MapPin className="h-4 w-4" />
        </div>
        <h3 className="text-xs font-bold text-slate-800">
          Live delivery tracking
        </h3>
      </div>

      {moving.map((row) => (
        <LiveRow key={row.deliveryId} row={row} />
      ))}

      {proofs.map((row) => (
        <div key={row.deliveryId} className="space-y-2" data-testid="proof-photo-block">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Camera className="h-3.5 w-3.5 text-emerald-600" />
            Photo proof of delivery
          </span>
          <ProofPhoto path={row.proofPhotoUrl ?? ''} />
        </div>
      ))}
    </section>
  );
};
