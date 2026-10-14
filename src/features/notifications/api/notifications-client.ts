import { supabase } from '../../../lib/supabase';
import { markRpcError } from '../../../lib/friendly-error';

/**
 * Shared plumbing for the notification bell and centre. A failed read is an error the screen
 * shows; it never becomes an empty tray, because "nothing new" and "could not look" are
 * different statements to a customer waiting on an order.
 */

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

export function rpcFailed(operation: string, message: string): Error {
  return markRpcError(new Error(`${operation}: ${message}`), operation);
}

/** The session id, or a thrown error. Nothing here has a "not signed in" data path. */
export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw rpcFailed('Could not read your session', error.message);
  const userId = data.session?.user?.id;
  if (!userId) throw rpcFailed('Could not read your session', 'not signed in');
  return userId;
}
