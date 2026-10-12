import { supabase } from '../../../lib/supabase';
import { num, requireUserId, rpcFailed, text } from './notifications-client';

/**
 * `public.notification_type`. The browser store this replaces invented 'dispute_update' and
 * 'price_alert'; neither exists in the enum, so neither category survives.
 */
export type NotificationKind =
  | 'order_status'
  | 'system'
  | 'promotion'
  | 'payout'
  | 'dispute'
  | 'review'
  | 'security';

const KINDS: readonly NotificationKind[] = [
  'order_status', 'system', 'promotion', 'payout', 'dispute', 'review', 'security',
];

export interface Notification {
  id: string;
  type: NotificationKind;
  title: string;
  message: string;
  /** A route in this app, or null when the notice is only a statement. */
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  page: number;
  pageSize: number;
  total: number;
  /** Every notice addressed to this account that is still unread, not just this page. */
  unread: number;
  rows: Notification[];
}

const kindOf = (value: unknown): NotificationKind =>
  (KINDS as readonly string[]).includes(String(value)) ? (String(value) as NotificationKind) : 'system';

function mapRow(row: Record<string, unknown>): Notification {
  return {
    id: text(row.id),
    type: kindOf(row.type),
    title: text(row.title),
    message: text(row.message),
    href: row.href == null ? null : text(row.href),
    readAt: row.read_at == null ? null : text(row.read_at),
    createdAt: text(row.created_at),
  };
}

async function countUnread(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw rpcFailed('Could not count your unread notices', error.message);
  return num(count);
}

/**
 * The recipient's own notices, newest first. `user_id` is filtered here as well as by RLS so a
 * row that could never be returned is not asked for in the first place.
 */
export async function fetchNotifications(
  params: { type?: NotificationKind | 'all'; unreadOnly?: boolean; page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<NotificationList> {
  const userId = await requireUserId();
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

  const build = () => {
    let query = supabase
      .from('notifications')
      .select('id, type, title, message, href, read_at, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (params.type && params.type !== 'all') query = query.eq('type', params.type);
    if (params.unreadOnly) query = query.is('read_at', null);
    if (signal) query = query.abortSignal(signal);
    return query;
  };

  const [listed, unread] = await Promise.all([build(), countUnread(userId)]);
  if (listed.error) throw rpcFailed('Could not load your notifications', listed.error.message);

  return {
    page,
    pageSize,
    total: num(listed.count ?? 0),
    unread,
    rows: (listed.data ?? []).map((row) => mapRow(row as unknown as Record<string, unknown>)),
  };
}

/** Marks one notice read. A notice that is not the caller's matches nothing and changes nothing. */
export async function markNotificationRead(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw rpcFailed('Could not mark that notice read', error.message);
}

/** Marks the caller's whole tray read. Returns how many rows it moved. */
export async function markAllNotificationsRead(): Promise<number> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
    .select('id');
  if (error) throw rpcFailed('Could not mark your notices read', error.message);
  return data?.length ?? 0;
}

/**
 * Throws a notice away. Only the recipient's own row can be deleted - `notifications_delete_own`
 * filters the rest out silently, so the row count is the proof and a zero means it was refused.
 */
export async function dismissNotification(id: string): Promise<void> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');
  if (error) throw rpcFailed('Could not dismiss that notice', error.message);
  if (!data || data.length === 0) throw rpcFailed('Could not dismiss that notice', 'it is not one of yours');
}

/** Staff only; the RPC refuses anyone else. One row per recipient, not one shared row. */
export async function broadcastNotification(input: {
  audience: 'all' | 'customer' | 'vendor' | 'support' | 'admin' | 'rider';
  type: NotificationKind;
  title: string;
  message: string;
  href?: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc('broadcast_notification', {
    p_role_target: input.audience,
    p_type: input.type,
    p_title: input.title,
    p_message: input.message,
    p_href: input.href ?? null,
  });
  if (error) throw rpcFailed('Could not send that announcement', error.message);
  return num(data);
}

export const isNotificationKind = (value: string): value is NotificationKind =>
  (KINDS as readonly string[]).includes(value);
