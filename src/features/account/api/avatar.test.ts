import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { uploadAvatar, validateAvatarFile, AVATAR_BUCKET } from './avatar';
import { profileRow, supabaseDouble } from '../../../test/supabase-double';

const USER = 'user-1';

function photo(overrides: Partial<{ type: string; size: number }> = {}): File {
  const file = new File(['fake-image-bytes'], 'me.png', { type: overrides.type ?? 'image/png' });
  if (overrides.size !== undefined) {
    Object.defineProperty(file, 'size', { value: overrides.size });
  }
  return file;
}

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: USER, email: 'alex@example.pk', name: 'Alex Buyer' }));
  supabaseDouble.authState.session = {
    access_token: 'test-access-token',
    user: { id: USER, email: 'alex@example.pk' },
  };
});

describe('validateAvatarFile', () => {
  it('accepts jpg, png and webp within the size limit', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: 500_000 })).toBeNull();
    expect(validateAvatarFile({ type: 'image/png', size: 2 * 1024 * 1024 })).toBeNull();
    expect(validateAvatarFile({ type: 'image/webp', size: 10 })).toBeNull();
  });

  it('rejects other types, empty files and oversize files with honest reasons', () => {
    expect(validateAvatarFile({ type: 'image/gif', size: 100 })).toMatch(/JPG, PNG or WebP/);
    expect(validateAvatarFile({ type: 'application/pdf', size: 100 })).toMatch(/JPG, PNG or WebP/);
    expect(validateAvatarFile({ type: 'image/png', size: 0 })).toMatch(/empty/);
    expect(validateAvatarFile({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toMatch(/over 2 MB/);
  });
});

describe('uploadAvatar', () => {
  it('uploads under the caller\u2019s own uid prefix and writes the public URL to profiles.avatar_url', async () => {
    const url = await uploadAvatar(photo());

    expect(supabaseDouble.storageUploads).toHaveLength(1);
    const upload = supabaseDouble.storageUploads[0];
    expect(upload.bucket).toBe(AVATAR_BUCKET);
    // The bucket policy only allows writes under `<auth uid>/` — the path must start there.
    expect(upload.path.startsWith(`${USER}/avatar-`)).toBe(true);
    expect(upload.path.endsWith('.png')).toBe(true);
    expect(url).toBe(
      `https://double.supabase.co/storage/v1/object/public/${AVATAR_BUCKET}/${upload.path}`,
    );

    const row = supabaseDouble.tables.profiles.find((r) => r.id === USER);
    expect(row?.avatar_url).toBe(url);
  });

  it('refuses an invalid file before anything is uploaded or written', async () => {
    await expect(uploadAvatar(photo({ type: 'image/gif' }))).rejects.toThrow(/JPG, PNG or WebP/);
    expect(supabaseDouble.storageUploads).toHaveLength(0);
    const row = supabaseDouble.tables.profiles.find((r) => r.id === USER);
    expect(row?.avatar_url).toBeNull();
  });

  it('surfaces a storage refusal and leaves the profile untouched', async () => {
    supabaseDouble.failStorageUpload('new row violates row-level security policy');
    await expect(uploadAvatar(photo())).rejects.toThrow(/Failed to save your profile/);
    // The storage service's raw wording never reaches the caller.
    await expect(uploadAvatar(photo())).rejects.not.toThrow(/violates row-level security/);
    const row = supabaseDouble.tables.profiles.find((r) => r.id === USER);
    expect(row?.avatar_url).toBeNull();
  });

  it('requires a signed-in session', async () => {
    supabaseDouble.authState.session = null;
    await expect(uploadAvatar(photo())).rejects.toThrow(/Sign in/);
    expect(supabaseDouble.storageUploads).toHaveLength(0);
  });
});
