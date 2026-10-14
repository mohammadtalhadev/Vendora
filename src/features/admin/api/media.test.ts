import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchAdminMediaLibrary, setMediaStatus } from './media';
import { mediaItemRow, profileRow, storeRow, supabaseDouble } from '../../../test/supabase-double';

const SELLER = 'seller-media';
const STORE_A = 'store-alpha';
const STORE_B = 'store-beta';

function signInAsAdmin() {
  supabaseDouble.seedAdmin();
}

function seedStores() {
  supabaseDouble.seedVendorProfile(
    storeRow({ id: STORE_A, user_id: 'owner-a', store_name: 'Alpha Audio', slug: 'alpha-audio' }),
  );
  supabaseDouble.seedVendorProfile(
    storeRow({ id: STORE_B, user_id: 'owner-b', store_name: 'Beta Bazaar', slug: 'beta-bazaar' }),
  );
}

beforeEach(() => {
  supabaseDouble.reset();
});

describe('fetchAdminMediaLibrary', () => {
  it('lists every store’s rows, not just the signed-in account’s, newest first', async () => {
    signInAsAdmin();
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({
      id: 'm-old', vendor_id: STORE_A, name: 'old.png', created_at: '2026-10-01T00:00:00.000Z',
    }));
    supabaseDouble.seedMediaItem(mediaItemRow({
      id: 'm-new', vendor_id: STORE_B, name: 'new.png', created_at: '2026-10-09T00:00:00.000Z',
    }));

    const items = await fetchAdminMediaLibrary();

    expect(items.map((item) => item.id)).toEqual(['m-new', 'm-old']);
  });

  it('resolves each row to the store that owns it', async () => {
    signInAsAdmin();
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({ id: 'm-a', vendor_id: STORE_A }));
    supabaseDouble.seedMediaItem(mediaItemRow({ id: 'm-b', vendor_id: STORE_B }));

    const items = await fetchAdminMediaLibrary();
    const byId = new Map(items.map((item) => [item.id, item]));

    expect(byId.get('m-a')).toMatchObject({
      vendorId: STORE_A, storeName: 'Alpha Audio', storeSlug: 'alpha-audio', status: 'pending',
    });
    expect(byId.get('m-b')).toMatchObject({
      vendorId: STORE_B, storeName: 'Beta Bazaar', storeSlug: 'beta-bazaar',
    });
  });

  it('leaves the store blank when the row points at a store that no longer exists', async () => {
    signInAsAdmin();
    supabaseDouble.seedMediaItem(mediaItemRow({ id: 'm-orphan', vendor_id: 'store-gone' }));

    const [item] = await fetchAdminMediaLibrary();

    expect(item).toMatchObject({ vendorId: 'store-gone', storeName: '', storeSlug: '' });
  });

  it('throws when the read fails instead of showing an empty library', async () => {
    signInAsAdmin();
    supabaseDouble.failures.media_items = 'permission denied for table media_items';

    await expect(fetchAdminMediaLibrary()).rejects.toThrow(/failed to load the media library/i);
  });
});

describe('setMediaStatus', () => {
  it('writes the moderation verdict on another store’s asset and returns the stored row', async () => {
    signInAsAdmin();
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({ id: 'm-mod', vendor_id: STORE_B, status: 'pending' }));

    const updated = await setMediaStatus('m-mod', 'flagged');

    expect(updated).toMatchObject({ id: 'm-mod', status: 'flagged', storeName: 'Beta Bazaar' });
    const [stored] = await fetchAdminMediaLibrary();
    expect(stored?.status).toBe('flagged');
  });

  it('refuses a non-admin before any write reaches the table', async () => {
    supabaseDouble.authState.session = {
      access_token: 't',
      user: { id: SELLER, email: 'seller@vendora.test' },
    };
    supabaseDouble.seedProfile(
      profileRow({ id: SELLER, name: 'Sana Seller', email: 'seller@vendora.test', roles: ['seller'] }),
    );
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({ id: 'm-mod', vendor_id: STORE_A, status: 'pending' }));

    await expect(setMediaStatus('m-mod', 'approved')).rejects.toThrow(
      /only the platform team can moderate a media asset/i,
    );
  });
});
