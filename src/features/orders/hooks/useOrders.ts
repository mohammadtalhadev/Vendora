import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchOrders,
  fetchOrderDetail,
  createOrder,
  updateSubOrderStatus,
} from '../api/orders';
import type { CreateOrderPayload } from '../api/orders';
import type { SubOrderStatus } from '../../../types/domain';

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => ['orders', 'list'] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
};

export function useOrders() {
  return useQuery({
    queryKey: orderKeys.lists(),
    queryFn: ({ signal }) => fetchOrders(signal),
  });
}

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: ({ signal }) => fetchOrderDetail(orderId, signal),
    enabled: Boolean(orderId),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
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
    }) => updateSubOrderStatus(subOrderId, nextStatus, note),
    onSuccess: (updatedSubOrder) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(updatedSubOrder.orderGroupId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}
