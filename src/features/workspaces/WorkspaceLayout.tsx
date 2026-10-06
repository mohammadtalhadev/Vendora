import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import {
  Store,
  ArrowLeft,
  Menu,
  X,
  Shield,
  User as UserIcon,
  Search,
  Bell,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import type { UserRole } from '../../types/domain';
import { cn } from '../../lib/utils';

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
    bg: 'bg-orange-50/90',
    text: 'text-[#EA6C13]',
    border: 'border-orange-200/80',
    dot: 'bg-[#FF7A1A]',
  },
  admin: {
    bg: 'bg-slate-900',
    text: 'text-white',
    border: 'border-slate-800',
    dot: 'bg-emerald-400',
  },
  rider: {
    bg: 'bg-emerald-50/90',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  support: {
    bg: 'bg-sky-50/90',
    text: 'text-sky-700',
    border: 'border-sky-200/80',
    dot: 'bg-sky-500',
  },
  customer: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
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
  const { user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Derive role and visual badge info
  const effectiveRole = (role || user?.roles[0] || 'vendor').toLowerCase();
  const badgeStyle = ROLE_BADGE_STYLES[effectiveRole] || ROLE_BADGE_STYLES.vendor;
  const displayRoleBadge = roleBadgeText || effectiveRole.toUpperCase();

  // User presentation details
  const userName = user?.name || 'Vendora User';
  const userEmail = user?.email || 'user@vendora.internal';
  const userInitials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* =========================================================================
          Top Shell Bar (Catmin Full-Width Sticky Header)
          ========================================================================= */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
          {/* Left section: Mobile menu button + Brand + Search capsule */}
          <div className="flex items-center gap-3 sm:gap-4">
            {sidebar && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
                aria-label={mobileMenuOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}

            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-1.5 focus:outline-none">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  Vendora
                  <span className="inline-block h-2 w-2 rounded-full bg-[#FF7A1A] ml-0.5" />
                </span>
              </Link>
              <span className="hidden text-slate-300 font-light sm:inline-block">/</span>
              <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-500 sm:inline-block">
                Workspace
              </span>
            </div>

            {/* Back to Storefront pill button */}
            <Link
              to="/"
              className="glass-pill ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-white hover:text-[#FF7A1A]"
              title="Return to customer storefront"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <Store className="h-3.5 w-3.5 hidden sm:inline" />
              <span>Storefront</span>
            </Link>

            {/* Catmin Search Bar */}
            <div className="relative hidden md:block w-56 lg:w-72 ml-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Type to search..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Right section: Header extra + Notification Bell + Role badge + User profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {headerExtra && (
              <div className="hidden lg:flex items-center">{headerExtra}</div>
            )}

            {/* Notification Bell with Badge */}
            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
              title="5 unread platform notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                5
              </span>
            </button>

            {/* Current Role Badge (Invariant: rounded-full glass pill) */}
            <span
              data-testid="role-badge"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold tracking-wide shadow-xs transition-colors',
                badgeStyle.bg,
                badgeStyle.text,
                badgeStyle.border,
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', badgeStyle.dot)} />
              <Shield className="h-3 w-3" />
              <span>{displayRoleBadge}</span>
            </span>

            {/* User Profile display */}
            <div
              data-testid="user-profile"
              className="glass-pill flex items-center gap-2 px-2.5 py-1 sm:pl-2 sm:pr-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-xs">
                {userInitials || <UserIcon className="h-3.5 w-3.5" />}
              </div>
              <div className="hidden flex-col text-left text-xs sm:flex">
                <span className="font-semibold text-slate-900 line-clamp-1">{userName}</span>
                <span className="text-[10px] text-slate-500 line-clamp-1">{userEmail}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Optional mobile secondary bar for header extra */}
        {headerExtra && (
          <div className="border-t border-slate-100 bg-white/50 px-4 py-2 lg:hidden">
            {headerExtra}
          </div>
        )}
      </header>

      {/* =========================================================================
          Workspace Body Shell: Full-Width Sidebar + Content
          ========================================================================= */}
      <div className="flex w-full flex-1 items-start">
        {/* Desktop Sidebar */}
        {sidebar && (
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-white p-4 md:block">
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
            <div className="relative flex w-72 max-w-[80vw] flex-col bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">Navigation</span>
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
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {(title || subtitle) && (
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
