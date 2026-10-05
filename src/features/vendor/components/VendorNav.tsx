import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Wallet,
  Settings,
  Store,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../../../store/auth-store';
import { cn } from '../../../lib/utils';

export interface VendorNavProps {
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

const NAV_ITEMS: NavItem[] = [
  {
    to: '/vendor',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/vendor/products',
    label: 'Products',
    icon: Package,
  },
  {
    to: '/vendor/orders',
    label: 'Orders',
    icon: ClipboardList,
  },
  {
    to: '/vendor/earnings',
    label: 'Earnings',
    icon: Wallet,
  },
  {
    to: '/vendor/store-settings',
    label: 'Settings',
    icon: Settings,
  },
];

export const VendorNav: React.FC<VendorNavProps> = ({ className, onNavigate }) => {
  const { user } = useAuthStore();
  const vendorStoreId = user?.vendorId || 'vendor-tech-1';

  return (
    <nav className={cn('flex flex-col space-y-6', className)} aria-label="Vendor Portal Navigation">
      {/* Store Header Capsule */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100/80 text-[#FF7A1A]">
            <Store className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-bold text-slate-900 truncate">
              {user?.name ? `${user.name.split(' ')[0]}'s Store` : 'Vendor Portal'}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Verified Seller</span>
            </div>
          </div>
        </div>

        {vendorStoreId && (
          <div className="mt-2.5 border-t border-slate-100 pt-2">
            <NavLink
              to={`/vendors/${vendorStoreId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF7A1A] hover:underline"
            >
              <span>View Public Storefront</span>
              <ExternalLink className="h-3 w-3" />
            </NavLink>
          </div>
        )}
      </div>

      {/* Main Navigation Links */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Management
        </div>
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
                  'group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-orange-50/90 text-[#EA6C13] font-semibold border border-orange-200/80 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-[#EA6C13]">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Quick Status Card */}
      <div className="mt-auto rounded-2xl border border-slate-200/60 bg-gradient-to-br from-orange-50/50 to-white p-3 text-xs text-slate-600 shadow-xs">
        <div className="font-semibold text-slate-800">Vendor Status</div>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Payouts processed weekly. Automatic order split enabled.
        </p>
      </div>
    </nav>
  );
};
