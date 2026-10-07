import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  ShieldCheck,
  Package,
  ShoppingBag,
  Users,
  Layers,
  Percent,
  BarChart3,
  Scale,
  Bell,
  Settings,
  ChevronsUpDown,
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
  },
  {
    to: '/admin/first-party',
    label: 'First-Party Catalog',
    icon: Package,
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
    to: '/admin/notifications',
    label: 'Notifications',
    icon: Bell,
  },
  {
    to: '/admin/settings',
    label: 'Settings',
    icon: Settings,
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
      {/* Brand Header: VENDORA / Admin Console */}
      <div className="flex items-center gap-2.5 px-3 py-3.5 mb-2 border-b border-slate-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-black text-white shadow-2xs">
          V
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-black tracking-wider text-slate-900 uppercase">
            VENDORA
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Admin Console
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-0.5 overflow-y-auto px-1.5 py-1">
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
                  'group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-slate-900" />
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
      <div className="mt-3 pt-3 border-t border-slate-100 px-2 pb-1">
        <div className="flex items-center justify-between rounded-lg p-1.5 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
                alt="Admin avatar"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="hidden">{user?.name?.charAt(0) ?? 'A'}</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-[11px] font-bold text-slate-900 leading-tight">
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
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <LogOut className="h-3 w-3" />
            </button>
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>
    </nav>
  );
};
