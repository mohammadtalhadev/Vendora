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
import type { AdminOrderRow } from '../api/orders';
import { useAdminOrderDetail, useLogisticsBoard } from '../hooks/useAdminQueries';
import {
  AdvancePackagesPanel,
  PackageActionFailure,
  RefundPackagesPanel,
  RiderPackagesPanel,
  type PackageRiderLine,
} from './PackageActionPanels';

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
 * The three action bodies live in `PackageActionPanels`, shared with the order
 * detail page so the queue and the dossier can never drift apart.
 *
 * There is deliberately no Delete: an order is a financial record that refunds,
 * disputes and payouts hang off, so it is cancelled or refunded, never erased.
 */

const shortId = (id: string): string => id.slice(0, 8);

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

/* ------------------------------------------------------------------ */
/* Assign rider — the queue rows carry neither a package's type nor    */
/* its current rider, so this body reads the order detail and the      */
/* fleet before handing enriched lines to the shared panel.            */
/* ------------------------------------------------------------------ */

const RiderBody: React.FC<{ order: AdminOrderRow; onChanged: () => void }> = ({
  order,
  onChanged,
}) => {
  const board = useLogisticsBoard();
  const detail = useAdminOrderDetail(order.id);

  if (detail.isPending || board.isPending) {
    return (
      <p role="status" className="text-sm text-slate-500">
        Reading the packages and the rider fleet…
      </p>
    );
  }

  if (detail.isError || board.isError) {
    return (
      <PackageActionFailure text="The packages or the rider fleet could not be read, so rider assignment is unavailable here. Open the order or the dispatch board to manage delivery." />
    );
  }

  const lines: PackageRiderLine[] = order.lines.map((line) => {
    const pkg = detail.data?.packages.find((entry) => entry.id === line.id);
    return {
      id: line.id,
      status: pkg?.status ?? line.status,
      gross: line.gross,
      type: pkg ? pkg.type : null,
      riderId: pkg?.riderId ?? null,
    };
  });

  return (
    <RiderPackagesPanel lines={lines} fleet={board.data?.fleet ?? []} onChanged={onChanged} />
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
        {dialog === 'refund' && <RefundPackagesPanel lines={order.lines} onChanged={onChanged} />}
      </DialogShell>

      <DialogShell
        open={dialog === 'advance'}
        onOpenChange={(next) => !next && setDialog(null)}
        title="Advance status"
        order={order}
        description="Only the moves the platform's state machine allows from each package's current status are listed."
      >
        {dialog === 'advance' && <AdvancePackagesPanel lines={order.lines} onChanged={onChanged} />}
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
