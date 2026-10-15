import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { OtpInput } from '../../../components/ui/otp-input';
import {
  enrollTotp,
  isMfaAlreadyEnrolledError,
  listTotpFactors,
  verifyTotp,
  type TotpEnrollment,
} from '../api/mfa';

/**
 * TotpEnrollForm — first-time authenticator setup (Batch 64): starts the
 * enrollment, shows the QR code (plus the manual secret for apps that cannot
 * scan), and activates the factor by verifying the first code the app
 * produces. Used by the staff portal's forced-enrollment step — where it is
 * deliberately impossible to skip — and by the MFA settings card, where
 * setup is voluntary.
 */
interface TotpEnrollFormProps {
  onEnrolled: () => void;
  /**
   * The account turned out to already hold a verified authenticator
   * (Batch 88): the host takes over — the staff portal switches to the
   * code step, the settings card reloads into its set-up state.
   */
  onAlreadyEnrolled?: () => void;
  variant?: 'dark' | 'light';
}

export const TotpEnrollForm: React.FC<TotpEnrollFormProps> = ({
  onEnrolled,
  onAlreadyEnrolled,
  variant = 'light',
}) => {
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startedRef = useRef(false);

  const start = useCallback(async () => {
    setLoadError(null);
    try {
      setEnrollment(await enrollTotp());
    } catch (cause) {
      if (isMfaAlreadyEnrolledError(cause)) {
        // Setup collided with an authenticator the account already holds —
        // set up on another device, or an earlier attempt that landed
        // after all. Re-read the factor list: if a verified factor is
        // really there, the host moves the person to the step that fits
        // (entering its code) instead of stranding them on a setup screen
        // that can never succeed. If none shows, the honest message stays
        // below and the retry button re-runs the stale-factor cleanup.
        const lists = await listTotpFactors();
        if (lists?.verified.length && onAlreadyEnrolled) {
          onAlreadyEnrolled();
          return;
        }
      }
      setLoadError((cause as Error).message);
    }
  }, [onAlreadyEnrolled]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
  }, [start]);

  const dark = variant === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyTotp(enrollment.factorId, code);
      onEnrolled();
    } catch (cause) {
      setError((cause as Error).message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <div
          role="alert"
          className={`rounded-2xl border p-4 text-sm ${
            dark
              ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {loadError}
        </div>
        <button
          type="button"
          onClick={() => void start()}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-sun-orange px-4 text-sm font-bold text-white transition-all hover:bg-sun-orange-600 cursor-pointer"
        >
          Try setting up again
        </button>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="flex items-center gap-3 py-4" role="status">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-sun-orange border-t-transparent" />
        <span className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
          Preparing your authenticator setup…
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-sun-orange" aria-hidden="true" />
        <p className={`text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
          Open your authenticator app (Google Authenticator, Microsoft Authenticator, Authy…) and scan
          this code. Then enter the 6-digit code the app shows to switch two-factor protection on.
        </p>
      </div>

      <div className="flex justify-center">
        <img
          src={enrollment.qrCode}
          alt="Authenticator setup QR code"
          className="h-44 w-44 rounded-2xl bg-white p-2"
        />
      </div>

      <div
        className={`rounded-2xl border p-3.5 text-center ${
          dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <p className={`text-[11px] font-bold uppercase tracking-widest ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Cannot scan? Type this secret instead
        </p>
        <p className={`mt-1 break-all font-mono text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
          {enrollment.secret}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className={`rounded-2xl border p-3.5 text-xs font-medium ${
            dark
              ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {error}
        </div>
      )}

      <OtpInput value={code} onChange={setCode} disabled={busy} label="Code digit" />

      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="mt-1 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-sun-orange px-4 text-sm font-bold text-white transition-all hover:bg-sun-orange-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {busy ? 'Switching on…' : 'Verify and switch on'}
      </button>
    </form>
  );
};
