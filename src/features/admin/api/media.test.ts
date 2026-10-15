import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import {
  createAdminMediaFolder,
  deleteAdminMedia,
  deleteAdminMediaFolder,
  fetchAdminMediaLibrary,
  listAdminMediaFolders,
  listAdminMediaStores,
  moveAdminMedia,
  renameAdminMedia,
  renameAdminMediaFolder,
  setMediaStatus,
  uploadAdminMedia,
} from './media';
import {
  mediaFolderRow,
  mediaItemRow,
  profileRow,
  storeRow,
  supabaseDouble,
} from '../../../test/supabase-double';

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

describe('Batch 61: admin media management', () => {
  const storedItem = {
    id: 'm-file',
    vendor_id: STORE_A,
    object_path: 'alpha-audio/products/hero.png',
    cdn_url: 'https://double.supabase.co/storage/v1/object/public/vendor-assets/alpha-audio/products/hero.png',
  };

  it('renames another store’s asset and returns it with its store resolved', async () => {
    signInAsAdmin();
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({ ...storedItem }));

    const renamed = await renameAdminMedia('m-file', 'hero-final.png');

    expect(renamed).toMatchObject({ id: 'm-file', name: 'hero-final.png', storeName: 'Alpha Audio' });
  });

  it('moves the object under the OWNER’s slug and records the new path', async () => {
    signInAsAdmin();
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({ ...storedItem }));
    const [item] = await fetchAdminMediaLibrary();

    const moved = await moveAdminMedia(item!, 'Banners');

    expect(supabaseDouble.storageMoves).toEqual([
      { bucket: 'vendor-assets', from: 'alpha-audio/products/hero.png', to: 'alpha-audio/banners/hero.png' },
    ]);
    expect(moved).toMatchObject({ folder: 'banners', objectPath: 'alpha-audio/banners/hero.png' });
  });

  it('refuses to move a demo asset that has no object in the bucket', async () => {
    signInAsAdmin();
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({ id: 'm-demo', vendor_id: STORE_A }));
    const [item] = await fetchAdminMediaLibrary();

    await expect(moveAdminMedia(item!, 'banners')).rejects.toThrow(/no file stored/i);
    expect(supabaseDouble.storageMoves).toEqual([]);
  });

  it('deletes through the RPC and removes the bucket object it captured', async () => {
    signInAsAdmin();
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({ ...storedItem }));

    const removed = await deleteAdminMedia('m-file');

    expect(removed.objectPath).toBe('alpha-audio/products/hero.png');
    expect(supabaseDouble.storageRemovals).toEqual([
      { bucket: 'vendor-assets', paths: ['alpha-audio/products/hero.png'] },
    ]);
    expect(await fetchAdminMediaLibrary()).toEqual([]);
  });

  it('refuses a non-admin delete before the RPC runs', async () => {
    supabaseDouble.authState.session = {
      access_token: 't',
      user: { id: SELLER, email: 'seller@vendora.test' },
    };
    supabaseDouble.seedProfile(
      profileRow({ id: SELLER, name: 'Sana Seller', email: 'seller@vendora.test', roles: ['seller'] }),
    );
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({ ...storedItem }));

    await expect(deleteAdminMedia('m-file')).rejects.toThrow(/only the platform team can/i);
    expect(supabaseDouble.storageRemovals).toEqual([]);
  });

  it('creates, lists, renames (relabeling files) and deletes folder rows', async () => {
    signInAsAdmin();
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({ ...storedItem }));

    const created = await createAdminMediaFolder(STORE_A, 'Campaign Shots');
    expect(created).toMatchObject({ vendorId: STORE_A, name: 'campaign-shots' });
    expect((await listAdminMediaFolders()).map((folder) => folder.name)).toEqual(['campaign-shots']);

    supabaseDouble.seedMediaFolder(mediaFolderRow({ id: 'f-products', vendor_id: STORE_A, name: 'products' }));
    const renamed = await renameAdminMediaFolder(STORE_A, 'products', 'Catalogue');
    expect(renamed.name).toBe('catalogue');
    const [item] = await fetchAdminMediaLibrary();
    expect(item?.folder).toBe('catalogue');

    await expect(deleteAdminMediaFolder(STORE_A, 'catalogue')).rejects.toThrow(/still holds 1 file/i);
    await deleteAdminMediaFolder(STORE_A, 'campaign-shots');
    expect((await listAdminMediaFolders()).map((folder) => folder.name)).toEqual(['catalogue']);
  });
});

