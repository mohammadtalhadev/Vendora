import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Bike, LifeBuoy, ShieldCheck, ShoppingBag, Store } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import {
  getAutoWorkspace,
  getDestinations,
  getLastWorkspace,
  isAccountBlocked,
  setAutoWorkspace,
  setLastWorkspace,
  type WorkspaceId,
} from '../features/auth/api/destinations';

const ICONS: Record<WorkspaceId, React.ReactNode> = {
  storefront: <ShoppingBag className="h-6 w-6" aria-hidden="true" />,
  vendor: <Store className="h-6 w-6" aria-hidden="true" />,
  rider: <Bike className="h-6 w-6" aria-hidden="true" />,
  support: <LifeBuoy className="h-6 w-6" aria-hidden="true" />,
  admin: <ShieldCheck className="h-6 w-6" aria-hidden="true" />,
};

/**
 * ChooseWorkspacePage — where a multi-destination account picks where it
 * is going (Batch 63). Only the destinations the profile's roles allow are
 * rendered — staff consoles appear solely for admin/support role holders.
 *
 * The profile is re-read on arrival (refreshUser) so a seller approved
 * minutes ago sees the Seller Console without signing out and back in:
 * roles come from the freshly loaded profile, never from a stale cache.
 * Picking a card remembers it as the last workspace; with "Always open my
 * last workspace" on, later sign-ins skip this screen entirely.
 */
export const ChooseWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, refreshUser, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(true);
  // The stored preference is the default; a toggle this visit overrides it.
  const [autoOverride, setAutoOverride] = useState<boolean | null>(null);
  const refreshedRef = useRef(false);

  useEffect(() => {
    if (refreshedRef.current) return;
    refreshedRef.current = true;
    void Promise.resolve(refreshUser?.())
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [refreshUser]);

  if (loading || refreshing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sun-orange border-t-transparent" />
          <span className="text-xs font-bold text-slate-400">Loading your workspaces...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isAccountBlocked(user)) return <Navigate to="/account-blocked" replace />;

  const destinations = getDestinations(user);
  if (destinations.length <= 1) {
    return <Navigate to={destinations[0]?.path ?? '/'} replace />;
  }

  const lastPath = getLastWorkspace(user.id);
  const lastDestination = destinations.find((d) => d.path === lastPath);
  const auto = autoOverride ?? getAutoWorkspace(user.id);

  const pick = (path: string) => {
    setLastWorkspace(user.id, path);
    navigate(path, { replace: true });
  };

  const toggleAuto = (on: boolean) => {
    setAutoOverride(on);
    setAutoWorkspace(user.id, on);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="text-center">
        <h1 className="font-outfit text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Where are you headed, {user.name.split(' ')[0]}?
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Your account has access to more than one Vendora workspace. Pick one — you can switch any
          time from the Switch workspace menu inside each console, without signing in again.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {destinations.map((destination) => (
          <button
            key={destination.id}
            type="button"
            onClick={() => pick(destination.path)}
            className="group flex items-start gap-4 rounded-3xl border border-slate-200 bg-white/80 p-5 text-left shadow-xs transition-all hover:border-sun-orange hover:shadow-md dark:border-white/10 dark:bg-slate-900/70 cursor-pointer"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-orange-50 text-sun-orange dark:bg-orange-950/40">
              {ICONS[destination.id]}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-outfit text-base font-bold text-slate-900 dark:text-white">
                {destination.label}
                {lastDestination?.id === destination.id && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    Last used
                  </span>
                )}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {destination.description}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-sun-orange">
                Open
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </span>
          </button>
        ))}
      </div>

      <label className="mt-8 flex cursor-pointer items-center justify-center gap-2.5 text-sm text-slate-600 dark:text-slate-300 select-none">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => toggleAuto(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 accent-[#FF6B35]"
        />
        <span>
          Always open my last workspace
          <span className="block text-xs text-slate-400">
            Skip this screen on future sign-ins and go straight to the workspace you used last.
          </span>
        </span>
      </label>

      <p className="mt-8 text-center text-xs text-slate-400">
        Not you?{' '}
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate('/login', { replace: true });
          }}
          className="font-bold text-sun-orange hover:text-sun-orange-600 cursor-pointer"
        >
          Sign in with a different account
        </button>
      </p>
    </div>
  );
};
