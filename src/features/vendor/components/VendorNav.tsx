import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Wallet,
  Settings,
  Store,
  ExternalLink,
  LogOut,
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

interface NavSection {
  heading: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'MAIN',
    items: [
      {
        to: '/vendor',
        label: 'Overview',
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    heading: 'STORE MANAGEMENT',
    items: [
      {
        to: '/vendor/products',
        label: 'My Products',
        icon: Package,
        badge: '3 pending',
      },
      {
        to: '/vendor/orders',
        label: 'Orders',
        icon: ClipboardList,
        badge: '8 new',
      },
      {
        to: '/vendor/earnings',
        label: 'Earnings & Payouts',
        icon: Wallet,
      },
    ],
  },
  {
    heading: 'SETTINGS',
    items: [
      {
        to: '/vendor/store-settings',
        label: 'Store Settings',
        icon: Settings,
      },
    ],
  },
];

export const VendorNav: React.FC<VendorNavProps> = ({ className, onNavigate }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const vendorStoreId = user?.vendorId ?? 'vendor-tech-1';

  const storeName = user?.name ? `${user.name.split(' ')[0]}'s Store` : 'Vendor Portal';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav
      className={cn('flex h-full flex-col', className)}
      aria-label="Vendor Portal Navigation"
    >
      {/* ── Store Header Capsule ───────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-xs mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100/80 text-[#FF7A1A]">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xs font-bold text-slate-900">{storeName}</h2>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Verified Seller</span>
            </div>
          </div>
        </div>

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
      </div>

      {/* ── Sectioned Nav Links ────────────────────────────── */}
      <div className="flex flex-col gap-5 flex-1 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.heading}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {section.heading}
            </p>
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
                          ? 'bg-orange-50 text-[#EA6C13] border-l-2 border-[#FF7A1A]'
                          : 'text-slate-600 hover:bg-slate-100'
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
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

      {/* ── Bottom User Profile Card ───────────────────────── */}
      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#FF7A1A] text-sm font-bold uppercase">
            {user?.name ? user.name.charAt(0) : 'V'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">
              {user?.name ?? 'Vendor'}
            </p>
            <p className="truncate text-[11px] text-slate-500">{user?.email ?? ''}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};