describe('Batch 66: listAdminMediaStores (New Folder picker)', () => {
  it('returns every store even when the library is completely empty', async () => {
    signInAsAdmin();
    seedStores();
    // No media items seeded at all: the old items-derived picker offered
    // nothing here and disabled New Folder - the exact bug this fixes.
    expect(await fetchAdminMediaLibrary()).toEqual([]);

    const stores = await listAdminMediaStores();

    expect(stores).toEqual([
      { id: STORE_A, label: 'Alpha Audio' },
      { id: STORE_B, label: 'Beta Bazaar' },
    ]);
  });

  it('also returns stores that own files, ordered by store name', async () => {
    signInAsAdmin();
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({ id: 'm-a', vendor_id: STORE_A }));

    const stores = await listAdminMediaStores();

    expect(stores.map((store) => store.id)).toEqual([STORE_A, STORE_B]);
  });

  it('falls back to the slug, then a placeholder, when a store has no name', async () => {
    signInAsAdmin();
    supabaseDouble.seedVendorProfile(
      storeRow({ id: 'store-gamma', user_id: 'owner-g', store_name: '', slug: 'gamma-goods' }),
    );
    supabaseDouble.seedVendorProfile(
      storeRow({ id: 'store-delta', user_id: 'owner-d', store_name: '', slug: '' }),
    );

    const stores = await listAdminMediaStores();
    const byId = new Map(stores.map((store) => [store.id, store.label]));

    expect(byId.get('store-gamma')).toBe('gamma-goods');
    expect(byId.get('store-delta')).toBe('Unnamed store');
  });

  it('refuses a non-admin before the store list is read', async () => {
    supabaseDouble.authState.session = {
      access_token: 't',
      user: { id: SELLER, email: 'seller@vendora.test' },
    };
    supabaseDouble.seedProfile(
      profileRow({ id: SELLER, name: 'Sana Seller', email: 'seller@vendora.test', roles: ['seller'] }),
    );
    seedStores();

    await expect(listAdminMediaStores()).rejects.toThrow(
      /only the platform team can list media stores/i,
    );
  });
});

