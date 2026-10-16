import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchStoreByHandle, fetchStoreOrderStats } from './store';
import { storeRow, supabaseDouble } from '../../../test/supabase-double';

const UUID = '2b1e2b62-8f0a-4d2e-9a77-9a1f0d3c4b55';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.authState.session = null;
  supabaseDouble.seedVendorProfile(storeRow({ id: UUID, slug: 'soundwave-direct', store_name: 'SoundWave Direct' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-2', slug: 'nova-tech', store_name: 'Nova Tech' }));
});

describe('fetchStoreByHandle', () => {
  it('resolves a store from its slug', async () => {
    const store = await fetchStoreByHandle('soundwave-direct');

    expect(store.storeName).toBe('SoundWave Direct');
    expect(store.slug).toBe('soundwave-direct');
  });

  it('resolves the same store from its id', async () => {
    const store = await fetchStoreByHandle(UUID);

    expect(store.storeName).toBe('SoundWave Direct');
  });

  it('does not mix a slug into the uuid column, which PostgREST rejects before it matches', async () => {
    // The old filter was `or(slug.eq.X,id.eq.X)`: for any slug the second half is an
    // invalid uuid literal and the whole request fails with 22P02, so no store page
    // addressed by slug - which is how the storefront and the brand directory link -
    // could ever load.
    await expect(fetchStoreByHandle('nova-tech')).resolves.toMatchObject({ storeName: 'Nova Tech' });
  });

  it('says a store is missing instead of reporting a database error', async () => {
    await expect(fetchStoreByHandle('no-such-store')).rejects.toThrow('Store not found.');
  });
});

describe('fetchStoreOrderStats', () => {
  it('returns delivered counts keyed by vendor id, for the requested ids only', async () => {
    supabaseDouble.seedStoreOrderStat({ vendor_id: UUID, orders_delivered: 7 });
    supabaseDouble.seedStoreOrderStat({ vendor_id: 'store-2', orders_delivered: 3 });
    supabaseDouble.seedStoreOrderStat({ vendor_id: 'store-9', orders_delivered: 42 });

    const stats = await fetchStoreOrderStats([UUID, 'store-2']);

    expect(stats.get(UUID)).toBe(7);
    expect(stats.get('store-2')).toBe(3);
    expect(stats.has('store-9')).toBe(false);
    expect(stats.size).toBe(2);
  });

  it('resolves to an empty map when the view is missing (pre-migration hosted database)', async () => {
    // The view exists only once its migration runs on the hosted
    // database; until then the read must fail soft — no throw, no stats.
    supabaseDouble.failures.store_order_stats =
      'relation "public.store_order_stats" does not exist';

    await expect(fetchStoreOrderStats([UUID])).resolves.toEqual(new Map());
  });

  it('resolves to an empty map for an empty id list', async () => {
    await expect(fetchStoreOrderStats([])).resolves.toEqual(new Map());
  });
});
