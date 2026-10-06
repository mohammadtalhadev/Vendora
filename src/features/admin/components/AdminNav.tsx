import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Package,
  Users,
  Layers,
  Percent,
  BarChart3,
  Scale,
  Building2,
  SlidersHorizontal,
  Sun,
  LogOut,
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
  badge?: string;
  badgeVariant?: 'gray' | 'dark';
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
    badge: '14',
    badgeVariant: 'gray',
  },
  {
    to: '/admin/products',
    label: 'Products',
    accessibleSubtitle: 'Product Moderation',
    icon: Package,
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
    badge: '3',
    badgeVariant: 'dark',
  },
  {
    to: '/admin/first-party',
    label: 'First-party Catalog',
    icon: Building2,
  },
];

export const AdminNav: React.FC<AdminNavProps> = ({ className, onNavigate }) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className={cn('flex flex-col h-full', className)} aria-label="Platform Admin Navigation">
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 px-2 py-3 mb-3 border-b border-slate-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-black text-white shadow-2xs">
          V
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-bold text-slate-900 tracking-tight">Vendora</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            MARKETPLACE HQ
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-1 overflow-y-auto px-1 py-1">
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
                  'group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                )
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.accessibleSubtitle && (
                  <span className="sr-only"> {item.accessibleSubtitle}</span>
                )}
              </div>
              {item.badge && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-bold leading-none',
                    item.badgeVariant === 'dark'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Footer: Admin Active v2.4 Monochrome capsule & User card */}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 px-1">
        <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 text-[11px] leading-tight">Admin Active</span>
              <span className="text-[9px] text-slate-400 leading-tight">v2.4 Monochrome</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <Sun className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* User Mini Profile & Logout */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200/60 bg-white p-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
              {user?.name?.charAt(0) ?? 'E'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[11px] font-semibold text-slate-900">
                {user?.name ?? 'Elena Vance'}
              </p>
              <p className="truncate text-[9px] text-slate-400">
                {user?.email ?? 'elena.vance@vendora.internal'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </nav>
  );
};
