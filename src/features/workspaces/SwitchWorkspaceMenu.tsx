import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Bike, Check, LifeBuoy, ShieldCheck, ShoppingBag, Store } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import {
  getDestinations,
  setLastWorkspace,
  workspaceIdForPath,
  type WorkspaceId,
} from '../auth/api/destinations';

const ICONS: Record<WorkspaceId, React.ReactNode> = {
  storefront: <ShoppingBag className="h-4 w-4" aria-hidden="true" />,
  vendor: <Store className="h-4 w-4" aria-hidden="true" />,
  rider: <Bike className="h-4 w-4" aria-hidden="true" />,
  support: <LifeBuoy className="h-4 w-4" aria-hidden="true" />,
  admin: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
};

/**
 * SwitchWorkspaceMenu — the header menu every workspace shell carries
 * (Batch 63). It lists the OTHER workspaces the signed-in account's roles
 * allow — computed by the same destinations helper as the login flow — and
 * switches with a plain navigation: the session is shared, so switching
 * never asks for a password again. Single-destination accounts never see
 * it. Switching also records the last-used workspace, which is what the
 * post-login "always open my last workspace" preference reads.
 */
export const SwitchWorkspaceMenu: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  if (!user) return null;

  const destinations = getDestinations(user);
  if (destinations.length <= 1) return null;

  const currentId = workspaceIdForPath(location.pathname) ?? 'storefront';

  const go = (path: string) => {
    setLastWorkspace(user.id, path);
    setOpen(false);
    navigate(path);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 shadow-2xs cursor-pointer"
        title="Switch workspace"
      >
        <ArrowLeftRight className="h-3.5 w-3.5 text-sun-orange" aria-hidden="true" />
        <span className="hidden xl:inline">Switch workspace</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch workspace"
          className="absolute right-0 top-10 z-50 w-64 rounded-2xl border border-white/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-2xl p-1.5 animate-in fade-in slide-in-from-top-1"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Your workspaces
          </div>
          {destinations.map((destination) => {
            const isCurrent = destination.id === currentId;
            return (
              <button
                key={destination.id}
                type="button"
                role="menuitem"
                disabled={isCurrent}
                onClick={() => go(destination.path)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  isCurrent
                    ? 'text-slate-400 dark:text-slate-500 cursor-default'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                }`}
              >
                <span className="text-sun-orange">{ICONS[destination.id]}</span>
                <span className="flex-1">{destination.label}</span>
                {isCurrent && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
