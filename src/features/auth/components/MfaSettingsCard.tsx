import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import {
  clearStepUp,
  getAalLevel,
  listTotpFactors,
  markStepUpVerified,
  needsStepUp,
  unenrollTotp,
  type TotpFactor,
} from '../api/mfa';
import { StepUpDialog } from './StepUpDialog';
import { TotpEnrollForm } from './TotpEnrollForm';

/**
 * MfaSettingsCard — the account's two-factor status and controls (Batch 64):
 * set up an authenticator, or remove it. Removal is itself a sensitive
 * action, so it requires an aal2 session with a fresh code proof (the
 * step-up dialog opens first when either is missing) — a hijacked aal1
 * session cannot quietly switch the second factor off.
 *
 * The card intentionally depends only on the MFA API layer, never on the
 * auth context, so it drops into any settings surface — the admin profile's
 * security tab and the shared account settings page alike.
 */
interface MfaSettingsCardProps {
  /** The hosting page's section/card classes. */
  className?: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; verified: TotpFactor | null };

export const MfaSettingsCard: React.FC<MfaSettingsCardProps> = ({ className }) => {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [settingUp, setSettingUp] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removeArmed, setRemoveArmed] = useState(false);
  const [removing, setRemoving] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    const lists = await listTotpFactors();
    if (!mountedRef.current) return;
    if (!lists) {
      setState({ kind: 'unavailable' });
      return;
    }
    setState({ kind: 'ready', verified: lists.verified[0] ?? null });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const doRemove = async (factorId: string) => {
    setRemoving(true);
    setError(null);
    try {
      await unenrollTotp(factorId);
      clearStepUp();
      setNotice(
        'Two-factor authentication is off. Staff consoles will ask you to set an authenticator up again at your next staff sign-in.',
      );
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setRemoving(false);
    }
  };

  const handleRemove = async (factor: TotpFactor) => {
    const level = await getAalLevel();
    if (level === 'aal2' && !needsStepUp()) {
      void doRemove(factor.id);
      return;
    }
    setRemoveArmed(true);
  };

  const verified = state.kind === 'ready' ? state.verified : null;

  return (
    <section className={className} aria-label="Two-factor authentication">
      <h2 className="flex items-center gap-2 font-outfit text-sm font-black text-slate-900 dark:text-white">
        <ShieldCheck className="h-4 w-4 text-sun-orange" aria-hidden="true" />
        Two-factor authentication (2FA)
      </h2>

      {state.kind === 'loading' && (
        <p className="text-xs text-slate-500" role="status">
          Checking your authenticator status…
        </p>
      )}

      {state.kind === 'unavailable' && (
        <p className="leading-relaxed text-slate-600 dark:text-slate-300">
          Two-factor settings could not be loaded right now. Reload the page to try again — your
          existing protection, if any, is unchanged.
        </p>
      )}

      {notice && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[11px] font-bold text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[11px] font-bold text-rose-800">
          {error}
        </p>
      )}

      {state.kind === 'ready' && verified && !settingUp && (
        <>
          <p className="leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="font-bold text-emerald-700">On.</span> An authenticator app is protecting
            this account
            {verified.createdAt
              ? ` (set up ${new Date(verified.createdAt).toLocaleDateString()})`
              : ''}
            . Staff consoles ask for its code at sign-in, and again before sensitive actions.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={removing}
              onClick={() => void handleRemove(verified)}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-bold text-rose-700 transition-all hover:bg-rose-100 disabled:opacity-60 cursor-pointer"
            >
              <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
              {removing ? 'Removing…' : 'Remove authenticator'}
            </button>
          </div>
        </>
      )}

      {state.kind === 'ready' && !verified && !settingUp && (
        <>
          <p className="leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white">Not set up.</span> Staff accounts must enrol an
            authenticator app — if you skip it here, the staff sign-in will walk you through it before
            the console opens.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setError(null);
                setSettingUp(true);
              }}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 cursor-pointer"
            >
              Set up an authenticator
            </button>
          </div>
        </>
      )}

      {settingUp && (
        <div className="max-w-md">
          <TotpEnrollForm
            variant="light"
            onEnrolled={() => {
              // The setup just verified a code, so the step-up proof is fresh.
              markStepUpVerified();
              setSettingUp(false);
              setNotice('Two-factor authentication is on for this account.');
              void load();
            }}
          />
          <button
            type="button"
            onClick={() => setSettingUp(false)}
            className="mt-3 text-xs font-bold text-slate-500 underline cursor-pointer"
          >
            Cancel setup
          </button>
        </div>
      )}

      {verified && (
        <StepUpDialog
          open={removeArmed}
          onOpenChange={setRemoveArmed}
          title="Confirm before removing 2FA"
          description="Removing your authenticator is a sensitive change, so it needs a fresh code from that same authenticator first."
          onVerified={() => {
            setRemoveArmed(false);
            void doRemove(verified.id);
          }}
        />
      )}
    </section>
  );
};
