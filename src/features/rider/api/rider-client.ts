import { markRpcError } from '../../../lib/friendly-error';

/**
 * Shared plumbing for the rider workspace. Reads return what Postgres computed and writes go
 * through the RPCs that own the state machine; nothing falls back to a local copy, so a failed
 * read is shown as an error rather than as an invented route.
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

export function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

/** The database's own refusal is the message the rider should see. */
export function rpcFailed(operation: string, message: string): Error {
  return markRpcError(new Error(`${operation}: ${message}`), operation);
}
