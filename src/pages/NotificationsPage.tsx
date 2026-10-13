import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronRight,
  DollarSign,
  Info,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/auth-store';
import { ListSkeleton } from '../components/common/QueryState';
import type { Notification, NotificationKind } from '../features/notifications/api/notifications';
import {
  useNotificationActions,
  useNotifications,
} from '../features/notifications/hooks/useNotifications';

type CategoryFilter = 'all' | 'unread' | 'orders' | 'alerts' | 'payouts' | 'system';

/**
 * A tab is a question for Postgres, not a filter over whatever page 1 happens to hold: the rows
 * the fan-out triggers write (`20261011001200_vendora_notification_fanout.sql`) are typed
 * `order_status`, `dispute`, `system` and `payout`, and `unreadOnly` is `read_at is null`.
 * `promotion`, `review` and `security` notices exist and reach the tray through All and Unread;
 * they get no tab of their own rather than a count this screen cannot ask for.
 */
const TAB_QUERY: Record<
  CategoryFilter,
  { type?: NotificationKind | 'all'; unreadOnly?: boolean }
> = {
  all: {},
  unread: { unreadOnly: true },
  orders: { type: 'order_status' },
  alerts: { type: 'dispute' },
  payouts: { type: 'payout' },
  system: { type: 'system' },
};

const TABS: ReadonlyArray<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'orders', label: 'Orders' },
  { id: 'alerts', label: 'Disputes' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'system', label: 'System' },
];

interface KindDetails {
  icon: LucideIcon;
  label: string;
  badgeClass: string;
  iconBgClass: string;
  actionLabel: string;
}

/** Every label of `public.notification_type`, which is what the column can actually hold. */
const KIND_DETAILS: Record<NotificationKind, KindDetails> = {
  order_status: {
    icon: Package,
    label: 'Order Update',
    badgeClass: 'bg-blue-50 text-[#2563EB] border-blue-200/60',
    iconBgClass: 'bg-blue-100 text-[#2563EB]',
    actionLabel: 'View Order',
  },
  dispute: {
    icon: AlertTriangle,
    label: 'Dispute Alert',
    badgeClass: 'bg-rose-50 text-rose-600 border-rose-200/60',
    iconBgClass: 'bg-rose-100 text-rose-600',
    actionLabel: 'Review Dispute',
  },
  payout: {
    icon: DollarSign,
    label: 'Payout Notification',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    iconBgClass: 'bg-emerald-100 text-emerald-700',
    actionLabel: 'View Payouts',
  },
  promotion: {
    icon: Sparkles,
    label: 'Special Deal',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/60',
    iconBgClass: 'bg-amber-100 text-amber-700',
    actionLabel: 'View Deal',
  },
  review: {
    icon: Star,
    label: 'Review Notice',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200/60',
    iconBgClass: 'bg-violet-100 text-violet-700',
    actionLabel: 'Read Review',
  },
  security: {
    icon: ShieldCheck,
    label: 'Security Alert',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300/60',
    iconBgClass: 'bg-slate-200 text-slate-700',
    actionLabel: 'Review Activity',
  },
  system: {
    icon: Info,
    label: 'System Notice',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    iconBgClass: 'bg-indigo-100 text-indigo-700',
    actionLabel: 'Learn More',
  },
};

/**
 * A page is a `range()` the server applies, so this is how many rows Postgres is asked for at a
 * time - not how many the page keeps after cutting the pool itself.
 */
const PAGE_SIZE = 6;

const fullTimestamp = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const dayStamp = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function formatFullTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : fullTimestamp.format(date);
}

/** Spelled out of `created_at` alone: nothing here is a canned "2 hours ago". */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 0) return dayStamp.format(date);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return dayStamp.format(date);
}

