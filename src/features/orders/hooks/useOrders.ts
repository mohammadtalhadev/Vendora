import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  advanceSubOrderStatus,
  fetchDigitalDownloads,
  fetchOrderDetail,
  fetchOrders,
  issueDeliveryCode,
} from '../api/orders';
import { useAuthStore } from '../../../store/auth-store';
import type { SubOrderStatus } from '../../../types/domain';

export const orderKeys = {
  all: ['orders'] as const,
  lists: (userId: string | null | undefined) => ['orders', 'list', userId ?? 'anon'] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  downloads: () => ['orders', 'downloads'] as const,
};

/** The signed-in customer's order history; a guest has no rows to read. */
export function useOrders() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: orderKeys.lists(userId),
    queryFn: ({ signal }) => fetchOrders(signal),
    enabled: Boolean(userId),
  });
}

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: ({ signal }) => fetchOrderDetail(orderId, signal),
    enabled: Boolean(orderId),
  });
}

export function useDigitalDownloads() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: orderKeys.downloads(),
    queryFn: ({ signal }) => fetchDigitalDownloads(signal),
    enabled: Boolean(userId),
  });
}

export function useUpdateSubOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subOrderId,
      nextStatus,
      note,
    }: {
      subOrderId: string;
      nextStatus: SubOrderStatus;
      note?: string;
    }) => advanceSubOrderStatus(subOrderId, nextStatus, note),
    onSuccess: (updatedSubOrder) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(updatedSubOrder.orderGroupId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

/**
 * The handover code is hashed on the way in, so a customer who lost theirs gets a new one.
 * Only the new code works, which is why it is read once and never cached.
 */
export function useIssueDeliveryCode(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subOrderId: string) => issueDeliveryCode(subOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
  });
}
