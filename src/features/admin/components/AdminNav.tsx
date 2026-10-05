import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  ShieldAlert,
  Percent,
  Scale,
  BarChart3,
  Shield,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface AdminNavProps {
  className?: string;
  onNavigate?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: string;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    to: '/admin',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/admin/vendors',
    label: 'Vendor Approvals',
    icon: UserCheck,
  },
  {
    to: '/admin/products',
    label: 'Product Moderation',
    icon: ShieldAlert,
  },
  {
    to: '/admin/commission',
    label: 'Commission Settings',
    icon: Percent,
  },
  {
    to: '/admin/disputes',
    label: 'Dispute Resolution',
    icon: Scale,
  },
  {
    to: '/admin/reports',
    label: 'Reports',
    icon: BarChart3,
  },
];

export const AdminNav: React.FC<AdminNavProps> = ({ className, onNavigate }) => {
  return (
    <nav className={cn('flex flex-col space-y-6', className)} aria-label="Platform Admin Navigation">
      {/* Platform Authority Capsule */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-emerald-400">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-bold tracking-tight text-white">
              Platform Admin
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Full Governance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Platform Controls
        </div>
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Security Notice Card */}
      <div className="mt-auto rounded-2xl border border-slate-200/60 bg-slate-50 p-3 text-xs text-slate-600 shadow-xs">
        <div className="font-semibold text-slate-800">Audit Active</div>
        <p className="mt-0.5 text-[11px] text-slate-500">
          All vendor overrides and moderation decisions are logged with timestamps.
        </p>
      </div>
    </nav>
  );
};
