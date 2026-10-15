import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Store,
  ShieldCheck,
  PlusCircle,
  ShoppingBag,
  Star,
  Users,
  Layers,
  Percent,
  BarChart3,
  RotateCcw,
  Scale,
  Wallet,
  FolderOpen,
  Bell,
  Settings,
  UserCheck,
  ChevronsUpDown,
  LogOut,
  Sparkles,
  Truck,
  Landmark,
  ShieldAlert,
  FileCode,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../lib/auth-context';
import { useAuthStore } from '../../../store/auth-store';

export interface AdminNavProps {
  className?: string;
  onNavigate?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  accessibleSubtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        to: '/admin',
        label: 'Dashboard',
        accessibleSubtitle: 'Overview',
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    title: 'Products',
    items: [
      {
        to: '/admin/products',
        label: 'Product Moderation',
        icon: ShieldCheck,
        end: true,
      },
      {
        to: '/admin/inventory',
        label: 'Inventory & Stock',
        accessibleSubtitle: 'Stocks Console',
        icon: Boxes,
      },
      {
        to: '/admin/add-product',
        label: 'Add Product',
        accessibleSubtitle: 'Create Product',
        icon: PlusCircle,
        end: true,
      },
      {
        to: '/admin/categories',
        label: 'Categories',
        icon: Layers,
      },
      {
        to: '/admin/brands',
        label: 'Brand Registry',
        accessibleSubtitle: 'Brand Gating & IP',
        icon: ShieldAlert,
      },
      {
        to: '/admin/media',
        label: 'Files & Media',
        accessibleSubtitle: 'Asset Repository',
        icon: FolderOpen,
      },
      {
        to: '/admin/cms',
        label: 'CMS & Banners',
        accessibleSubtitle: 'Homepage & Deals',
        icon: Sparkles,
      },
    ],
  },
  {
    title: 'People',
    items: [
      {
        to: '/admin/vendors',
        label: 'Vendors',
        accessibleSubtitle: 'Vendor Approvals',
        icon: Store,
      },
      {
        to: '/admin/users',
        label: 'Users',
        icon: Users,
      },
    ],
  },
  {
    title: 'Orders & Service',
    items: [
      {
        to: '/admin/orders',
        label: 'Orders',
        icon: ShoppingBag,
      },
      {
        to: '/admin/returns',
        label: 'Returns',
        accessibleSubtitle: 'Returns & Refunds',
        icon: RotateCcw,
      },
      {
        to: '/admin/disputes',
        label: 'Disputes',
        accessibleSubtitle: 'Dispute Resolution',
        icon: Scale,
      },
      {
        to: '/admin/reviews',
        label: 'Reviews',
        accessibleSubtitle: 'Review Moderation',
        icon: Star,
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        to: '/admin/commission',
        label: 'Commission',
        accessibleSubtitle: 'Commission Settings',
        icon: Percent,
      },
      {
        to: '/admin/payouts',
        label: 'Payouts',
        accessibleSubtitle: 'Vendor Payouts & Finance',
        icon: Wallet,
      },
      {
        to: '/admin/reports',
        label: 'Reports',
        icon: BarChart3,
      },
      {
        to: '/admin/compliance',
        label: 'Tax Compliance',
        accessibleSubtitle: 'Facilitator & 1099-K',
        icon: Landmark,
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        to: '/admin/logistics',
        label: 'Fleet Logistics',
        accessibleSubtitle: 'Rider Dispatch Console',
        icon: Truck,
      },
      {
        to: '/admin/notifications',
        label: 'Notifications',
        icon: Bell,
      },
      {
        to: '/admin/audit-logs',
        label: 'Audit Logs',
        accessibleSubtitle: 'Security Event Stream',
        icon: FileCode,
      },
      {
        to: '/admin/settings',
        label: 'Platform Settings',
        accessibleSubtitle: 'Platform & System Settings',
        icon: Settings,
      },
      {
        to: '/admin/profile',
        label: 'Admin Profile',
        accessibleSubtitle: 'Account & Security Settings',
        icon: UserCheck,
      },
    ],
  },
];

export const AdminNav: React.FC<AdminNavProps> = ({ className, onNavigate }) => {
  const user = useAuthStore((s) => s.user);
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
      aria-label="Platform Admin Navigation"
    >
      {/* ── 1. Top Pinned Section: Homepage Logo + Hover Effect (shrink-0) ── */}
      <div className="shrink-0 border-b border-slate-200/60 dark:border-white/10 px-4 py-3.5 bg-[var(--panel-sidebar-bg,rgba(255,255,255,0.65))] dark:bg-slate-900/65">
        <Link
          to="/admin"
          aria-label="Vendora Admin Home"
          className="flex items-center justify-between focus:outline-none group transition-all"
          title="Vendora Admin Console"
        >
          <div className="flex flex-col">
            <span className="font-outfit text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none group-hover:text-sun-orange transition-colors">
              Vendora<span className="inline-block h-2 w-2 rounded-full bg-sun-orange group-hover:bg-slate-900 dark:group-hover:bg-white ml-0.5 transition-all duration-300 group-hover:scale-125" />
            </span>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wider mt-1 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
              Admin Console
            </span>
          </div>
          <span className="inline-flex items-center rounded-md bg-orange-500/10 dark:bg-orange-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sun-orange-600 dark:text-sun-orange border border-orange-500/20 group-hover:border-orange-500/40 transition-colors">
            Admin
          </span>
        </Link>
      </div>

      {/* ── 2. Center Scrollable Section: Only navigation options scroll (flex-1 overflow-y-auto) ── */}
      <div
        data-lenis-prevent
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-3 py-2 space-y-3"
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-0.5">
            <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-slate-400">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all select-none',
                    isActive
                      ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/10 text-sun-orange-600 dark:text-sun-orange font-bold border border-orange-500/20 shadow-2xs backdrop-blur-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  )
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0 transition-colors text-slate-500 dark:text-slate-400 group-hover:text-sun-orange" />
                  <span className="truncate">{item.label}</span>
                  {item.accessibleSubtitle && (
                    <span className="sr-only"> {item.accessibleSubtitle}</span>
                  )}
                </div>
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── 3. Bottom Pinned Section: User profile & image card (shrink-0 mt-auto) ── */}
      <div className="shrink-0 mt-auto border-t border-slate-200/60 dark:border-white/10 p-2.5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xs">
        <Link
          to="/admin/profile"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-xl p-1.5 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60 group"
          title="View Admin Profile & Settings"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs group-hover:scale-105 transition-transform">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {user?.name ?? 'Admin User'}
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
              <LogOut className="h-3.5 w-3.5" />
            </button>
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </Link>
      </div>
    </nav>
  );
};
