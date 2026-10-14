import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Eye, FastForward, MoreHorizontal, RotateCcw, Truck } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
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
import { assignRider, type AdminOrderQueueLine, type AdminOrderRow } from '../api/orders';
import { useAdminOrderDetail, useLogisticsBoard } from '../hooks/useAdminQueries';
import { advanceSubOrderStatus } from '../../orders/api/orders';
import { NEXT_STATUSES } from './order-transitions';

/**
 * Row actions for the admin order queue. Every action here is a call the database
 * already permits an admin to make — nothing is decorative:
 *
 * - Refund: `admin_refund_sub_order`, guarded by `admin_require_admin()`. Issued per
 *   package for its full gross (subtotal + shipping), skipping refunded and cancelled
 *   packages — the exact semantics of the order detail page's administrative refund,
 *   which shares the same `refundSubOrder` call.
 * - Advance status: `advance_sub_order_status` resolves an admin caller first and
 *   allows an admin any transition in its graph (mirrored in NEXT_STATUSES below);
 *   the RPC re-validates every move server-side regardless of what this menu offers.
 * - Assign rider: `assign_rider` is admin-only (`is_admin()` or it raises). Offered
 *   only for physical packages still awaiting dispatch, judged from the order detail
 *   read — the queue rows alone do not carry a package's type or current rider.
 *
 * There is deliberately no Delete: an order is a financial record that refunds,
 * disputes and payouts hang off, so it is cancelled or refunded, never erased.
 */

/** Dispatch states where a package is already moving with a courier. */
const IN_TRANSIT = new Set(['shipped', 'out_for_delivery', 'delivery_failed']);
/** States after which a package takes no rider and no further handling. */
const CLOSED = new Set(['delivered', 'cancelled', 'refunded', 'returned']);

const statusLabel = (status: string): string =>
  STATUS_LABELS[status] ?? status.replace(/_/g, ' ');

const shortId = (id: string): string => id.slice(0, 8);

const errorText = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

/* ------------------------------------------------------------------ */
/* Shared dialog chrome                                                */
/* ------------------------------------------------------------------ */

const DialogShell: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  order: AdminOrderRow;
  description: string;
  children: React.ReactNode;
}> = ({ open, onOpenChange, title, order, description, children }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Order {shortId(order.id)}
          {order.customerEmail ? ` · ${order.customerEmail}` : ''}. {description}
        </DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
);

const Notice: React.FC<{ text: string }> = ({ text }) => (
  <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
    {text}
  </p>
);

const Failure: React.FC<{ text: string }> = ({ text }) => (
  <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
    {text}
  </p>
);

