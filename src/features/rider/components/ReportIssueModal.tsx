import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

export const DELIVERY_ISSUE_REASONS = [
  'Customer Unavailable',
  'Incorrect / Incomplete Address',
  'Package Damaged',
  'Access Denied / Gate Code Required',
] as const;

export type DeliveryIssueReason = (typeof DELIVERY_ISSUE_REASONS)[number];

export interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  subOrderId?: string;
  customerName?: string;
  onSubmit: (data: { reason: DeliveryIssueReason; notes: string }) => Promise<void> | void;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  subOrderId,
  customerName,
  onSubmit,
}) => {
  const [selectedReason, setSelectedReason] = useState<DeliveryIssueReason>('Customer Unavailable');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSelectedReason('Customer Unavailable');
    setNotes('');
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedReason) {
      setError('Please select an issue reason.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        reason: selectedReason,
        notes: notes.trim(),
      });
      handleClose();
    } catch (err: unknown) {
      setIsSubmitting(false);
      const message = err instanceof Error ? err.message : 'Failed to submit report. Please try again.';
      setError(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-6 sm:p-7">
        <DialogHeader className="text-center sm:text-center items-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-xs">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Report Delivery Exception
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 max-w-xs mx-auto">
            {customerName
              ? `Log delivery obstruction for order to ${customerName}. This flags the shipment for support review.`
              : 'Specify the issue encountered preventing successful package delivery.'}
          </DialogDescription>
        </DialogHeader>

        {subOrderId && (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Sub-Order:</span>
            <span className="font-mono font-bold text-slate-900">{subOrderId}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Reason for Exception
            </label>
            <div className="space-y-2" role="radiogroup" aria-label="Delivery exception reasons">
              {DELIVERY_ISSUE_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <label
                    key={reason}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all text-xs select-none',
                      isSelected
                        ? 'border-rose-400 bg-rose-50/60 text-rose-950 font-semibold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="delivery-issue-reason"
                      value={reason}
                      checked={isSelected}
                      onChange={() => setSelectedReason(reason)}
                      className="h-4 w-4 text-rose-600 border-slate-300 focus:ring-rose-500"
                    />
                    <span>{reason}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="issue-notes" className="text-xs font-semibold text-slate-700 block">
              Additional Notes (Optional)
            </label>
            <textarea
              id="issue-notes"
              rows={3}
              value={notes}
              disabled={isSubmitting}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide extra details (e.g. security refused entry, customer phone unreachable)..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20 disabled:bg-slate-50 disabled:text-slate-400 resize-none"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700 animate-in fade-in duration-150"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="pt-2 sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleClose}
              className="w-full sm:w-auto rounded-full order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-full min-h-[44px] order-1 sm:order-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Submitting...
                </>
              ) : (
                'Submit Issue'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
