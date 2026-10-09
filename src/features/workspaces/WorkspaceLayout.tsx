import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Store,
  ArrowLeft,
  Menu,
  X,
  User as UserIcon,
  Search,
  Bell,
  Globe,
  Moon,
  Sun,
  LogOut,
  Plus,
  ExternalLink,
  CheckCircle2,
  Edit3,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  UserPlus,
  Tag,
  Image,
  HelpCircle,
  AlertCircle,
  Clock,
  ShieldAlert,
  Scale,
  Settings,
  Inbox,
  Headphones,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import type { UserRole } from '../../types/domain';
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

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
    text: 'text-[#EA6C13] dark:text-[#ff944d]',
    border: 'border-orange-200/80 dark:border-orange-800/60',
    dot: 'bg-[#FF7A1A]',
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

const GLOBAL_SEARCH_INDEX = [
  { title: 'Dashboard', path: '/admin', group: 'Navigation', desc: 'Marketplace KPIs and real-time overview' },
  { title: 'Product Moderation', path: '/admin/products', group: 'Catalog', desc: 'Submissions queue and approvals' },
  { title: 'Add Product', path: '/admin/add-product', group: 'Catalog', desc: 'Create and publish product catalog listing' },
  { title: 'Categories & Taxonomy', path: '/admin/categories', group: 'Catalog', desc: 'Taxonomy tree & commission structure' },
  { title: 'Orders & Shipments', path: '/admin/orders', group: 'Operations', desc: 'Multi-vendor split orders & tracking' },
  { title: 'Vendors & Merchants', path: '/admin/vendors', group: 'Stores', desc: 'KYC verification & merchant registry' },
  { title: 'Disputes & Arbitration', path: '/admin/disputes', group: 'Governance', desc: 'Buyer protection & escrow claims' },
  { title: 'Commission & Fees', path: '/admin/commission', group: 'Finance', desc: 'Take rates, fee history & payout rules' },
  { title: 'Financial Reports', path: '/admin/reports', group: 'Finance', desc: 'Ledger exports & yield breakdown' },
  { title: 'Files & Media Management', path: '/admin/media', group: 'Media', desc: 'Cloudflare CDN, S3 buckets & media assets' },
  { title: 'Admin Settings', path: '/admin/settings', group: 'System', desc: 'API keys, security policies & webhooks' },
  { title: 'Users & Permissions', path: '/admin/users', group: 'System', desc: 'Staff roles and access control' },
  { title: 'Platform Notifications', path: '/admin/notifications', group: 'System', desc: 'Alert triggers and dispatch center' },
  // Quick Products / Items
  { title: 'Wireless Headphones Pro', path: '/admin/products', group: 'Products', desc: 'SKU: SPKR-009 • Nova Electronics' },
  { title: 'Bamboo Cutting Board Set', path: '/admin/products', group: 'Products', desc: 'SKU: BMBRD-020 • Artisan Kitchen' },
  { title: 'Adjustable Dumbbell Set', path: '/admin/products', group: 'Products', desc: 'SKU: DUNBL-015 • Nexus Tech' },
  { title: 'Ergonomic Mesh Chair', path: '/admin/products', group: 'Products', desc: 'SKU: CHAIR-002 • Urban Nomad' },
  // Stores
  { title: 'Nova Electronics', path: '/admin/vendors', group: 'Vendors', desc: 'Consumer Audio & Tech • Tier 1' },
  { title: 'Apex Optics Store', path: '/admin/vendors', group: 'Vendors', desc: 'Optics & Accessories • Tier 2' },
  { title: 'Vendora Soundwave', path: '/admin/vendors', group: 'Vendors', desc: 'Audio & Studio Gear • Official Partner' },
];

interface NotificationItem {
  id: string;
  category: 'orders' | 'disputes' | 'kyc';
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  actionUrl: string;
  actionText: string;
}

