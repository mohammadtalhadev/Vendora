import React from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  History,
  Wallet,
  UserCheck,
  ExternalLink,
  ChevronsUpDown,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { useAuthStore } from '../../../store/auth-store';
import { useRiderBoard } from '../hooks/useRider';
import { cn } from '../../../lib/utils';

export interface RiderNavProps {
  className?: string;
  onNavigate?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const RiderNav: React.FC<RiderNavProps> = ({ className, onNavigate }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useAuthStore();
  // The queue badge is the board's own count of open work - parcels assigned and
  // parcels already in flight - so the sidebar cannot show a number the board
  // itself disagrees with. A zero renders nothing.
  const board = useRiderBoard();
  const queueCount = board.data ? board.data.counts.assigned + board.data.counts.inFlight : 0;
  const rider = board.data?.rider ?? null;

  const navSections: NavSection[] = [
    {
      title: 'Deliveries',
      items: [
        { to: '/rider', label: 'Dashboard', icon: LayoutDashboard, end: true },
        {
          to: '/rider/deliveries',
          label: 'My Deliveries',
          icon: Truck,
          badge: queueCount > 0 ? String(queueCount) : undefined,
          badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        { to: '/rider/history', label: 'History', icon: History, end: true },
      ],
    },
    {
      title: 'Earnings & Account',
      items: [
        { to: '/rider/earnings', label: 'Earnings', icon: Wallet, end: true },
        { to: '/rider/profile', label: 'Profile', icon: UserCheck, end: true },
      ],
    },
  ];

  // Strictly ensures only ONE navigation item is active at a time
  const isItemActive = (item: NavItem): boolean => {
    if (currentPath === item.to) {
      return true;
    }
    // The deliveries section also owns the single-parcel route (/rider/deliveries/:id).
    if (item.to === '/rider/deliveries') {
      return currentPath.startsWith('/rider/deliveries');
    }
    if (item.end) {
      return currentPath === item.to;
    }
    return currentPath.startsWith(item.to + '/');
  };

  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void signOut().then(() => navigate('/'));
  };

  return (
    <nav
      className={cn('flex flex-col h-full w-full overflow-hidden', className)}
      aria-label="Rider Portal Navigation"
    >
      {/* ── 1. Top Pinned Section: Homepage Logo + Hover Effect (shrink-0) ── */}
      <div className="shrink-0 border-b border-slate-200/60 dark:border-white/10 px-4 py-3.5 bg-[var(--panel-sidebar-bg,rgba(255,255,255,0.65))] dark:bg-slate-900/65">
        <Link
          to="/rider"
          aria-label="Vendora Rider Home"
          className="flex items-center justify-between focus:outline-none group transition-all"
          title="Vendora Rider Hub"
        >
          <div className="flex flex-col">
            <span className="font-outfit text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none group-hover:text-sun-orange transition-colors">
              Vendora<span className="inline-block h-2 w-2 rounded-full bg-sun-orange group-hover:bg-slate-900 dark:group-hover:bg-white ml-0.5 transition-all duration-300 group-hover:scale-125" aria-hidden="true" />
            </span>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wider mt-1 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
              Rider Hub
            </span>
          </div>
          <span className="inline-flex items-center rounded-md bg-orange-500/10 dark:bg-orange-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sun-orange-600 dark:text-sun-orange border border-orange-500/20 group-hover:border-orange-500/40 transition-colors">
            Rider
          </span>
        </Link>
      </div>

      {/* ── 2. Center Scrollable Section: Only navigation options & rider capsule scroll (flex-1 overflow-y-auto) ── */}
      <div
        data-lenis-prevent
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-3 py-2 space-y-3"
      >
        {/* Rider Capsule */}
        <div className="relative rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 font-black text-emerald-600 border border-emerald-100 dark:border-emerald-900/40 text-xs uppercase">
              <Truck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{rider?.fullName || 'Delivery Rider'}</h2>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="truncate">{user?.email ?? ''}</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between text-[11px]">
            <Link
              to="/"
              className="inline-flex items-center gap-1 font-semibold text-sun-orange-600 dark:text-sun-orange hover:underline"
            >
              <span>View Storefront</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
            {rider && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-400 capitalize">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    rider.status === 'available'
                      ? 'bg-emerald-500'
                      : rider.status === 'busy'
                        ? 'bg-sun-orange'
                        : 'bg-slate-400'
                  )}
                  aria-hidden="true"
                />
                {rider.status}
              </span>
            )}
          </div>
        </div>

        {/* Grouped Navigation Sections */}
        <div className="space-y-3">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {section.title}
              </div>
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                const active = isItemActive(item);

                return (
                  <NavLink
                    key={`${item.to}-${item.label}-${idx}`}
                    to={item.to}
                    end={item.end}
                    onClick={() => {
                      if (onNavigate) onNavigate();
                    }}
                    className={cn(
                      'group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all select-none',
                      active
                        ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/10 text-sun-orange-600 dark:text-sun-orange font-bold border border-orange-500/20 shadow-2xs backdrop-blur-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          active
                            ? 'text-sun-orange-600 dark:text-sun-orange'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-sun-orange'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.2 text-[10px] font-bold',
                          item.badgeColor ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Bottom Pinned Section: Fixed rider profile card (shrink-0 mt-auto) ── */}
      <div className="shrink-0 mt-auto border-t border-slate-200/60 dark:border-white/10 p-2.5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xs">
        <Link
          to="/rider/profile"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-xl p-1.5 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60 group"
          title="View Rider Profile"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-600 shadow-xs group-hover:scale-105 transition-transform">
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {user?.name ?? 'Rider User'}
              </p>
              <p className="truncate text-[10px] text-slate-400 leading-tight">
                {user?.email ?? ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          </div>
        </Link>
      </div>
    </nav>
  );
};
