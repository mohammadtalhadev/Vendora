/**
 * The origin this deployment is actually served from (e.g.
 * "https://vendora-plum.vercel.app"). URL previews are built from it at
 * runtime so they stay correct on any domain — a host is never hardcoded.
 * Returns '' outside a browser (tests, SSR), where previews fall back to
 * showing the path alone.
 */
export function siteOrigin(): string {
  return typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : '';
}
