/**
 * Stale-chunk recovery.
 *
 * Every lazy page is a hashed file (e.g. AdminDashboardPage-BZibbZhz.js). After a
 * redeploy the old hashes no longer exist, and because the SPA rewrite answers
 * every unknown path with index.html, an old open tab that asks for its chunk
 * gets HTML back and the dynamic import fails with "Failed to fetch dynamically
 * imported module". The user did nothing wrong — their tab is simply older than
 * the deployment. The correct response is one automatic reload (which fetches
 * the fresh index.html and its new chunk map), guarded so a genuinely broken
 * deployment can never trap the browser in a reload loop.
 */

const RELOAD_KEY = 'vendora_chunk_reload_at';
/** A second chunk failure inside this window is NOT retried by reload. */
const RELOAD_WINDOW_MS = 15_000;

const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /error loading dynamically imported module/i,
  /unable to preload css for/i,
];

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ((error as { message?: unknown } | null)?.message as string) ?? '';
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(String(message)));
}

/**
 * Reload the page once to pick up the current deployment. Returns true when a
 * reload was triggered (callers should then suspend instead of throwing), and
 * false when a reload already happened inside the guard window — the caller
 * should surface the error screen instead of looping.
 */
export function reloadOnceForNewVersion(
  now: number = Date.now(),
  reload: () => void = () => window.location.reload(),
): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? '0');
    if (Number.isFinite(last) && now - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    // Storage unavailable (private mode, blocked cookies): still attempt one
    // reload — the router error screen is the backstop if it loops.
  }
  reload();
  return true;
}

/** Forget the guard, e.g. when the user taps "Reload" on the error screen. */
export function clearChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // Nothing to clear where storage is unavailable.
  }
}
