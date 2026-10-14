import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is about to happen, e.g. "Clear your cart?" */
  title: string;
  /** Honest consequence line: what will be removed / sent, and that it cannot be undone. */
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive styling for the confirm button (default true — this dialog exists for destructive actions). */
  destructive?: boolean;
  /** While the confirmed action runs, the confirm button disables and shows its pending label. */
  isPending?: boolean;
  pendingLabel?: string;
  onConfirm: () => void;
}

/**
 * The one confirmation for destructive actions (Batch 47). Before this
 * component, Clear Cart, Clear Compare, address/payment deletion, admin
 * Force Refund / Administrative Cancel and Broadcast all fired on a single
 * click with no chance to back out. Anything destructive routes through
 * here: a named consequence, an explicit confirm, and a pending state while
 * the action runs.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  isPending = false,
  pendingLabel,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                destructive
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-orange-500/15 text-sun-orange-600 dark:text-sun-orange-400',
              )}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (pendingLabel ?? 'Working…') : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
