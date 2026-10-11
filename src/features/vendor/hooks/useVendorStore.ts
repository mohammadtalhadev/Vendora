import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchStoreByHandle,
  fetchStoreDirectory,
  fetchVendorStore,
  updateVendorStore,
  type VendorStoreUpdate,
} from '../api/store';
import {
  fetchNotificationPrefs,
  fetchShippingSettings,
  saveNotificationPrefs,
  saveShippingSettings,
  type VendorNotificationPrefs,
  type VendorShippingSettings,
} from '../api/shipping';
import { vendorKeys, useVendorScope } from './vendor-keys';

/** The store record, or the error that explains why there is not one. */
export function useVendorStore() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.store(userId),
    queryFn: ({ signal }) => fetchVendorStore(signal),
    enabled: Boolean(userId),
  });
}

/** A public storefront by slug or id - works for a store you do not own. */
export function useStoreByHandle(handle: string) {
  return useQuery({
    queryKey: ['vendor', 'store-by-handle', handle],
    queryFn: ({ signal }) => fetchStoreByHandle(handle, signal),
    enabled: Boolean(handle),
  });
}

export function useStoreDirectory() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: ['vendor', 'store-directory'],
    queryFn: ({ signal }) => fetchStoreDirectory(signal),
    enabled: Boolean(userId),
  });
}

export function useUpdateVendorStore() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: VendorStoreUpdate) => updateVendorStore(updates),
    onSuccess: (store) => {
      queryClient.setQueryData(vendorKeys.store(userId), store);
      // The dashboard header shows the store name, rating and vacation banner.
      queryClient.invalidateQueries({ queryKey: vendorKeys.dashboard(userId) });
    },
  });
}

export function useShippingSettings() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.shipping(userId),
    queryFn: ({ signal }) => fetchShippingSettings(signal),
    enabled: Boolean(userId),
  });
}

export function useSaveShippingSettings() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<VendorShippingSettings>) => saveShippingSettings(updates),
    onSuccess: (settings) => {
      queryClient.setQueryData(vendorKeys.shipping(userId), settings);
    },
  });
}

export function useNotificationPrefs() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.notificationPrefs(userId),
    queryFn: ({ signal }) => fetchNotificationPrefs(signal),
    enabled: Boolean(userId),
  });
}

export function useSaveNotificationPrefs() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<VendorNotificationPrefs>) => saveNotificationPrefs(updates),
    onSuccess: (prefs) => {
      queryClient.setQueryData(vendorKeys.notificationPrefs(userId), prefs);
    },
  });
}
