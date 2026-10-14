import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useUpdateVendorProduct, useVendorProduct, useVendorProducts } from './useVendorProducts';
import { vendorKeys } from './vendor-keys';
import { signInVendor } from '../../../test/vendor-render';
import { categoryRow, productRow, supabaseDouble } from '../../../test/supabase-double';
import type { Product } from '../../../types/domain';

const PRODUCT_ID = productRow().id;

describe('useUpdateVendorProduct cache behaviour (Batch 57)', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    supabaseDouble.reset();
    signInVendor();
    supabaseDouble.seedCategory(categoryRow({ id: productRow().category_id }));
    supabaseDouble.seedProduct(productRow({ price: 1999 }));
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it('primes the detail cache with the saved row and invalidates list + detail', async () => {
    // A previous visit leaves the pre-save product in the detail + list
    // caches — the state the products list and the reopened edit form
    // used to keep showing after a save.
    const detail = renderHook(() => useVendorProduct(PRODUCT_ID), { wrapper });
    const list = renderHook(() => useVendorProducts(), { wrapper });
    await waitFor(() => expect(detail.result.current.data?.price).toBe(1999));
    await waitFor(() => expect(list.result.current.data?.[0]?.price).toBe(1999));

    const update = renderHook(() => useUpdateVendorProduct(), { wrapper });
    await act(async () => {
      await update.result.current.mutateAsync({
        productId: PRODUCT_ID,
        updates: { price: 1799 },
      });
    });

    // The detail cache now holds the row the server returned, so a form
    // opening at this moment reads 1799 on its first paint — not the
    // stale 1999 followed by a background correction it would ignore.
    const cached = queryClient.getQueryData<Product>(vendorKeys.product(PRODUCT_ID));
    expect(cached?.price).toBe(1799);

    // Both mounted readers were invalidated by the mutation and now serve
    // the saved price — the list no longer shows the old value, and the
    // detail cache holds the server-returned row.
    await waitFor(() => expect(detail.result.current.data?.price).toBe(1799));
    await waitFor(() => expect(list.result.current.data?.[0]?.price).toBe(1799));
    expect(vendorKeys.product(PRODUCT_ID)).toContain(PRODUCT_ID);

    // The write itself reached the (double's) database.
    expect(supabaseDouble.tables.products[0].price).toBe(1799);
  });
});
