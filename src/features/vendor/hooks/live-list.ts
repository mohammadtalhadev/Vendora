/**
 * The freshness standard for vendor list boards, matching the
 * one the dashboards already run (`useVendorDashboard`, and the admin
 * console's `liveBoard`): a 30-second poll plus a refetch when the tab
 * regains focus, so a seller watching Orders, Returns, Products or
 * Promotions learns a buyer acted without pressing refresh. `staleTime`
 * matches the poll — the app-wide default is five minutes, which would
 * swallow the focus refetch entirely.
 *
 * Applied to LIST queries only. A single-record read (one package, one
 * product) keeps the app defaults: it is opened from a list that is
 * already fresh, and mutations invalidate it explicitly.
 */
export const liveList = {
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
  staleTime: 30_000,
} as const;
