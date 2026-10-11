import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderResult } from '@testing-library/react';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import { storeRow, supabaseDouble } from './supabase-double';

/** The account the demo seed gives a seller, used as the session in workspace tests. */
export const VENDOR_USER = DEMO_ACCOUNTS.vendor.id;
export const VENDOR_STORE = 'store-1';

/**
 * Signs the session into one store: the Supabase session that `current_vendor_id()` reads,
 * and the auth store the workspace keys its cache by. Neither one decides what the database
 * returns - the store row's `user_id` is what makes the two agree.
 */
export function signInVendor(overrides: Record<string, unknown> = {}) {
  supabaseDouble.seedVendorProfile(
    storeRow({ id: VENDOR_STORE, user_id: VENDOR_USER, store_name: 'Nova Tech', ...overrides }),
  );
  supabaseDouble.authState.session = {
    access_token: 't',
    user: { id: VENDOR_USER, email: DEMO_ACCOUNTS.vendor.email },
  };
  useAuthStore.getState().setUser(DEMO_ACCOUNTS.vendor, 'test-token');
}

/**
 * Renders a workspace page the way the app does: a query client that fails fast instead of
 * retrying, and a router. There is no mock data behind it - a page shows what the double
 * holds, so a test seeds rows and asserts on them.
 */
export function renderWorkspace(ui: ReactNode, entries: string[] = ['/vendor']): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
