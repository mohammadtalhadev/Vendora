import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Download,
  Gift,
  Heart,
  LifeBuoy,
  MapPin,
  Package,
  RotateCcw,
  Scale,
  ShieldCheck,
  Star,
  User as UserIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import { useWishlistStore } from '../../store/wishlist-store';

/**
 * AccountLayout — the ONE shell for the whole customer account area.
 *
 * Profile, orders, wishlist, downloads, addresses and disputes all render
 * inside this layout (see the pathless route group in app/router.tsx), so
 * moving between account sections swaps only the right-hand content: the
 * sidebar — user summary plus section nav — stays mounted instead of the
 * whole page being replaced, which is what made wishlist/downloads feel
 * like leaving the account area entirely.
 *
 * The container is the storefront canon (w-full max-w-[1600px], same
 * gutters as Login/Register), so account pages are exactly as wide as the
 * rest of the shop. On mobile the sidebar collapses to a compact summary
 * row with a horizontally scrolling section nav above the content.
 */

interface AccountNavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  /** Route match, hand-rolled because two items share the /account prefix. */
  isActive: (pathname: string) => boolean;
  badge?: string;
}

const NAV_ITEMS: AccountNavItem[] = [
  {
    to: '/account/profile',
    label: 'Profile & Settings',
    icon: <UserIcon className="h-4 w-4 shrink-0" aria-hidden="true" />,
    isActive: (p) => p === '/account/profile',
  },
  {
    to: '/orders',
    label: 'My Orders',
    icon: <Package className="h-4 w-4 shrink-0" aria-hidden="true" />,
    isActive: (p) => p === '/orders' || p.startsWith('/orders/'),
  },
  {
    to: '/wishlist',
    label: 'My Wishlist',
    icon: <Heart className="h-4 w-4 shrink-0" aria-hidden="true" />,
    isActive: (p) => p === '/wishlist',
  },
  {
    to: '/downloads',
    label: 'My Downloads',
    icon: <Download className="h-4 w-4 shrink-0" aria-hidden="true" />,
    isActive: (p) => p === '/downloads',
  },
  {
    to: '/account/addresses',
    label: 'Addresses',
    icon: <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />,
    isActive: (p) => p === '/account/addresses',
  },
  {
    to: '/disputes',
    label: 'Disputes & Claims',
    icon: <Scale className="h-4 w-4 shrink-0" aria-hidden="true" />,
    isActive: (p) => p === '/disputes' || p.startsWith('/disputes/'),
  },
  {
    to: '/account/reviews',
    label: 'My Reviews',
    icon: <Star className="h-4 w-4 shrink-0" aria-hidden="true" />,
    isActive: (p) => p === '/account/reviews',
  },
  {
    to: '/account/returns',
    label: 'My Returns',
    icon: <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />,
    isActive: (p) => p === '/account/returns',
  },
  {
    to: '/account/rewards',
    label: 'Rewards & Gift Cards',
    icon: <Gift className="h-4 w-4 shrink-0" aria-hidden="true" />,
    isActive: (p) => p === '/account/rewards',
  },
  {
    to: '/account/support',
    label: 'Support Tickets',
    icon: <LifeBuoy className="h-4 w-4 shrink-0" aria-hidden="true" />,
    isActive: (p) => p === '/account/support',
  },
  {
    to: '/account/settings',
    label: 'Settings & Security',
    icon: <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />,
    isActive: (p) => p === '/account/settings',
  },
];

export const AccountLayout: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const { pathname } = useLocation();

  const items = NAV_ITEMS.map((item) =>
    item.to === '/wishlist' && wishlistCount > 0
      ? { ...item, badge: `${wishlistCount} item${wishlistCount === 1 ? '' : 's'}` }
      : item,
  );

  const isSeller = Boolean(user && (user.roles.includes('vendor') || user.vendorId));

  return (
    <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
        {/* Sidebar: summary + nav. Stays mounted across every account route. */}
        <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Account">
          <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 rounded-2xl overflow-hidden border-2 border-sun-orange/70 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-outfit text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user ? user.name : 'Guest'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user ? user.email : 'You are not signed in'}
                </p>
                {user && (
                  <span className="mt-1 inline-flex rounded-full bg-orange-100 dark:bg-orange-950/50 px-2 py-0.5 text-[10px] font-bold text-sun-orange dark:text-orange-300">
                    {isSeller ? 'Seller account' : 'Customer account'}
                  </span>
                )}
              </div>
            </div>
            {!user && (
              <Link
                to="/login"
                className="mt-3 inline-flex rounded-xl bg-sun-orange px-4 py-2 text-xs font-bold text-white hover:bg-sun-orange-600 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>

          <nav
            aria-label="Account sections"
            className="flex gap-1.5 overflow-x-auto rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-2 shadow-sm lg:flex-col lg:overflow-visible lg:p-3"
          >
            {items.map((item) => {
              const active = item.isActive(pathname);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-2xl px-4 py-3 text-xs font-semibold transition-all lg:shrink lg:whitespace-normal ${
                    active
                      ? 'bg-gradient-to-r from-sun-orange to-[#FF9040] text-white font-bold shadow-md shadow-orange-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold ${active ? 'text-white/90' : 'text-rose-500 dark:text-rose-400'}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Section content: the only part that swaps between account routes. */}
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AccountLayout;
