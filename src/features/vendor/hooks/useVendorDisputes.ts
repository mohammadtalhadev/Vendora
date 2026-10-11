import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDisputeMessages,
  fetchVendorDisputes,
  postDisputeMessage,
} from '../api/disputes';
import { vendorKeys, useVendorScope } from './vendor-keys';

/** The arbitration cases naming this store, most recently touched first. */
export function useVendorDisputes() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.disputes(userId),
    queryFn: ({ signal }) => fetchVendorDisputes(signal),
    enabled: Boolean(userId),
  });
}

/** One case's exchange, loaded when the seller opens it rather than with the list. */
export function useDisputeMessages(disputeId: string | null) {
  return useQuery({
    queryKey: vendorKeys.disputeMessages(disputeId ?? ''),
    queryFn: ({ signal }) => fetchDisputeMessages(disputeId as string, signal),
    enabled: Boolean(disputeId),
  });
}

export function usePostDisputeMessage() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ disputeId, body }: { disputeId: string; body: string }) =>
      postDisputeMessage(disputeId, body),
    onSuccess: (_message, { disputeId }) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.disputeMessages(disputeId) });
      // A reply bumps the case's updated_at, which is what the list is ordered by.
      queryClient.invalidateQueries({ queryKey: vendorKeys.disputes(userId) });
    },
  });
}
