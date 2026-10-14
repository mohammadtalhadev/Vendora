import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addBankAccount,
  fetchBankAccounts,
  fetchPayoutHistory,
  fetchVendorBalance,
  fetchVendorEarnings,
  removeBankAccount,
  requestPayout,
  setDefaultBankAccount,
} from '../api/earnings';
import { vendorKeys, useVendorScope } from './vendor-keys';

export function useVendorBalance() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.balance(userId),
    queryFn: ({ signal }) => fetchVendorBalance(signal),
    enabled: Boolean(userId),
  });
}

/**
 * @param months of history the chart asks for (clamped 1..24 by the RPC).
 *
 * The earnings figures poll like the dashboard's do (30s, and on focus) so a sale
 * shows up without the seller pressing anything; `staleTime` matches the poll so
 * the app-wide five-minute default cannot swallow the focus refetch.
 */
export function useVendorEarnings(months = 6) {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.earnings(userId, months),
    queryFn: ({ signal }) => fetchVendorEarnings(months, signal),
    enabled: Boolean(userId),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function usePayoutHistory(limit = 40) {
  const userId = useVendorScope();
  return useQuery({
    queryKey: [...vendorKeys.payouts(userId), limit] as const,
    queryFn: ({ signal }) => fetchPayoutHistory(limit, signal),
    enabled: Boolean(userId),
  });
}

export function useBankAccounts() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.banks(userId),
    queryFn: ({ signal }) => fetchBankAccounts(signal),
    enabled: Boolean(userId),
  });
}

function usePayoutQueries() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: vendorKeys.balance(userId) });
    queryClient.invalidateQueries({ queryKey: vendorKeys.payouts(userId) });
    queryClient.invalidateQueries({ queryKey: vendorKeys.banks(userId) });
    // Every earnings window the workspace may be showing, not only the default six months.
    queryClient.invalidateQueries({ queryKey: [...vendorKeys.scope(userId), 'earnings'] });
    queryClient.invalidateQueries({ queryKey: vendorKeys.dashboard(userId) });
  };
}

/**
 * The balance is re-read after a request rather than decremented here: the database
 * refused anything above what it holds free, and it is the one that set the fee.
 */
export function useRequestPayout() {
  const refresh = usePayoutQueries();

  return useMutation({
    mutationFn: ({ amount, method }: { amount: number; method?: 'instant' | 'standard' }) =>
      requestPayout(amount, method ?? 'instant'),
    onSuccess: () => refresh(),
  });
}

export function useAddBankAccount() {
  const refresh = usePayoutQueries();

  return useMutation({
    mutationFn: (input: {
      holderName: string;
      bankName: string;
      maskedAccount: string;
      maskedRouting?: string;
      accountType?: string;
    }) => addBankAccount(input),
    onSuccess: () => refresh(),
  });
}

export function useRemoveBankAccount() {
  const refresh = usePayoutQueries();

  return useMutation({
    mutationFn: (bankAccountId: string) => removeBankAccount(bankAccountId),
    onSuccess: () => refresh(),
  });
}

/** Returns the full list so the page can show which account is default now. */
export function useSetDefaultBankAccount() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bankAccountId: string) => setDefaultBankAccount(bankAccountId),
    onSuccess: (accounts) => {
      queryClient.setQueryData(vendorKeys.banks(userId), accounts);
    },
  });
}
