import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAdminDashboard } from '../api/dashboard';
import { fetchVendorDetail, fetchVendorQueue } from '../api/vendors';
import { fetchModerationQueue } from '../api/moderation';
import { fetchDisputeQueue } from '../api/disputes';
import { fetchUserQueue } from '../api/users';
import { fetchAdminOrderDetail, fetchAdminOrderQueue } from '../api/orders';
import { fetchCategoryTree } from '../api/categories';
import { fetchCommissionOverview } from '../api/commission';
import { fetchAuditQueue, fetchBroadcastLog } from '../api/audit';
import { fetchReportSummary } from '../api/reports';
import { fetchCodSettlements, fetchLogisticsBoard } from '../api/logistics';
import { fetchPlatformSettings } from '../api/settings';
import { fetchAdminMediaLibrary } from '../api/media';
import { fetchAdminInventory } from '../api/inventory';
import { adminKeys, useAdminScope } from './admin-keys';

/**
 * There is no aggregate hook here. Each console screen asks for the one query it
 * renders, so a queue that failed cannot quietly borrow another queue's rows.
 */

/**
 * Boards an operator watches stay current on their own: a 30-second poll plus a
 * refetch when the tab regains focus, so nobody has to press a refresh button to
 * learn the numbers moved. `staleTime` matches the poll - the app-wide default is
 * five minutes, which would swallow the focus refetch entirely. Realtime
 * invalidation (useAdminLive) still lands changes sooner when it can; the poll is
 * the guarantee underneath it, covering the aggregates' reads beyond the watched
 * tables.
 */
const liveBoard = {
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
  staleTime: 30_000,
} as const;

export function useAdminDashboard(days = 30) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.dashboard(userId, days),
    queryFn: ({ signal }) => fetchAdminDashboard(days, signal),
    enabled: Boolean(userId),
    ...liveBoard,
  });
}

/** Cross-seller stock of record (Batch 79): the whole physical catalog, live-polled like the other boards. */
export function useAdminInventory() {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.inventory(userId),
    queryFn: ({ signal }) => fetchAdminInventory(signal),
    enabled: Boolean(userId),
    ...liveBoard,
  });
}

export function useVendorQueue(params: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.vendors(userId, params),
    queryFn: ({ signal }) => fetchVendorQueue(params, signal),
    enabled: Boolean(userId),
    // Paging and filtering re-reads the queue; the previous page stays on screen
    // until the next one arrives so the table does not blink.
    placeholderData: keepPreviousData,
  });
}

export function useVendorDetail(vendorId: string) {
  return useQuery({
    queryKey: adminKeys.vendor(vendorId),
    queryFn: ({ signal }) => fetchVendorDetail(vendorId, signal),
    enabled: Boolean(vendorId),
  });
}

export function useModerationQueue(params: {
  status?: string;
  search?: string;
  categoryId?: string | null;
  page?: number;
  pageSize?: number;
} = {}) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.moderation(userId, params),
    queryFn: ({ signal }) => fetchModerationQueue(params, signal),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}

export function useDisputeQueue(params: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.disputes(userId, params),
    queryFn: ({ signal }) => fetchDisputeQueue(params, signal),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}

export function useUserQueue(params: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.users(userId, params),
    queryFn: ({ signal }) => fetchUserQueue(params, signal),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrderQueue(params: {
  status?: string;
  payment?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.orders(userId, params),
    queryFn: ({ signal }) => fetchAdminOrderQueue(params, signal),
    enabled: Boolean(userId),
    // The order queue is the widest read in the console, so a page change keeps the
    // previous rows on screen rather than blanking the table.
    placeholderData: keepPreviousData,
    ...liveBoard,
  });
}

export function useAdminOrderDetail(orderGroupId: string) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.order(orderGroupId),
    queryFn: ({ signal }) => fetchAdminOrderDetail(orderGroupId, signal),
    enabled: Boolean(userId) && Boolean(orderGroupId),
  });
}

export function useCategoryTree() {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.categories(userId),
    queryFn: ({ signal }) => fetchCategoryTree(signal),
    enabled: Boolean(userId),
  });
}

export function useCommissionOverview(days = 30) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.commission(userId, days),
    queryFn: ({ signal }) => fetchCommissionOverview(days, signal),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}

export function useAuditQueue(params: {
  action?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.audit(userId, params),
    queryFn: ({ signal }) => fetchAuditQueue(params, signal),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}

/**
 * The announcements this console sent, newest first. `audit_logs` is not in the realtime
 * publication, so the list refreshes when a broadcast of this browser's succeeds rather than
 * pretending to stream.
 */
export function useBroadcastLog(params: { page?: number; pageSize?: number } = {}) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.broadcasts(userId, params),
    queryFn: ({ signal }) => fetchBroadcastLog(params, signal),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}

export function useReportSummary(days = 30, bucket: 'day' | 'week' | 'month' = 'day') {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.reports(userId, { days, bucket }),
    queryFn: ({ signal }) => fetchReportSummary(days, bucket, signal),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}

export function useLogisticsBoard() {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.logistics(userId),
    queryFn: ({ signal }) => fetchLogisticsBoard(signal),
    enabled: Boolean(userId),
    ...liveBoard,
  });
}

/** COD cash awaiting a desk handover, plus the confirmed history (Batch 42). */
export function useCodSettlements() {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.codSettlements(userId),
    queryFn: ({ signal }) => fetchCodSettlements(signal),
    enabled: Boolean(userId),
    ...liveBoard,
  });
}

export function usePlatformSettings() {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.settings(userId),
    queryFn: ({ signal }) => fetchPlatformSettings(signal),
    enabled: Boolean(userId),
  });
}

/** The platform-wide media library; `enabled` lets the shared media view keep the vendor read out of the admin console. */
export function useAdminMediaLibrary(enabled = true) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: adminKeys.media(userId),
    queryFn: ({ signal }) => fetchAdminMediaLibrary(signal),
    enabled: enabled && Boolean(userId),
  });
}