const PackageShell: React.FC<{
  line: AdminOrderQueueLine;
  status: string;
  children: React.ReactNode;
}> = ({ line, status, children }) => (
  <div className="rounded-xl border border-slate-200/90 px-3.5 py-3">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-mono text-xs font-bold text-slate-900">Package {shortId(line.id)}</p>
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

const RefundBody: React.FC<{ order: AdminOrderRow; onChanged: () => void }> = ({
  order,
  onChanged,
}) => {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runRefund = async (line: AdminOrderQueueLine) => {
    setPendingId(line.id);
    setError(null);
    try {
      await refundSubOrder(line.id, line.gross, 'Platform administrative refund');
      setStatuses((prev) => ({ ...prev, [line.id]: 'refunded' }));
      setNotice(`Package ${shortId(line.id)} refunded — ${formatPrice(line.gross)} back to the buyer.`);
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
      {notice && <Notice text={notice} />}
      {error && <Failure text={error} />}
      <div className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
        {order.lines.map((line) => {
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

const AdvanceBody: React.FC<{ order: AdminOrderRow; onChanged: () => void }> = ({
  order,
  onChanged,
}) => {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, SubOrderStatus>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runAdvance = async (line: AdminOrderQueueLine, next: SubOrderStatus) => {
    setPendingId(line.id);
    setError(null);
    try {
      await advanceSubOrderStatus(line.id, next);
      setStatuses((prev) => ({ ...prev, [line.id]: next }));
      setNotice(`Package ${shortId(line.id)} moved to ${statusLabel(next)}.`);
      onChanged();
    } catch (err) {
      setError(errorText(err, 'Status update failed.'));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {notice && <Notice text={notice} />}
      {error && <Failure text={error} />}
      <div className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
        {order.lines.map((line) => {
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
                      aria-label={`Next status for package ${shortId(line.id)}`}
                      className="h-8 w-52 text-xs font-semibold text-slate-700"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs">
                          {statusLabel(option)}
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

const RiderBody: React.FC<{ order: AdminOrderRow; onChanged: () => void }> = ({
  order,
  onChanged,
}) => {
  const board = useLogisticsBoard();
  const detail = useAdminOrderDetail(order.id);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fleet = board.data?.fleet ?? [];
  const riderName = (riderId: string | null): string | null =>
    riderId ? (fleet.find((rider) => rider.id === riderId)?.name ?? 'An assigned rider') : null;

  const runAssign = async (line: AdminOrderQueueLine, riderId: string) => {
    setPendingId(line.id);
    setError(null);
    try {
      await assignRider(line.id, riderId);
      const name = riderName(riderId) ?? 'the rider';
      setAssigned((prev) => ({ ...prev, [line.id]: name }));
      setNotice(`Package ${shortId(line.id)} assigned to ${name}.`);
      onChanged();
    } catch (err) {
      setError(errorText(err, 'Rider assignment failed.'));
    } finally {
      setPendingId(null);
    }
  };

  if (detail.isPending || board.isPending) {
    return (
      <p role="status" className="text-sm text-slate-500">
        Reading the packages and the rider fleet…
      </p>
    );
  }

  if (detail.isError || board.isError) {
    return (
      <Failure text="The packages or the rider fleet could not be read, so rider assignment is unavailable here. Open the order or the dispatch board to manage delivery." />
    );
  }

  return (
    <div className="space-y-3">
      {notice && <Notice text={notice} />}
      {error && <Failure text={error} />}
      {fleet.length === 0 && (
        <p className="text-xs text-slate-500">
          No riders are registered yet — assignment opens once a rider joins the fleet.
        </p>
      )}
      <div className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
        {order.lines.map((line) => {
          const pkg = detail.data?.packages.find((entry) => entry.id === line.id);
          const status = pkg?.status ?? line.status;
          const assignedName = assigned[line.id];
          return (
            <PackageShell key={line.id} line={line} status={status}>
              {!pkg ? (
                <p className="text-[11px] text-slate-400">Package details unavailable.</p>
              ) : assignedName ? (
                <p className="text-[11px] font-medium text-emerald-700">
                  Assigned to {assignedName}.
                </p>
              ) : pkg.type !== 'physical' ? (
                <p className="text-[11px] text-slate-400">
                  Digital package — delivered online, no rider needed.
                </p>
              ) : IN_TRANSIT.has(status) ? (
                <p className="text-[11px] text-slate-400">
                  Already out with a courier — reassign from the dispatch board, which can see
                  the delivery.
                </p>
              ) : CLOSED.has(status) ? (
                <p className="text-[11px] text-slate-400">This package is closed.</p>
              ) : fleet.length === 0 ? (
                <p className="text-[11px] text-slate-400">No rider available to assign.</p>
              ) : (
                <div className="space-y-2">
                  {pkg.riderId && (
                    <p className="text-[11px] text-slate-500">
                      Current rider: {riderName(pkg.riderId)}
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
                        aria-label={`Rider for package ${shortId(line.id)}`}
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
/* The menu                                                            */
/* ------------------------------------------------------------------ */

type DialogKind = 'refund' | 'advance' | 'rider';

/** Approximate panel height, used only to flip the menu above the button
 *  when the row sits near the bottom of the viewport. */
const MENU_HEIGHT = 178;

const MENU_ITEM_CLASS =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900';

export const OrderActionsMenu: React.FC<{
  order: AdminOrderRow;
  onChanged: () => void;
}> = ({ order, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        panelRef.current?.contains(event.target as Node) ||
        triggerRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open ]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const flip = rect.bottom + MENU_HEIGHT + 8 > window.innerHeight;
      setCoords({
        top: flip ? Math.max(8, rect.top - MENU_HEIGHT - 6) : rect.bottom + 6,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    setOpen(true);
  };

  const openDialog = (kind: DialogKind) => {
    setOpen(false);
    setDialog(kind);
  };

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-500 hover:text-slate-900"
        aria-label={`Actions for order ${shortId(order.id)}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </Button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={`Actions for order ${shortId(order.id)}`}
            className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
            style={{ top: coords.top, right: coords.right }}
            onClick={(event) => event.stopPropagation()}
          >
            <Link
              role="menuitem"
              to={`/admin/orders/${order.id}`}
              className={MENU_ITEM_CLASS}
              onClick={() => setOpen(false)}
            >
              <Eye className="h-4 w-4 text-slate-400" aria-hidden="true" />
              View details
            </Link>
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={() => openDialog('refund')}
            >
              <RotateCcw className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Refund packages
            </button>
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={() => openDialog('advance')}
            >
              <FastForward className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Advance status
            </button>
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={() => openDialog('rider')}
            >
              <Truck className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Assign rider
            </button>
          </div>,
          document.body,
        )}

      <DialogShell
        open={dialog === 'refund'}
        onOpenChange={(next) => !next && setDialog(null)}
        title="Refund packages"
        order={order}
        description="Each refund returns the full amount the buyer paid for that package, the same action as the order page's administrative refund."
      >
        {dialog === 'refund' && <RefundBody order={order} onChanged={onChanged} />}
      </DialogShell>

      <DialogShell
        open={dialog === 'advance'}
        onOpenChange={(next) => !next && setDialog(null)}
        title="Advance status"
        order={order}
        description="Only the moves the platform's state machine allows from each package's current status are listed."
      >
        {dialog === 'advance' && <AdvanceBody order={order} onChanged={onChanged} />}
      </DialogShell>

      <DialogShell
        open={dialog === 'rider'}
        onOpenChange={(next) => !next && setDialog(null)}
        title="Assign rider"
        order={order}
        description="A rider can be assigned while a physical package is waiting to be picked up."
      >
        {dialog === 'rider' && <RiderBody order={order} onChanged={onChanged} />}
      </DialogShell>
    </>
  );
};
