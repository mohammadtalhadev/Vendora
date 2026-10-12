import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeWatch } from '../../../hooks/useRealtime';
import { adminKeys } from './admin-keys';

/**
 * The console re-reads itself when the platform changes underneath it: an order placed on the
 * storefront moves GMV, a moderation decision empties the queue, an application arrives.
 *
 * Nothing here trusts the event payload - Supabase applies the subscriber's own RLS before
 * delivering it, so a change to a row the console could not select never arrives at all, and
 * what does arrive only says "stale". The numbers come back from Postgres.
 */
export function useAdminLive(): void {
  const queryClient = useQueryClient();
  const stale = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.all });
  };

  useRealtimeWatch({ table: 'orders', onChange: stale });
  useRealtimeWatch({ table: 'products', onChange: stale });
  useRealtimeWatch({ table: 'disputes', onChange: stale });
  useRealtimeWatch({ table: 'vendor_applications', onChange: stale });
}
