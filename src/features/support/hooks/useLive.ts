import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeWatch } from '../../../hooks/useRealtime';
import { adminKeys } from '../../admin/hooks/admin-keys';
import { supportKeys } from './support-keys';

/**
 * A dispute that lands, a reply a buyer adds, a refund the desk issues elsewhere: the queue and
 * the open thread both re-read rather than splice an event payload into the list.
 *
 * The order lookup is a console read, so its cache lives under the admin keys and has to go stale
 * with everything else when a parcel moves.
 */
export function useSupportLive(): void {
  const queryClient = useQueryClient();
  const stale = () => {
    void queryClient.invalidateQueries({ queryKey: supportKeys.all });
    void queryClient.invalidateQueries({ queryKey: adminKeys.all });
  };

  useRealtimeWatch({ table: 'disputes', onChange: stale });
  useRealtimeWatch({ table: 'dispute_messages', onChange: stale });
  useRealtimeWatch({ table: 'refunds', onChange: stale });
  useRealtimeWatch({ table: 'sub_orders', onChange: stale });
}
