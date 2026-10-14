import { useAuthStore } from '../../../store/auth-store';

/**
 * Support reads are keyed by the signed-in agent: the queue, the thread and the template
 * library all say different things depending on who is asking.
 */
export const supportKeys = {
  all: ['support'] as const,
  scope: (userId: string | null | undefined) => ['support', userId ?? 'anon'] as const,
  disputeQueue: (userId: string | null | undefined, params: Record<string, unknown>) =>
    ['support', userId ?? 'anon', 'disputes', params] as const,
  disputeThread: (userId: string | null | undefined, disputeId: string | null) =>
    ['support', userId ?? 'anon', 'disputes', disputeId ?? '', 'thread'] as const,
  staffDirectory: (userId: string | null | undefined) => ['support', userId ?? 'anon', 'staff'] as const,
  cannedResponses: (userId: string | null | undefined, params: { category?: string | null }) =>
    ['support', userId ?? 'anon', 'canned', params] as const,
  orderLookup: (userId: string | null | undefined, email: string | null) =>
    ['support', userId ?? 'anon', 'orders', email ?? ''] as const,
  ticketQueue: (userId: string | null | undefined, params: Record<string, unknown>) =>
    ['support', userId ?? 'anon', 'tickets', params] as const,
  ticketDetail: (userId: string | null | undefined, ticketId: string | null) =>
    ['support', userId ?? 'anon', 'tickets', ticketId ?? '', 'detail'] as const,
  myTickets: (userId: string | null | undefined) =>
    ['support', userId ?? 'anon', 'tickets', 'mine'] as const,
};

/** Who is asking. This only chooses what is displayed; the RPCs and policies decide what is allowed. */
export function useSupportScope(): string | null | undefined {
  return useAuthStore((s) => s.user?.id);
}
