import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { captureException } from './error-reporter';

/**
 * The app's one query client. It lives in a module (not only in main.tsx) so
 * the auth layer can clear it on sign-out: cached orders, addresses and admin
 * lists belong to the account that fetched them and must not outlive it in a
 * shared browser (FE-SEC F3).
 */
export const queryClient = new QueryClient({
  // Handled failures are reported too: until now only uncaught
  // errors reached error_logs, so the failures pages caught and displayed —
  // including auth 500s — left no trace. Reporting only; pages keep display
  // duty, and captureException dedupes an error object reported twice.
  queryCache: new QueryCache({
    onError: (error) => captureException(error, { source: 'query' }),
  }),
  mutationCache: new MutationCache({
    onError: (error) => captureException(error, { source: 'mutation' }),
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Prevents sudden refetch when switching windows or tabs
      refetchOnReconnect: false, // Prevents sudden refetch on network jitter
    },
  },
});
