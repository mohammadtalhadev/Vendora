import { supabase } from '../../../lib/supabase';
import type { Json } from '../../../types/database';

/**
 * Shared plumbing for the vendor workspace. Every call here either returns data the
 * database authorized or throws: the pages have no mock left to fall back to, so a
 * failed read is shown as an error rather than as fabricated numbers.
 */

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not read your session: ${error.message}`);
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in to manage your store.');
  return userId;
}

/**
 * The store the signed-in account owns, resolved by Postgres rather than by the
 * browser's idea of itself - a stale localStorage vendor id would otherwise let a
 * page read (and scope writes to) someone else's store.
 */
export async function requireVendorId(): Promise<string> {
  const { data, error } = await supabase.rpc('current_vendor_id');
  if (error) throw new Error(`Could not resolve your store: ${error.message}`);
  if (!data) throw new Error('This account has no store. Apply to sell, then sign in again.');
  return data;
}

export const text = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

/** Money columns arrive as numbers from PostgREST and as strings inside RPC jsonb. */
export const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const optionalNum = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

/** `strings` and `null` both mean "no carriers recorded" to the settings form. */
export function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

/**
 * Supabase surfaces an RPC's `raise exception` as an error message; unwrapping it here
 * keeps the wording the database chose, which is written for the person seeing it.
 */
export function rpcFailed(operation: string, message: string): Error {
  return new Error(`${operation}: ${message}`);
}

/**
 * jsonb columns are typed as `Json`, which rejects app-level shapes lacking an index
 * signature. Postgres validates the value on write, so the single boundary cast lives
 * here instead of being repeated in every API module.
 */
export const json = (value: unknown): Json => value as Json;
