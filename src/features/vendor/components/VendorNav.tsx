import React from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
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
  ChevronsUpDown,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { useAuthStore } from '../../../store/auth-store';
import { useVendorData } from '../hooks/useVendorData';
import { useVendorDashboard } from '../hooks/useVendorDashboard';
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
  const { vendorId: hookVendorId, storeName: hookStoreName } = useVendorData();
  // The four queue badges are counts Postgres already makes for the dashboard RPC, so the
  // sidebar cannot show a number the workspace itself disagrees with. A zero renders nothing.
  const dashboard = useVendorDashboard();
  const badges: Record<string, number> = dashboard.data
    ? {
        orders:
          dashboard.data.stages.placed +
          dashboard.data.stages.confirmed +
          dashboard.data.stages.packed,
        returns: dashboard.data.stages.returns,
        qa: dashboard.data.engagement.unansweredQuestions,
        messages: dashboard.data.engagement.unreadMessages,
      }
    : {};
  const badgeOf = (key: string) => {
    const value = badges[key] ?? 0;
    return value > 0 ? String(value) : undefined;
  };

  const vendorStoreId = hookVendorId || user?.vendorId || '';
  // The store a session owns is decided by the database, so there is no switcher here:
  // a second store means a second account, and the storefront link needs a real id.
  const storeName = hookStoreName || 'Your store';

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
          badge: badgeOf('orders'),
          badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        {
          to: '/vendor/returns',
          label: 'Returns',
          accessibleName: 'Returns',
          icon: RotateCcw,
          badge: badgeOf('returns'),
          badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40',
        },
        {
          to: '/vendor/qa',
          label: 'Customer Q&A',
          accessibleName: 'Product QA',
          icon: MessageCircleQuestion,
          badge: badgeOf('qa'),
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
          badge: badgeOf('messages'),
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
      aria-label="Vendor Portal Navigation"
    >
      {/* ── 1. Top Pinned Section: Homepage Logo + Hover Effect (shrink-0) ── */}
      <div className="shrink-0 border-b border-slate-200/60 dark:border-white/10 px-4 py-3.5 bg-[var(--panel-sidebar-bg,rgba(255,255,255,0.65))] dark:bg-slate-900/65">
        <Link
          to="/vendor"
          aria-label="Vendora Seller Home"
          className="flex items-center justify-between focus:outline-none group transition-all"
          title="Vendora Seller Hub"
        >
          <div className="flex flex-col">
            <span className="font-outfit text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none group-hover:text-[#FF7A1A] transition-colors">
              Vendora<span className="inline-block h-2 w-2 rounded-full bg-[#FF7A1A] group-hover:bg-slate-900 dark:group-hover:bg-white ml-0.5 transition-all duration-300 group-hover:scale-125" aria-hidden="true" />
            </span>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wider mt-1 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
              Seller Hub
            </span>
          </div>
          <span className="inline-flex items-center rounded-md bg-orange-500/10 dark:bg-orange-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#EA6C13] dark:text-[#FF7A1A] border border-orange-500/20 group-hover:border-orange-500/40 transition-colors">
            Seller
          </span>
        </Link>
      </div>

      {/* ── 2. Center Scrollable Section: Only navigation options & store capsule scroll (flex-1 overflow-y-auto) ── */}
      <div
        data-lenis-prevent
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar px-3 py-2 space-y-3"
      >
        {/* Brand / Store Capsule */}
        <div className="relative rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40 font-black text-[#FF7A1A] border border-orange-100 dark:border-orange-900/40 text-xs uppercase">
              <Store className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{storeName}</h2>
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
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </NavLink>
          </div>
        </div>

        {/* Grouped Navigation Sections */}
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
                        aria-hidden="true"
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

      {/* ── 3. Bottom Pinned Section: Fixed seller profile card (shrink-0 mt-auto) ── */}
      <div className="shrink-0 mt-auto border-t border-slate-200/60 dark:border-white/10 p-2.5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xs">
        <Link
          to="/vendor/profile"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-xl p-1.5 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60 group"
          title="View Seller Profile & Settings"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800 text-[#FF7A1A] shadow-xs group-hover:scale-105 transition-transform">
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {user?.name ?? 'Seller User'}
              </p>
              <p className="truncate text-[10px] text-slate-400 leading-tight">
                {user?.email ?? 'vendor@demo.test'}
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
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          </div>
        </Link>
      </div>
    </nav>
  );
};
