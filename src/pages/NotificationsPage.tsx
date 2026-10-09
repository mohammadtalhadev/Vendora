import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Search,
  Check,
  CheckCheck,
  Trash2,
  Package,
  AlertTriangle,
  DollarSign,
  Sparkles,
  Info,
  ArrowRight,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  useNotificationStore,
  type AppNotification,
  type NotificationType,
} from '../store/notification-store';

type CategoryFilter = 'all' | 'unread' | 'orders' | 'alerts' | 'payouts' | 'system';

function formatFullTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return timestamp;
  }
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

function getTypeDetails(type: NotificationType) {
  switch (type) {
    case 'order_status':
      return {
        icon: Package,
        label: 'Order Update',
        badgeClass: 'bg-blue-50 text-[#2563EB] border-blue-200/60',
        iconBgClass: 'bg-blue-100 text-[#2563EB]',
        actionLabel: 'View Order',
      };
    case 'dispute_update':
      return {
        icon: AlertTriangle,
        label: 'Dispute Alert',
        badgeClass: 'bg-rose-50 text-rose-600 border-rose-200/60',
        iconBgClass: 'bg-rose-100 text-rose-600',
        actionLabel: 'Review Dispute',
      };
    case 'payout':
      return {
        icon: DollarSign,
        label: 'Payout Notification',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
        iconBgClass: 'bg-emerald-100 text-emerald-700',
        actionLabel: 'View Payouts',
      };
    case 'price_alert':
      return {
        icon: Sparkles,
        label: 'Special Deal',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/60',
        iconBgClass: 'bg-amber-100 text-amber-700',
        actionLabel: 'View Deal',
      };
    case 'system':
    default:
      return {
        icon: Info,
        label: 'System Notice',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
        iconBgClass: 'bg-indigo-100 text-indigo-700',
        actionLabel: 'Learn More',
      };
  }
}

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [clearingConfirm, setClearingConfirm] = useState(false);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      orders: notifications.filter((n) => n.type === 'order_status').length,
      alerts: notifications.filter(
        (n) => n.type === 'dispute_update' || n.type === 'price_alert',
      ).length,
      payouts: notifications.filter((n) => n.type === 'payout').length,
      system: notifications.filter((n) => n.type === 'system').length,
    };
  }, [notifications]);

  // Filtered & Searched list
  const filteredNotifications = useMemo(() => {
    let result = notifications;

    // Filter by category
    switch (activeCategory) {
      case 'unread':
        result = result.filter((n) => !n.isRead);
        break;
      case 'orders':
        result = result.filter((n) => n.type === 'order_status');
        break;
      case 'alerts':
        result = result.filter(
          (n) => n.type === 'dispute_update' || n.type === 'price_alert',
        );
        break;
      case 'payouts':
        result = result.filter((n) => n.type === 'payout');
        break;
      case 'system':
        result = result.filter((n) => n.type === 'system');
        break;
      case 'all':
      default:
        break;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q),
      );
    }

    return result;
  }, [notifications, activeCategory, searchQuery]);

  const handleClearAll = () => {
    if (clearingConfirm) {
      clearAll();
      setClearingConfirm(false);
    } else {
      setClearingConfirm(true);
      setTimeout(() => setClearingConfirm(false), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 pt-6">
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
                    Stay updated on orders, store payouts, dispute escalations, and marketplace alerts.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                <span className="font-bold text-slate-900">{notifications.length}</span> Total
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  {unreadCount} Unread
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar: Category Tabs + Search + Actions */}
        <div className="mb-6 space-y-4">
          {/* Top Actions Row: Search + Bulk Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notifications by keyword..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:border-[#FF7A1A] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#FF7A1A]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  unreadCount > 0
                    ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-95'
                    : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCheck className="h-4 w-4" />
                <span>Mark all as read</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                disabled={notifications.length === 0}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  notifications.length === 0
                    ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                    : clearingConfirm
                      ? 'border-rose-300 bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                      : 'border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 active:scale-95'
                }`}
              >
                <Trash2 className="h-4 w-4" />
                <span>{clearingConfirm ? 'Click to confirm clear' : 'Clear all'}</span>
              </button>
            </div>
          </div>

          {/* Filter Pill Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(
              [
                { id: 'all', label: 'All', count: counts.all },
                { id: 'unread', label: 'Unread', count: counts.unread },
                { id: 'orders', label: 'Orders', count: counts.orders },
                { id: 'alerts', label: 'Disputes & Deals', count: counts.alerts },
                { id: 'payouts', label: 'Payouts', count: counts.payouts },
                { id: 'system', label: 'System', count: counts.system },
              ] as const
            ).map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications Feed */}
        {notifications.length === 0 ? (
          /* Global Empty State (All notifications cleared) */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white py-16 px-6 text-center shadow-xs">
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-[#FF7A1A]">
              <BellOff className="h-10 w-10 stroke-[1.5]" />
              <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              You're all caught up!
            </h2>
            <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed">
              No notifications at the moment. As order updates, buyer inquiries, or payout notices arrive, you will receive real-time alerts right here.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-full bg-[#FF7A1A] hover:bg-[#ea6909] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
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
        ) : filteredNotifications.length === 0 ? (
          /* Filter/Search Empty State */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-14 px-6 text-center shadow-xs">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search className="h-6 w-6 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No notifications match your filters
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              We couldn't find any notifications matching the current criteria or search query.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Notification Cards List */
          <div className="space-y-3">
            {filteredNotifications.map((notif: AppNotification) => {
              const {
                icon: TypeIcon,
                label: typeLabel,
                badgeClass,
                iconBgClass,
                actionLabel,
              } = getTypeDetails(notif.type);

              return (
                <div
                  key={notif.id}
                  className={`group relative rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs ${
                    !notif.isRead
                      ? 'border-blue-200/90 bg-blue-50/25 hover:border-blue-300 hover:bg-blue-50/40'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    {/* Color-coded Icon Box */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-2xs ${iconBgClass}`}
                    >
                      <TypeIcon className="h-5 w-5" />
                    </div>

                    {/* Middle Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Type Badge */}
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badgeClass}`}
                        >
                          {typeLabel}
                        </span>

                        {/* Unread indicator pill */}
                        {!notif.isRead && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-[#FF7A1A] px-2 py-0.5 text-[10px] font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#FF7A1A]" />
                            Unread
                          </span>
                        )}

                        {/* Timestamp */}
                        <span className="text-[11px] text-slate-400 font-medium ml-auto">
                          {formatFullTimestamp(notif.timestamp)}
                          <span className="hidden sm:inline text-slate-300 mx-1.5">•</span>
                          <span className="hidden sm:inline text-slate-500">
                            {formatRelativeTime(notif.timestamp)}
                          </span>
                        </span>
                      </div>

                      {/* Title */}
                      <h3
                        className={`text-sm sm:text-base tracking-tight ${
                          !notif.isRead
                            ? 'font-extrabold text-slate-900'
                            : 'font-semibold text-slate-800'
                        }`}
                      >
                        {notif.title}
                      </h3>

                      {/* Message Body */}
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Action Links & Controls */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100/80">
                        {notif.linkUrl && (
                          <Link
                            to={notif.linkUrl}
                            onClick={() => {
                              if (!notif.isRead) markAsRead(notif.id);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition-colors"
                          >
                            <span>{actionLabel}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}

                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={() => markAsRead(notif.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Mark as read</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => removeNotification(notif.id)}
                          aria-label="Delete notification"
                          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1"
                          title="Remove notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-[11px]">Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
