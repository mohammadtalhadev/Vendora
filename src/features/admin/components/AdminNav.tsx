import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  ShieldAlert,
  Percent,
  Scale,
  BarChart3,
  Shield,
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
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: string;
  badgeVariant?: 'amber' | 'rose';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      {
        to: '/admin',
        label: 'Overview',
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      {
        to: '/admin/vendors',
        label: 'Vendor Approvals',
        icon: UserCheck,
        badge: '4',
        badgeVariant: 'amber',
      },
      {
        to: '/admin/products',
        label: 'Product Moderation',
        icon: ShieldAlert,
        badge: '12',
        badgeVariant: 'amber',
      },
      {
        to: '/admin/disputes',
        label: 'Dispute Resolution',
        icon: Scale,
        badge: '2',
        badgeVariant: 'rose',
      },
    ],
  },
  {
    title: 'FINANCIALS',
    items: [
      {
        to: '/admin/commission',
        label: 'Commission Settings',
        icon: Percent,
      },
      {
        to: '/admin/reports',
        label: 'Reports',
        icon: BarChart3,
      },
    ],
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

      {/* Sectioned Navigation */}
      <div className="mt-6 flex-1 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {section.title}
            </div>
            <div className="space-y-0.5">
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
                        'group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-slate-900 text-white border-l-2 border-blue-500'
                          : 'text-slate-600 hover:bg-slate-100'
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          item.badgeVariant === 'rose'
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile Mini-Card */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
            {user?.name?.charAt(0) ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-slate-800">
              {user?.name ?? 'Admin'}
            </p>
            <p className="truncate text-[10px] text-slate-500">
              {user?.email ?? ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </nav>
  );
};
