import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { useRealtimeWatch } from '../../../hooks/useRealtime';
import {
  broadcastNotification,
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationKind,
} from '../api/notifications';

/**
 * Keyed by the signed-in account, because a notification list is literally per person: two
 * admins share an audience but never each other's read receipts.
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  scope: (userId: string | null | undefined) => ['notifications', userId ?? 'anon'] as const,
  list: (userId: string | null | undefined, params: Record<string, unknown>) =>
    ['notifications', userId ?? 'anon', 'list', params] as const,
};

function useNotificationScope(): string | null | undefined {
  return useAuthStore((s) => s.user?.id);
}

/**
 * The tray, plus the subscription that keeps it honest: when Postgres writes a notice for this
 * account - from a trigger, a broadcast, or an order placed on another device - the list is
 * re-read rather than guessed at from the event payload.
 */
export function useNotifications(
  params: { type?: NotificationKind | 'all'; unreadOnly?: boolean; page?: number; pageSize?: number } = {},
) {
  const userId = useNotificationScope();
  const queryClient = useQueryClient();

  useRealtimeWatch({
    table: 'notifications',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onChange: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.scope(userId) });
    },
  });

  return useQuery({
    queryKey: notificationKeys.list(userId, params),
    queryFn: ({ signal }) => fetchNotifications(params, signal),
    enabled: Boolean(userId),
    placeholderData: (previous) => previous,
  });
}

export function useNotificationActions() {
  const userId = useNotificationScope();
  const queryClient = useQueryClient();

  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationKeys.scope(userId) });

  return {
    markRead: useMutation({
      mutationFn: (id: string) => markNotificationRead(id),
      onSuccess: refresh,
    }),
    markAllRead: useMutation({
      mutationFn: () => markAllNotificationsRead(),
      onSuccess: refresh,
    }),
    dismiss: useMutation({
      mutationFn: (id: string) => dismissNotification(id),
      onSuccess: refresh,
    }),
    broadcast: useMutation({
      mutationFn: broadcastNotification,
      // The recipients are other people's caches, so the audience's own screens catch up through
      // their subscription; this one only refreshes the sender, who may be in the audience too.
      onSuccess: refresh,
    }),
  };
}