const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    category: 'orders',
    title: 'High-Value Order #ORD-9821',
    desc: '$1,420.00 requires settlement split sign-off.',
    time: '5m ago',
    unread: true,
    actionUrl: '/admin/orders',
    actionText: 'View Order',
  },
  {
    id: 'n-2',
    category: 'kyc',
    title: 'Merchant KYC: Artisan Audio Tech',
    desc: 'Tax ID & bank mandate documents awaiting sign-off.',
    time: '24m ago',
    unread: true,
    actionUrl: '/admin/vendors',
    actionText: 'Review KYC',
  },
  {
    id: 'n-3',
    category: 'disputes',
    title: 'Arbitration Escalation #DISP-402',
    desc: 'Buyer claims missing item on mirrorless camera body.',
    time: '1h ago',
    unread: true,
    actionUrl: '/admin/disputes',
    actionText: 'Open Case',
  },
  {
    id: 'n-4',
    category: 'kyc',
    title: 'Catalog Moderation: SoundWave Pro',
    desc: 'New SKU pending trademark and policy verification.',
    time: '2h ago',
    unread: false,
    actionUrl: '/admin/products',
    actionText: 'Moderate SKU',
  },
  {
    id: 'n-5',
    category: 'orders',
    title: 'Delivery SLA Alert #ORD-9755',
    desc: 'Sub-order dispatched courier window exceeded 48h.',
    time: '4h ago',
    unread: false,
    actionUrl: '/admin/orders',
    actionText: 'Inspect SLA',
  },
];

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
  const { user, logout, setUser } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Breadcrumbs
  const crumbs = getBreadcrumbData(location.pathname);

  // Environment badge state
  const [envMode, setEnvMode] = useState<'production' | 'staging'>('production');
  const [isEnvMenuOpen, setIsEnvMenuOpen] = useState(false);
  const envMenuRef = useRef<HTMLDivElement>(null);

  // Global Date Range filter state
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const dateRangeRef = useRef<HTMLDivElement>(null);

  // Quick Create menu state
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  // Notifications dropdown & tabs
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'orders' | 'disputes' | 'kyc'>('all');
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Profile menu dropdown
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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

  // Global Quick Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsCreateMenuOpen(false);
        setIsDateRangeOpen(false);
        setIsNotificationsOpen(false);
        setIsProfileMenuOpen(false);
        setIsEnvMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(target)) {
        setIsCreateMenuOpen(false);
      }
      if (dateRangeRef.current && !dateRangeRef.current.contains(target)) {
        setIsDateRangeOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
      if (envMenuRef.current && !envMenuRef.current.contains(target)) {
        setIsEnvMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim()
    ? GLOBAL_SEARCH_INDEX.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.group.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : GLOBAL_SEARCH_INDEX.slice(0, 6);

  // Edit Profile Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || 'Vendora Administrator');
  const [editEmail, setEditEmail] = useState(user?.email || 'admin@vendora.internal');
  const [editRoleTitle, setEditRoleTitle] = useState('Marketplace Operations Lead');
  const [editPhone, setEditPhone] = useState('+1 (555) 492-8812');
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      setUser({
        ...user,
        name: editName.trim() || user.name,
        email: editEmail.trim() || user.email,
      });
    }
    setProfileSavedToast(true);
    setTimeout(() => {
      setProfileSavedToast(false);
      setIsEditProfileOpen(false);
    }, 900);
  };

  // Derive role and visual badge info
  const effectiveRole = (role || user?.roles[0] || 'vendor').toLowerCase();
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

  // User presentation details
  const userName = user?.name || 'Vendora User';
  const userEmail = user?.email || 'user@vendora.internal';

  return (
    <div className="workspace-shell min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 relative isolate">
      {/* Ambient soft glow mesh for Frosted Glass depth */}
      <div className="workspace-mesh-bg" aria-hidden="true">
        <div className="absolute -top-32 -left-32 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-orange-400/15 via-amber-300/10 to-transparent blur-3xl dark:from-orange-500/15 dark:via-orange-950/20" />
        <div className="absolute top-1/4 -right-32 h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-blue-400/15 via-indigo-300/10 to-transparent blur-3xl dark:from-indigo-900/20 dark:via-slate-900/30" />
        <div className="absolute top-2/3 left-1/4 h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-emerald-400/12 via-teal-300/8 to-transparent blur-3xl dark:from-emerald-950/20" />
        <div className="absolute -bottom-32 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-purple-400/12 via-pink-300/8 to-transparent blur-3xl dark:from-purple-950/20" />
      </div>

      {/* =========================================================================
          Top Shell Bar (Full-Width Sticky Header)
          ========================================================================= */}
      <header className="sticky top-0 z-40 w-full border-b border-white/60 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-xs transition-colors">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left section: Mobile menu + Logo + Storefront pill + Global Search */}
          <div className="flex items-center gap-3 sm:gap-4">
            {sidebar && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 md:hidden"
                aria-label={mobileMenuOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}

            {/* Logo replacement without redundant "/ Workspace" */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 focus:outline-none group">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF7A1A] to-[#FF9A42] text-white shadow-xs font-black text-sm tracking-tighter">
                  V
                </div>
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-[#FF7A1A] transition-colors">
                  Vendora
                  <span className="inline-block h-2 w-2 rounded-full bg-[#FF7A1A] ml-0.5" />
                </span>
              </Link>
            </div>

            {/* Back to Storefront pill button */}
            {effectiveRole !== 'support' && effectiveRole !== 'rider' && (
              <Link
                to="/"
                className="glass-pill ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 hover:text-[#FF7A1A]"
                title="Return to customer storefront"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <Store className="h-3.5 w-3.5 hidden sm:inline" />
                <span>Storefront</span>
              </Link>
            )}

            {/* Support Agent Quick Triage Queue Shortcut */}
            {effectiveRole === 'support' && (
              <Link
                to="/support"
                className="glass-pill ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 hover:text-sky-600"
                title="Support Triage Queue"
              >
                <Inbox className="h-3.5 w-3.5 text-sky-600" />
                <span>My Queue</span>
                <span className="rounded-full bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.2 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                  5
                </span>
              </Link>
            )}

            {/* Environment Safety Badge (Production / Staging) */}
            {effectiveRole === 'admin' && (
              <div className="relative" ref={envMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsEnvMenuOpen(!isEnvMenuOpen)}
                  className={cn(
                    "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer shadow-2xs",
                    envMode === 'production'
                      ? "bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/90"
                      : "bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100/90"
                  )}
                  title="Active Platform Environment — Click to switch"
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", envMode === 'production' ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                  <span className="capitalize">{envMode}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
                {isEnvMenuOpen && (
                  <div className="absolute top-8 left-0 w-44 rounded-xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                    <button
                      type="button"
                      onClick={() => { setEnvMode('production'); setIsEnvMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Production
                      </span>
                      {envMode === 'production' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEnvMode('staging'); setIsEnvMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Staging / Sandbox
                      </span>
                      {envMode === 'staging' && <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Global Search Bar (Whole Panel Access - hidden for rider) */}
            {effectiveRole !== 'rider' && (
              <div ref={searchContainerRef} className="relative hidden md:flex items-center w-52 lg:w-64 ml-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Search panel..."
                className="w-full h-8 pl-8 pr-12 text-xs rounded-xl border border-white/60 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#FF7A1A]/50 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-white/60 dark:border-white/10 rounded px-1.5 py-0.5 bg-white/60 dark:bg-slate-800/60">
                ⌘K
              </kbd>

              {/* Quick Search Results Dropdown */}
              {isSearchOpen && (
                <div className="absolute top-10 left-0 w-80 lg:w-96 rounded-2xl border border-white/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Quick Navigation</span>
                    <span>{searchResults.length} results</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-0.5">
                    {searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate(item.path);
                        }}
                        className="w-full text-left flex items-start justify-between gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#FF7A1A] transition-colors">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {item.desc}
                          </div>
                        </div>
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                          {item.group}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>

          {/* Right section: Date range + Context action + Urgency badge + Create dropdown + Help + Theme + Notifications + User Avatar */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {headerExtra && (
              <div className="hidden lg:flex items-center">{headerExtra}</div>
            )}

            {/* Global Date Range Filter */}
            {effectiveRole === 'admin' && (
              <div className="relative hidden xl:block" ref={dateRangeRef}>
                <button
                  type="button"
                  onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
                  title="Global analytics date window"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{dateRange}</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
                {isDateRangeOpen && (
                  <div className="absolute top-10 right-0 w-40 rounded-xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                    {['Today', 'Last 7 Days', 'Last 30 Days', 'This Quarter', 'All Time'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setDateRange(r); setIsDateRangeOpen(false); }}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                          dateRange === r
                            ? "bg-[#FF7A1A]/10 text-[#EA6C13] dark:text-[#FF7A1A] font-bold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Context-Aware Action Button */}
            {effectiveRole === 'admin' && (
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
                    title="Invite new marketplace vendor"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-slate-500" />
                    <span>Invite Vendor</span>
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
            )}

            {/* Action Urgency Button: Review Pending (2) */}
            {effectiveRole === 'admin' && (
              <Link
                to="/admin/products"
                className="hidden sm:inline-flex items-center gap-1.5 h-8 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 px-2.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-2xs transition-all active:scale-95"
                title="2 listings pending catalog moderation"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span>Review Pending</span>
                <span className="rounded-full bg-amber-200/80 dark:bg-amber-800/80 px-1.5 py-0.2 text-[10px] font-extrabold text-amber-900 dark:text-amber-100">
                  2
                </span>
              </Link>
            )}

            {/* Quick Create Dropdown ("+ Create") */}
            {effectiveRole === 'admin' ? (
              <div className="relative" ref={createMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                  className="inline-flex items-center gap-1.5 h-8 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                  title="Create new catalog item or platform entity"
                >
                  <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" />
                  <span>Create</span>
                  <ChevronDown className="h-3 w-3 text-white/80" />
                </button>
                {isCreateMenuOpen && (
                  <div className="absolute top-10 right-0 w-56 rounded-2xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Quick Create
                    </div>
                    <Link
                      to="/admin/add-product"
                      onClick={() => setIsCreateMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-[#FF7A1A]/10 hover:text-[#EA6C13] dark:hover:text-[#FF7A1A] transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF7A1A]">
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div>Product</div>
                        <div className="text-[10px] font-normal text-slate-400">Catalog listing</div>
                      </div>
                    </Link>
                    <Link
                      to="/admin/vendors"
                      onClick={() => setIsCreateMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                        <UserPlus className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div>Vendor</div>
                        <div className="text-[10px] font-normal text-slate-400">Invite merchant</div>
                      </div>
                    </Link>
                    <Link
                      to="/admin/commission"
                      onClick={() => setIsCreateMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                        <Tag className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div>Coupon / Promotion</div>
                        <div className="text-[10px] font-normal text-slate-400">Platform voucher</div>
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
                        <div>Banner / Campaign</div>
                        <div className="text-[10px] font-normal text-slate-400">Storefront showcase</div>
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
              title="Help & Operations SOP"
              aria-label="Help and operations SOP"
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

            {/* Notification Bell with Dropdown & Tabs (Orders, Disputes, KYC) */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-2xs cursor-pointer"
                title="5 unread platform notifications"
                aria-label="View notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF7A1A] text-[9px] font-bold text-white shadow-2xs">
                  5
                </span>
              </button>

              {isNotificationsOpen && (
                <div className="absolute top-10 right-0 w-80 sm:w-96 rounded-2xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
                      <span className="rounded-full bg-orange-100 dark:bg-orange-950/60 px-1.5 py-0.2 text-[10px] font-bold text-[#EA6C13]">
                        5 unread
                      </span>
                    </div>
                    <Link
                      to={effectiveRole === 'admin' ? '/admin/notifications' : '/vendor/messages'}
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-[11px] font-semibold text-[#EA6C13] hover:underline"
                    >
                      View All
                    </Link>
                  </div>

                  {/* Tabs: All, Orders, Disputes, KYC */}
                  <div className="grid grid-cols-4 gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold mb-2">
                    {(['all', 'orders', 'disputes', 'kyc'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setNotificationTab(tab)}
                        className={cn(
                          "py-1 rounded-lg capitalize transition-all cursor-pointer",
                          notificationTab === tab
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        )}
                      >
                        {tab === 'kyc' ? 'KYC' : tab}
                      </button>
                    ))}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-72 overflow-y-auto space-y-1.5">
                    {SAMPLE_NOTIFICATIONS.filter((n) => notificationTab === 'all' || n.category === notificationTab).map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "p-2 rounded-xl border text-xs transition-colors",
                          n.unread
                            ? "bg-orange-50/40 dark:bg-orange-950/20 border-orange-200/60 dark:border-orange-800/40"
                            : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-700/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100 leading-snug">{n.title}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.desc}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                            n.category === 'orders' ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700" :
                            n.category === 'disputes' ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700" :
                            "bg-purple-100 dark:bg-purple-950/60 text-purple-700"
                          )}>
                            {n.category.toUpperCase()}
                          </span>
                          <Link
                            to={n.actionUrl}
                            onClick={() => setIsNotificationsOpen(false)}
                            className="text-[11px] font-bold text-[#EA6C13] hover:underline"
                          >
                            {n.actionText} →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar & Dropdown Menu */}
            <div className="relative" ref={profileMenuRef}>
              <div
                data-testid="user-profile"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-1.5 cursor-pointer group p-0.5 rounded-full hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-700 transition-all"
                title="Profile & Settings"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs">
                  <UserIcon className="h-4 w-4" />
                </div>
                <span className="sr-only">{userName} ({userEmail})</span>
              </div>

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
                <div className="absolute top-10 right-0 w-60 rounded-2xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1">
                  {/* Identity & Role Badge */}
                  <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{userName}</div>
                    <div className="text-[11px] text-slate-400 truncate">{userEmail}</div>
                    <div className="mt-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-normal shadow-2xs',
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

                  {/* Language Selector in Menu */}
                  <div className="px-2.5 py-1.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors">
                    <span className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                      Language
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">English (US)</span>
                  </div>

                  {/* Edit Profile */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsEditProfileOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                    Edit Profile
                  </button>

                  {/* Platform Settings */}
                  <Link
                    to={effectiveRole === 'admin' ? '/admin/settings' : '/vendor/store-settings'}
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-400" />
                    Platform Settings
                  </Link>

                  {/* Sign Out */}
                  <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                        window.location.href = '/';
                      }}
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

      {/* Edit Profile Modal Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                <Edit3 className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-bold">Edit Admin Profile</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Update your administrative profile identity, contact details, and role preferences.
            </DialogDescription>
          </DialogHeader>

          {profileSavedToast && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Job Title / Scope
                </label>
                <input
                  type="text"
                  value={editRoleTitle}
                  onChange={(e) => setEditRoleTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-[#FF7A1A] text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-[#ea6c13] shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin Operations Playbook & SOPs Dialog */}
      <Dialog open={isHelpModalOpen} onOpenChange={setIsHelpModalOpen}>
        <DialogContent className="max-w-md sm:max-w-lg p-6 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-2xl text-slate-900 dark:text-slate-100">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-[#FF7A1A]">
                <HelpCircle className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-bold">Marketplace Operations Playbook & SOPs</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Platform governance policies, approval SLAs, and quick operator shortcuts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                Catalog Moderation SLA (24h)
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Vendor submissions must be reviewed for IP infringement, authentic barcode/UPC formatting, and compliant imagery before marketplace indexing.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-rose-500" />
                Escrow & Dispute Resolution (7-Day Hold)
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Vendor settlement is held in automated escrow for 7 days post-delivery. Customer defect disputes require merchant rebuttal within 48h.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-indigo-500" />
                Operator Keyboard Shortcuts
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">⌘K</kbd>
                  <span>Global Panel Search</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Esc</kbd>
                  <span>Close Menus & Dialogs</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          Workspace Body Shell: Full-Width Sidebar + Content
          ========================================================================= */}
      <div className="flex w-full flex-1 items-start relative z-10">
        {/* Desktop Sidebar (Smooth scrollable with hidden scrollbar) */}
        {sidebar && (
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-r border-white/60 dark:border-white/10 bg-white/65 dark:bg-slate-900/65 backdrop-blur-xl p-3 md:block transition-colors">
            {sidebar}
          </aside>
        )}

        {/* Mobile Sidebar Overlay & Drawer */}
        {sidebar && mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <div className="relative flex w-72 max-w-[80vw] flex-col bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl p-5 shadow-2xl border-r border-white/60 dark:border-white/10">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900 dark:text-white">Navigation</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                      badgeStyle.bg,
                      badgeStyle.text,
                    )}
                  >
                    {effectiveRole}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div
                className="flex-1 overflow-y-auto"
                onClick={() => setMobileMenuOpen(false)}
              >
                {sidebar}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 relative z-10">
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
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
              )}
            </div>
          )}
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};
