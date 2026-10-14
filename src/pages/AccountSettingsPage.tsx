import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  Mail,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import { signOutEverywhere, updatePassword } from '../features/auth/api/session';
import { useAuthStore } from '../store/auth-store';

/**
 * Account Settings & Security (/account/settings). Password changes go
 * through the same tested `updatePassword` helper the auth API exposes;
 * "sign out everywhere" revokes every session via Supabase's global scope.
 * Account deletion has no self-serve endpoint by design — it is handled by
 * the admin team, and this page says so instead of faking a button.
 */
export const AccountSettingsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordState, setPasswordState] = useState<
    | { kind: 'idle' }
    | { kind: 'saving' }
    | { kind: 'saved' }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordState({ kind: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordState({ kind: 'error', message: 'The two passwords do not match.' });
      return;
    }
    setPasswordState({ kind: 'saving' });
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordState({ kind: 'saved' });
    } catch (err) {
      setPasswordState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not update your password.',
      });
    }
  };

  const handleSignOutEverywhere = async () => {
    setSigningOutAll(true);
    setSignOutError(null);
    try {
      await signOutEverywhere();
      navigate('/login', { replace: true });
    } catch (err) {
      setSigningOutAll(false);
      setConfirmSignOutAll(false);
      setSignOutError(
        err instanceof Error ? err.message : 'Could not sign out other sessions.',
      );
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-sun-orange focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-outfit text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
          Settings &amp; Security
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Your sign-in email, password, and sessions.
        </p>
      </div>

      {/* Sign-in email */}
      <section className="rounded-3xl border border-white/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <h2 className="flex items-center gap-2 font-outfit text-base font-black text-slate-900 dark:text-white">
          <Mail className="h-5 w-5 text-sun-orange" aria-hidden="true" />
          Sign-in email
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          You sign in as{' '}
          <span className="font-bold text-slate-900 dark:text-white">
            {user?.email ?? '—'}
          </span>
          . Email changes are made from your{' '}
          <Link to="/account/profile" className="font-semibold text-sun-orange hover:underline">
            Profile
          </Link>{' '}
          — customers confirm the new address through a link we email them, and vendor
          emails stay locked to the store identity (our admin team handles those).
        </p>
      </section>

      {/* Change password */}
      <section className="rounded-3xl border border-white/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <h2 className="flex items-center gap-2 font-outfit text-base font-black text-slate-900 dark:text-white">
          <KeyRound className="h-5 w-5 text-sun-orange" aria-hidden="true" />
          Change password
        </h2>
        <form onSubmit={handlePasswordSubmit} className="mt-4 grid gap-3 sm:max-w-md">
          <div>
            <label
              htmlFor="settings-new-password"
              className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              New password
            </label>
            <input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (passwordState.kind !== 'idle') setPasswordState({ kind: 'idle' });
              }}
              placeholder="At least 8 characters"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="settings-confirm-password"
              className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              Confirm new password
            </label>
            <input
              id="settings-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat the new password"
              className={inputClass}
            />
          </div>
          {passwordState.kind === 'error' && (
            <p role="alert" className="flex items-start gap-2 text-xs font-semibold text-rose-600">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {passwordState.message}
            </p>
          )}
          {passwordState.kind === 'saved' && (
            <p role="status" className="flex items-start gap-2 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Password updated. Use it the next time you sign in.
            </p>
          )}
          <button
            type="submit"
            disabled={passwordState.kind === 'saving'}
            className="mt-1 w-fit cursor-pointer rounded-full bg-sun-orange px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            {passwordState.kind === 'saving' ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

      {/* Sessions */}
      <section className="rounded-3xl border border-white/80 bg-white/80 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <h2 className="flex items-center gap-2 font-outfit text-base font-black text-slate-900 dark:text-white">
          <LogOut className="h-5 w-5 text-sun-orange" aria-hidden="true" />
          Sessions
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Signed in somewhere you do not recognise, or on a shared device? Sign your
          account out on every device at once — you will need to sign in again here too.
        </p>
        {signOutError && (
          <p role="alert" className="mt-3 flex items-start gap-2 text-xs font-semibold text-rose-600">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {signOutError}
          </p>
        )}
        {confirmSignOutAll ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Sign out on all devices?
            </span>
            <button
              type="button"
              onClick={handleSignOutEverywhere}
              disabled={signingOutAll}
              className="cursor-pointer rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700 active:scale-95 disabled:opacity-60"
            >
              {signingOutAll ? 'Signing out…' : 'Yes, sign out everywhere'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmSignOutAll(false)}
              disabled={signingOutAll}
              className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:border-slate-400 dark:border-white/15 dark:bg-transparent dark:text-slate-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmSignOutAll(true)}
            className="mt-4 cursor-pointer rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 shadow-xs transition-all hover:border-rose-400 hover:text-rose-600 sm:text-sm dark:border-white/15 dark:bg-transparent dark:text-slate-100"
          >
            Sign out on all devices
          </button>
        )}
      </section>

      {/* Danger zone */}
      <section className="rounded-3xl border border-rose-200/80 bg-rose-50/60 p-6 dark:border-rose-900/40 dark:bg-rose-950/20">
        <h2 className="flex items-center gap-2 font-outfit text-base font-black text-slate-900 dark:text-white">
          <ShieldAlert className="h-5 w-5 text-rose-500" aria-hidden="true" />
          Delete account
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Account deletion is permanent and is handled by our admin team, so an account
          is never wiped by a stray click. If you want your account and personal data
          deleted, contact support and we will process it for you.
        </p>
        <Link
          to="/contact"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-5 py-2.5 text-xs font-bold text-rose-600 shadow-xs transition-all hover:bg-rose-50 sm:text-sm dark:border-rose-800 dark:bg-transparent"
        >
          Contact support about deletion
        </Link>
      </section>
    </div>
  );
};

export default AccountSettingsPage;