const reason = (error: unknown): string =>
  error instanceof Error && error.message
    ? error.message
    : 'The database did not accept this change.';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  /** The page Postgres is asked for; a tab change starts the pool again from page 1. */
  const [page, setPage] = useState(1);
  /** The keyword box never leaves this page: it narrows the loaded page, nothing more. */
  const [pageFilter, setPageFilter] = useState('');

  const list = useNotifications({ ...TAB_QUERY[activeCategory], page, pageSize: PAGE_SIZE });
  const actions = useNotificationActions();

  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const unread = list.data?.unread ?? 0;
  const readError =
    list.error instanceof Error ? list.error.message : 'Your notifications could not be read.';

  const visibleRows = useMemo(() => {
    const needle = pageFilter.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (notice) =>
        notice.title.toLowerCase().includes(needle) ||
        notice.message.toLowerCase().includes(needle) ||
        notice.type.includes(needle),
    );
  }, [rows, pageFilter]);

  const openNotice = (notice: Notification) => {
    if (notice.readAt === null) actions.markRead.mutate(notice.id);
    if (notice.href) navigate(notice.href);
  };

  /**
   * A count only where the database gave one: `total` is the size of the pool the active tab
   * asked for, `unread` is this account's unread notices however they are filtered. Every other
   * tab shows its label alone, because counting kinds from one page would be a guess.
   */
  const countOf = (tab: CategoryFilter): number | null => {
    if (!list.data) return null;
    if (tab === 'unread') return list.data.unread;
    return tab === activeCategory ? list.data.total : null;
  };

  const activeLabel = TABS.find((tab) => tab.id === activeCategory)?.label ?? 'All';

  /** The tab is a new question for the database, so its answer starts at its own page 1. */
  const selectTab = (tab: CategoryFilter) => {
    setActiveCategory(tab);
    setPage(1);
  };

  /** Roving focus across the tablist: Arrow/Home/End move focus, Enter/Space activate. */
  const handleTabListKeyDown = (event: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = TABS.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      document.getElementById(`tab-${TABS[nextIndex].id}`)?.focus();
    }
  };

  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="pb-20 pt-6">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500"
        >
          <Link to="/" className="hover:text-slate-800 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-900 font-semibold">Notifications</span>
        </nav>

        {/* Header Banner */}
        <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF7A1A] to-amber-500 text-white shadow-md shadow-orange-500/20">
                  <Bell className="h-6 w-6 stroke-[2]" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                    Notifications Center
                  </h1>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                    The notices Postgres addressed to this account: order and dispute updates,
                    payouts, and marketplace alerts.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                <span className="font-bold text-slate-900">{total}</span>
                {activeCategory === 'all' ? 'Total' : activeLabel}
              </span>
              {unread > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  {unread} Unread
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar: Search + Bulk Action + Category Tabs */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            {/* Keyword filter over the loaded page only */}
            <div className="flex-1 max-w-md">
              <label
                htmlFor="notice-page-filter"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500"
              >
                Filters the loaded page
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="notice-page-filter"
                  type="text"
                  value={pageFilter}
                  onChange={(event) => setPageFilter(event.target.value)}
                  placeholder="Narrow these results by keyword..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:border-[#FF7A1A] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#FF7A1A]/20"
                />
                {pageFilter && (
                  <button
                    type="button"
                    onClick={() => setPageFilter('')}
                    aria-label="Clear keyword filter"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Bulk action: the one the backend actually has */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => actions.markAllRead.mutate()}
                  disabled={actions.markAllRead.isPending || unread === 0}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer',
                    unread > 0 && !actions.markAllRead.isPending
                      ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-95'
                      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed',
                  )}
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>{actions.markAllRead.isPending ? 'Marking…' : 'Mark all as read'}</span>
                </button>
              </div>
              {/* A refused write is reported, never folded into "you are all caught up". */}
              {actions.markAllRead.isError && (
                <p
                  role="alert"
                  data-testid="mark-all-read-error"
                  className="max-w-xs text-right text-[11px] font-semibold text-rose-600"
                >
                  {reason(actions.markAllRead.error)}
                </p>
              )}
            </div>
          </div>

          {/* Filter Pill Tabs */}
          <div
            role="tablist"
            aria-label="Notification categories"
            aria-orientation="horizontal"
            className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
          >
            {TABS.map((tab, index) => {
              const isActive = activeCategory === tab.id;
              const count = countOf(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  onClick={() => selectTab(tab.id)}
                  onKeyDown={(event) => handleTabListKeyDown(event, index)}
                  aria-selected={isActive}
                  aria-controls="notifications-panel"
                  tabIndex={isActive ? 0 : -1}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer',
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <span>{tab.label}</span>
                  {count !== null && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications Feed */}
        <div role="tabpanel" id="notifications-panel" aria-labelledby={`tab-${activeCategory}`} tabIndex={0}>
        {!userId ? (
          /* A notice is addressed to an account, so an anonymous visitor has none to read. */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white py-16 px-6 text-center shadow-xs">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-[#FF7A1A]">
              <BellOff className="h-10 w-10 stroke-[1.5]" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Sign in to see your notices</h2>
            <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed">
              Every notification is a row addressed to one account. Nothing here belongs to you
              until a session identifies it.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-sun-orange hover:bg-[#EA6C13] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            >
              <span>Sign in</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : list.isError ? (
          /* A failed read is not an empty tray: "nothing new" and "could not look" differ. */
          <div
            role="alert"
            data-testid="notification-read-error"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-rose-900">Your notifications could not be read</h3>
              <p className="mt-1 break-words text-xs text-rose-800 leading-relaxed">{readError}</p>
            </div>
            <button
              type="button"
              onClick={() => void list.refetch()}
              disabled={list.isFetching}
              className="shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {list.isFetching ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        ) : list.isPending ? (
          <ListSkeleton count={4} />
        ) : rows.length === 0 ? (
          total === 0 && activeCategory === 'all' ? (
            /* The account's tray really is empty. */
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white py-16 px-6 text-center shadow-xs">
              <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-[#FF7A1A]">
                <BellOff className="h-10 w-10 stroke-[1.5]" />
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">You&apos;re all caught up!</h2>
              <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed">
                This account has no notices. As order updates, dispute replies or payout notices
                arrive, the database writes one for it and it shows up here.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 rounded-full bg-sun-orange hover:bg-[#EA6C13] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
                >
                  <span>Browse Marketplace</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
                >
                  <span>Back to Home</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Another tab may hold notices; this kind has none. */
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-14 px-6 text-center shadow-xs">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Bell className="h-6 w-6 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No {activeLabel.toLowerCase()} notices</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                {activeCategory === 'unread'
                  ? 'Nothing is unread on this account right now.'
                  : 'The database matched no notices of this kind for this account.'}
              </p>
              <button
                type="button"
                onClick={() => selectTab('all')}
                className="mt-4 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Show all notices
              </button>
            </div>
          )
        ) : visibleRows.length === 0 ? (
          /* The keyword box narrows the loaded page, so it can empty the page without emptying the tray. */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-14 px-6 text-center shadow-xs">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search className="h-6 w-6 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Nothing on this page matches that</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {total} notices match the {activeLabel} filter and {rows.length} are loaded here. The
              keyword box only reads the loaded page, so a match may sit beyond it.
            </p>
            <button
              type="button"
              onClick={() => setPageFilter('')}
              className="mt-4 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              data-testid="reset-page-filter"
            >
              Clear keyword filter
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {visibleRows.map((notice) => {
                const {
                  icon: TypeIcon,
                  label: typeLabel,
                  badgeClass,
                  iconBgClass,
                  actionLabel,
                } = KIND_DETAILS[notice.type];
                const isUnread = notice.readAt === null;
                const readingThis = actions.markRead.isPending && actions.markRead.variables === notice.id;
                const droppingThis = actions.dismiss.isPending && actions.dismiss.variables === notice.id;
                const refusedReading = actions.markRead.isError && actions.markRead.variables === notice.id;
                const refusedDropping = actions.dismiss.isError && actions.dismiss.variables === notice.id;

                return (
                  <article
                    key={notice.id}
                    data-testid={`notice-${notice.id}`}
                    className={cn(
                      'group relative rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs',
                      isUnread
                        ? 'border-blue-200/90 bg-blue-50/25 hover:border-blue-300'
                        : 'border-slate-200/80 bg-white hover:border-slate-300',
                    )}
                  >
                    {/* The notice itself is the affordance: reading it is the click. */}
                    <button
                      type="button"
                      onClick={() => openNotice(notice)}
                      data-testid={`notice-open-${notice.id}`}
                      className="flex w-full items-start gap-3.5 sm:gap-4 text-left cursor-pointer"
                    >
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-2xs',
                          iconBgClass,
                        )}
                      >
                        <TypeIcon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={cn(
                              'rounded-full border px-2.5 py-0.5 text-[10px] font-bold',
                              badgeClass,
                            )}
                          >
                            {typeLabel}
                          </span>

                          {isUnread && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-[#FF7A1A] px-2 py-0.5 text-[10px] font-bold">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#FF7A1A]" />
                              Unread
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 font-medium ml-auto">
                            {formatFullTimestamp(notice.createdAt)}
                            <span className="hidden sm:inline text-slate-300 mx-1.5">•</span>
                            <span className="hidden sm:inline text-slate-500">
                              {formatRelativeTime(notice.createdAt)}
                            </span>
                          </span>
                        </div>

                        <h3
                          className={cn(
                            'text-sm sm:text-base tracking-tight',
                            isUnread
                              ? 'font-extrabold text-slate-900'
                              : 'font-semibold text-slate-800',
                          )}
                        >
                          {notice.title}
                        </h3>

                        <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {notice.message}
                        </p>
                      </div>
                    </button>

                    <div className="mt-3.5 flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100/80">
                      {notice.href && (
                        <Link
                          to={notice.href}
                          onClick={() => {
                            if (isUnread) actions.markRead.mutate(notice.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition-colors"
                        >
                          <span>{actionLabel}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}

                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => actions.markRead.mutate(notice.id)}
                          disabled={readingThis}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{readingThis ? 'Marking…' : 'Mark as read'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => actions.dismiss.mutate(notice.id)}
                        disabled={droppingThis}
                        data-testid={`notice-dismiss-${notice.id}`}
                        aria-label={`Remove "${notice.title}"`}
                        title="Delete this notice"
                        className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline text-[11px]">
                          {droppingThis ? 'Removing…' : 'Remove'}
                        </span>
                      </button>
                    </div>

                    {/* The row stays on the tray when the write fails: only Postgres can delete it,
                        and it refused, so the screen says so instead of pretending it is gone. */}
                    {(refusedReading || refusedDropping) && (
                      <p
                        role="alert"
                        data-testid={`notice-write-error-${notice.id}`}
                        className="mt-2 text-[11px] font-semibold text-rose-600"
                      >
                        {reason(refusedDropping ? actions.dismiss.error : actions.markRead.error)}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>

            {total > PAGE_SIZE && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs sm:flex-row">
                <p
                  data-testid="pager-summary"
                  aria-live="polite"
                  className="text-[11px] font-semibold text-slate-500"
                >
                  Showing {rows.length} of {total} {activeCategory === 'all' ? 'notices' : `${activeLabel.toLowerCase()} notices`}
                  {' '}on page {page} of {pageCount} — the rest are in Postgres, one page at a time.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    disabled={page <= 1 || list.isFetching}
                    data-testid="pager-previous"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(current + 1, pageCount))}
                    disabled={page >= pageCount || list.isFetching}
                    data-testid="pager-next"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next page</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};
