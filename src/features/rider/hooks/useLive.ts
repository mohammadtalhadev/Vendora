import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeWatch } from '../../../hooks/useRealtime';
import { riderKeys } from './useRider';

/**
 * A parcel assigned here, or a package that moved on without waiting: the route is re-read from
 * `rider_delivery_board()`, so a rider never sees a stop the database has already taken away.
 */
export function useRiderLive(): void {
  const queryClient = useQueryClient();
  const stale = () => {
    void queryClient.invalidateQueries({ queryKey: riderKeys.all });
  };

  useRealtimeWatch({ table: 'deliveries', onChange: stale });
  useRealtimeWatch({ table: 'sub_orders', onChange: stale });
}
