import { useAuthStore } from '../../../store/auth-store';

/**
 * Every vendor query is keyed by the signed-in account. Two different sellers using the
 * same browser therefore never share a cached dashboard, and signing out or switching
 * account invalidates the whole workspace by prefix.
 */
export const vendorKeys = {
  all: ['vendor'] as const,
  scope: (userId: string | null | undefined) => ['vendor', userId ?? 'anon'] as const,
  store: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'store'] as const,
  dashboard: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'dashboard'] as const,
  products: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'products'] as const,
  product: (productId: string) => ['vendor', 'product', productId] as const,
  packages: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'packages'] as const,
  pkg: (subOrderId: string) => ['vendor', 'package', subOrderId] as const,
  returns: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'returns'] as const,
  earnings: (userId: string | null | undefined, months: number) =>
    ['vendor', userId ?? 'anon', 'earnings', months] as const,
  balance: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'balance'] as const,
  payouts: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'payouts'] as const,
  banks: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'banks'] as const,
  promotions: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'promotions'] as const,
  threads: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'threads'] as const,
  thread: (threadId: string) => ['vendor', 'thread', threadId] as const,
  media: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'media'] as const,
  questions: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'questions'] as const,
  disputes: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'disputes'] as const,
  disputeMessages: (disputeId: string) => ['vendor', 'dispute', disputeId, 'messages'] as const,
  shipping: (userId: string | null | undefined) => ['vendor', userId ?? 'anon', 'shipping'] as const,
  notificationPrefs: (userId: string | null | undefined) =>
    ['vendor', userId ?? 'anon', 'notification-prefs'] as const,
};

/** The account the workspace is scoped to; undefined while the session is still loading. */
export function useVendorScope(): string | null | undefined {
  return useAuthStore((s) => s.user?.id);
}
