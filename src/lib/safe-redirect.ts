/**
 * The one place a `?redirect=` target is trusted.
 *
 * Login pages receive the post-login destination as a query parameter, and
 * navigating to it unchecked is an open-redirect pattern: only same-origin
 * absolute paths are ever honoured. `//evil.example` looks like a path but
 * is a protocol-relative URL, and `/\evil.example` is treated the same way
 * by some browsers — both fall back, as does anything that is not a string
 * starting with exactly one `/`.
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target) return fallback;
  if (!target.startsWith('/')) return fallback;
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback;
  return target;
}
