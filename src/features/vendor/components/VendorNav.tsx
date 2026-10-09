import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  FolderOpen,
  Settings,
  HelpCircle,
  Store,
  ExternalLink,
  UserCheck,
  Boxes,
  FileSpreadsheet,
  Truck,
  MessageCircleQuestion,
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

interface NavSection {
  title: string;
  items: NavItem[];
}

export const VendorNav: React.FC<VendorNavProps> = ({
  className,
  onNavigate,
  onOpenAddProduct,
}) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useAuthStore();
  const vendorStoreId = user?.vendorId ?? 'vendor-tech-1';
  const storeName = user?.name ? `${user.name.split(' ')[0]} Electronics` : 'Nova Electronics';

  const navSections: NavSection[] = [
    {
      title: 'Catalog',
      items: [
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
          end: true,
        },
        {
          to: '/vendor/products/new',
          label: 'Add Product',
          accessibleName: 'Add Product',
          icon: PlusCircle,
          action: onOpenAddProduct,
          end: true,
        },
        {
          to: '/vendor/inventory',
          label: 'Stock Console',
          accessibleName: 'Stock Console',
          icon: Boxes,
          end: true,
        },
        {
          to: '/vendor/products/import-export',
          label: 'Import / Export',
          accessibleName: 'Import Export',
          icon: FileSpreadsheet,
          end: true,
        },
      ],
    },
    {
      title: 'Sales',
      items: [
        {
          to: '/vendor/orders',
          label: 'Orders',
          accessibleName: 'Orders',
          icon: ClipboardList,
          badge: '12',
          badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        {
          to: '/vendor/returns',
          label: 'Returns',
          accessibleName: 'Returns',
          icon: RotateCcw,
          badge: '3',
          badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40',
        },
        {
          to: '/vendor/qa',
          label: 'Customer Q&A',
          accessibleName: 'Product QA',
          icon: MessageCircleQuestion,
          badge: '3',
          badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40',
        },
      ],
    },
    {
      title: 'Finance',
      items: [
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
      ],
    },
    {
      title: 'Communication',
      items: [
        {
          to: '/vendor/messages',
          label: 'Customer Messages',
          icon: MessageSquare,
          badge: '4',
          badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        {
          to: '/vendor/reviews',
          label: 'Reviews & Ratings',
          icon: Star,
        },
        {
          to: '/vendor/media',
          label: 'Files & Media',
          accessibleName: 'Media',
          icon: FolderOpen,
        },
        {
          to: '/vendor/shipping-settings',
          label: 'Shipping & Origin',
          accessibleName: 'Shipping & Origin',
          icon: Truck,
        },
        {
          to: '/vendor/store-settings',
          label: 'Store Settings',
          accessibleName: 'Settings',
          icon: Settings,
        },
        {
          to: '/vendor/profile',
          label: 'Seller Profile',
          accessibleName: 'Profile & Security',
          icon: UserCheck,
        },
        {
          to: '/vendor/support',
          label: 'Help & Support',
          icon: HelpCircle,
        },
      ],
    },
  ];

  // Strictly ensures only ONE navigation item is active at a time
  const isItemActive = (item: NavItem): boolean => {
    // Exact match
    if (currentPath === item.to) {
      return true;
    }

    // Add Product route alias (/vendor/products/new or /vendor/add-product)
    if (item.to === '/vendor/products/new') {
      return currentPath === '/vendor/products/new' || currentPath === '/vendor/add-product';
    }

    // Products link should NEVER be active if user is on Add Product or Import/Export
    if (item.to === '/vendor/products') {
      if (
        currentPath === '/vendor/products/new' ||
        currentPath === '/vendor/add-product' ||
        currentPath.startsWith('/vendor/products/import-export')
      ) {
        return false;
      }
      return currentPath === '/vendor/products' || currentPath.startsWith('/vendor/products/');
    }

    // Strict end match for root or specific leaf items
    if (item.end) {
      return currentPath === item.to;
    }

    // Nested sub-routes for other sections (e.g. /vendor/orders/123)
    return currentPath.startsWith(item.to + '/');
  };

  return (
    <nav
      className={cn('flex h-full flex-col justify-between pb-4', className)}
      aria-label="Vendor Portal Navigation"
    >
      <div className="flex flex-col gap-3 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-1">
        {/* ── Brand / Store Capsule ───────────────────────────── */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40 font-black text-[#FF7A1A] border border-orange-100 dark:border-orange-900/40 text-xs uppercase">
              <Store className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{storeName}</h2>
                <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                  Approved
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="truncate">{user?.email ?? 'vendor@demo.test'}</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between text-[11px]">
            <NavLink
              to={`/vendors/${vendorStoreId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[#EA6C13] dark:text-[#FF7A1A] hover:underline"
            >
              <span>Public Storefront</span>
              <ExternalLink className="h-3 w-3" />
            </NavLink>
          </div>
        </div>

        {/* ── Grouped Navigation Sections ─────────────────────── */}
        <div className="space-y-3">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                {section.title}
              </div>
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                const active = isItemActive(item);

                return (
                  <NavLink
                    key={`${item.to}-${item.label}-${idx}`}
                    to={item.to}
                    end={item.end}
                    onClick={() => {
                      if (item.action) item.action();
                      if (onNavigate) onNavigate();
                    }}
                    className={cn(
                      'group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all select-none',
                      active
                        ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/10 text-[#EA6C13] dark:text-[#FF7A1A] font-bold border border-orange-500/20 shadow-2xs backdrop-blur-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          active
                            ? 'text-[#EA6C13] dark:text-[#FF7A1A]'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-[#FF7A1A]'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.accessibleName && (
                        <span className="sr-only">{item.accessibleName}</span>
                      )}
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.2 text-[10px] font-bold',
                          item.badgeColor ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
};
