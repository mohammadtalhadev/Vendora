import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ScrollManager } from '../../components/ScrollManager';
import { SkipLink } from '../../components/common/SkipLink';
import { useLenisWrapper } from '../../hooks/useLenisWrapper';
import {
  Store,
  ArrowLeft,
  Menu,
  X,
  User as UserIcon,
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  Plus,
  CheckCircle2,
  Edit3,
  ChevronDown,
  ChevronRight,
  Download,
  UserPlus,
  Tag,
  Image,
  HelpCircle,
  ShieldAlert,
  Settings,
  Inbox,
  Boxes,
  BellOff,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import { useAuth } from '../../lib/auth-context';
import { SwitchWorkspaceMenu } from './SwitchWorkspaceMenu';
import type { UserRole } from '../../types/domain';
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
  type NotificationKind,
} from '../../features/notifications/api/notifications';

export interface WorkspaceLayoutProps {
  /** Explicit role override; defaults to primary user role or 'vendor' */
  role?: UserRole | string;
  /** Custom badge label (e.g. 'VENDOR PARTNER', 'SUPER ADMIN') */
  roleBadgeText?: string;
  /** Title displayed in the workspace shell */
  title?: string;
  /** Subtitle or workspace description */
  subtitle?: string;
  /** Sidebar navigation node (e.g., <VendorNav /> or <AdminNav />) */
  sidebar?: ReactNode;
  /** Extra header controls (e.g. shift status, queue counters, action buttons) */
  headerExtra?: ReactNode;
  /** Content to render instead of router <Outlet /> */
  children?: ReactNode;
}

const ROLE_BADGE_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  vendor: {
    bg: 'bg-orange-50/90 dark:bg-orange-950/40',
    text: 'text-sun-orange-600 dark:text-[#ff944d]',
    border: 'border-orange-200/80 dark:border-orange-800/60',
    dot: 'bg-sun-orange',
  },
  admin: {
    bg: 'bg-indigo-50/90 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200/80 dark:border-indigo-800/60',
    dot: 'bg-indigo-500',
  },
  rider: {
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200/80 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
  },
  support: {
    bg: 'bg-sky-50/90 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-200/80 dark:border-sky-800/60',
    dot: 'bg-sky-500',
  },
  customer: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};

type WorkspaceScreen = {
  title: string;
  path: string;
  group: string;
  desc: string;
};

/**
 * The palette only offers screens the signed-in role can actually open: `/admin/*` sits behind
 * `AdminOnlyRoute` and `/vendor/*` behind `VendorOnlyRoute`, so an entry a role cannot reach is a
 * dead control and stays out of the index. Every path here is a route `src/app/router.tsx` serves.
 */
const ADMIN_SCREENS: WorkspaceScreen[] = [
  { title: 'Dashboard', path: '/admin', group: 'Navigation', desc: 'Marketplace KPIs and real-time overview' },
  { title: 'Product Moderation', path: '/admin/products', group: 'Catalog', desc: 'Submissions queue and approvals' },
  { title: 'Inventory & Stock', path: '/admin/inventory', group: 'Catalog', desc: 'Platform-wide stock levels & low-stock watch' },
  { title: 'Add Product', path: '/admin/add-product', group: 'Catalog', desc: 'Create and publish product catalog listing' },
  { title: 'Categories & Taxonomy', path: '/admin/categories', group: 'Catalog', desc: 'Taxonomy tree & commission structure' },
  { title: 'Orders & Shipments', path: '/admin/orders', group: 'Operations', desc: 'Multi-vendor split orders & tracking' },
  { title: 'Vendors & Merchants', path: '/admin/vendors', group: 'Stores', desc: 'Applications awaiting a KYC decision' },
  { title: 'Disputes & Arbitration', path: '/admin/disputes', group: 'Governance', desc: 'Buyer protection & escrow claims' },
  { title: 'Commission & Fees', path: '/admin/commission', group: 'Finance', desc: 'Take rates, fee history & payout rules' },
  { title: 'Financial Reports', path: '/admin/reports', group: 'Finance', desc: 'Ledger exports & yield breakdown' },
  { title: 'Files & Media Management', path: '/admin/media', group: 'Media', desc: 'Platform assets, product imagery & vendor uploads' },
  { title: 'Admin Settings', path: '/admin/settings', group: 'System', desc: 'API keys, security policies & webhooks' },
  { title: 'Users & Permissions', path: '/admin/users', group: 'System', desc: 'Staff roles and access control' },
  { title: 'Platform Notifications', path: '/admin/notifications', group: 'System', desc: 'Announcement dispatch to an audience' },
  { title: 'Brand Registry', path: '/admin/brands', group: 'Catalog', desc: 'Brands the catalog lists against' },
  { title: 'CMS & Banners', path: '/admin/cms', group: 'Storefront', desc: 'Storefront banner blocks' },
  { title: 'Logistics Fleet', path: '/admin/logistics', group: 'Operations', desc: 'Courier fleet & coverage' },
  { title: 'Tax Compliance', path: '/admin/compliance', group: 'Governance', desc: 'Tax records & filings' },
  { title: 'Audit Logs', path: '/admin/audit-logs', group: 'System', desc: 'Staff action history' },
];

