import { useQuery } from '@tanstack/react-query';
import { fetchOrderDeliveryLive } from '../api/location';

const MOVING_STATUSES = ['picked_up', 'in_transit', 'out_for_delivery'];

/**
 * The customer-side live read for one order. While any of the
 * order's deliveries is on the road the read re-runs every 30 seconds, so the
 * map follows the rider without the buyer refreshing; once every parcel is
 * delivered or failed, polling stops and the last position/proof stays as
 * the record of the drop.
 */
export function useOrderDeliveryLive(orderId: string | null | undefined) {
  return useQuery({
    queryKey: ['rider', 'delivery-live', orderId ?? 'none'] as const,
    queryFn: ({ signal }) => fetchOrderDeliveryLive(orderId ?? '', signal),
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const rows = query.state.data;
      return rows?.some((row) => MOVING_STATUSES.includes(row.status)) ? 30_000 : false;
    },
  });
}
