import { useQuery } from '@tanstack/react-query';
import { fetchVendorDashboard } from '../api/dashboard';
import { vendorKeys, useVendorScope } from './vendor-keys';

/**
 * One query, one RPC: the dashboard's tiles, stage counts, catalog health and engagement
 * badges all come back from Postgres already computed.
 *
 * The workspace's numbers stay current on their own: a 30-second poll plus a refetch
 * when the tab regains focus. `staleTime` matches the poll - the app-wide default is
 * five minutes, which would swallow the focus refetch entirely.
 *
 * @param lowStockAt what the store counts as low stock.
 */
export function useVendorDashboard(lowStockAt = 5) {
  const userId = useVendorScope();
  return useQuery({
    queryKey: [...vendorKeys.dashboard(userId), lowStockAt] as const,
    queryFn: ({ signal }) => fetchVendorDashboard(lowStockAt, signal),
    enabled: Boolean(userId),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
