import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeWatch } from '../../../hooks/useRealtime';
import { vendorKeys } from './vendor-keys';

/**
 * The seller's workspace is a queue that other people change: a buyer places an order, a
 * moderator rules on a listing, the platform settles a payout or records a strike. Each of those
 * writes a row the workspace reads, so the screens re-read from Postgres instead of assuming the
 * event body is the whole truth.
 */
export function useVendorLive(): void {
  const queryClient = useQueryClient();
  const stale = () => {
    void queryClient.invalidateQueries({ queryKey: vendorKeys.all });
  };

  useRealtimeWatch({ table: 'sub_orders', onChange: stale });
  useRealtimeWatch({ table: 'products', onChange: stale });
  useRealtimeWatch({ table: 'disputes', onChange: stale });
  useRealtimeWatch({ table: 'payouts', onChange: stale });
  useRealtimeWatch({ table: 'vendor_strikes', onChange: stale });
}
