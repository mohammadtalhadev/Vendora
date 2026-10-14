import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SubOrderStatus } from '../../../types/domain';
import {
  advancePackageStatus,
  fetchVendorPackage,
  fetchVendorPackages,
  updatePackageTracking,
  type VendorPackage,
} from '../api/packages';
import {
  approveReturn,
  completeReturn,
  declineReturn,
  fetchReturnQueue,
  type ReturnDecision,
  type RestockedLine,
} from '../api/returns';
import { vendorKeys, useVendorScope } from './vendor-keys';
import { liveList } from './live-list';

export function useVendorPackages() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.packages(userId),
    queryFn: ({ signal }) => fetchVendorPackages(signal),
    enabled: Boolean(userId),
    // The Orders and Returns boards watch this list (Batch 48 freshness standard).
    ...liveList,
  });
}

export function useVendorPackage(subOrderId: string) {
  return useQuery({
    queryKey: vendorKeys.pkg(subOrderId),
    queryFn: ({ signal }) => fetchVendorPackage(subOrderId, signal),
    enabled: Boolean(subOrderId),
  });
}

/** A write to a package changes the dashboard stage counts and the earnings ledger. */
function useInvalidatePackages() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return (subOrderId: string) => {
    queryClient.invalidateQueries({ queryKey: vendorKeys.pkg(subOrderId) });
    queryClient.invalidateQueries({ queryKey: vendorKeys.packages(userId) });
    queryClient.invalidateQueries({ queryKey: vendorKeys.returns(userId) });
    queryClient.invalidateQueries({ queryKey: vendorKeys.dashboard(userId) });
    queryClient.invalidateQueries({ queryKey: vendorKeys.earnings(userId, 6) });
    // Restocking puts units back on the shelf, so the inventory table must re-read.
    queryClient.invalidateQueries({ queryKey: vendorKeys.products(userId) });
  };
}

export function useAdvancePackageStatus() {
  const invalidate = useInvalidatePackages();

  return useMutation({
    mutationFn: ({
      subOrderId,
      nextStatus,
      note,
    }: {
      subOrderId: string;
      nextStatus: SubOrderStatus;
      note?: string;
    }) => advancePackageStatus(subOrderId, nextStatus, note),
    onSuccess: (pkg: VendorPackage) => invalidate(pkg.id),
  });
}

export function useUpdatePackageTracking() {
  const invalidate = useInvalidatePackages();

  return useMutation({
    mutationFn: ({
      subOrderId,
      carrierName,
      trackingNumber,
    }: {
      subOrderId: string;
      carrierName: string;
      trackingNumber: string;
    }) => updatePackageTracking(subOrderId, carrierName, trackingNumber),
    onSuccess: (pkg: VendorPackage) => invalidate(pkg.id),
  });
}

/** The return queue: requested, approved, closed - whatever the state machine left waiting. */
export function useReturnQueue() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.returns(userId),
    queryFn: ({ signal }) => fetchReturnQueue(signal),
    enabled: Boolean(userId),
  });
}

export function useApproveReturn() {
  const invalidate = useInvalidatePackages();

  return useMutation({
    mutationFn: ({ subOrderId, refundAmount }: { subOrderId: string; refundAmount?: number }) =>
      approveReturn(subOrderId, refundAmount),
    onSuccess: ({ pkg }: { decision: ReturnDecision; pkg: VendorPackage }) => invalidate(pkg.id),
  });
}

export function useDeclineReturn() {
  const invalidate = useInvalidatePackages();

  return useMutation({
    mutationFn: ({ subOrderId, reason }: { subOrderId: string; reason: string }) =>
      declineReturn(subOrderId, reason),
    onSuccess: ({ pkg }: { decision: ReturnDecision; pkg: VendorPackage }) => invalidate(pkg.id),
  });
}

/** Closes an approved return and puts its units back on the shelf. */
export function useCompleteReturn() {
  const invalidate = useInvalidatePackages();

  return useMutation({
    mutationFn: (subOrderId: string) => completeReturn(subOrderId),
    onSuccess: ({ pkg }: { restocked: RestockedLine[]; pkg: VendorPackage }) =>
      invalidate(pkg.id),
  });
}