const VENDOR_SCREENS: WorkspaceScreen[] = [
  { title: 'Seller Dashboard', path: '/vendor', group: 'Seller Hub', desc: 'Store performance, sales & analytics' },
  { title: 'Add Product Listing', path: '/vendor/add-product', group: 'Seller Catalog', desc: 'Publish new store product listing' },
  { title: 'Manage Products', path: '/vendor/products', group: 'Seller Catalog', desc: 'Catalog items, pricing & variants' },
  { title: 'Import & Export', path: '/vendor/products/import-export', group: 'Seller Catalog', desc: 'Bulk catalog work' },
  { title: 'Inventory & Stock', path: '/vendor/inventory', group: 'Seller Operations', desc: 'Stock levels & restock alerts' },
  { title: 'Customer Orders', path: '/vendor/orders', group: 'Seller Operations', desc: 'Order fulfillment, packing slips & dispatch' },
  { title: 'Returns & Refunds', path: '/vendor/returns', group: 'Seller Operations', desc: 'Manage buyer return requests & claims' },
  { title: 'Earnings & Payouts', path: '/vendor/earnings', group: 'Seller Finance', desc: 'Sales revenue, settlements & balances' },
  { title: 'Customer Reviews', path: '/vendor/reviews', group: 'Seller Store', desc: 'Ratings, feedback & store reputation' },
  { title: 'Buyer Questions', path: '/vendor/qa', group: 'Seller Store', desc: 'Questions shoppers ask on your listings' },
  { title: 'Messages', path: '/vendor/messages', group: 'Seller Store', desc: 'Conversations with buyers' },
  { title: 'Promotions & Coupons', path: '/vendor/promotions', group: 'Seller Store', desc: 'Discount codes your store issues' },
  { title: 'Media Assets Library', path: '/vendor/media', group: 'Seller Media', desc: 'Upload product photography & banners' },
  { title: 'Store Settings', path: '/vendor/store-settings', group: 'Seller Store', desc: 'Shipping policies, store branding & profile' },
  { title: 'Shipping & Origin', path: '/vendor/shipping-settings', group: 'Seller Store', desc: 'Dispatch SLA & warehouse per shipment' },
  { title: 'All Notifications', path: '/notifications', group: 'Seller Account', desc: 'Every notice addressed to this account' },
];

const SUPPORT_SCREENS: WorkspaceScreen[] = [
  { title: 'Triage Desk', path: '/support', group: 'Support', desc: 'Open conversations across the queue' },
  { title: 'Dispute Queue', path: '/support/disputes', group: 'Governance', desc: 'Buyer protection cases awaiting a decision' },
  { title: 'All Notifications', path: '/notifications', group: 'Support', desc: 'Every notice addressed to this account' },
];

const RIDER_SCREENS: WorkspaceScreen[] = [
  { title: 'Delivery Board', path: '/rider', group: 'Rider Hub', desc: 'Assigned parcels, handovers and exceptions' },
  { title: 'My Deliveries', path: '/rider/deliveries', group: 'Rider Hub', desc: 'The parcels on your board right now' },
  { title: 'Delivery History', path: '/rider/history', group: 'Rider Hub', desc: 'Parcels you have closed - delivered and failed' },
  { title: 'Earnings', path: '/rider/earnings', group: 'Rider Hub', desc: 'Value of the parcels you delivered, and COD cash handled' },
  { title: 'Rider Profile', path: '/rider/profile', group: 'Rider Hub', desc: 'Availability, contact details and vehicle' },
  { title: 'All Notifications', path: '/notifications', group: 'Rider Account', desc: 'Every notice addressed to this account' },
];

const SCREENS_BY_ROLE: Record<string, WorkspaceScreen[]> = {
  admin: ADMIN_SCREENS,
  vendor: VENDOR_SCREENS,
  support: SUPPORT_SCREENS,
  rider: RIDER_SCREENS,
};

const screensForRole = (roleKey: string): WorkspaceScreen[] => SCREENS_BY_ROLE[roleKey] ?? [];

/**
 * The tray's tabs are reads of their own: each one asks the `notifications` table for that
 * slice, so a tab shows what Postgres holds for this account rather than a filter over rows
 * that happened to load. Every id here is a member of `public.notification_type`.
 */
const NOTIFICATION_TABS: { id: NotificationKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'order_status', label: 'Orders' },
  { id: 'dispute', label: 'Disputes' },
  { id: 'payout', label: 'Payouts' },
];

/** `created_at` the way a tray reads it: recent in relative terms, older as a date. */
function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const NOTIFICATIONS_PANEL_ID = 'workspace-notification-panel';
const SEARCH_LISTBOX_ID = 'workspace-search-listbox';
const CREATE_MENU_ID = 'workspace-create-menu';
const PROFILE_MENU_ID = 'workspace-profile-menu';
const MOBILE_DRAWER_ID = 'workspace-mobile-drawer';

/**
 * A disclosure the keyboard can live with. While it is open the panel takes focus, so the first
 * Tab or Escape lands inside what the user just summoned; Escape closes it and hands focus back to
 * the control that opened it, and a click outside closes it without moving focus under the cursor.
 * `focusOnOpen` stays false for the search field, which must keep the caret.
 */
function useDisclosure<P extends HTMLElement, T extends HTMLElement>(
  open: boolean,
  setOpen: (next: boolean) => void,
  panelRef: React.RefObject<P | null>,
  triggerRef: React.RefObject<T | null>,
  focusOnOpen = true,
) {
  useEffect(() => {
    if (!open) return;
    if (focusOnOpen) panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open, setOpen, panelRef, triggerRef, focusOnOpen]);
}

const getBreadcrumbData = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [];
  if (segments[0] !== 'admin') return [];

  const crumbs: { label: string; path: string }[] = [
    { label: 'Admin', path: '/admin' },
  ];

  if (segments.length === 1) {
    return crumbs;
  }

  const section = segments[1];
  const SECTION_LABELS: Record<string, string> = {
    products: 'Products',
    'add-product': 'Add Product',
    vendors: 'Vendors',
    orders: 'Orders',
    users: 'Users',
    categories: 'Categories',
    commission: 'Commission',
    disputes: 'Disputes',
    reports: 'Reports',
    media: 'Files & Media',
    notifications: 'Notifications',
    settings: 'Settings',
    brands: 'Brand Registry',
    cms: 'CMS & Banners',
    logistics: 'Logistics Fleet',
    compliance: 'Tax Compliance',
    'audit-logs': 'Audit Logs',
  };

  if (section === 'add-product') {
    crumbs.push({ label: 'Products', path: '/admin/products' });
    crumbs.push({ label: 'Add Product', path: '/admin/add-product' });
    return crumbs;
  }

  const label = SECTION_LABELS[section] || section.charAt(0).toUpperCase() + section.slice(1);
  crumbs.push({ label, path: `/admin/${section}` });

  if (segments.length > 2) {
    const sub = segments[2];
    crumbs.push({ label: sub.charAt(0).toUpperCase() + sub.slice(1), path: pathname });
  }

  return crumbs;
};

