/**
 * safe-redirect — the one place a `?redirect=` value is judged before it is
 * navigated to (Batch 63).
 *
 * A redirect target is only ever an in-app path: a string that starts with
 * exactly one '/'. Anything else — a protocol-relative '//evil.com', a
 * backslash variant '/\\evil.com' some browsers normalise into '//', an
 * absolute URL, an empty value — falls back instead of being honoured, so a
 * crafted sign-in link can never bounce a freshly authenticated user off
 * the site (open redirect) or into a route the router never defined.
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (typeof target !== 'string') return fallback;
  const value = target.trim();
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.includes('\\')) return fallback;
  return value;
}

/** True when `target` survives safeRedirect unchanged (i.e. it was valid). */
export function isSafeRedirect(target: string | null | undefined): boolean {
  return typeof target === 'string' && safeRedirect(target, '') === target.trim() && target.trim() !== '';
}
