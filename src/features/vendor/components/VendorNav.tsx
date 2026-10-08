import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ClipboardList,
  RotateCcw,
  Wallet,
  CreditCard,
  Tag,
  MessageSquare,
  Star,
  Settings,
  HelpCircle,
  Store,
  ExternalLink,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../../store/auth-store';
import { cn } from '../../../lib/utils';

export interface VendorNavProps {
  className?: string;
  onNavigate?: () => void;
  onOpenAddProduct?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  accessibleName?: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: string;
  badgeColor?: string;
  action?: () => void;
}

export const VendorNav: React.FC<VendorNavProps> = ({
  className,
  onNavigate,
  onOpenAddProduct,
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const vendorStoreId = user?.vendorId ?? 'vendor-tech-1';
  const storeName = user?.name ? `${user.name.split(' ')[0]} Electronics` : 'Nova Electronics';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems: NavItem[] = [
    {
      to: '/vendor',
      label: 'Dashboard',
      accessibleName: 'Overview',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/vendor/products',
      label: 'Products',
      accessibleName: 'Products',
      icon: Package,
    },
    {
      to: '/vendor/products',
      label: 'Create Listing',
      icon: PlusCircle,
      action: onOpenAddProduct,
    },
    {
      to: '/vendor/orders',
      label: 'Orders',
      accessibleName: 'Orders',
      icon: ClipboardList,
      badge: '12',
      badgeColor: 'bg-slate-900 text-white',
    },
    {
      to: '/vendor/returns',
      label: 'Returns',
      accessibleName: 'Returns',
      icon: RotateCcw,
      badge: '03',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      to: '/vendor/earnings',
      label: 'Earnings',
      accessibleName: 'Earnings',
      icon: Wallet,
    },
    {
      to: '/vendor/payouts',
      label: 'Payouts',
      icon: CreditCard,
    },
    {
      to: '/vendor/promotions',
      label: 'Promotions & Coupons',
      icon: Tag,
    },
    {
      to: '/vendor/store-settings',
      label: 'Customer Messages',
      icon: MessageSquare,
    },
    {
      to: '/vendor/store-settings',
      label: 'Reviews',
      icon: Star,
    },
    {
      to: '/vendor/store-settings',
      label: 'Store Settings',
      accessibleName: 'Settings',
      icon: Settings,
    },
    {
      to: '/vendor/store-settings',
      label: 'Help & Support',
      icon: HelpCircle,
    },
  ];

  return (
    <nav
      className={cn('flex h-full flex-col justify-between', className)}
      aria-label="Vendor Portal Navigation"
    >
      <div className="flex flex-col gap-4 overflow-y-auto">
        {/* ── Brand / Store Capsule ───────────────────────────── */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 font-black text-[#FF7A1A] border border-orange-100 text-xs uppercase">
              <Store className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-xs font-bold text-slate-900">{storeName}</h2>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700">
                  Approved
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="truncate">{user?.email ?? 'vendor@demo.test'}</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 border-t border-slate-100 pt-2 flex items-center justify-between text-[11px]">
            <NavLink
              to={`/vendors/${vendorStoreId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[#EA6C13] hover:underline"
            >
              <span>Public Storefront</span>
              <ExternalLink className="h-3 w-3" />
            </NavLink>
          </div>
        </div>

        {/* ── 12 Navigation Items ─────────────────────────────── */}
        <div className="space-y-0.5">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={`${item.to}-${item.label}-${idx}`}
                to={item.to}
                end={item.end}
                onClick={() => {
                  if (item.action) item.action();
                  if (onNavigate) onNavigate();
                }}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-orange-50 text-[#EA6C13] border-l-2 border-[#FF7A1A] font-bold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  )
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-700" />
                  <span>{item.label}</span>
                  {item.accessibleName && (
                    <span className="sr-only">{item.accessibleName}</span>
                  )}
                </div>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.2 text-[10px] font-bold',
                      item.badgeColor ?? 'bg-slate-100 text-slate-700'
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

      {/* ── Bottom User / Store Profile Card ───────────────────── */}
      <div className="mt-4 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white shadow-2xs">
              NE
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-xs font-bold text-slate-900">
                  Nova Electron...
                </span>
                <span className="rounded bg-emerald-50 px-1 py-0.2 text-[9px] font-bold text-emerald-700">
                  Approved
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </div>
              <p className="truncate text-[10px] text-slate-400 font-normal">
                {user?.email ?? 'vendor@demo.test'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};
