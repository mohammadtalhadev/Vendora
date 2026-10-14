import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { StatusBadge, STATUS_LABELS } from '../../../components/ui/status-badge';
import { formatPrice } from '../../../store/currency-store';
import type { SubOrderStatus } from '../../../types/domain';
import { refundSubOrder } from '../api/disputes';
import type { LogisticsRider } from '../api/logistics';
import { assignRider, updateAdminPackageTracking } from '../api/orders';
import { advanceSubOrderStatus } from '../../orders/api/orders';
import { NEXT_STATUSES } from './order-transitions';

/**
 * The per-package actions of the admin console, shared by the order queue's row
 * menu and the order detail page so the two surfaces can never drift apart.
 * Every action is a call the database already permits an admin to make:
 *
 * - Refund: `admin_refund_sub_order`, per package for its full gross (subtotal +
 *   shipping), skipping refunded and cancelled packages.
 * - Advance status: `advance_sub_order_status` resolves an admin caller first and
 *   allows any transition in its graph (mirrored in NEXT_STATUSES); the RPC
 *   re-validates every move server-side regardless of what is offered here.
 * - Assign rider: `assign_rider` is admin-only. Offered only for physical packages
 *   still awaiting dispatch — never for digital packages, packages already out
 *   with a courier, or closed ones.
 * - Tracking: `update_sub_order_tracking`, the same RPC the seller writes through;
 *   `sub_orders` has no UPDATE policy for anyone, so this is the only write path.
 */

/** The slice of a package every per-package action needs. */
export interface PackageActionLine {
  id: string;
  status: string;
  /** Subtotal + shipping: what the buyer was charged for this package. */
  gross: number;
}

/** A package as the rider panel needs it: the action line plus type and rider. */
export interface PackageRiderLine extends PackageActionLine {
  /** `null` when the package's detail could not be read. */
  type: string | null;
  riderId: string | null;
}

/** Dispatch states where a package is already moving with a courier. */
export const RIDER_IN_TRANSIT = new Set(['shipped', 'out_for_delivery', 'delivery_failed']);
/** States after which a package takes no rider and no further handling. */
export const RIDER_CLOSED = new Set(['delivered', 'cancelled', 'refunded', 'returned']);

export const packageStatusLabel = (status: string): string =>
  STATUS_LABELS[status] ?? status.replace(/_/g, ' ');

export const shortPackageId = (id: string): string => id.slice(0, 8);

const errorText = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

/* ------------------------------------------------------------------ */
/* Shared chrome                                                       */
/* ------------------------------------------------------------------ */

export const PackageActionNotice: React.FC<{ text: string }> = ({ text }) => (
  <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
    {text}
  </p>
);

export const PackageActionFailure: React.FC<{ text: string }> = ({ text }) => (
  <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
    {text}
  </p>
);

