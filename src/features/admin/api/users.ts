import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, num, rpcFailed, text } from './admin-client';

/**
 * An account, its roles, and the volume it has actually bought. `linkedId` is the
 * store or rider profile attached to the account, so the console can jump to it.
 */
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  roles: string[];
  vendorStatus: string;
  accountStatus: 'active' | 'suspended' | 'banned';
  accountStatusReason: string | null;
  joinedAt: string;
  orders: number;
  volume: number;
  linkedId: string | null;
}

export interface AdminUserQueue {
  page: number;
  pageSize: number;
  total: number;
  counts: Record<'all' | 'admins' | 'vendors' | 'support' | 'riders' | 'suspended', number>;
  rows: AdminUserRow[];
}

function mapRow(row: Record<string, unknown>): AdminUserRow {
  const status = text(row.accountStatus);
  return {
    id: text(row.id),
    name: text(row.name),
    email: text(row.email),
    avatarUrl: text(row.avatarUrl),
    roles: Array.isArray(row.roles) ? row.roles.map(text) : [],
    vendorStatus: text(row.vendorStatus),
    accountStatus: status === 'suspended' || status === 'banned' ? status : 'active',
    accountStatusReason:
      row.accountStatusReason === null || row.accountStatusReason === undefined
        ? null
        : text(row.accountStatusReason),
    joinedAt: text(row.joinedAt),
    orders: num(row.orders),
    volume: num(row.volume),
    linkedId: row.linkedId === null || row.linkedId === undefined ? null : text(row.linkedId),
  };
}

function mapQueue(value: unknown): AdminUserQueue {
  const root = asRecord(value);
  const counts = asRecord(root.counts);
  return {
    page: num(root.page),
    pageSize: num(root.pageSize),
    total: num(root.total),
    counts: {
      all: num(counts.all),
      admins: num(counts.admins),
      vendors: num(counts.vendors),
      support: num(counts.support),
      riders: num(counts.riders),
      suspended: num(counts.suspended),
    },
    rows: asRows(root.rows).map(mapRow),
  };
}

export async function fetchUserQueue(
  params: { role?: string; status?: string; search?: string; page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<AdminUserQueue> {
  let query = supabase.rpc('admin_user_queue', {
    p_role: params.role ?? 'all',
    p_status: params.status ?? 'all',
    p_search: params.search ?? '',
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 20,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load accounts', error.message);
  return mapQueue(data);
}

export async function setUserStatus(
  userId: string,
  status: 'active' | 'suspended' | 'banned',
  reason?: string,
): Promise<{ id: string; status: string }> {
  const { data, error } = await supabase.rpc('admin_set_user_status', {
    p_user_id: userId,
    p_status: status,
    p_reason: reason ?? null,
  });
  if (error) throw rpcFailed(`Could not mark this account ${status}`, error.message);
  const root = asRecord(data);
  return { id: text(root.id), status: text(root.status) };
}

/**
 * Replaces an account's roles. The database refuses to rewrite the caller's own
 * roles, because the last role an admin removes would be the one that let them.
 */
export async function setUserRoles(
  userId: string,
  roles: string[],
): Promise<{ id: string; roles: string[] }> {
  const { data, error } = await supabase.rpc('admin_set_user_roles', {
    p_user_id: userId,
    p_roles: roles,
  });
  if (error) throw rpcFailed('Could not change those roles', error.message);
  const root = asRecord(data);
  const parsed = root.roles;
  return { id: text(root.id), roles: Array.isArray(parsed) ? parsed.map(text) : [] };
}
