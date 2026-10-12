import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchCannedResponses } from '../api/canned';
import {
  fetchDisputeQueue,
  fetchDisputeThread,
  fetchSupportAgents,
  lookupOrders,
} from '../api/disputes';
import { supportKeys, useSupportScope } from './support-keys';

/**
 * Reads for the support desk. Each one goes to Postgres and throws on failure: an
 * error here renders as an error, never as an empty queue or a demo row.
 */

export function useDisputeQueue(
  params: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    unassigned?: boolean;
    assignedTo?: string | null;
  } = {},
) {
  const userId = useSupportScope();
  return useQuery({
    queryKey: supportKeys.disputeQueue(userId, params),
    queryFn: ({ signal }) => fetchDisputeQueue(params, signal),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}

export function useDisputeThread(disputeId: string | null) {
  const userId = useSupportScope();
  return useQuery({
    queryKey: supportKeys.disputeThread(userId, disputeId),
    queryFn: ({ signal }) => fetchDisputeThread(disputeId as string, signal),
    enabled: Boolean(userId && disputeId),
  });
}

export function useSupportAgents() {
  const userId = useSupportScope();
  return useQuery({
    queryKey: supportKeys.staffDirectory(userId),
    queryFn: ({ signal }) => fetchSupportAgents(signal),
    enabled: Boolean(userId),
  });
}

export function useCannedResponses(category?: string | null) {
  const userId = useSupportScope();
  return useQuery({
    queryKey: supportKeys.cannedResponses(userId, { category }),
    queryFn: ({ signal }) => fetchCannedResponses({ category }, signal),
    enabled: Boolean(userId),
  });
}

export function useOrderLookup(customerEmail: string | null) {
  const userId = useSupportScope();
  return useQuery({
    queryKey: supportKeys.orderLookup(userId, customerEmail),
    queryFn: ({ signal }) => lookupOrders(customerEmail as string, 30, signal),
    enabled: Boolean(userId && customerEmail),
  });
}
