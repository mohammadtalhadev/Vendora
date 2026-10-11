import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, num, rpcFailed, text } from './admin-client';

/**
 * The audit trail as `admin_audit_queue` pages it. `before` and `after` are the jsonb
 * the write RPC recorded alongside its change, so a decision can be read back rather
 * than only named.
 */

export interface AuditRow {
  id: string;
  action: string;
  actorRole: string;
  actorName: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

/** The actions present in the table with how many rows each has, for the filter list. */
export interface AuditActionFacet {
  action: string;
  count: number;
}

export interface AuditQueue {
  page: number;
  pageSize: number;
  total: number;
  actions: AuditActionFacet[];
  rows: AuditRow[];
}

const nullableText = (value: unknown): string | null =>
  value === null || value === undefined ? null : text(value);

function mapQueue(value: unknown): AuditQueue {
  const root = asRecord(value);
  return {
    page: num(root.page),
    pageSize: num(root.pageSize),
    total: num(root.total),
    actions: asRows(root.actions).map((row) => ({
      action: text(row.action),
      count: num(row.count),
    })),
    rows: asRows(root.rows).map((row) => ({
      id: text(row.id),
      action: text(row.action),
      actorRole: text(row.actorRole),
      actorName: text(row.actorName),
      entityType: nullableText(row.entityType),
      entityId: nullableText(row.entityId),
      ipAddress: nullableText(row.ipAddress),
      before: row.before,
      after: row.after,
      createdAt: text(row.createdAt),
    })),
  };
}

/**
 * Staff actions, newest first. The actor's name, the entity and the action itself are
 * all matched by the same search term in SQL.
 */
export async function fetchAuditQueue(
  params: { action?: string; search?: string; page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<AuditQueue> {
  let query = supabase.rpc('admin_audit_queue', {
    p_action: params.action ?? 'all',
    p_search: params.search ?? '',
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 25,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the audit trail', error.message);
  return mapQueue(data);
}
