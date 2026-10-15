import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { isAccountBlocked } from '../features/auth/api/destinations';
import { Button } from '../components/ui/button';

/**
 * AccountBlockedPage — where a suspended or banned account lands from
 * every guarded route (Batch 63). The page is deliberately UNguarded: it
 * is the one screen a blocked account can always reach, it explains the
 * state in plain language, and it offers sign-out so the session is never
 * a trap. Public pages stay browsable; every workspace stays closed.
 */
export const AccountBlockedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sun-orange border-t-transparent" />
          <span className="text-xs font-bold text-slate-400">Checking your account...</span>
        </div>
      </div>
    );
  }

  if (!isAccountBlocked(user)) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-20 text-center">
        <h1 className="font-outfit text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Your account is active
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          There is no restriction on this account — you reached this page by following an old link.
        </p>
        <div className="mt-8">
          <Link to="/">
            <Button variant="default" size="lg">
              <span>Go to the storefront</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const banned = user?.accountStatus === 'banned';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <ShieldAlert className="h-8 w-8" aria-hidden="true" />
      </div>

      <h1 className="mt-6 font-outfit text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {banned ? 'This account has been closed' : 'Your account is suspended'}
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {banned
          ? 'This account can no longer sign in to any Vendora workspace. Orders already placed are unaffected and will be completed or refunded as normal.'
          : 'While your account is suspended, Vendora workspaces — shopping account, seller, rider and support consoles — are unavailable. Orders already placed are unaffected.'}
      </p>

      {user?.accountStatusReason && (
        <div className="mt-5 w-full rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-left dark:border-rose-900/40 dark:bg-rose-950/30">
          <div className="mb-1 text-xs font-semibold text-rose-900 dark:text-rose-200">
            Reason recorded:
          </div>
          <p className="text-xs leading-relaxed text-rose-700 dark:text-rose-300">
            {user.accountStatusReason}
          </p>
        </div>
      )}

      <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
        Think this is a mistake? Contact Vendora support from the{' '}
        <Link to="/help" className="font-bold text-sun-orange hover:text-sun-orange-600">
          help centre
        </Link>{' '}
        and mention the email address on the account.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button variant="default" size="lg" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Sign Out</span>
        </Button>
        <Link to="/">
          <Button variant="outline" size="lg">
            <span>Browse the storefront</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
