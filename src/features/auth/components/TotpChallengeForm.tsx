import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { OtpInput } from '../../../components/ui/otp-input';
import { listTotpFactors, verifyTotp } from '../api/mfa';

/**
 * TotpChallengeForm — the "enter the code from your authenticator app" step
 *. Shared by the staff portal's post-password step and the in-app
 * step-up dialog: it finds the account's verified factor itself, runs the
 * challenge + verify, and reports success through `onVerified`. A wrong code
 * is shown in place and the step simply waits for the next code — the user
 * is never signed out for a typo.
 */
interface TotpChallengeFormProps {
  onVerified: () => void;
  /** 'dark' for the slate staff portal, 'light' for in-console dialogs. */
  variant?: 'dark' | 'light';
  /** Shown when the account turns out to have no verified factor to challenge. */
  onNeedEnroll?: () => void;
}

export const TotpChallengeForm: React.FC<TotpChallengeFormProps> = ({
  onVerified,
  variant = 'light',
  onNeedEnroll,
}) => {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      const lists = await listTotpFactors();
      const first = lists?.verified[0];
      if (first) {
        setFactorId(first.id);
      } else if (lists && onNeedEnroll) {
        onNeedEnroll();
      } else {
        setLoadFailed(true);
      }
    })();
  }, [onNeedEnroll]);

  const dark = variant === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyTotp(factorId, code);
      onVerified();
    } catch (cause) {
      setError((cause as Error).message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (loadFailed) {
    return (
      <div
        role="alert"
        className={`rounded-2xl border p-4 text-sm ${
          dark
            ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
            : 'border-rose-200 bg-rose-50 text-rose-800'
        }`}
      >
        No authenticator is set up on this account yet, so there is no code to check. Set one up
        first, then come back to this step.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${dark ? 'text-sun-orange' : 'text-sun-orange'}`} aria-hidden="true" />
        <p className={`text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
          Enter the 6-digit code from your authenticator app to finish proving it is you.
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

      <OtpInput value={code} onChange={setCode} disabled={busy || !factorId} label="Code digit" />

      <button
        type="submit"
        disabled={busy || !factorId || code.length !== 6}
        className="mt-1 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-sun-orange px-4 text-sm font-bold text-white transition-all hover:bg-sun-orange-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {busy ? 'Checking code…' : factorId ? 'Verify code' : 'Loading your authenticator…'}
      </button>
    </form>
  );
};
