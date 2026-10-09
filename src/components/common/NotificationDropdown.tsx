import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Package,
  AlertTriangle,
  DollarSign,
  Sparkles,
  Info,
  CheckCheck,
  ArrowRight,
  BellOff,
} from 'lucide-react';
import {
  useNotificationStore,
  type AppNotification,
  type NotificationType,
} from '../../store/notification-store';

type FilterTab = 'all' | 'unread' | 'orders' | 'alerts';

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

function getNotificationTypeIcon(type: NotificationType) {
  switch (type) {
    case 'order_status':
      return {
        icon: Package,
        bgClass: 'bg-blue-50 text-[#2563EB] border-blue-200/60',
      };
    case 'dispute_update':
      return {
        icon: AlertTriangle,
        bgClass: 'bg-rose-50 text-rose-600 border-rose-200/60',
      };
    case 'payout':
      return {
        icon: DollarSign,
        bgClass: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
      };
    case 'price_alert':
      return {
        icon: Sparkles,
        bgClass: 'bg-amber-50 text-amber-600 border-amber-200/60',
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

  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationStore();

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

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter((n) => !n.isRead);
      case 'orders':
        return notifications.filter((n) => n.type === 'order_status');
      case 'alerts':
        return notifications.filter(
          (n) => n.type === 'dispute_update' || n.type === 'price_alert',
        );
      case 'all':
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  const handleItemClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    setIsOpen(false);
    if (notification.linkUrl) {
      navigate(notification.linkUrl);
    }
  };

  const handleMarkAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsRead();
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
          'relative flex h-9 w-9 items-center justify-center rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus:outline-hidden'
        }
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          badgeVariant === 'pulse' ? (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
          ) : (
            <span
              data-testid="unread-badge"
              className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-extrabold text-white shadow-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )
        )}
      </button>

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
              {unreadCount > 0 ? (
                <span className="rounded-full bg-orange-50 text-[#FF7A1A] border border-orange-200/50 px-2 py-0.5 text-[10px] font-bold">
                  {unreadCount} unread
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
              disabled={unreadCount === 0}
              className={`flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                unreadCount > 0
                  ? 'text-[#FF7A1A] hover:text-[#EA580C]'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all as read</span>
            </button>
          </div>

          {/* Filter Pill Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2 bg-white">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'orders', label: 'Orders' },
                { id: 'alerts', label: 'Alerts' },
              ] as const
            ).map((tab) => {
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

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 overscroll-contain">
            {filteredNotifications.length === 0 ? (
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
              filteredNotifications.map((notif) => {
                const { icon: TypeIcon, bgClass } = getNotificationTypeIcon(
                  notif.type,
                );
                return (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => handleItemClick(notif)}
                    className={`group flex w-full items-start gap-3 p-3.5 text-left transition-colors cursor-pointer hover:bg-slate-50/90 ${
                      !notif.isRead ? 'bg-blue-50/20' : 'bg-transparent'
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
                            !notif.isRead
                              ? 'font-bold text-slate-900'
                              : 'font-semibold text-slate-700'
                          }`}
                        >
                          {notif.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {formatRelativeTime(notif.timestamp)}
                        </span>
                      </div>

                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notif.isRead && (
                      <span
                        aria-label="Unread indicator"
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#FF7A1A]"
                      />
                    )}
                  </button>
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