describe('Batch 72: platform media - the admin’s own folders and uploads', () => {
  const bannerFile = () =>
    new File([new Uint8Array([1, 2, 3])], 'hero banner.png', { type: 'image/png' });

  it('surfaces a platform item in the library with the Platform label', async () => {
    signInAsAdmin();
    seedStores();
    supabaseDouble.seedMediaItem(mediaItemRow({
      id: 'm-platform', vendor_id: null, name: 'banner.png', folder: 'banners', status: 'approved',
    }));
    supabaseDouble.seedMediaItem(mediaItemRow({ id: 'm-store', vendor_id: STORE_A }));

    const items = await fetchAdminMediaLibrary();
    const byId = new Map(items.map((item) => [item.id, item]));

    expect(byId.get('m-platform')).toMatchObject({
      vendorId: null, storeName: 'Platform', storeSlug: 'platform', folder: 'banners',
    });
    expect(byId.get('m-store')).toMatchObject({ vendorId: STORE_A, storeName: 'Alpha Audio' });
  });

  it('creates, lists, renames (relabeling files) and deletes platform folder rows', async () => {
    signInAsAdmin();
    seedStores();

    const created = await createAdminMediaFolder(null, 'Site Banners');
    expect(created).toMatchObject({ vendorId: null, name: 'site-banners' });
    expect((await listAdminMediaFolders()).map((folder) => folder.name)).toEqual(['site-banners']);

    // The NULL owner must not collide with a store folder of the same name,
    // and the pair must stay distinct in the listing.
    await createAdminMediaFolder(STORE_A, 'site-banners');
    expect((await listAdminMediaFolders()).length).toBe(2);

    supabaseDouble.seedMediaItem(mediaItemRow({ id: 'm-p', vendor_id: null, folder: 'site-banners' }));
    const renamed = await renameAdminMediaFolder(null, 'site-banners', 'Hero Banners');
    expect(renamed).toMatchObject({ vendorId: null, name: 'hero-banners' });
    const platformItem = (await fetchAdminMediaLibrary()).find((item) => item.id === 'm-p');
    expect(platformItem?.folder).toBe('hero-banners');

    await expect(deleteAdminMediaFolder(null, 'hero-banners')).rejects.toThrow(/still holds 1 file/i);
    await deleteAdminMedia('m-p');
    await deleteAdminMediaFolder(null, 'hero-banners');
    expect((await listAdminMediaFolders()).map((folder) => folder.vendorId)).toEqual([STORE_A]);
  });

  it('refuses a duplicate platform folder name', async () => {
    signInAsAdmin();
    await createAdminMediaFolder(null, 'banners');
    await expect(createAdminMediaFolder(null, 'banners')).rejects.toThrow(/duplicate key/i);
  });

  it('uploads to the platform: platform/ path, null-vendor row, born approved', async () => {
    signInAsAdmin();
    seedStores();

    const uploaded = await uploadAdminMedia(bannerFile(), { vendorId: null, folder: 'Banners' });

    expect(supabaseDouble.storageUploads).toHaveLength(1);
    expect(supabaseDouble.storageUploads[0]?.bucket).toBe('vendor-assets');
    expect(supabaseDouble.storageUploads[0]?.path).toMatch(/^platform\/banners\/\d+_hero_banner\.png$/);
    expect(uploaded).toMatchObject({
      vendorId: null,
      storeName: 'Platform',
      storeSlug: 'platform',
      folder: 'banners',
      name: 'hero banner.png',
      status: 'approved',
    });
    expect(uploaded.objectPath).toBe(supabaseDouble.storageUploads[0]?.path);
    // The destination exists as a folder row for the sidebar afterwards.
    expect((await listAdminMediaFolders()).map((folder) => folder.name)).toEqual(['banners']);
  });

  it('uploads on a store’s behalf under the store slug, owned by that store', async () => {
    signInAsAdmin();
    seedStores();

    const uploaded = await uploadAdminMedia(bannerFile(), { vendorId: STORE_A, folder: 'products' });

    expect(supabaseDouble.storageUploads[0]?.path).toMatch(/^alpha-audio\/products\/\d+_hero_banner\.png$/);
    expect(uploaded).toMatchObject({
      vendorId: STORE_A, storeName: 'Alpha Audio', storeSlug: 'alpha-audio', status: 'approved',
    });
  });

  it('refuses an upload for a store that does not exist, before any object is stored', async () => {
    signInAsAdmin();
    seedStores();

    await expect(
      uploadAdminMedia(bannerFile(), { vendorId: 'store-gone', folder: 'products' }),
    ).rejects.toThrow(/does not exist/i);
    expect(supabaseDouble.storageUploads).toEqual([]);
  });

  it('refuses a non-admin upload before storage is touched', async () => {
    supabaseDouble.authState.session = {
      access_token: 't',
      user: { id: SELLER, email: 'seller@vendora.test' },
    };
    supabaseDouble.seedProfile(
      profileRow({ id: SELLER, name: 'Sana Seller', email: 'seller@vendora.test', roles: ['seller'] }),
    );
    seedStores();

    await expect(
      uploadAdminMedia(bannerFile(), { vendorId: null, folder: 'banners' }),
    ).rejects.toThrow(/only the platform team can upload a media asset/i);
    expect(supabaseDouble.storageUploads).toEqual([]);
  });

  it('moves a platform asset between platform folders under the platform segment', async () => {
    signInAsAdmin();
    supabaseDouble.seedMediaItem(mediaItemRow({
      id: 'm-pmove',
      vendor_id: null,
      folder: 'banners',
      object_path: 'platform/banners/hero.png',
      cdn_url: 'https://double.supabase.co/storage/v1/object/public/vendor-assets/platform/banners/hero.png',
    }));
    const [item] = await fetchAdminMediaLibrary();

    const moved = await moveAdminMedia(item!, 'Campaigns');

    expect(supabaseDouble.storageMoves).toEqual([
      { bucket: 'vendor-assets', from: 'platform/banners/hero.png', to: 'platform/campaigns/hero.png' },
    ]);
    expect(moved).toMatchObject({ vendorId: null, folder: 'campaigns', objectPath: 'platform/campaigns/hero.png' });
  });
});
