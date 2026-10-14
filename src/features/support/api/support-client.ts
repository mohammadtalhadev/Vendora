import { supabase } from '../../../lib/supabase';
import { markRpcError } from '../../../lib/friendly-error';
import type { Json } from '../../../types/database';

/**
 * Shared plumbing for the support workspace. Reads here return what Postgres computed
 * and writes go through the governance RPCs; nothing falls back to a local copy, so
 * a failed read is shown as an error rather than as fabricated zero values.
 */

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not read your session: ${error.message}`);
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in to use the support workspace.');
  return userId;
}

export const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

export const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
 */
export function rpcFailed(operation: string, message: string): Error {
  return markRpcError(new Error(`${operation}: ${message}`), operation);
}

export const json = (value: unknown): Json => value as Json;
