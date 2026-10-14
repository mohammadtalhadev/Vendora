import React, { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';
import { ShieldCheck, AlertCircle, Loader2, Camera, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';

export interface HandoverVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Who the parcel is for — taken from the rider's board row, never invented. */
  customerName: string;
  /** One line of the delivery address, so the rider can confirm they are at the right door. */
  addressLine: string;
  /** Postgres owns the code: this modal only collects what the buyer read out. */
  onVerify: (code: string) => Promise<void>;
  /** The database's own refusal after a wrong or already-used code. */
  error?: string | null;
  /** A verification is in flight. */
  submitting?: boolean;
  /**
   * Batch 42 photo proof: when the caller provides this, a successful code
   * check moves the modal to a proof step instead of closing - the rider can
   * attach a photo of the drop before they leave the door. The photo is
   * additional proof, never a blocker: the parcel is already delivered, and
   * "Done" closes with or without one.
   */
  onAttachProof?: (file: File) => Promise<void>;
}

export const HandoverVerificationModal: React.FC<HandoverVerificationModalProps> = ({
  isOpen,
  onClose,
  customerName,
  addressLine,
  onVerify,
  error,
  submitting = false,
  onAttachProof,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [verified, setVerified] = useState(false);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofDone, setProofDone] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Reset modal state upon opening
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '']);
      setVerified(false);
      setProofBusy(false);
      setProofDone(false);
      setProofError(null);
      // Autofocus first input after brief paint
      const timer = setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Success is not decided here: Postgres checks the code. When a submit that
  // was in flight finishes without the caller reporting an error, the caller
  // has already re-read the board — close the modal, or, when the caller
  // wired photo proof, move to the proof step for this now-delivered parcel.
  const wasSubmitting = useRef(false);
  useEffect(() => {
    if (wasSubmitting.current && !submitting && !error) {
      if (onAttachProof) {
        setVerified(true);
      } else {
        onClose();
      }
    }
    wasSubmitting.current = submitting;
  }, [submitting, error, onClose, onAttachProof]);

  const handleProofFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onAttachProof || proofBusy || proofDone) return;
    setProofBusy(true);
    setProofError(null);
    try {
      await onAttachProof(file);
      setProofDone(true);
    } catch (err) {
      setProofError(err instanceof Error ? err.message : 'The photo could not be attached.');
    } finally {
      setProofBusy(false);
    }
  };

  const handleDigitChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    // If multiple characters entered (e.g. autofill or paste into input)
    if (rawVal.length > 1) {
      const cleaned = rawVal.replace(/\D/g, '').slice(0, 4);
      if (cleaned.length > 0) {
        const next = ['', '', '', ''];
        for (let i = 0; i < 4; i++) {
          next[i] = cleaned[i] || '';
        }
        setDigits(next);
        const focusIdx = Math.min(cleaned.length, 3);
        inputRefs[focusIdx].current?.focus();
        return;
      }
    }

    const char = rawVal.slice(-1).replace(/\D/g, '');
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);

    // Auto-advance
    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        setDigits(nextDigits);
        inputRefs[index - 1].current?.focus();
      } else if (digits[index]) {
        // Let normal backspace clear the digit
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault();
      inputRefs[index + 1].current?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasteData) return;

    const next = [...digits];
    for (let i = 0; i < pasteData.length; i++) {
      next[i] = pasteData[i];
    }
    setDigits(next);
    const targetIdx = Math.min(pasteData.length, 3);
    inputRefs[targetIdx].current?.focus();
  };

  const enteredCode = digits.join('');

  const handleConfirm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (enteredCode.length < 4 || submitting) return;
    await onVerify(enteredCode);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 sm:p-7">
        <DialogHeader className="text-center sm:text-center items-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Customer Handover Verification
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 max-w-xs mx-auto">
            Ask {customerName} to read out their 4-digit handover code. Only the hashed code in the
            database can confirm it.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-100 text-xs space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 font-medium shrink-0">Customer:</span>
            <span className="font-semibold text-slate-900 text-right truncate">{customerName}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 font-medium shrink-0">Delivering to:</span>
            <span className="text-slate-900 text-right truncate">{addressLine}</span>
          </div>
        </div>

        {verified ? (
          <div className="space-y-4" data-testid="proof-step">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Handover confirmed - the parcel is delivered.</span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700">
                Add photo proof (recommended)
              </span>
              <p className="text-[11px] leading-relaxed text-slate-500">
                A photo of the parcel at the door is stored as this delivery's proof. It is
                additional evidence on top of the code - the delivery is complete either way.
              </p>
              {proofDone ? (
                <div
                  data-testid="proof-attached"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-700"
                >
                  <Camera className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Photo proof attached to this delivery.</span>
                </div>
              ) : (
                <label
                  className={`flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-all hover:border-sun-orange hover:text-sun-orange-600 ${proofBusy ? 'pointer-events-none opacity-60' : ''}`}
                >
                  {proofBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <span>{proofBusy ? 'Uploading…' : 'Take or choose a photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    data-testid="proof-file-input"
                    disabled={proofBusy}
                    onChange={handleProofFile}
                  />
                </label>
              )}
              {proofError && (
                <div
                  role="alert"
                  data-testid="proof-error"
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{proofError}</span>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 sm:justify-end gap-2">
              <Button
                type="button"
                variant="orange-cta"
                onClick={onClose}
                className="w-full sm:w-auto rounded-full min-h-[44px]"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <label htmlFor="pin-digit-0" className="text-xs font-semibold text-slate-700">
              Enter 4-Digit Customer PIN
            </label>
            <div className="flex items-center justify-center gap-2.5 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  id={idx === 0 ? 'pin-digit-0' : undefined}
                  ref={inputRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  data-testid={`pin-digit-${idx}`}
                  aria-label={`Digit ${idx + 1}`}
                  value={digit}
                  disabled={submitting}
                  onChange={(e) => handleDigitChange(idx, e)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="h-14 w-12 sm:w-14 rounded-2xl border-2 border-slate-200 bg-white text-center font-mono text-2xl font-black text-slate-900 shadow-xs transition-all focus:border-sun-orange focus:outline-none focus:ring-4 focus:ring-sun-orange/15 disabled:bg-slate-50 disabled:text-slate-400"
                />
              ))}
            </div>
          </div>

          {/* Error reported by the database through the caller */}
          {error && (
            <div
              role="alert"
              data-testid="verification-error"
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
              disabled={submitting}
              onClick={onClose}
              className="w-full sm:w-auto rounded-full order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="orange-cta"
              disabled={submitting || enteredCode.length < 4}
              className="w-full sm:w-auto rounded-full min-h-[44px] order-1 sm:order-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Checking…
                </>
              ) : (
                'Confirm Handover'
              )}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
