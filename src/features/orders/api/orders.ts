import { apiClient } from '../../../lib/api-client';
import type { CartItem, ShippingAddress, OrderGroup, SubOrder, SubOrderStatus } from '../../../types/domain';

export interface CreateOrderPayload {
  customerId?: string;
  customerEmail?: string;
  items: CartItem[];
  shippingAddress?: ShippingAddress;
  paymentMethod: 'card' | 'cod';
  paymentBrand?: string;
  last4?: string;
}

export interface CreateOrderResponse {
  orderGroup: OrderGroup;
  subOrders: SubOrder[];
}

export interface OrdersListResponse {
  orderGroups: OrderGroup[];
  subOrders: SubOrder[];
}

export interface OrderDetailResponse {
  orderGroup: OrderGroup;
  subOrders: SubOrder[];
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  return apiClient<CreateOrderResponse>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchOrders(signal?: AbortSignal): Promise<OrdersListResponse> {
  return apiClient<OrdersListResponse>('/api/orders', { signal });
}

export async function fetchOrderDetail(id: string, signal?: AbortSignal): Promise<OrderDetailResponse> {
  return apiClient<OrderDetailResponse>(`/api/orders/${id}`, { signal });
}

export async function updateSubOrderStatus(
  subOrderId: string,
  nextStatus: SubOrderStatus,
  note?: string,
): Promise<SubOrder> {
  return apiClient<SubOrder>(`/api/suborders/${subOrderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ nextStatus, note }),
  });
}
