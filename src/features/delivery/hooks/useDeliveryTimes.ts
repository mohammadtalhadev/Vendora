import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSellerDeliveryTimes } from '../api/delivery-times';

export const deliveryKeys = {
  times: (vendorIdsKey: string) => ['delivery', 'times', vendorIdsKey] as const,
};

/**
 * The seller delivery profiles for the stores on screen (one product page,
 * or every package in a checkout). The fetch never rejects — a store with
 * no published times, or a database without the Batch 91 view yet, simply
 * has no entry, and the caller quotes the platform standard for it.
 */
export function useSellerDeliveryTimes(vendorIds: string[]) {
  const ids = useMemo(() => [...new Set(vendorIds.filter(Boolean))].sort(), [vendorIds]);
  const key = ids.join(',');
  return useQuery({
    queryKey: deliveryKeys.times(key),
    queryFn: ({ signal }) => fetchSellerDeliveryTimes(ids, signal),
    enabled: ids.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}
