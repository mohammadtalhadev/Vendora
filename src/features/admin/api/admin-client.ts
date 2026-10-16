import { supabase } from '../../../lib/supabase';
import { markRpcError } from '../../../lib/friendly-error';
import type { Json } from '../../../types/database';

/**
 * Shared plumbing for the admin console. Reads here return what Postgres computed
 * and writes go through the governance RPCs; nothing falls back to a local copy, so
 * a failed read is shown as a failure rather than as a platform with no sellers.
 *
 * The small coercions are duplicated from the vendor client on purpose: an admin
 * module importing vendor plumbing would tie two workspaces that only share a database.
 */

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not read your session: ${error.message}`);
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in to use the admin console.');
  return userId;
}

export const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

export const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** A rate column the seller never set is `null`, which is not the same as `0`. */
export const optionalNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const bool = (value: unknown): boolean => value === true;

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

/**
 * Supabase surfaces an RPC's `raise exception` as an error message. Keeping the
 * database's wording is the point: it was written for the person seeing it.
 * The error is tagged so the friendly-error mapper can recognise
 * it downstream: staff surfaces keep this wording, customer surfaces keep
 * only the operation.
 */
export function rpcFailed(operation: string, message: string): Error {
  return markRpcError(new Error(`${operation}: ${message}`), operation);
}

export const json = (value: unknown): Json => value as Json;
