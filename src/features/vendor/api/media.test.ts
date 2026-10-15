import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchMediaLibrary, recordProfileImage, uploadMedia } from './media';
import { mediaItemRow, storeRow, supabaseDouble } from '../../../test/supabase-double';

const SELLER = 'seller-user-1';
const STORE = 'store-1';

const imageFile = (name: string) => new File(['image-bytes'], name, { type: 'image/png' });

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.authState.session = {
    access_token: 'test-access-token',
    user: { id: SELLER, email: 'seller@demo.test' },
  };
  supabaseDouble.seedVendorProfile(
    storeRow({ id: STORE, user_id: SELLER, slug: 'demo-store', store_name: 'Demo Store' }),
  );
});

describe('Batch 80: uploads file into the store’s kind subfolders', () => {
  it('files an upload under the folder it was given, as a path segment and a label', async () => {
    const item = await uploadMedia(imageFile('banner.png'), 'storefront');

    expect(item.folder).toBe('storefront');
    expect(item.objectPath.startsWith('demo-store/storefront/')).toBe(true);
  });

  it('defaults to Product Images when no folder is named', async () => {
    const item = await uploadMedia(imageFile('shoe.png'));

    expect(item.folder).toBe('products');
  });

  it('creates the destination as a media_folders row on demand', async () => {
    await uploadMedia(imageFile('banner.png'), 'storefront');

    expect(
      supabaseDouble.tables.media_folders.some(
        (folder) => folder.vendor_id === STORE && folder.name === 'storefront',
      ),
    ).toBe(true);
  });
});

describe('Batch 80: recordProfileImage files the profile photo', () => {
  it('records the photo in Profile Images, replacing the previous photo’s row only', async () => {
    supabaseDouble.seedMediaItem(
      mediaItemRow({
        id: 'old-avatar',
        folder: 'profile',
        name: 'old.png',
        cdn_url: 'https://example.test/storage/v1/object/public/user-avatars/u/avatar-old.png',
      }),
    );
    supabaseDouble.seedMediaItem(
      mediaItemRow({
        id: 'uploaded-profile-file',
        folder: 'profile',
        name: 'team.png',
        cdn_url: 'https://example.test/storage/v1/object/public/vendor-assets/demo-store/profile/team.png',
      }),
    );

    await recordProfileImage({
      name: 'me.png',
      objectPath: 'seller-user-1/avatar-123.png',
      cdnUrl: 'https://example.test/storage/v1/object/public/user-avatars/u/avatar-123.png',
      mimeType: 'image/png',
      sizeBytes: 1234,
    });

    const library = await fetchMediaLibrary();
    const profileRows = library.filter((item) => item.folder === 'profile');
    expect(profileRows.map((item) => item.name).sort()).toEqual(['me.png', 'team.png']);
    expect(
      supabaseDouble.tables.media_folders.some(
        (folder) => folder.vendor_id === STORE && folder.name === 'profile',
      ),
    ).toBe(true);
  });

  it('is a no-op for an account with no store, and never throws', async () => {
    supabaseDouble.authState.session = {
      access_token: 'test-access-token',
      user: { id: 'customer-1', email: 'customer@demo.test' },
    };

    await expect(
      recordProfileImage({
        name: 'me.png',
        objectPath: 'customer-1/avatar-1.png',
        cdnUrl: 'https://example.test/user-avatars/customer-1/avatar-1.png',
        mimeType: 'image/png',
        sizeBytes: 10,
      }),
    ).resolves.toBeUndefined();
    expect(supabaseDouble.tables.media_items).toHaveLength(0);
  });
});