export const PackageShell: React.FC<{
  line: PackageActionLine;
  status: string;
  children: React.ReactNode;
}> = ({ line, status, children }) => (
  <div className="rounded-xl border border-slate-200/90 px-3.5 py-3">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-mono text-xs font-bold text-slate-900">Package {shortPackageId(line.id)}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{formatPrice(line.gross)} charged</p>
      </div>
      <StatusBadge status={status} />
    </div>
    <div className="mt-2.5">{children}</div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Refund                                                              */
/* ------------------------------------------------------------------ */

export const RefundPackagesPanel: React.FC<{
  lines: PackageActionLine[];
  onChanged: () => void;
}> = ({ lines, onChanged }) => {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runRefund = async (line: PackageActionLine) => {
    setPendingId(line.id);
    setError(null);
    try {
      await refundSubOrder(line.id, line.gross, 'Platform administrative refund');
      setStatuses((prev) => ({ ...prev, [line.id]: 'refunded' }));
      setNotice(`Package ${shortPackageId(line.id)} refunded — ${formatPrice(line.gross)} back to the buyer.`);
      setConfirmId(null);
      onChanged();
    } catch (err) {
      setError(errorText(err, 'Refund failed.'));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {notice && <PackageActionNotice text={notice} />}
      {error && <PackageActionFailure text={error} />}
      <div className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
        {lines.map((line) => {
          const status = statuses[line.id] ?? line.status;
          return (
            <PackageShell key={line.id} line={line} status={status}>
              {status === 'refunded' ? (
                <p className="text-[11px] text-slate-400">Already refunded.</p>
              ) : status === 'cancelled' ? (
                <p className="text-[11px] text-slate-400">
                  Cancelled packages are not refunded — the buyer was never settled on them.
                </p>
              ) : confirmId === line.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-slate-600">
                    Refund {formatPrice(line.gross)} to the buyer?
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pendingId === line.id}
                    onClick={() => void runRefund(line)}
                  >
                    {pendingId === line.id ? 'Refunding…' : 'Confirm refund'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pendingId === line.id}
                    onClick={() => setConfirmId(null)}
                  >
                    Not now
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmId(line.id)}
                >
                  Refund {formatPrice(line.gross)}
                </Button>
              )}
            </PackageShell>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Advance status                                                      */
/* ------------------------------------------------------------------ */

export const AdvancePackagesPanel: React.FC<{
  lines: PackageActionLine[];
  onChanged: () => void;
}> = ({ lines, onChanged }) => {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, SubOrderStatus>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runAdvance = async (line: PackageActionLine, next: SubOrderStatus) => {
    setPendingId(line.id);
    setError(null);
    try {
      await advanceSubOrderStatus(line.id, next);
      setStatuses((prev) => ({ ...prev, [line.id]: next }));
      setNotice(`Package ${shortPackageId(line.id)} moved to ${packageStatusLabel(next)}.`);
      onChanged();
    } catch (err) {
      setError(errorText(err, 'Status update failed.'));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {notice && <PackageActionNotice text={notice} />}
      {error && <PackageActionFailure text={error} />}
      <div className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
        {lines.map((line) => {
          const status = statuses[line.id] ?? line.status;
          const options = NEXT_STATUSES[status] ?? [];
          const choice = choices[line.id] ?? options[0];
          return (
            <PackageShell key={line.id} line={line} status={status}>
              {options.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  No further transitions from this status.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={choice}
                    onValueChange={(value) =>
                      setChoices((prev) => ({ ...prev, [line.id]: value as SubOrderStatus }))
                    }
                  >
                    <SelectTrigger
                      aria-label={`Next status for package ${shortPackageId(line.id)}`}
                      className="h-8 w-52 text-xs font-semibold text-slate-700"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs">
                          {packageStatusLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pendingId === line.id || !choice}
                    onClick={() => choice && void runAdvance(line, choice)}
                  >
                    {pendingId === line.id ? 'Applying…' : 'Apply'}
                  </Button>
                </div>
              )}
            </PackageShell>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Assign rider                                                        */
/* ------------------------------------------------------------------ */

export const RiderPackagesPanel: React.FC<{
  lines: PackageRiderLine[];
  fleet: LogisticsRider[];
  onChanged: () => void;
}> = ({ lines, fleet, onChanged }) => {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const riderName = (riderId: string | null): string | null =>
    riderId ? (fleet.find((rider) => rider.id === riderId)?.name ?? 'An assigned rider') : null;

  const runAssign = async (line: PackageRiderLine, riderId: string) => {
    setPendingId(line.id);
    setError(null);
    try {
      await assignRider(line.id, riderId);
      const name = riderName(riderId) ?? 'the rider';
      setAssigned((prev) => ({ ...prev, [line.id]: name }));
      setNotice(`Package ${shortPackageId(line.id)} assigned to ${name}.`);
      onChanged();
    } catch (err) {
      setError(errorText(err, 'Rider assignment failed.'));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {notice && <PackageActionNotice text={notice} />}
      {error && <PackageActionFailure text={error} />}
      {fleet.length === 0 && (
        <p className="text-xs text-slate-500">
          No riders are registered yet — assignment opens once a rider joins the fleet.
        </p>
      )}
      <div className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
        {lines.map((line) => {
          const status = line.status;
          const assignedName = assigned[line.id];
          return (
            <PackageShell key={line.id} line={line} status={status}>
              {line.type === null ? (
                <p className="text-[11px] text-slate-400">Package details unavailable.</p>
              ) : assignedName ? (
                <p className="text-[11px] font-medium text-emerald-700">
                  Assigned to {assignedName}.
                </p>
              ) : line.type !== 'physical' ? (
                <p className="text-[11px] text-slate-400">
                  Digital package — delivered online, no rider needed.
                </p>
              ) : RIDER_IN_TRANSIT.has(status) ? (
                <p className="text-[11px] text-slate-400">
                  Already out with a courier — reassign from the dispatch board, which can see
                  the delivery.
                </p>
              ) : RIDER_CLOSED.has(status) ? (
                <p className="text-[11px] text-slate-400">This package is closed.</p>
              ) : fleet.length === 0 ? (
                <p className="text-[11px] text-slate-400">No rider available to assign.</p>
              ) : (
                <div className="space-y-2">
                  {line.riderId && (
                    <p className="text-[11px] text-slate-500">
                      Current rider: {riderName(line.riderId)}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={choices[line.id] ?? ''}
                      onValueChange={(value) =>
                        setChoices((prev) => ({ ...prev, [line.id]: value }))
                      }
                    >
                      <SelectTrigger
                        aria-label={`Rider for package ${shortPackageId(line.id)}`}
                        className="h-8 w-52 text-xs font-semibold text-slate-700"
                      >
                        <SelectValue placeholder="Choose a rider" />
                      </SelectTrigger>
                      <SelectContent>
                        {fleet.map((rider) => (
                          <SelectItem key={rider.id} value={rider.id} className="text-xs">
                            {rider.name}
                            {rider.vehicle ? ` · ${rider.vehicle}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      disabled={pendingId === line.id || !choices[line.id]}
                      onClick={() =>
                        choices[line.id] && void runAssign(line, choices[line.id]!)
                      }
                    >
                      {pendingId === line.id ? 'Assigning…' : 'Assign'}
                    </Button>
                  </div>
                </div>
              )}
            </PackageShell>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Carrier + tracking                                                  */
/* ------------------------------------------------------------------ */

/**
 * The carrier and tracking editor for one physical package. The RPC refuses a
 * blank tracking number and a digital package; the form mirrors the first refusal
 * with a required field so a blank save never leaves the browser.
 */
export const PackageTrackingForm: React.FC<{
  line: PackageActionLine & {
    carrierName: string | null;
    trackingNumber: string | null;
  };
  onChanged: () => void;
}> = ({ line, onChanged }) => {
  const [carrier, setCarrier] = useState(line.carrierName ?? '');
  const [tracking, setTracking] = useState(line.trackingNumber ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateAdminPackageTracking(line.id, carrier.trim(), tracking.trim());
      setNotice(`Tracking recorded for package ${shortPackageId(line.id)}.`);
      onChanged();
    } catch (err) {
      setError(errorText(err, 'Tracking could not be saved.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <PackageShell line={line} status={line.status}>
      <form onSubmit={(event) => void runSave(event)} className="space-y-2.5">
        {notice && <PackageActionNotice text={notice} />}
        {error && <PackageActionFailure text={error} />}
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Carrier</span>
            <Input
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              placeholder="Carrier name"
              aria-label={`Carrier for package ${shortPackageId(line.id)}`}
              className="h-8 w-44 text-xs"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">
              Tracking number
            </span>
            <Input
              value={tracking}
              onChange={(event) => setTracking(event.target.value)}
              placeholder="Tracking number"
              aria-label={`Tracking number for package ${shortPackageId(line.id)}`}
              required
              className="h-8 w-52 text-xs"
            />
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Saving…' : 'Save tracking'}
          </Button>
        </div>
      </form>
    </PackageShell>
  );
};
