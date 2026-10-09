import { describe, it, expect, beforeEach } from 'vitest';
import {
  useNotificationStore,
  INITIAL_NOTIFICATIONS,
  type AppNotification,
} from './notification-store';

describe('Notification Store (useNotificationStore)', () => {
  beforeEach(() => {
    localStorage.clear();
    useNotificationStore.setState({
      notifications: [...INITIAL_NOTIFICATIONS],
      unreadCount: INITIAL_NOTIFICATIONS.filter((n) => !n.isRead).length,
    });
  });

  it('initializes with pre-populated seed notifications and correct unread count', () => {
    const { notifications, unreadCount } = useNotificationStore.getState();
    expect(notifications).toHaveLength(5);
    expect(unreadCount).toBe(3);

    // Verify all 5 required seed scenarios exist
    const types = notifications.map((n) => n.type);
    expect(types).toContain('order_status');
    expect(types).toContain('system');
    expect(types).toContain('dispute_update');
    expect(types).toContain('payout');
    expect(types).toContain('price_alert');
  });

  it('adds a new notification and increments unread count', () => {
    const initialUnread = useNotificationStore.getState().unreadCount;
    const initialTotal = useNotificationStore.getState().notifications.length;

    useNotificationStore.getState().addNotification({
      title: 'Order Delivered',
      message: 'Package #ORD-9821 has been marked as delivered by rider.',
      type: 'order_status',
      linkUrl: '/orders/ORD-9821',
      roleTarget: 'customer',
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(initialTotal + 1);
    expect(state.unreadCount).toBe(initialUnread + 1);

    const newest = state.notifications[0];
    expect(newest.title).toBe('Order Delivered');
    expect(newest.isRead).toBe(false);
    expect(newest.id).toBeDefined();
    expect(newest.timestamp).toBeDefined();
  });

  it('marks a specific notification as read and updates unread count', () => {
    const targetId = 'notif-seed-1'; // Initially isRead: false
    const initialUnread = useNotificationStore.getState().unreadCount;

    useNotificationStore.getState().markAsRead(targetId);

    const state = useNotificationStore.getState();
    const updated = state.notifications.find((n) => n.id === targetId);
    expect(updated?.isRead).toBe(true);
    expect(state.unreadCount).toBe(initialUnread - 1);
  });

  it('marks all notifications as read and resets unread count to 0', () => {
    expect(useNotificationStore.getState().unreadCount).toBeGreaterThan(0);

    useNotificationStore.getState().markAllAsRead();

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every((n) => n.isRead)).toBe(true);
  });

  it('removes a specific notification and recalculates unread count', () => {
    const targetId = 'notif-seed-1'; // Unread item
    const initialCount = useNotificationStore.getState().notifications.length;
    const initialUnread = useNotificationStore.getState().unreadCount;

    useNotificationStore.getState().removeNotification(targetId);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(initialCount - 1);
    expect(state.notifications.find((n) => n.id === targetId)).toBeUndefined();
    expect(state.unreadCount).toBe(initialUnread - 1);
  });

  it('clears all notifications and sets unread count to 0', () => {
    useNotificationStore.getState().clearAll();

    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
  });

  it('persists notifications to localStorage under vd:v1:notifications key', () => {
    const newNotif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'> = {
      title: 'Security Alert',
      message: 'New login detected from Chrome on Windows.',
      type: 'system',
      roleTarget: 'all',
    };

    useNotificationStore.getState().addNotification(newNotif);

    const rawStorage = localStorage.getItem('vd:v1:notifications');
    expect(rawStorage).toBeTruthy();

    const parsed = JSON.parse(rawStorage!);
    expect(parsed.state).toBeDefined();
    expect(parsed.state.notifications).toBeDefined();
    expect(parsed.state.notifications[0].title).toBe('Security Alert');
  });
});
