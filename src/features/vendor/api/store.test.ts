import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchStoreByHandle } from './store';
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
