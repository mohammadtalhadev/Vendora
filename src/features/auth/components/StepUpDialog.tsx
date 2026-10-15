import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { markStepUpVerified, needsStepUp } from '../api/mfa';
import { TotpChallengeForm } from './TotpChallengeForm';

/**
 * StepUpDialog + useStepUp (Batch 64) — the in-console re-proof for
 * sensitive staff actions. Entering the console proves the second factor
 * once; suspending an account, moving a commission rate or issuing a refund
 * asks for a fresh code when the last proof is older than the freshness
 * window (see api/mfa). The protected action does not exist until the
 * verify succeeds: `requireStepUp(action)` either runs `action` immediately
 * (proof still fresh) or parks it behind this dialog and runs it only from
 * the success callback.
 */
interface StepUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs only after the code has verified. */
  onVerified: () => void;
  title?: string;
  description?: string;
}

export const StepUpDialog: React.FC<StepUpDialogProps> = ({
  open,
  onOpenChange,
  onVerified,
  title = 'Confirm it is you',
  description = 'This action needs a fresh authenticator code — the last two-factor proof for this session is older than 10 minutes.',
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">{title}</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">{description}</DialogDescription>
        </DialogHeader>
        {open && (
          <TotpChallengeForm
            variant="light"
            onVerified={() => {
              markStepUpVerified();
              onOpenChange(false);
              onVerified();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export function useStepUp() {
  const [pending, setPending] = useState<(() => void) | null>(null);

  /** Runs `action` now when the proof is fresh; otherwise parks it behind the dialog. */
  const requireStepUp = (action: () => void) => {
    if (!needsStepUp()) {
      action();
      return;
    }
    setPending(() => action);
  };

  const stepUpDialog = (
    <StepUpDialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      onVerified={() => {
        const action = pending;
        setPending(null);
        action?.();
      }}
    />
  );

  return { requireStepUp, stepUpDialog };
}
