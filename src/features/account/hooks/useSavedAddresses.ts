import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from '../api/addresses';
import type { AddressUpdates } from '../types';

/** Keyed by the signed-in account, because an address book is literally per person. */
export const savedAddressKeys = {
  all: ['account', 'addresses'] as const,
  scope: (userId: string | null | undefined) => ['account', 'addresses', userId ?? 'anon'] as const,
  list: (userId: string | null | undefined) => ['account', 'addresses', userId ?? 'anon', 'list'] as const,
};

/**
 * The signed-in customer's saved addresses, read from `user_addresses`. Signed out -
 * or before the read lands - the book is simply empty; a failed read surfaces as the
 * query's error so the screen can say so instead of falling back to invented rows.
 */
export function useSavedAddresses() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: savedAddressKeys.list(userId),
    queryFn: ({ signal }) => fetchAddresses(signal),
    enabled: Boolean(userId),
  });
}

export function useSavedAddressActions() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const refresh = () => queryClient.invalidateQueries({ queryKey: savedAddressKeys.scope(userId) });

  return {
    create: useMutation({
      mutationFn: createAddress,
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, updates }: { id: string; updates: AddressUpdates }) => updateAddress(id, updates),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteAddress(id),
      onSuccess: refresh,
    }),
    setDefault: useMutation({
      mutationFn: (id: string) => setDefaultAddress(id),
      onSuccess: refresh,
    }),
  };
}
