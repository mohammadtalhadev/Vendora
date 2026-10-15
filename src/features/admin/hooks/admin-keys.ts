import { useAuthStore } from '../../../store/auth-store';

/**
 * Console queries are keyed by the signed-in staff account so two admins sharing a
 * browser never read each other's cache. This only chooses what is *displayed*;
 * authorization is decided by `admin_require_admin()` inside each RPC.
 */
export const adminKeys = {
  all: ['admin'] as const,
  scope: (userId: string | null | undefined) => ['admin', userId ?? 'anon'] as const,
  dashboard: (userId: string | null | undefined, days: number) =>
    ['admin', userId ?? 'anon', 'dashboard', days] as const,
  vendors: (userId: string | null | undefined, params: Record<string, unknown>) =>
    ['admin', userId ?? 'anon', 'vendors', params] as const,
  vendor: (vendorId: string) => ['admin', 'vendor', vendorId] as const,
  moderation: (userId: string | null | undefined, params: Record<string, unknown>) =>
    ['admin', userId ?? 'anon', 'moderation', params] as const,
  disputes: (userId: string | null | undefined, params: Record<string, unknown>) =>
    ['admin', userId ?? 'anon', 'disputes', params] as const,
  users: (userId: string | null | undefined, params: Record<string, unknown>) =>
    ['admin', userId ?? 'anon', 'users', params] as const,
  orders: (userId: string | null | undefined, params: Record<string, unknown>) =>
    ['admin', userId ?? 'anon', 'orders', params] as const,
  /** An order group's id is global, so the dossier needs no admin scope to be unique. */
  order: (orderGroupId: string) => ['admin', 'order', orderGroupId] as const,
  categories: (userId: string | null | undefined) =>
    ['admin', userId ?? 'anon', 'categories'] as const,
  inventory: (userId: string | null | undefined) =>
    ['admin', userId ?? 'anon', 'inventory'] as const,
  brands: (userId: string | null | undefined) =>
    ['admin', userId ?? 'anon', 'brands', 'directory'] as const,
  /** `days` left out gives the family every window belongs to, which is what a rate change invalidates. */
  commission: (userId: string | null | undefined, days?: number) =>
    days === undefined
      ? (['admin', userId ?? 'anon', 'commission'] as const)
      : (['admin', userId ?? 'anon', 'commission', days] as const),
  audit: (userId: string | null | undefined, params: Record<string, unknown>) =>
    ['admin', userId ?? 'anon', 'audit', params] as const,
  /** The announcements this console sent: the same audit read, narrowed and typed. */
  broadcasts: (userId: string | null | undefined, params: Record<string, unknown>) =>
    ['admin', userId ?? 'anon', 'broadcasts', params] as const,
  reports: (userId: string | null | undefined, params: Record<string, unknown>) =>
    ['admin', userId ?? 'anon', 'reports', params] as const,
  logistics: (userId: string | null | undefined) =>
    ['admin', userId ?? 'anon', 'logistics'] as const,
  riderApplications: (userId: string | null | undefined) =>
    ['admin', userId ?? 'anon', 'rider-applications'] as const,
  codSettlements: (userId: string | null | undefined) =>
    ['admin', userId ?? 'anon', 'cod-settlements'] as const,
  settings: (userId: string | null | undefined) =>
    ['admin', userId ?? 'anon', 'settings'] as const,
  media: (userId: string | null | undefined) =>
    ['admin', userId ?? 'anon', 'media'] as const,
};

export function useAdminScope(): string | null | undefined {
  return useAuthStore((s) => s.user?.id);
}