const PROFILE_FIELD_LABEL = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1';

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  role,
  roleBadgeText,
  title,
  subtitle,
  sidebar,
  headerExtra,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuthStore();
  const { signOut } = useAuth();
  // The reload at the end re-reads the persisted session, so the server sign-out must
  // complete first; leaving anyway keeps the workspace unreachable if that call fails.
  const handleSignOut = async () => {
    setIsProfileMenuOpen(false);
    try {
      await signOut();
    } finally {
      window.location.href = '/';
    }
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  // the drawer stays mounted for one exit animation after `mobileMenuOpen` flips
  // false, so it slides out instead of vanishing. Opening still mounts in the same commit as
  // before, so `useDisclosure`'s focus-on-open is untouched; every close path (X, backdrop,
  // Esc, nav click, hamburger toggle) funnels through `setMobileMenuOpen(false)`, so the
  // closing state below animates them all. Reduced-motion users skip the wait entirely.
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [prevMobileMenuOpen, setPrevMobileMenuOpen] = useState(mobileMenuOpen);
  // Render-phase adjustment (the React-docs pattern for state derived from a flip): the
  // render in which the drawer closes is the render that starts its exit, so the exit
  // classes land in the same commit — no flash of the un-animated drawer. Reduced-motion
  // users never enter the closing state: instant unmount, as before.
  if (mobileMenuOpen !== prevMobileMenuOpen) {
    setPrevMobileMenuOpen(mobileMenuOpen);
    if (
      !mobileMenuOpen &&
      !(
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      )
    ) {
      setDrawerClosing(true);
    }
  }
  useEffect(() => {
    if (!drawerClosing) return;
    const timer = window.setTimeout(() => setDrawerClosing(false), 240);
    return () => window.clearTimeout(timer);
  }, [drawerClosing, prevMobileMenuOpen]);
  // Masked while open, so re-opening mid-exit cancels the close cleanly.
  const closing = drawerClosing && !mobileMenuOpen;
  const drawerVisible = mobileMenuOpen || closing;
  // The <main> below is an inner scroller (the shell frame is h-screen), so
  // the window Lenis never smooths it — it gets its own wrapper-mode Lenis.
  const mainScrollRef = useLenisWrapper<HTMLElement>();

  // Derived first: the palette, the create menu and the tray all key off the signed-in role.
  const effectiveRole = (role || user?.roles[0] || 'vendor').toLowerCase();

  // Breadcrumbs
  const crumbs = getBreadcrumbData(location.pathname);

  // Quick Create menu state
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const createTriggerRef = useRef<HTMLButtonElement>(null);

  // Notifications dropdown & tabs
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<NotificationKind | 'all'>('all');
  const notificationsRef = useRef<HTMLDivElement>(null);
  const bellTriggerRef = useRef<HTMLButtonElement>(null);

  /**
   * The tray is the account's own rows in `notifications` - the same table the storefront centre
   * reads - through `api/notifications`, so the bell's badge is the server's unread head count and
   * never a number this shell makes up. `unreadCount === null` means "not read yet", which is why
   * the tray says so instead of printing a zero or an empty list.
   */
  const [notificationRows, setNotificationRows] = useState<Notification[] | null>(null);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationWriteError, setNotificationWriteError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const loadNotifications = useCallback(
    async (tab: NotificationKind | 'all', signal?: AbortSignal) => {
      setNotificationsLoading(true);
      try {
        const list = await fetchNotifications({ type: tab, pageSize: 8 }, signal);
        if (signal?.aborted) return;
        setNotificationRows(list.rows);
        setUnreadCount(list.unread);
        setNotificationsError(null);
      } catch (cause) {
        if (signal?.aborted) return;
        setNotificationRows(null);
        setUnreadCount(null);
        setNotificationsError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!signal?.aborted) setNotificationsLoading(false);
      }
    },
    [],
  );

  // The badge sits on the header before the tray is ever opened, so the first read happens on
  // mount, and a new read runs whenever the tab changes: each tab is a read of its own.
  useEffect(() => {
    const controller = new AbortController();
    void loadNotifications(notificationTab, controller.signal);
    return () => controller.abort();
  }, [notificationTab, loadNotifications]);

  const readNotification = (item: Notification) => {
    if (item.readAt !== null) return;
    void markNotificationRead(item.id)
      .then(() => loadNotifications(notificationTab))
      .catch((cause: unknown) =>
        setNotificationWriteError(cause instanceof Error ? cause.message : String(cause)),
      );
  };

  const markAllRead = () => {
    setNotificationWriteError(null);
    setMarkingAllRead(true);
    void markAllNotificationsRead()
      .then(() => loadNotifications(notificationTab))
      .catch((cause: unknown) =>
        setNotificationWriteError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setMarkingAllRead(false));
  };

  // Profile menu dropdown
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  // Help / Docs Modal state
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('vd_theme') === 'dark' ||
        document.documentElement.classList.contains('dark')
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vd_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vd_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Global Quick Search. The palette is scoped to the role's own workspace, because every entry
  // it offers has to be a route that role can actually open.
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  const reachableScreens = screensForRole(effectiveRole);

  const searchResults = searchQuery.trim()
    ? reachableScreens.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.group.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : reachableScreens;

  const goToScreen = (screen: WorkspaceScreen | undefined) => {
    if (!screen) return;
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchActiveIndex(0);
    navigate(screen.path);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (searchResults.length === 0) return;
      event.preventDefault();
      setIsSearchOpen(true);
      setSearchActiveIndex((index) =>
        event.key === 'ArrowDown'
          ? (index + 1) % searchResults.length
          : (index - 1 + searchResults.length) % searchResults.length,
      );
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      goToScreen(searchResults[searchActiveIndex]);
    }
  };

  /** One disclosure open at a time, so Escape has a single owner and one control to return to. */
  const openDisclosure = (open: () => void) => {
    setIsSearchOpen(false);
    setIsCreateMenuOpen(false);
    setIsNotificationsOpen(false);
    setIsProfileMenuOpen(false);
    open();
  };

  const toggleDisclosure = (
    isOpen: boolean,
    setOpen: (next: boolean) => void,
    onOpen?: () => void,
  ) => {
    if (isOpen) {
      setOpen(false);
      return;
    }
    openDisclosure(() => setOpen(true));
    onOpen?.();
  };

  // ⌘K / Ctrl+K focuses the palette. Escape belongs to each disclosure (see `useDisclosure`), which
  // hands focus back to the control that opened it instead of leaving it on a removed node.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openDisclosure(() => setIsSearchOpen(true));
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useDisclosure(isNotificationsOpen, setIsNotificationsOpen, notificationsRef, bellTriggerRef);
  useDisclosure(isCreateMenuOpen, setIsCreateMenuOpen, createMenuRef, createTriggerRef);
  useDisclosure(isProfileMenuOpen, setIsProfileMenuOpen, profileMenuRef, profileTriggerRef);
  // The palette keeps the caret in the field, so it does not take focus for itself.
  useDisclosure(isSearchOpen, setIsSearchOpen, searchPanelRef, searchInputRef, false);
  useDisclosure(mobileMenuOpen, setMobileMenuOpen, mobileDrawerRef, mobileMenuTriggerRef);

  // Edit Profile Modal State. Only the two columns the session actually keeps are editable;
  // a job title or phone number here would be typed into nothing.
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editEmail, setEditEmail] = useState(user?.email ?? '');
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUser({
      ...user,
      name: editName.trim() || user.name,
      email: editEmail.trim() || user.email,
    });
    setProfileSavedToast(true);
    setTimeout(() => {
      setProfileSavedToast(false);
      setIsEditProfileOpen(false);
    }, 900);
  };

  // Derive visual badge info from the role computed above
  const badgeStyle = ROLE_BADGE_STYLES[effectiveRole] || ROLE_BADGE_STYLES.vendor;

  // Friendly role title for "Logged in as [Role]"
  const getRoleDisplayName = (r: string) => {
    const normalized = r.toLowerCase();
    if (normalized.includes('vendor') || normalized.includes('seller')) {
      return 'Seller';
    }
    if (normalized.includes('admin')) {
      return 'Admin';
    }
    if (normalized.includes('rider')) {
      return 'Rider';
    }
    if (normalized.includes('support')) {
      return 'Support';
    }
    return r.charAt(0).toUpperCase() + r.slice(1);
  };

  const roleDisplayName = getRoleDisplayName(effectiveRole);

  const panelShellClass =
    effectiveRole === 'admin'
      ? 'admin-shell'
      : effectiveRole === 'vendor'
        ? 'vendor-shell'
        : effectiveRole === 'rider'
          ? 'rider-shell'
          : effectiveRole === 'support'
            ? 'support-shell'
            : '';

  const panelSidebarClass =
    effectiveRole === 'admin'
      ? 'admin-sidebar'
      : effectiveRole === 'vendor'
        ? 'vendor-sidebar'
        : effectiveRole === 'rider'
          ? 'rider-sidebar'
          : effectiveRole === 'support'
            ? 'support-sidebar'
            : '';

  const panelHeaderClass =
    effectiveRole === 'admin'
      ? 'admin-header'
      : effectiveRole === 'vendor'
        ? 'vendor-header'
        : effectiveRole === 'rider'
          ? 'rider-header'
          : effectiveRole === 'support'
            ? 'support-header'
            : '';

  // User presentation details
  const userName = user?.name || 'Signed-in user';
  const userEmail = user?.email || 'No email on this session';

  /**
   * What the bell is allowed to claim: the server's unread count once the read has landed, and an
   * explicit "not read" otherwise. A zero before the first response would be a made-up number.
   */
  const notificationReadout = notificationsError
    ? 'could not be read'
    : unreadCount === null
      ? notificationsLoading
        ? 'reading'
        : 'not loaded yet'
      : `${unreadCount} unread`;

  /** Only the keys this shell really binds, and only when the control they drive is on screen. */
  const shortcutRows: { keys: string; what: string }[] = [
    ...(reachableScreens.length > 0
      ? [{ keys: '⌘K / Ctrl+K', what: 'Jump to the screen list, then ↑ ↓ and Enter to open one' }]
      : []),
    { keys: 'Esc', what: 'Close the open panel and hand focus back to the control that opened it' },
  ];

  return (
    <div className={cn("workspace-shell h-screen max-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-none dark:bg-[#0a0a0b] text-slate-900 dark:text-slate-100 flex flex-row font-sans transition-colors duration-200 relative isolate", panelShellClass)}>
      <SkipLink />
      <ScrollManager />
      {/* Ambient soft glow mesh for Frosted Glass depth */}
      <div className="workspace-mesh-bg" aria-hidden="true">
        <div className="absolute -top-32 -left-32 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-orange-400/15 via-amber-300/10 to-transparent blur-3xl dark:from-orange-500/15 dark:via-orange-950/20" />
        <div className="absolute top-1/4 -right-32 h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-blue-400/15 via-indigo-300/10 to-transparent blur-3xl dark:from-white/[0.04] dark:via-white/[0.02]" />
        <div className="absolute top-2/3 left-1/4 h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-emerald-400/12 via-teal-300/8 to-transparent blur-3xl dark:from-emerald-950/20" />
        <div className="absolute -bottom-32 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-purple-400/12 via-pink-300/8 to-transparent blur-3xl dark:from-purple-950/20" />
      </div>

      {/* =========================================================================
          Desktop Sidebar (Extends full-height to the top of the viewport)
          ========================================================================= */}
      {sidebar && (
        <aside
          data-lenis-prevent
          className={cn(
            "hidden h-screen max-h-screen w-64 shrink-0 overflow-hidden border-r border-[var(--panel-glass-border,rgba(255,255,255,0.6))] dark:border-white/10 bg-[var(--panel-sidebar-bg,rgba(255,255,255,0.65))] dark:bg-[#121214]/80 backdrop-blur-xl md:flex md:flex-col transition-colors select-none relative z-30",
            panelSidebarClass
          )}
        >
          {sidebar}
        </aside>
      )}

      {/* =========================================================================
          Workspace Right Column: Header at Top + Scrollable Main Content Area
          ========================================================================= */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden relative z-10">
        {/* Top Header Bar */}
        <header className={cn("shrink-0 z-20 w-full border-b border-[var(--panel-glass-border,rgba(255,255,255,0.6))] dark:border-white/10 bg-[var(--panel-header-bg,rgba(255,255,255,0.75))] dark:bg-[#121214]/85 backdrop-blur-xl shadow-xs transition-colors", panelHeaderClass)}>
          <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Left section: Mobile menu + Global Search + Storefront Option */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {sidebar && (
                <button
                  ref={mobileMenuTriggerRef}
                  type="button"
                  onClick={() => toggleDisclosure(mobileMenuOpen, setMobileMenuOpen)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 md:hidden"
                  aria-label={mobileMenuOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
                  aria-expanded={mobileMenuOpen}
                  aria-controls={mobileMenuOpen ? MOBILE_DRAWER_ID : undefined}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              )}

              {/* Compact fallback logo only when no sidebar exists */}
              {!sidebar && (
                <div className="flex items-center mr-1">
                  <Link to="/" className="flex items-center gap-2 focus:outline-none group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-sun-orange to-[#FF9A42] text-white shadow-xs font-black text-sm tracking-tighter">
                      V
                    </div>
                    <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-sun-orange transition-colors">
                      Vendora
                      <span className="inline-block h-2 w-2 rounded-full bg-sun-orange ml-0.5" />
                    </span>
                  </Link>
                </div>
              )}

              {/* Palette. It only appears for a role that has screens to reach - a search box
                  that can offer nothing would be a control with nothing behind it. */}
              {reachableScreens.length > 0 && (
                <div className="relative hidden md:flex items-center w-52 lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    id="workspace-panel-search"
                    role="combobox"
                    aria-label="Search the workspace screens this role can open"
                    aria-expanded={isSearchOpen && searchResults.length > 0}
                    aria-controls={
                      isSearchOpen && searchResults.length > 0 ? SEARCH_LISTBOX_ID : undefined
                    }
                    aria-autocomplete="list"
                    aria-activedescendant={
                      isSearchOpen && searchResults.length > 0
                        ? `${SEARCH_LISTBOX_ID}-option-${searchActiveIndex}`
                        : undefined
                    }
                    value={searchQuery}
                    onFocus={() => setIsSearchOpen(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchActiveIndex(0);
                      setIsSearchOpen(true);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search panel..."
                    className="w-full h-8 pl-8 pr-12 text-xs rounded-xl border border-white/60 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-sun-orange/50 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-white/60 dark:border-white/10 rounded px-1.5 py-0.5 bg-white/60 dark:bg-slate-800/60">
                    ⌘K
                  </kbd>

                  {isSearchOpen && (
                    <div
                      ref={searchPanelRef}
                      className="absolute top-10 left-0 w-80 lg:w-96 rounded-2xl border border-white/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1"
                    >
                      <div className="px-3 py-1.5 text-xs font-bold text-slate-500 flex items-center justify-between">
                        <span>Quick Navigation</span>
                        <span>{searchResults.length} reachable screens</span>
                      </div>
                      {searchResults.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-slate-500">
                          No screen this role can open matches “{searchQuery.trim()}”.
                        </p>
                      ) : (
                        <div
                          id={SEARCH_LISTBOX_ID}
                          role="listbox"
                          aria-label="Workspace screens this role can open"
                          className="max-h-72 overflow-y-auto space-y-0.5"
                        >
                          {searchResults.map((item, idx) => (
                            <button
                              key={item.path}
                              id={`${SEARCH_LISTBOX_ID}-option-${idx}`}
                              type="button"
                              role="option"
                              aria-selected={idx === searchActiveIndex}
                              onClick={() => goToScreen(item)}
                              onMouseEnter={() => setSearchActiveIndex(idx)}
                              className={cn(
                                'w-full text-left flex items-start justify-between gap-2 p-2 rounded-xl transition-colors cursor-pointer group',
                                idx === searchActiveIndex
                                  ? 'bg-slate-50 dark:bg-slate-800'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800',
                              )}
                            >
                              <div>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-sun-orange transition-colors">
                                  {item.title}
                                </div>
                                <div className="text-xs text-slate-500 truncate max-w-[220px]">
                                  {item.desc}
                                </div>
                              </div>
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                                {item.group}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            {/* Back to Storefront pill button - positioned on the right side of the search bar */}
            {effectiveRole !== 'support' && effectiveRole !== 'rider' && (
              <Link
                to="/"
                className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 hover:text-sun-orange shadow-2xs group"
                title="Return to customer storefront"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-slate-400 group-hover:text-sun-orange transition-colors" />
                <Store className="h-3.5 w-3.5 text-sun-orange" />
                <span>Storefront</span>
              </Link>
            )}

            {/* Support Agent Quick Triage Queue Shortcut */}
            {effectiveRole === 'support' && (
              <Link
                to="/support"
                className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 hover:text-sky-600 shadow-2xs"
                title="Support Triage Queue"
              >
                <Inbox className="h-3.5 w-3.5 text-sky-600" />
                <span>My Queue</span>
              </Link>
            )}
          </div>

          {/* Right section: Date range + Context action + Urgency badge + Create dropdown + Help + Theme + Notifications + User Avatar */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Switch workspace: every shell carries it, so a
                multi-role account moves between consoles without a new
                sign-in. It renders nothing for single-workspace accounts. */}
            <SwitchWorkspaceMenu />
            {headerExtra && (
              <div className="hidden lg:flex items-center">{headerExtra}</div>
            )}

            {/* Context-Aware Action Button */}
            {effectiveRole === 'admin' ? (
              <>
                {location.pathname === '/admin' || location.pathname === '/admin/' ? (
                  <Link
                    to="/admin/reports"
                    className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-2xs"
                    title="Export financial report"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Export Report</span>
                  </Link>
                ) : location.pathname.startsWith('/admin/vendors') ? (
                  <Link
                    to="/admin/vendors"
                    className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-2xs"
                    title="Open the vendor applications awaiting a decision"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-slate-500" />
                    <span>Vendor Applications</span>
                  </Link>
                ) : location.pathname.startsWith('/admin/products') && location.pathname !== '/admin/add-product' ? (
                  <Link
                    to="/admin/add-product"
                    className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-500" />
                    <span>Add 1P Listing</span>
                  </Link>
                ) : null}
              </>
            ) : effectiveRole === 'vendor' ? (
              <>
                {location.pathname === '/vendor' || location.pathname === '/vendor/' ? (
                  <Link
                    to="/vendor/add-product"
                    className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-2xs"
                    title="Publish new product listing"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-500" />
                    <span>Add Product</span>
                  </Link>
                ) : location.pathname.startsWith('/vendor/products') && location.pathname !== '/vendor/add-product' ? (
                  <Link
                    to="/vendor/add-product"
                    className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-2xs"
                    title="Publish new product listing"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-500" />
                    <span>Add Product</span>
                  </Link>
                ) : location.pathname.startsWith('/vendor/orders') ? (
                  <Link
                    to="/vendor/inventory"
                    className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-2xs"
                    title="Manage inventory stock levels"
                  >
                    <Boxes className="h-3.5 w-3.5 text-slate-500" />
                    <span>Stock Console</span>
                  </Link>
                ) : location.pathname.startsWith('/vendor/inventory') ? (
                  <Link
                    to="/vendor/add-product"
                    className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-2xs"
                    title="Create new listing"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-500" />
                    <span>Add Listing</span>
                  </Link>
                ) : null}
              </>
            ) : null}

            {/* Queue shortcuts. A count or an urgency dot here would claim work the queue page is
                the only one that actually reads, so these just name where they lead. */}
            {effectiveRole === 'admin' ? (
              <Link
                to="/admin/products"
                className="hidden sm:inline-flex items-center gap-1.5 h-8 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 px-2.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-2xs transition-all active:scale-95"
                title="Open the catalog moderation queue"
              >
                <span>Moderation Queue</span>
              </Link>
            ) : effectiveRole === 'vendor' ? (
              <Link
                to="/vendor/orders"
                className="hidden sm:inline-flex items-center gap-1.5 h-8 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 px-2.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-2xs transition-all active:scale-95"
                title="Open the fulfillment queue"
              >
                <span>Fulfillment Queue</span>
              </Link>
            ) : null}

            {/* Quick Create Dropdown ("+ Create") */}
            {effectiveRole === 'admin' ? (
              <div className="relative">
                <button
                  ref={createTriggerRef}
                  type="button"
                  onClick={() => toggleDisclosure(isCreateMenuOpen, setIsCreateMenuOpen)}
                  className="inline-flex items-center gap-1.5 h-8 rounded-xl bg-gradient-to-r from-sun-orange to-[#FF9233] hover:from-sun-orange-600 hover:to-[#e88020] px-3 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                  title="Create a first-party listing or a storefront banner"
                  aria-expanded={isCreateMenuOpen}
                  aria-controls={isCreateMenuOpen ? CREATE_MENU_ID : undefined}
                >
                  <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" />
                  <span>Create</span>
                  <ChevronDown className="h-3 w-3 text-white/80" />
                </button>
                {/* Only the two creations this console really owns: `AdminAddProductPage` writes a
                    listing and `AdminCMSPage` has the Add Banner form. Inviting a merchant or
                    minting a platform voucher has no surface here, so neither is offered. */}
                {isCreateMenuOpen && (
                  <div
                    id={CREATE_MENU_ID}
                    ref={createMenuRef}
                    role="group"
                    aria-label="Quick create"
                    tabIndex={-1}
                    className="absolute top-10 right-0 w-56 rounded-2xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 focus:outline-none"
                  >
                    <div className="px-2.5 py-1 text-xs font-bold text-slate-500">
                      Quick Create
                    </div>
                    <Link
                      to="/admin/add-product"
                      onClick={() => setIsCreateMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-sun-orange/10 hover:text-sun-orange-600 dark:hover:text-sun-orange transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40 text-sun-orange">
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div>Product</div>
                        <div className="text-xs font-normal text-slate-500">First-party listing</div>
                      </div>
                    </Link>
                    <Link
                      to="/admin/cms"
                      onClick={() => setIsCreateMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                        <Image className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div>Banner</div>
                        <div className="text-xs font-normal text-slate-500">Storefront showcase</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            ) : effectiveRole === 'vendor' ? (
              <div className="relative">
                <button
                  ref={createTriggerRef}
                  type="button"
                  onClick={() => toggleDisclosure(isCreateMenuOpen, setIsCreateMenuOpen)}
                  className="inline-flex items-center gap-1.5 h-8 rounded-xl bg-gradient-to-r from-sun-orange to-[#FF9233] hover:from-sun-orange-600 hover:to-[#e88020] px-3 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                  title="Create a listing, a discount code, or upload store media"
                  aria-expanded={isCreateMenuOpen}
                  aria-controls={isCreateMenuOpen ? CREATE_MENU_ID : undefined}
                >
                  <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" />
                  <span>Create</span>
                  <ChevronDown className="h-3 w-3 text-white/80" />
                </button>
                {isCreateMenuOpen && (
                  <div
                    id={CREATE_MENU_ID}
                    ref={createMenuRef}
                    role="group"
                    aria-label="Store actions"
                    tabIndex={-1}
                    className="absolute top-10 right-0 w-56 rounded-2xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 focus:outline-none"
                  >
                    <div className="px-2.5 py-1 text-xs font-bold text-slate-500">
                      Store Actions
                    </div>
                    <Link
                      to="/vendor/add-product"
                      onClick={() => setIsCreateMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-sun-orange/10 hover:text-sun-orange-600 dark:hover:text-sun-orange transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40 text-sun-orange">
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div>Product Listing</div>
                        <div className="text-xs font-normal text-slate-500">Create new item</div>
                      </div>
                    </Link>
                    <Link
                      to="/vendor/promotions"
                      onClick={() => setIsCreateMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                        <Tag className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div>Promo Code</div>
                        <div className="text-xs font-normal text-slate-500">Discount your store issues</div>
                      </div>
                    </Link>
                    <Link
                      to="/vendor/media"
                      onClick={() => setIsCreateMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                        <Image className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div>Upload Media</div>
                        <div className="text-xs font-normal text-slate-500">Images &amp; banners</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            ) : null}

            {/* Help / Docs SOP Icon */}
            <button
              type="button"
              onClick={() => setIsHelpModalOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-2xs cursor-pointer"
              title="Workspace shortcuts and reachable screens"
              aria-label="Workspace shortcuts and reachable screens"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            {/* Dark Mode / Theme Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-2xs cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode theme"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>

            {/* Notification bell. The tray and its badge are this account's own rows in the
                `notifications` table - the same read the storefront centre makes - so a count here
                is the server's, and an unread that has not arrived is reported as not arrived. */}
            <div className="relative">
              <button
                ref={bellTriggerRef}
                type="button"
                onClick={() =>
                  toggleDisclosure(isNotificationsOpen, setIsNotificationsOpen, () => {
                    setNotificationWriteError(null);
                    void loadNotifications(notificationTab);
                  })
                }
                className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-2xs cursor-pointer"
                title={`Notifications ${notificationReadout}`}
                aria-label={`View notifications: ${notificationReadout}`}
                aria-expanded={isNotificationsOpen}
                aria-controls={isNotificationsOpen ? NOTIFICATIONS_PANEL_ID : undefined}
              >
                <Bell className="h-4 w-4" />
                {!notificationsError && unreadCount !== null && unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sun-orange px-1 text-[9px] font-bold text-white shadow-2xs"
                    aria-hidden="true"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  id={NOTIFICATIONS_PANEL_ID}
                  ref={notificationsRef}
                  role="region"
                  aria-label="Notifications addressed to this account"
                  tabIndex={-1}
                  className="absolute top-10 right-0 w-80 sm:w-96 rounded-2xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-1 focus:outline-none"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
                      <span className="rounded-full bg-orange-100 dark:bg-orange-950/60 px-1.5 py-0.2 text-xs font-bold text-sun-orange-600">
                        {notificationReadout}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={markAllRead}
                        disabled={
                          notificationsLoading ||
                          markingAllRead ||
                          notificationsError !== null ||
                          unreadCount === null ||
                          unreadCount === 0
                        }
                        className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-sun-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {markingAllRead ? 'Marking…' : 'Mark all read'}
                      </button>
                      <Link
                        to={effectiveRole === 'admin' ? '/admin/notifications' : '/notifications'}
                        onClick={() => setIsNotificationsOpen(false)}
                        className="text-xs font-semibold text-sun-orange-600 hover:underline"
                      >
                        View All
                      </Link>
                    </div>
                  </div>

                  {notificationWriteError && (
                    <p role="alert" className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700">
                      {notificationWriteError}
                    </p>
                  )}

                  {/* Tabs: each one is its own read of the table */}
                  <div
                    role="group"
                    aria-label="Filter notices by type"
                    className="grid grid-cols-4 gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold mb-2"
                  >
                    {NOTIFICATION_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setNotificationTab(tab.id)}
                        aria-pressed={notificationTab === tab.id}
                        className={cn(
                          "py-1 rounded-lg transition-all cursor-pointer",
                          notificationTab === tab.id
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div aria-busy={notificationsLoading}>
                  {notificationsLoading && notificationRows === null ? (
                    <p role="status" className="py-6 text-center text-xs text-slate-500">Reading your notifications…</p>
                  ) : notificationsError ? (
                    <div role="alert" className="py-6 text-center">
                      <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                        Your notifications could not be read
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{notificationsError}</p>
                      <button
                        type="button"
                        onClick={() => void loadNotifications(notificationTab)}
                        className="mt-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Read them again
                      </button>
                    </div>
                  ) : (notificationRows?.length ?? 0) === 0 ? (
                    <div role="status" className="py-6 text-center">
                      <BellOff className="mx-auto h-5 w-5 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                      <p className="mt-1.5 text-xs text-slate-500">
                        No notice is addressed to this account in this category.
                      </p>
                    </div>
                  ) : (
                  <div className="max-h-72 overflow-y-auto space-y-1.5">
                    {(notificationRows ?? []).map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "p-2 rounded-xl border text-xs transition-colors",
                          n.readAt === null
                            ? "bg-orange-50/40 dark:bg-orange-950/20 border-orange-200/60 dark:border-orange-800/40"
                            : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-700/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100 leading-snug">{n.title}</p>
                          <span className="text-xs text-slate-500 shrink-0">{relativeTime(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                            n.type === 'order_status' ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300" :
                            n.type === 'dispute' ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300" :
                            n.type === 'payout' ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" :
                            "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                          )}>
                            {n.type.replace(/_/g, ' ')}
                          </span>
                          {n.href ? (
                            <Link
                              to={n.href}
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                readNotification(n);
                              }}
                              className="text-xs font-bold text-sun-orange-600 hover:underline"
                            >
                              Open →
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => readNotification(n)}
                              disabled={n.readAt !== null}
                              aria-label={`Mark “${n.title}” read`}
                              className="text-xs font-bold text-slate-500 hover:text-sun-orange-600 disabled:opacity-40"
                            >
                              {n.readAt !== null ? 'Read' : 'Mark read'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar & Dropdown Menu */}
            <div className="relative">
              <button
                ref={profileTriggerRef}
                type="button"
                data-testid="user-profile"
                onClick={() => toggleDisclosure(isProfileMenuOpen, setIsProfileMenuOpen)}
                aria-expanded={isProfileMenuOpen}
                aria-controls={isProfileMenuOpen ? PROFILE_MENU_ID : undefined}
                className="flex items-center gap-1.5 cursor-pointer group p-0.5 rounded-full hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-700 transition-all"
                title="Profile & Settings"
                aria-label={`Account menu for ${userName} (${userEmail})`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs" aria-hidden="true">
                  <UserIcon className="h-4 w-4" />
                </div>
                <span className="sr-only">{userName} ({userEmail})</span>
              </button>

              {/* Accessible Test Compatibility Role Badge (Kept for tests) */}
              <span
                data-testid="role-badge"
                className={cn(
                  'sr-only rounded-full',
                  badgeStyle.bg,
                  badgeStyle.text,
                  badgeStyle.border,
                )}
              >
                Logged in as {roleBadgeText || effectiveRole.toUpperCase()}
              </span>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div
                  id={PROFILE_MENU_ID}
                  ref={profileMenuRef}
                  role="group"
                  aria-label="Account"
                  tabIndex={-1}
                  className="absolute top-10 right-0 w-60 rounded-2xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 focus:outline-none"
                >
                  {/* Identity & Role Badge */}
                  <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{userName}</div>
                    <div className="text-xs text-slate-500 truncate">{userEmail}</div>
                    <div className="mt-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-normal shadow-2xs',
                          badgeStyle.bg,
                          badgeStyle.text,
                          badgeStyle.border,
                        )}
                      >
                        <span>Logged in as</span>
                        <span>{roleDisplayName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Edit Profile */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setEditName(user?.name ?? '');
                      setEditEmail(user?.email ?? '');
                      setProfileSavedToast(false);
                      setIsEditProfileOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                    Edit Profile
                  </button>

                  {/* Platform Settings - only where the router serves one. `/vendor/store-settings`
                      is behind `VendorOnlyRoute`, so offering it to a support agent or a rider would
                      be a link that goes nowhere. */}
                  {(effectiveRole === 'admin' || effectiveRole === 'vendor') && (
                    <Link
                      to={effectiveRole === 'admin' ? '/admin/settings' : '/vendor/store-settings'}
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-400" />
                      Platform Settings
                    </Link>
                  )}

                  {/* Sign Out */}
                  <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Optional mobile secondary bar for header extra */}
        {headerExtra && (
          <div className="border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 px-4 py-2 lg:hidden">
            {headerExtra}
          </div>
        )}
      </header>

        {/* Main Content Area (Independent isolated scrolling, page only).
            data-lenis-prevent keeps the WINDOW Lenis out of this scroller;
            the wrapper-mode Lenis from useLenisWrapper smooths it instead
            (it is bound to this element, so the attribute does not block it). */}
        <main
          id="main-content"
          tabIndex={-1}
          ref={mainScrollRef}
          data-lenis-prevent
          data-scroll-reset
          className="flex-1 h-full min-w-0 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 relative z-10 dark:[&_h1]:text-slate-50 dark:[&_h2]:text-slate-50 dark:[&_h3]:text-slate-50 dark:[&_h4]:text-slate-50"
        >
          {/* Lenis wrapper mode measures this content element for its
              scroll limit; it must wrap everything the scroller holds. */}
          <div data-lenis-content className="min-h-full">
            {/* Breadcrumbs for deeper pages */}
            {crumbs.length > 1 && (
              <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
                {crumbs.map((c, i) => (
                  <React.Fragment key={c.path}>
                    {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />}
                    {i === crumbs.length - 1 ? (
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{c.label}</span>
                    ) : (
                      <Link to={c.path} className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                        {c.label}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}

            {!children && (title || subtitle) && (
              <div className="mb-6">
                {title && (
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                )}
              </div>
            )}
            {/* Route entrance: same .page-enter treatment as
                the storefront shell, keyed by pathname so panel pages
                fade/rise once per navigation. It sits inside the Lenis
                content wrapper, so the scroller's measurements are
                unchanged, and query/hash-only changes do not replay it. */}
            <div key={location.pathname} className="page-enter">
              {children ?? <Outlet />}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay & Drawer */}
      {sidebar && drawerVisible && (
        <div
          id={MOBILE_DRAWER_ID}
          ref={mobileDrawerRef}
          className={cn(
            'fixed inset-0 z-50 flex md:hidden focus:outline-none',
            closing && 'pointer-events-none',
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-mobile-drawer-title"
          tabIndex={-1}
        >
          {/* Backdrop */}
          <button
            type="button"
            className={cn(
              'fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity cursor-default',
              closing ? 'drawer-backdrop-exit' : 'animate-in fade-in-0',
            )}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar menu"
          />
          {/* Drawer */}
          <div className={cn(closing ? 'drawer-exit' : 'drawer-enter', "relative flex w-72 max-w-[80vw] flex-col bg-[var(--panel-sidebar-bg,rgba(255,255,255,0.85))] dark:bg-slate-900/85 backdrop-blur-2xl p-5 shadow-2xl border-r border-[var(--panel-glass-border,rgba(255,255,255,0.6))] dark:border-white/10", panelSidebarClass)}>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span id="workspace-mobile-drawer-title" className="text-base font-bold text-slate-900 dark:text-white">Navigation</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-bold uppercase',
                    badgeStyle.bg,
                    badgeStyle.text,
                  )}
                >
                  {effectiveRole}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  mobileMenuTriggerRef.current?.focus();
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close sidebar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div
              data-lenis-prevent
              className="flex-1 overflow-y-auto overscroll-contain no-scrollbar"
              onClick={() => setMobileMenuOpen(false)}
            >
              {sidebar}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                <Edit3 className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-bold">Edit Profile</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Update the name and email shown for your account.
            </DialogDescription>
          </DialogHeader>

          {profileSavedToast && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Profile updated.</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className={PROFILE_FIELD_LABEL} htmlFor="profile-name">
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className={PROFILE_FIELD_LABEL} htmlFor="profile-email">
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              To change the name or email on your account record, use your Profile page.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <Button type="submit" variant="gradient" size="sm">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Operator help dialog: the keys this shell binds and the screens this role can open. The
          moderation and escrow timings it used to quote are not read from anywhere, so they are
          gone rather than repeated. */}
      <Dialog open={isHelpModalOpen} onOpenChange={setIsHelpModalOpen}>
        <DialogContent className="max-w-md sm:max-w-lg p-6 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-2xl text-slate-900 dark:text-slate-100">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-sun-orange">
                <HelpCircle className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-bold">Workspace shortcuts</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              The keys this shell binds, and the screens your role can open from it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-indigo-500" />
                Keyboard
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {shortcutRows.map((row) => (
                  <li key={row.keys} className="flex items-start gap-2">
                    <kbd className="shrink-0 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">
                      {row.keys}
                    </kbd>
                    <span>{row.what}</span>
                  </li>
                ))}
              </ul>
            </div>

            {reachableScreens.length > 0 && (
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                  Screens for this role
                </div>
                <ul className="grid grid-cols-2 gap-1 text-xs">
                  {reachableScreens.slice(0, 8).map((screen) => (
                    <li key={screen.path}>
                      <Link
                        to={screen.path}
                        onClick={() => setIsHelpModalOpen(false)}
                        className="block truncate rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-sun-orange-600 transition-colors"
                        title={screen.desc}
                      >
                        {screen.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
