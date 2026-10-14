import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Package,
  PackageSearch,
  Phone,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { RiderHeader } from '../features/rider/components/RiderHeader';
import { RiderNav } from '../features/rider/components/RiderNav';
import { HandoverVerificationModal } from '../features/rider/components/HandoverVerificationModal';
import { LocationShareControl } from '../features/rider/components/LocationShareControl';
import {
  ReportIssueModal,
  type DeliveryIssueReason,
} from '../features/rider/components/ReportIssueModal';
import { useRiderActions, useRiderBoard } from '../features/rider/hooks/useRider';
import { useRiderLive } from '../features/rider/hooks/useLive';
import type { RiderAvailability, RiderDrop } from '../features/rider/api/board';
import { useCurrency } from '../store/currency-store';
import { cn } from '../lib/utils';

/** `rider_availability` in Postgres; anything else the row holds is shown as offline. */
const AVAILABILITY: RiderAvailability[] = ['available', 'busy', 'offline'];
const availabilityOf = (status: string | undefined): RiderAvailability =>
  AVAILABILITY.find((option) => option === status) ?? 'offline';

const stamp = (iso: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const shortId = (id: string): string => (id.length > 8 ? id.slice(0, 8) : id).toUpperCase();

const STATUS_META: Record<string, { label: string; tone: string }> = {
  assigned: { label: 'Assigned', tone: 'border-amber-300 bg-amber-50 text-amber-800' },
  picked_up: { label: 'Picked up', tone: 'border-sky-300 bg-sky-50 text-sky-800' },
  in_transit: { label: 'In transit', tone: 'border-sky-300 bg-sky-50 text-sky-800' },
  out_for_delivery: {
    label: 'Out for delivery',
    tone: 'border-orange-300 bg-orange-50 text-sun-orange-600 animate-pulse',
  },
  failed: { label: 'Reported', tone: 'border-rose-300 bg-rose-50 text-rose-800' },
};
const statusMeta = (status: string) =>
  STATUS_META[status] ?? { label: status, tone: 'border-slate-200 bg-slate-100 text-slate-700' };

/** The board's own buckets: a parcel is either still at the store, on the road, or at the door. */
const GROUP_DEFS: { key: 'collect' | 'route' | 'door' | 'hold'; title: string; hint: string; statuses: string[] }[] = [
  {
    key: 'collect',
    title: 'To collect',
    hint: 'Assigned to you and still waiting at the store',
    statuses: ['assigned'],
  },
  {
    key: 'route',
    title: 'On the route',
    hint: 'In your bag - take them to the door',
    statuses: ['picked_up', 'in_transit'],
  },
  {
    key: 'door',
    title: 'At the door',
    hint: 'Close these with the buyer’s handover code',
    statuses: ['out_for_delivery'],
  },
];

const ON_THE_WAY_STATUSES = ['picked_up', 'in_transit', 'failed'];

interface DropCardProps {
  drop: RiderDrop;
  busy: boolean;
  /**
   * Set on the board route, where the card is one row of a list: it is the row's link to
   * `/rider/deliveries/:id`. On the detail route the card *is* the detail view, so the page
   * leaves it unset rather than render a link to the page already open.
   */
  openHref?: string | null;
  onCollect: (drop: RiderDrop) => void;
  onOnTheWay: (drop: RiderDrop) => void;
  onDeliver: (drop: RiderDrop) => void;
  onReport: (drop: RiderDrop) => void;
}

const DropCard: React.FC<DropCardProps> = ({
  drop,
  busy,
  openHref = null,
  onCollect,
  onOnTheWay,
  onDeliver,
  onReport,
}) => {
  // The parcel's value as the order booked it - the only money figure a rider is given.
  const { formatPrice } = useCurrency();
  const region = [drop.address.city, drop.address.state].filter(Boolean).join(', ');
  const locality = [region, drop.address.zipCode].filter(Boolean).join(' ');
  const placedAt = stamp(drop.assignedAt);
  const pickedAt = stamp(drop.pickedUpAt);
  const meta = statusMeta(drop.status);

  return (
    <article
      data-testid="drop-card"
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Store className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-bold text-slate-900">{drop.storeName}</div>
            <div className="font-mono text-xs font-semibold text-slate-500">
              Parcel {shortId(drop.subOrderId)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold',
              meta.tone
            )}
          >
            <Package className="h-3.5 w-3.5" />
            {meta.label}
          </span>
          {openHref && (
            <Link
              to={openHref}
              data-testid="btn-open-drop"
              aria-label={`Open parcel ${shortId(drop.subOrderId)} as its own page`}
              title="Open parcel on its own page"
              className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <span>Open</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-3.5 p-4">
        {/* Buyer */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
          <span className="text-xs font-extrabold text-slate-500">
            Recipient
          </span>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-bold text-slate-900">{drop.address.fullName}</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {drop.customerEmail}
            </span>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5">
          <span className="text-xs font-extrabold text-slate-500">
            Deliver to
          </span>
          <div className="mt-1.5 flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sun-orange-600" />
            <div className="text-xs text-slate-700">
              <div className="font-semibold text-slate-900">{drop.address.street}</div>
              {(locality || drop.address.country) && (
                <div className="mt-0.5 text-slate-600">
                  {[locality, drop.address.country].filter(Boolean).join(' • ')}
                </div>
              )}
            </div>
          </div>
          {drop.address.phone && (
            <a
              href={`tel:${drop.address.phone}`}
              data-testid="btn-call-customer"
              className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50"
            >
              <Phone className="h-3.5 w-3.5 text-slate-500" />
              Call {drop.address.phone}
            </a>
          )}
        </div>

        {/* Value + timestamps */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
          <div>
            <span className="text-xs font-extrabold text-slate-500">
              Value of parcel
            </span>
            <div className="font-mono text-base font-black text-slate-900">{formatPrice(drop.gross)}</div>
          </div>
          <div className="space-y-1 text-right text-xs font-medium text-slate-500">
            {placedAt && (
              <div className="flex items-center justify-end gap-1.5">
                <Clock className="h-3 w-3 text-amber-600" />
                <span>Assigned {placedAt}</span>
              </div>
            )}
            {pickedAt && (
              <div className="flex items-center justify-end gap-1.5">
                <Truck className="h-3 w-3 text-sky-600" />
                <span>Picked up {pickedAt}</span>
              </div>
            )}
          </div>
        </div>

        {drop.customerNotes.trim() !== '' && (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-950">
            <span className="font-bold text-amber-900">Buyer note: </span>
            {drop.customerNotes}
          </div>
        )}

        {/* Live location (Batch 42): the rider's own opt-in share for this parcel. */}
        <LocationShareControl deliveryId={drop.id} status={drop.status} />

        {drop.status === 'out_for_delivery' && !drop.needsHandoverCode && (
          <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              No handover code on this parcel, so it cannot be closed from the bike. The desk settles
              it from the order record.
            </span>
          </div>
        )}

        {/* Actions: every label names the state the button asks the database for. */}
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
          {drop.status === 'assigned' && (
            <button
              type="button"
              data-testid="btn-collect"
              disabled={busy}
              onClick={() => onCollect(drop)}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Package className="h-4 w-4" />
              <span>Collected</span>
              <span className="text-xs font-semibold opacity-80">→ shipped</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {ON_THE_WAY_STATUSES.includes(drop.status) && (
            <button
              type="button"
              data-testid="btn-on-the-way"
              disabled={busy}
              onClick={() => onOnTheWay(drop)}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-sky-600/20 transition-all hover:bg-sky-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Navigation className="h-4 w-4" />
              <span>On the way</span>
              <span className="text-xs font-semibold opacity-80">→ out_for_delivery</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {drop.status === 'out_for_delivery' && drop.needsHandoverCode && (
            <button
              type="button"
              data-testid="btn-deliver"
              disabled={busy}
              onClick={() => onDeliver(drop)}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-sun-orange px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Deliver</span>
              <span className="text-xs font-semibold opacity-80">code check</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            data-testid="btn-report-issue"
            disabled={busy}
            onClick={() => onReport(drop)}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 text-xs font-bold text-rose-700 shadow-2xs transition-all hover:bg-rose-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Report issue</span>
          </button>
        </div>
      </div>
    </article>
  );
};

const CountTile: React.FC<{
  testId: string;
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  tone: string;
}> = ({ testId, label, value, hint, icon, tone }) => (
  <div className="rounded-3xl border border-slate-200/90 bg-white p-3.5 shadow-xs sm:p-4">
    <div className="flex items-center justify-between text-slate-500">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className={cn('flex h-7 w-7 items-center justify-center rounded-xl', tone)}>{icon}</span>
    </div>
    <div className="mt-2 flex items-baseline gap-1">
      <span data-testid={testId} className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
        {value}
      </span>
      <span className="text-xs text-slate-500">parcels</span>
    </div>
    <div className="mt-1 text-xs font-medium text-slate-500">{hint}</div>
  </div>
);

const BoardLoading: React.FC = () => (
  <div data-testid="board-loading" className="space-y-3">
    <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin text-sun-orange" />
      Reading your board from dispatch…
    </div>
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
      {[0, 1, 2, 3].map((slot) => (
        <div key={slot} className="h-24 animate-pulse rounded-3xl border border-slate-200/80 bg-white/70" />
      ))}
    </div>
    {[0, 1].map((slot) => (
      <div key={slot} className="h-48 animate-pulse rounded-2xl border border-slate-200/80 bg-white/70" />
    ))}
  </div>
);

const BoardError: React.FC<{ message: string; retrying: boolean; onRetry: () => void }> = ({
  message,
  retrying,
  onRetry,
}) => (
  <section
    role="alert"
    data-testid="board-error"
    className="space-y-4 rounded-3xl border-2 border-rose-300 bg-rose-50 p-5 shadow-sm"
  >
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-black text-rose-950">Your board could not be read</p>
        <p className="mt-1 text-xs font-medium text-rose-900">{message}</p>
        <p className="mt-2 text-xs text-rose-700">
          No parcels are listed, because a route the database never sent is not something this screen
          can invent. Retry, or sign in again if the message mentions your rider profile.
        </p>
      </div>
    </div>
    <button
      type="button"
      data-testid="btn-retry-board"
      disabled={retrying}
      onClick={onRetry}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      <span>Retry</span>
    </button>
  </section>
);

export const RiderDashboardPage: React.FC = () => {
  // `/rider/deliveries/:id` is served by this same component, so the route param decides
  // whether the screen is the board or one parcel on it.
  const { id: deliveryId } = useParams<{ id: string }>();
  useRiderLive();
  const board = useRiderBoard();
  const actions = useRiderActions();

  // Only the row id is held: the card itself is looked up in the live board, so a parcel that
  // leaves the board also leaves the modal.
  const [handoverId, setHandoverId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  /**
   * Batch 42: a verified drop leaves the board on the next read, which would unmount the
   * handover modal before its photo-proof step can render. The drop is therefore snapshotted
   * at the moment the code matches, and the modal lives on the snapshot until it is closed.
   */
  const [proofDrop, setProofDrop] = useState<RiderDrop | null>(null);

  const rider = board.data?.rider ?? null;
  const drops = board.data?.drops ?? [];
  const counts = board.data?.counts ?? null;

  /**
   * `rider_board` is the only read dispatch offers a rider, and it returns the parcels assigned
   * to this account. A detail screen is therefore one row of that read, matched on the delivery
   * id or the package id in the URL; a row it does not contain is reported as not found rather
   * than shown as an empty card.
   */
  const detailDrop = deliveryId
    ? drops.find((drop) => drop.id === deliveryId || drop.subOrderId === deliveryId) ?? null
    : null;

  const readError =
    board.isError && board.error instanceof Error
      ? board.error.message
      : 'The rider board could not be read.';

  const moveError =
    actions.move.isError && actions.move.error instanceof Error
      ? actions.move.error.message
      : null;

  const availabilityError =
    actions.availability.isError && actions.availability.error instanceof Error
      ? actions.availability.error.message
      : null;

  const handoverError =
    actions.handover.isError && actions.handover.error instanceof Error
      ? actions.handover.error.message
      : null;

  const grouped = useMemo(() => {
    const buckets: Record<'collect' | 'route' | 'door' | 'hold', RiderDrop[]> = {
      collect: [],
      route: [],
      door: [],
      hold: [],
    };
    for (const drop of board.data?.drops ?? []) {
      const def = GROUP_DEFS.find((group) => group.statuses.includes(drop.status));
      buckets[def ? def.key : 'hold'].push(drop);
    }
    return buckets;
  }, [board.data]);

  const handoverDrop = handoverId ? drops.find((drop) => drop.id === handoverId) ?? null : null;
  const reportDrop = reportId ? drops.find((drop) => drop.id === reportId) ?? null : null;

  const busy = actions.move.isPending;

  const requestCollect = (drop: RiderDrop) =>
    actions.move.mutate({ subOrderId: drop.subOrderId, next: 'shipped' });

  const requestOnTheWay = (drop: RiderDrop) =>
    actions.move.mutate({ subOrderId: drop.subOrderId, next: 'out_for_delivery' });

  /** The report *is* the note: it lands in the package history the store and the desk both read. */
  const submitReport = async (data: { reason: DeliveryIssueReason; notes: string }) => {
    if (!reportDrop) return;
    const detail = data.notes.trim();
    const note = detail ? `${data.reason}: ${detail}` : data.reason;
    await actions.move.mutateAsync({
      subOrderId: reportDrop.subOrderId,
      next: 'delivery_failed',
      note,
    });
    setReportId(null);
  };

  /**
   * The plaintext code is never known to the browser - Postgres compares its hash and refuses a
   * wrong one. That refusal is not re-thrown here because it is already on screen: the mutation's
   * error feeds the modal's `error` prop, and the row stays on the board until a code matches.
   */
  const submitHandover = async (drop: RiderDrop, code: string) => {
    try {
      await actions.handover.mutateAsync({ deliveryId: drop.id, code });
      // The code matched: hold the drop so the modal's photo-proof step survives
      // the board re-read that is about to take the delivered parcel off it.
      setProofDrop(drop);
    } catch {
      /* shown through `handoverError` below */
    }
  };

  const attachProof = async (drop: RiderDrop, file: File) => {
    await actions.proof.mutateAsync({ deliveryId: drop.id, file });
  };

  const groupSections = GROUP_DEFS.map((def) => ({ def, rows: grouped[def.key] })).filter(
    (section) => section.rows.length > 0
  );
  const holdRows = grouped.hold;

  return (
    <WorkspaceLayout
      role="rider"
      roleBadgeText="DELIVERY RIDER"
      title="Delivery Rider Workspace"
      subtitle="Your assigned parcels, handovers and exceptions - read live from the dispatch board"
      sidebar={<RiderNav />}
    >
      <div className="w-full space-y-4 pb-10 sm:space-y-6">
        {board.isError ? (
          <BoardError
            message={readError}
            retrying={board.isFetching}
            onRetry={() => void board.refetch()}
          />
        ) : board.data ? (
          <div className="space-y-5">
            <RiderHeader
              riderName={rider?.fullName ?? ''}
              vehicleType={rider?.vehicleType ?? ''}
              status={availabilityOf(rider?.status)}
              onStatusChange={(status) => actions.availability.mutate(status)}
              activeDeliveries={drops.length}
              pending={actions.availability.isPending}
            />

            {availabilityError && (
              <div
                role="alert"
                data-testid="availability-error"
                className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{availabilityError}</span>
              </div>
            )}

            {rider?.status === 'offline' && (
              <div
                data-testid="offline-banner"
                className="flex items-center gap-2.5 rounded-2xl border border-amber-300/90 bg-amber-50/95 p-4 text-xs font-medium text-amber-900 shadow-sm"
              >
                <Clock className="h-4 w-4 shrink-0 text-amber-700" />
                <span>
                  Your availability is offline, so dispatch holds new assignments back. Parcels
                  already on this board stay yours to finish.
                </span>
              </div>
            )}
            {/* Counts: what the board itself reports back - parcels, never money. */}
            {counts && !deliveryId && (
              <section aria-label="Your load on the board" className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-500">
                    Your load
                  </span>
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    {rider && rider.slaCeilingHours > 0 && (
                      <span>Handling window {rider.slaCeilingHours}h</span>
                    )}
                    <button
                      type="button"
                      data-testid="btn-refresh-board"
                      disabled={board.isFetching}
                      onClick={() => void board.refetch()}
                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-2xs transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {board.isFetching ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      <span>Refresh</span>
                    </button>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
                  <CountTile
                    testId="rider-count-assigned"
                    label="Assigned"
                    value={counts.assigned}
                    hint="Waiting to be collected"
                    tone="bg-amber-50 text-amber-600"
                    icon={<Package className="h-4 w-4" />}
                  />
                  <CountTile
                    testId="rider-count-in-flight"
                    label="In flight"
                    value={counts.inFlight}
                    hint="Carried right now"
                    tone="bg-sky-50 text-sky-600"
                    icon={<Navigation className="h-4 w-4" />}
                  />
                  <CountTile
                    testId="rider-count-delivered-today"
                    label="Delivered today"
                    value={counts.deliveredToday}
                    hint="Closed with a buyer code"
                    tone="bg-emerald-50 text-emerald-600"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  />
                  <CountTile
                    testId="rider-count-all-time"
                    label="Delivered all time"
                    value={counts.completedAllTime}
                    hint="Every handover you have made"
                    tone="bg-orange-50 text-sun-orange-600"
                    icon={<Truck className="h-4 w-4" />}
                  />
                </div>
              </section>
            )}

            {moveError && (
              <div
                role="alert"
                data-testid="move-error"
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-900"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>That move was refused: {moveError}</span>
                </span>
                <button
                  type="button"
                  data-testid="btn-dismiss-move-error"
                  onClick={() => actions.move.reset()}
                  className="inline-flex min-h-[32px] items-center rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700"
                >
                  Dismiss
                </button>
              </div>
            )}

            {deliveryId ? (
              detailDrop ? (
                <section aria-label={`Parcel ${shortId(detailDrop.subOrderId)} detail`} className="space-y-3">
                  <Link
                    to="/rider/deliveries"
                    data-testid="btn-back-to-board"
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-2xs transition-all hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to the board</span>
                  </Link>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-2xs">
                    <span className="text-xs font-extrabold text-slate-500">
                      One parcel, from your board
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        delivery {shortId(detailDrop.id)} · package {shortId(detailDrop.subOrderId)}
                      </span>
                      <button
                        type="button"
                        data-testid="btn-refresh-detail"
                        disabled={board.isFetching}
                        onClick={() => void board.refetch()}
                        title="Re-read the dispatch board behind this parcel"
                        className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-2xs transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {board.isFetching ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        <span>Re-read</span>
                      </button>
                    </span>
                  </div>
                  <DropCard
                    drop={detailDrop}
                    busy={busy}
                    onCollect={requestCollect}
                    onOnTheWay={requestOnTheWay}
                    onDeliver={(target) => setHandoverId(target.id)}
                    onReport={(target) => setReportId(target.id)}
                  />
                </section>
              ) : (
                <section
                  role="alert"
                  data-testid="drop-not-found"
                  className="space-y-3 rounded-3xl border-2 border-slate-300 bg-white p-6 shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <PackageSearch className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        That parcel is not on your board
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        Dispatch assigns parcels to riders; the board read only returns rows already
                        given to you, and <code className="font-mono">{deliveryId}</code> is not one
                        of them. It may have been reassigned, or the link may be a delivery another
                        rider is holding.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid="btn-retry-drop"
                      disabled={board.isFetching}
                      onClick={() => void board.refetch()}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {board.isFetching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      <span>Re-read the board</span>
                    </button>
                    <Link
                      to="/rider"
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50"
                    >
                      <span>Open my board</span>
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Link>
                  </div>
                </section>
              )
            ) : drops.length === 0 ? (
              <div
                data-testid="board-empty"
                className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-xs"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                  <Inbox className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No open parcels on your board</h3>
                <p className="mt-1 max-w-md text-xs text-slate-500">
                  Dispatch has nothing assigned to you right now. New parcels appear here the moment a
                  store hands them over - refresh to re-read the board.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupSections.map((section) => (
                  <section key={section.def.key} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div>
                        <h2 className="text-sm font-black text-slate-900">{section.def.title}</h2>
                        <p className="text-xs text-slate-500">{section.def.hint}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                        {section.rows.length}
                      </span>
                    </div>
                    <div className="space-y-3.5">
                      {section.rows.map((drop) => (
                        <DropCard
                          key={drop.id}
                          drop={drop}
                          busy={busy}
                          openHref={`/rider/deliveries/${drop.id}`}
                          onCollect={requestCollect}
                          onOnTheWay={requestOnTheWay}
                          onDeliver={(target) => setHandoverId(target.id)}
                          onReport={(target) => setReportId(target.id)}
                        />
                      ))}
                    </div>
                  </section>
                ))}

                {holdRows.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div>
                        <h2 className="text-sm font-black text-slate-900">Reported / on hold</h2>
                        <p className="text-xs text-slate-500">
                          Left by a delivery report - the store or the desk decides the next step, or you
                          can take it out again.
                        </p>
                      </div>
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                        {holdRows.length}
                      </span>
                    </div>
                    <div className="space-y-3.5">
                      {holdRows.map((drop) => (
                        <DropCard
                          key={drop.id}
                          drop={drop}
                          busy={busy}
                          openHref={`/rider/deliveries/${drop.id}`}
                          onCollect={requestCollect}
                          onOnTheWay={requestOnTheWay}
                          onDeliver={(target) => setHandoverId(target.id)}
                          onReport={(target) => setReportId(target.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        ) : (
          <BoardLoading />
        )}

        {(handoverDrop ?? proofDrop) && (
          <HandoverVerificationModal
            isOpen
            onClose={() => {
              setHandoverId(null);
              setProofDrop(null);
              actions.handover.reset();
            }}
            customerName={(handoverDrop ?? proofDrop)!.address.fullName}
            addressLine={(handoverDrop ?? proofDrop)!.address.street}
            submitting={actions.handover.isPending}
            error={handoverError}
            onVerify={(code) => submitHandover((handoverDrop ?? proofDrop)!, code)}
            onAttachProof={(file) => attachProof((handoverDrop ?? proofDrop)!, file)}
          />
        )}

        {reportDrop && (
          <ReportIssueModal
            isOpen
            onClose={() => setReportId(null)}
            subOrderId={reportDrop.subOrderId}
            customerName={reportDrop.address.fullName}
            onSubmit={submitReport}
          />
        )}
      </div>
    </WorkspaceLayout>
  );
};
