import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  ShieldCheck,
  PlusCircle,
  ShoppingBag,
  Users,
  Layers,
  Percent,
  BarChart3,
  Scale,
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

const NAV_ITEMS: NavItem[] = [
  {
    to: '/admin',
    label: 'Dashboard',
    accessibleSubtitle: 'Overview',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/admin/vendors',
    label: 'Vendors',
    accessibleSubtitle: 'Vendor Approvals',
    icon: Store,
  },
  {
    to: '/admin/products',
    label: 'Product Moderation',
    icon: ShieldCheck,
    end: true,
  },
  {
    to: '/admin/add-product',
    label: 'Add Product',
    accessibleSubtitle: 'Create Product',
    icon: PlusCircle,
    end: true,
  },
  {
    to: '/admin/orders',
    label: 'Orders',
    icon: ShoppingBag,
  },
  {
    to: '/admin/users',
    label: 'Users',
    icon: Users,
  },
  {
    to: '/admin/categories',
    label: 'Categories',
    icon: Layers,
  },
  {
    to: '/admin/commission',
    label: 'Commission',
    accessibleSubtitle: 'Commission Settings',
    icon: Percent,
  },
  {
    to: '/admin/reports',
    label: 'Reports',
    icon: BarChart3,
  },
  {
    to: '/admin/disputes',
    label: 'Disputes',
    accessibleSubtitle: 'Dispute Resolution',
    icon: Scale,
  },
  {
    to: '/admin/media',
    label: 'Files & Media',
    accessibleSubtitle: 'Asset Repository',
    icon: FolderOpen,
  },
  {
    to: '/admin/brands',
    label: 'Brand Registry',
    accessibleSubtitle: 'Brand Gating & IP',
    icon: ShieldAlert,
  },
  {
    to: '/admin/cms',
    label: 'CMS & Banners',
    accessibleSubtitle: 'Homepage & Deals',
    icon: Sparkles,
  },
  {
    to: '/admin/logistics',
    label: 'Fleet Logistics',
    accessibleSubtitle: 'Rider Dispatch Console',
    icon: Truck,
  },
  {
    to: '/admin/compliance',
    label: 'Tax Compliance',
    accessibleSubtitle: 'Facilitator & 1099-K',
    icon: Landmark,
  },
  {
    to: '/admin/audit-logs',
    label: 'Audit Logs',
    accessibleSubtitle: 'Security Event Stream',
    icon: FileCode,
  },
  {
    to: '/admin/notifications',
    label: 'Notifications',
    icon: Bell,
  },
  {
    to: '/admin/settings',
    label: 'Settings',
    icon: Settings,
  },
  {
    to: '/admin/profile',
    label: 'Admin Profile',
    accessibleSubtitle: 'Account & Security Settings',
    icon: UserCheck,
  },
];

export const AdminNav: React.FC<AdminNavProps> = ({ className, onNavigate }) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logout();
    navigate('/');
  };

  return (
    <nav className={cn('flex flex-col h-full min-h-0', className)} aria-label="Platform Admin Navigation">
      {/* Brand Header: VENDORA / Admin Console */}
      <div className="flex items-center gap-2.5 px-3 py-3.5 mb-2 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-black text-white shadow-2xs">
          V
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase">
            VENDORA
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Admin Console
          </span>
        </div>
      </div>

      {/* Navigation Links (Scrollable with hidden scrollbar) */}
      <div className="flex-1 min-h-0 space-y-0.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-1.5 py-1">
        {NAV_ITEMS.map((item) => {
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
                    ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/10 text-[#EA6C13] dark:text-[#FF7A1A] font-bold border border-orange-500/20 shadow-2xs backdrop-blur-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                )
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="h-4 w-4 shrink-0 transition-colors text-slate-500 dark:text-slate-400 group-hover:text-[#FF7A1A]" />
                <span className="truncate">{item.label}</span>
                {item.accessibleSubtitle && (
                  <span className="sr-only"> {item.accessibleSubtitle}</span>
                )}
              </div>
            </NavLink>
          );
        })}
      </div>

      {/* Bottom User Card */}
      <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 px-2 pb-1 shrink-0">
        <Link
          to="/admin/profile"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-xl p-1.5 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all border border-transparent hover:border-white/60 dark:hover:border-slate-700/60"
          title="View Admin Profile & Settings"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs">
              <UserIcon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-[11px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {user?.name ?? 'Admin User'}
              </p>
              <p className="truncate text-[10px] text-slate-400 leading-tight">
                {user?.email ?? 'admin@demo.test'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <LogOut className="h-3 w-3" />
            </button>
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </Link>
      </div>
    </nav>
  );
};
