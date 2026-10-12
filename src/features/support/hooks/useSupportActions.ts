import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  assignDispute,
  escalateDispute,
  postDisputeMessage,
  refundPackage,
  resolveDispute,
} from '../api/disputes';
import {
  createCannedResponse,
  deleteCannedResponse,
  updateCannedResponse,
} from '../api/canned';
import { supportKeys, useSupportScope } from './support-keys';

/**
 * Every action lands in Postgres, and every success invalidates the desk's reads so the
 * screen repaints from the rows the database now holds rather than from what the form
 * intended. A refused write surfaces the database's own message and leaves the queue alone.
 */
export function useSupportActions() {
  const userId = useSupportScope();
  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: supportKeys.scope(userId) });
    queryClient.invalidateQueries({ queryKey: supportKeys.all });
  };

  /** Only the thread changes: the queue's message count moves with it, so both are re-read. */
  const refreshThread = (disputeId: string) => {
    queryClient.invalidateQueries({ queryKey: supportKeys.disputeThread(userId, disputeId) });
    refresh();
  };

  return {
    assignDispute: useMutation({
      mutationFn: ({ disputeId, agentId }: { disputeId: string; agentId: string }) =>
        assignDispute(disputeId, agentId),
      onSuccess: refresh,
    }),

    escalateDispute: useMutation({
      mutationFn: ({ disputeId, note }: { disputeId: string; note: string }) =>
        escalateDispute(disputeId, note),
      onSuccess: refresh,
    }),

    postMessage: useMutation({
      mutationFn: ({ disputeId, content, internalNote }: {
        disputeId: string;
        content: string;
        internalNote?: boolean;
      }) => postDisputeMessage(disputeId, content, internalNote),
      onSuccess: (_data, variables) => refreshThread(variables.disputeId),
    }),

    refundPackage: useMutation({
      mutationFn: ({ subOrderId, amount, reason }: { subOrderId: string; amount: number; reason: string }) =>
        refundPackage(subOrderId, amount, reason),
      onSuccess: refresh,
    }),

    resolveDispute: useMutation({
      mutationFn: ({ disputeId, outcome, note, amount }: {
        disputeId: string;
        outcome: 'resolved_refund' | 'resolved_denied';
        note?: string;
        amount?: number;
      }) => resolveDispute(disputeId, outcome, note, amount),
      onSuccess: refresh,
    }),

    createCannedResponse: useMutation({
      mutationFn: createCannedResponse,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: supportKeys.cannedResponses(userId, {}) }),
    }),

    updateCannedResponse: useMutation({
      mutationFn: ({ id, ...input }: { id: string; subject: string; body: string; category?: string | null }) =>
        updateCannedResponse(id, input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: supportKeys.cannedResponses(userId, {}) }),
    }),

    deleteCannedResponse: useMutation({
      mutationFn: (id: string) => deleteCannedResponse(id),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: supportKeys.cannedResponses(userId, {}) }),
    }),
  };
}
