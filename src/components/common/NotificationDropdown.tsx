import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Package,
  AlertTriangle,
  DollarSign,
  Sparkles,
  Star,
  ShieldAlert,
  Info,
  CheckCheck,
  ArrowRight,
  BellOff,
  X,
} from 'lucide-react';
import {
  useNotificationActions,
  useNotifications,
} from '../../features/notifications/hooks/useNotifications';
import type {
  Notification,
  NotificationKind,
} from '../../features/notifications/api/notifications';

type FilterTab = 'all' | 'unread' | 'orders' | 'alerts';

/**
 * Every tab is a read of its own, not a filter over the rows already in hand: the tray asks
 * Postgres for that slice, so a tab shows the notices the database holds rather than whichever
 * of the eight loaded rows happen to match.
 */
const TABS: {
  id: FilterTab;
  label: string;
  params: { type?: NotificationKind; unreadOnly?: boolean; pageSize: number };
}[] = [
  { id: 'all', label: 'All', params: { pageSize: 8 } },
  { id: 'unread', label: 'Unread', params: { unreadOnly: true, pageSize: 8 } },
  { id: 'orders', label: 'Orders', params: { type: 'order_status', pageSize: 8 } },
  // The browser store invented a 'price_alert' category; the closest real kind an alert carries
  // is a dispute, which is the one thing here that needs the customer to act.
  { id: 'alerts', label: 'Alerts', params: { type: 'dispute', pageSize: 8 } },
];

interface NotificationDropdownProps {
  className?: string;
  triggerClassName?: string;
  align?: 'left' | 'right';
  badgeVariant?: 'numeric' | 'pulse';
}

function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(diffSec) || diffSec < 0) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return timestamp;
  }
}

/** A refused write names itself; the tray never swallows it into a silent no-op. */
const reason = (error: unknown): string =>
  error instanceof Error && error.message
    ? error.message
    : 'The database did not accept this change.';

