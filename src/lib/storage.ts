/**
 * Versioned, quota-aware localStorage wrapper (PRD §8.2).
 *
 * - Namespaced, versioned keys (vd:v2:*) with a migration hook so schema changes
 *   never corrupt old data.
 * - QuotaExceededError and disabled-storage failures are caught, recorded and
 *   broadcast to listeners so the UI can surface them instead of crashing.
 */

export const STORAGE_VERSION = 2;
export const STORAGE_PREFIX = `vd:v${STORAGE_VERSION}:`;
const LEGACY_PREFIX = 'vd:v1:';
const META_KEY = `${STORAGE_PREFIX}meta`;

export type StorageFailureReason = 'quota' | 'unavailable' | 'parse' | 'write';

export interface StorageFailure {
  key: string;
  reason: StorageFailureReason;
  message: string;
  at: string;
}

type FailureListener = (failure: StorageFailure) => void;

const listeners = new Set<FailureListener>();
let lastFailure: StorageFailure | null = null;

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isQuotaError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      // Firefox exposes code 1014, legacy WebKit code 22
      (err as DOMException & { code?: number }).code === 1014 ||
      (err as DOMException & { code?: number }).code === 22
    );
  }
  return err instanceof Error && err.name === 'QuotaExceededError';
}

function recordFailure(key: string, reason: StorageFailureReason, err: unknown): void {
  const failure: StorageFailure = {
    key,
    reason,
    message: err instanceof Error ? err.message : String(err),
    at: new Date().toISOString(),
  };
  lastFailure = failure;
  listeners.forEach((listener) => {
    try {
      listener(failure);
    } catch {
      // A broken listener must never break persistence
    }
  });
}

/** Subscribe to storage failures (quota exceeded, disabled storage, parse errors). */
export function onStorageFailure(listener: FailureListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLastStorageFailure(): StorageFailure | null {
  return lastFailure;
}

export function safeGetItem(key: string): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    recordFailure(key, 'unavailable', err);
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (!hasWindow()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    recordFailure(key, isQuotaError(err) ? 'quota' : 'write', err);
    if (isQuotaError(err)) {
      // One-shot retry after evicting the largest non-essential overlay key
      try {
        const evicted = evictLargestOverlayKey(key);
        if (evicted) {
          window.localStorage.setItem(key, value);
          return true;
        }
      } catch {
        // surfaced below
      }
    }
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    recordFailure(key, 'unavailable', err);
  }
}

/** Storage adapter compatible with zustand's createJSONStorage. */
export const safeLocalStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem: safeGetItem,
  setItem: (key, value) => {
    safeSetItem(key, value);
  },
  removeItem: safeRemoveItem,
};

export function readJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    recordFailure(key, 'parse', err);
    safeRemoveItem(key);
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  return safeSetItem(key, JSON.stringify(value));
}

export function listKeys(prefix: string): string[] {
  if (!hasWindow()) return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
  } catch (err) {
    recordFailure(prefix, 'unavailable', err);
  }
  return keys;
}

export function removeKeysWithPrefix(prefix: string): void {
  listKeys(prefix).forEach(safeRemoveItem);
}

function evictLargestOverlayKey(protectKey: string): boolean {
  const candidates = listKeys(`${STORAGE_PREFIX}overlay:`).filter((k) => k !== protectKey);
  if (candidates.length === 0) return false;
  let largest = candidates[0];
  let largestSize = (safeGetItem(largest) || '').length;
  for (const key of candidates) {
    const size = (safeGetItem(key) || '').length;
    if (size > largestSize) {
      largest = key;
      largestSize = size;
    }
  }
  safeRemoveItem(largest);
  return true;
}

// ---------------------------------------------------------------------------
// Migration hook (PRD §8.2): "versioned storage keys with a migration hook so
// schema changes do not corrupt old data".
// ---------------------------------------------------------------------------

interface StorageMeta {
  version: number;
  migratedAt?: string;
  history?: Array<{ from: number; to: number; at: string }>;
}

type Migration = (meta: StorageMeta | null) => void;

/**
 * Ordered migrations. Key = the version being migrated TO.
 * v1 -> v2: v1 snapshotted the entire catalog/orders/disputes into localStorage
 * (blowing the 5MB budget). v2 uses a delta overlay, so legacy full snapshots
 * are dropped and data is re-derived from the immutable seed.
 */
const MIGRATIONS: Record<number, Migration> = {
  2: () => {
    removeKeysWithPrefix(LEGACY_PREFIX);
  },
};

/**
 * Runs any pending migrations. Safe to call on every boot; a no-op when the
 * stored version already matches STORAGE_VERSION.
 */
export function runStorageMigrations(): StorageMeta {
  const existing = readJSON<StorageMeta | null>(META_KEY, null);
  const from = existing?.version ?? (listKeys(LEGACY_PREFIX).length > 0 ? 1 : STORAGE_VERSION);

  let meta: StorageMeta = existing ?? { version: from };
  for (let v = from + 1; v <= STORAGE_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (migrate) {
      try {
        migrate(meta);
      } catch (err) {
        recordFailure(META_KEY, 'write', err);
      }
      meta = {
        ...meta,
        version: v,
        migratedAt: new Date().toISOString(),
        history: [...(meta.history ?? []), { from: meta.version, to: v, at: new Date().toISOString() }],
      };
    }
  }
  if (meta.version !== STORAGE_VERSION) {
    meta = { ...meta, version: STORAGE_VERSION };
  }
  writeJSON(META_KEY, meta);
  return meta;
}
