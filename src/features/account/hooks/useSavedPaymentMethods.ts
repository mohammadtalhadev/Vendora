import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import {
  createPaymentMethod,
  deletePaymentMethod,
  fetchPaymentMethods,
  setDefaultPaymentMethod,
} from '../api/payments';

/** Keyed by the signed-in account, because saved payment methods are per person. */
export const savedPaymentKeys = {
  all: ['account', 'payment-methods'] as const,
  scope: (userId: string | null | undefined) => ['account', 'payment-methods', userId ?? 'anon'] as const,
  list: (userId: string | null | undefined) =>
    ['account', 'payment-methods', userId ?? 'anon', 'list'] as const,
};

/**
 * The signed-in customer's saved payment methods (display metadata only), read from
 * `user_payment_methods`. Signed out the list is empty; a failed read surfaces as the
 * query's error rather than as an invented card.
 */
export function useSavedPaymentMethods() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: savedPaymentKeys.list(userId),
    queryFn: ({ signal }) => fetchPaymentMethods(signal),
    enabled: Boolean(userId),
  });
}

export function useSavedPaymentMethodActions() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const refresh = () => queryClient.invalidateQueries({ queryKey: savedPaymentKeys.scope(userId) });

  return {
    create: useMutation({
      mutationFn: createPaymentMethod,
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deletePaymentMethod(id),
      onSuccess: refresh,
    }),
    setDefault: useMutation({
      mutationFn: (id: string) => setDefaultPaymentMethod(id),
      onSuccess: refresh,
    }),
  };
}