function getNotificationIcon(type: NotificationKind) {
  switch (type) {
    case 'order_status':
      return {
        icon: Package,
        bgClass: 'bg-blue-50 text-[#2563EB] border-blue-200/60',
      };
    case 'dispute':
      return {
        icon: AlertTriangle,
        bgClass: 'bg-rose-50 text-rose-600 border-rose-200/60',
      };
    case 'payout':
      return {
        icon: DollarSign,
        bgClass: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
      };
    case 'promotion':
      return {
        icon: Sparkles,
        bgClass: 'bg-amber-50 text-amber-600 border-amber-200/60',
      };
    case 'review':
      return {
        icon: Star,
        bgClass: 'bg-violet-50 text-violet-600 border-violet-200/60',
      };
    case 'security':
      return {
        icon: ShieldAlert,
        bgClass: 'bg-slate-100 text-slate-700 border-slate-200/60',
      };
    case 'system':
    default:
      return {
        icon: Info,
        bgClass: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
      };
  }
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  className = '',
  triggerClassName = '',
  align = 'right',
  badgeVariant = 'numeric',
}) => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const activeRead = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const list = useNotifications(activeRead.params);
  const actions = useNotificationActions();

  /** The server's own count for this account; nothing is shown while the first read is in flight. */
  const unread = list.data?.unread ?? 0;
  const notices = list.data?.rows ?? [];
  const firstReadPending = list.isPending;

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = (notification: Notification) => {
    actions.markRead.mutate(notification.id);
    setIsOpen(false);
    if (notification.href !== null) {
      navigate(notification.href);
    }
  };

  const handleMarkAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.markAllRead.mutate();
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    actions.dismiss.mutate(id);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          triggerClassName ||
          'relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 hover:text-[#FF7A1A] hover:bg-slate-100 transition-colors cursor-pointer focus:outline-hidden'
        }
      >
        <Bell className="h-5 w-5" />

        {!firstReadPending &&
          unread > 0 &&
          (badgeVariant === 'pulse' ? (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
          ) : (
            <span
              data-testid="unread-badge"
              className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-extrabold text-white shadow-xs"
            >
              {unread > 99 ? '99+' : unread}
            </span>
          ))}

        {/* A failed read is not "nothing new", so the bell marks it as a problem instead. */}
        {list.isError && (
          <span
            data-testid="bell-read-error"
            className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-[#EF4444] ring-2 ring-white"
          />
        )}
      </button>

      {!isOpen && list.isError && (
        <span role="status" aria-live="polite" className="sr-only">
          {list.error.message}
        </span>
      )}

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div
          data-testid="notification-popover"
          className={`absolute top-full mt-2 w-[360px] sm:w-[380px] rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xl text-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Notifications
              </h3>
              {list.isError ? (
                <span className="rounded-full bg-rose-50 text-rose-600 border border-rose-200/60 px-2 py-0.5 text-[10px] font-bold">
                  Not loaded
                </span>
              ) : firstReadPending ? (
                <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium">
                  Checking
                </span>
              ) : unread > 0 ? (
                <span className="rounded-full bg-orange-50 text-[#FF7A1A] border border-orange-200/50 px-2 py-0.5 text-[10px] font-bold">
                  {unread} unread
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium">
                  All caught up
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleMarkAll}
              disabled={
                unread === 0 || list.isError || actions.markAllRead.isPending
              }
              className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                unread > 0 && !list.isError && !actions.markAllRead.isPending
                  ? 'text-[#FF7A1A] hover:text-[#EA580C] cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>{actions.markAllRead.isPending ? 'Marking…' : 'Mark all as read'}</span>
            </button>
          </div>

          {/* Filter Pill Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2 bg-white">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* A refused write is shown as itself, never folded back into the tray. */}
          {actions.markAllRead.isError && (
            <p
              data-testid="mark-all-error"
              role="alert"
              aria-live="assertive"
              className="break-words border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600"
            >
              {reason(actions.markAllRead.error)}
            </p>
          )}

          {actions.dismiss.isError && (
            <p
              data-testid="dismiss-error"
              role="alert"
              aria-live="assertive"
              className="break-words border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600"
            >
              {reason(actions.dismiss.error)}
            </p>
          )}

          {/* Notifications List */}
          <div
            className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 overscroll-contain"
            aria-busy={firstReadPending}
          >
            {list.isError ? (
              <div
                data-testid="notification-error"
                role="alert"
                aria-live="assertive"
                className="px-4 py-6 text-center"
              >
                <p className="text-sm font-semibold text-rose-600">
                  Could not load your notifications
                </p>
                <p className="mt-1 break-words text-xs text-rose-500">
                  {list.error.message}
                </p>
              </div>
            ) : firstReadPending ? (
              <p className="px-4 py-8 text-center text-xs font-semibold text-slate-500">
                Loading your notifications…
              </p>
            ) : notices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-2">
                  <BellOff className="h-6 w-6 stroke-[1.5]" />
                </div>
                <p className="text-sm font-semibold text-slate-800">No notifications</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTab === 'unread'
                    ? 'No unread notifications at the moment.'
                    : 'Nothing new in this category.'}
                </p>
              </div>
            ) : (
              notices.map((notif) => {
                const { icon: TypeIcon, bgClass } = getNotificationIcon(notif.type);
                const isUnread = notif.readAt === null;
                const dropping =
                  actions.dismiss.isPending && actions.dismiss.variables === notif.id;
                return (
                  <div key={notif.id} className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => handleItemClick(notif)}
                      className={`group flex flex-1 items-start gap-3 p-3.5 text-left transition-colors cursor-pointer hover:bg-slate-50/90 ${
                        isUnread ? 'bg-blue-50/20' : 'bg-transparent'
                      }`}
                    >
                    {/* Color-coded Type Icon */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${bgClass}`}
                    >
                      <TypeIcon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs truncate ${
                            isUnread
                              ? 'font-bold text-slate-900'
                              : 'font-semibold text-slate-700'
                          }`}
                        >
                          {notif.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <span
                        aria-label="Unread indicator"
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#FF7A1A]"
                      />
                    )}
                    </button>

                    {/* Dismiss: throws this notice away through the server, not local state. */}
                    <button
                      type="button"
                      onClick={(e) => handleDismiss(e, notif.id)}
                      disabled={dropping}
                      aria-label={`Remove "${notif.title}"`}
                      title="Delete this notice"
                      className="flex items-center px-2 text-slate-300 transition-colors hover:text-rose-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-2 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-[#FF7A1A] hover:text-[#EA580C] transition-colors"
            >
              <span>View All Notifications</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
