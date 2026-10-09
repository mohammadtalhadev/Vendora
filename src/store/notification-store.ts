import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type NotificationType = 'order_status' | 'dispute_update' | 'price_alert' | 'system' | 'payout';

export type NotificationRoleTarget = 'customer' | 'vendor' | 'admin' | 'rider' | 'support' | 'all';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
  linkUrl?: string;
  roleTarget?: NotificationRoleTarget;
}

export interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-seed-1',
    title: 'Order Shipped!',
    message: 'Your order #ORD-9821 has been shipped via Express Courier.',
    type: 'order_status',
    timestamp: '2026-10-08T09:30:00.000Z',
    isRead: false,
    linkUrl: '/orders/ORD-9821',
    roleTarget: 'customer',
  },
  {
    id: 'notif-seed-2',
    title: 'Seller Application Approved',
    message: 'Congratulations! Your merchant store "Vendora Direct" is now active.',
    type: 'system',
    timestamp: '2026-10-08T08:15:00.000Z',
    isRead: false,
    linkUrl: '/vendor',
    roleTarget: 'vendor',
  },
  {
    id: 'notif-seed-3',
    title: 'Dispute Opened',
    message: 'Buyer opened a dispute on sub-order #SUB-4412 (Item damaged).',
    type: 'dispute_update',
    timestamp: '2026-10-07T16:45:00.000Z',
    isRead: false,
    linkUrl: '/orders',
    roleTarget: 'vendor',
  },
  {
    id: 'notif-seed-4',
    title: 'New Payout Processed',
    message: 'A payout of $1,420.50 has been transferred to your registered bank account.',
    type: 'payout',
    timestamp: '2026-10-07T11:20:00.000Z',
    isRead: true,
    linkUrl: '/vendor/payouts',
    roleTarget: 'vendor',
  },
  {
    id: 'notif-seed-5',
    title: 'Flash Sale Discount Active',
    message: 'Obsidian Mechanical Keyboard is now 20% off for the next 4 hours.',
    type: 'price_alert',
    timestamp: '2026-10-06T14:00:00.000Z',
    isRead: true,
    linkUrl: '/products/prod-artisan-keyboard',
    roleTarget: 'customer',
  },
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: INITIAL_NOTIFICATIONS,
      unreadCount: INITIAL_NOTIFICATIONS.filter((n) => !n.isRead).length,

      addNotification: (notification) =>
        set((state) => {
          const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const timestamp = new Date().toISOString();
          const newNotification: AppNotification = {
            ...notification,
            id,
            timestamp,
            isRead: false,
          };
          const updated = [newNotification, ...state.notifications];
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.isRead).length,
          };
        }),

      markAsRead: (id: string) =>
        set((state) => {
          const updated = state.notifications.map((item) =>
            item.id === id ? { ...item, isRead: true } : item,
          );
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.isRead).length,
          };
        }),

      markAllAsRead: () =>
        set((state) => {
          const updated = state.notifications.map((item) => ({
            ...item,
            isRead: true,
          }));
          return {
            notifications: updated,
            unreadCount: 0,
          };
        }),

      removeNotification: (id: string) =>
        set((state) => {
          const updated = state.notifications.filter((item) => item.id !== id);
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.isRead).length,
          };
        }),

      clearAll: () =>
        set({
          notifications: [],
          unreadCount: 0,
        }),
    }),
    {
      name: 'vd:v1:notifications',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ notifications: state.notifications }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.unreadCount = state.notifications.filter((n) => !n.isRead).length;
        }
      },
    },
  ),
);
