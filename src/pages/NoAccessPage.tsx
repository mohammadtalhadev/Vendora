import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShieldAlert, Store } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { safeRedirect } from '../lib/safe-redirect';
import { workspaceIdForPath } from '../features/auth/api/destinations';
import { Button } from '../components/ui/button';

/**
 * NoAccessPage — the dead end a signed-in user reaches when the link they
 * followed points at a workspace their account does not have.
 *
 * It replaces the old behaviour — bouncing back into the route guard,
 * which bounced them here again — with a plain explanation and the right
 * next step. Seller targets get seller wording and the application link;
 * staff targets deliberately get GENERIC wording that does not describe
 * the area at all, mirroring the staff portal's own denial.
 */
export const NoAccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const target = safeRedirect(searchParams.get('target'), '/');
  const workspace = workspaceIdForPath(target);
  const isSellerTarget = workspace === 'vendor';

  const handleDifferentAccount = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <ShieldAlert className="h-8 w-8" aria-hidden="true" />
      </div>

      <h1 className="mt-6 font-outfit text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {isSellerTarget ? 'No Seller Console access' : 'You don’t have access to that area'}
      </h1>

      {isSellerTarget ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Your account does not have Seller Console access
          {user ? (
            <>
              {' '}
              (<span className="font-semibold">{user.email}</span>)
            </>
          ) : null}
          . If you applied to sell on Vendora, your application may still be under review — you can
          check its status any time. If you have not applied yet, start your seller application
          first; the console opens as soon as it is approved.
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          The link you followed leads somewhere your account
          {user ? (
            <>
              {' '}
              (<span className="font-semibold">{user.email}</span>)
            </>
          ) : null}{' '}
          is not able to open. Nothing is broken — that area is only available to accounts it was
          issued to. If you believe you should have access, contact a Vendora administrator.
        </p>
      )}

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {isSellerTarget && (
          <Link to="/become-a-seller">
            <Button variant="default" size="lg">
              <Store className="h-4 w-4" aria-hidden="true" />
              <span>Apply to sell on Vendora</span>
            </Button>
          </Link>
        )}
        <Link to="/">
          <Button variant={isSellerTarget ? 'outline' : 'default'} size="lg">
            <span>Go to the storefront</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>

      {user && (
        <button
          type="button"
          onClick={handleDifferentAccount}
          className="mt-6 text-xs font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-white"
        >
          Sign in with a different account
        </button>
      )}
    </div>
  );
};
