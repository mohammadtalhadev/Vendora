import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import {
  uploadCmsImage,
  validateCmsImageFile,
  CMS_IMAGE_BUCKET,
  CMS_IMAGE_PREFIX,
} from './cms-media';
import { supabaseDouble } from '../../../test/supabase-double';

function image(overrides: Partial<{ name: string; type: string; size: number }> = {}): File {
  const file = new File(['fake-image-bytes'], overrides.name ?? 'hero-banner.png', {
    type: overrides.type ?? 'image/png',
  });
  if (overrides.size !== undefined) {
    Object.defineProperty(file, 'size', { value: overrides.size });
  }
  return file;
}

beforeEach(() => {
  supabaseDouble.reset();
});

describe('validateCmsImageFile', () => {
  it('accepts the bucket allowlist types within the 5 MB bucket limit', () => {
    expect(validateCmsImageFile({ type: 'image/jpeg', size: 500_000 })).toBeNull();
    expect(validateCmsImageFile({ type: 'image/png', size: 5 * 1024 * 1024 })).toBeNull();
    expect(validateCmsImageFile({ type: 'image/webp', size: 10 })).toBeNull();
    expect(validateCmsImageFile({ type: 'image/gif', size: 10 })).toBeNull();
  });

  it('rejects other types, empty files and oversize files with honest reasons', () => {
    expect(validateCmsImageFile({ type: 'image/svg+xml', size: 100 })).toMatch(/JPG, PNG, WebP or GIF/);
    expect(validateCmsImageFile({ type: 'application/pdf', size: 100 })).toMatch(/JPG, PNG, WebP or GIF/);
    expect(validateCmsImageFile({ type: '', size: 100 })).toMatch(/JPG, PNG, WebP or GIF/);
    expect(validateCmsImageFile({ type: 'image/png', size: 0 })).toMatch(/empty/);
    expect(validateCmsImageFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toMatch(/over 5 MB/);
  });
});

describe('uploadCmsImage', () => {
  it('uploads under the platform store’s cms/ folder and returns the public URL', async () => {
    const url = await uploadCmsImage(image());

    expect(supabaseDouble.storageUploads).toHaveLength(1);
    const upload = supabaseDouble.storageUploads[0];
    expect(upload.bucket).toBe(CMS_IMAGE_BUCKET);
    expect(upload.bucket).toBe('product-images');
    // The product-images insert policy keys on the first path segment being a
    // vendor slug: the platform store's 'vendora' folder is what admits the
    // admin — a bare 'cms/' prefix would be refused.
    expect(upload.path.startsWith(`${CMS_IMAGE_PREFIX}/`)).toBe(true);
    expect(upload.path.endsWith('.png')).toBe(true);
    expect(url).toBe(
      `https://double.supabase.co/storage/v1/object/public/${CMS_IMAGE_BUCKET}/${upload.path}`,
    );
  });

  it('stores the extension from the file type, not the file name', async () => {
    await uploadCmsImage(image({ name: 'banner.final.JPEG', type: 'image/webp' }));
    expect(supabaseDouble.storageUploads[0].path.endsWith('.webp')).toBe(true);
    expect(supabaseDouble.storageUploads[0].path).not.toContain(' ');
  });

  it('refuses an invalid file before anything is uploaded', async () => {
    await expect(uploadCmsImage(image({ type: 'application/pdf' }))).rejects.toThrow(
      /JPG, PNG, WebP or GIF/,
    );
    await expect(uploadCmsImage(image({ size: 6 * 1024 * 1024 }))).rejects.toThrow(/over 5 MB/);
    expect(supabaseDouble.storageUploads).toHaveLength(0);
  });

  it('surfaces a storage refusal as a friendly error, never the raw wording', async () => {
    supabaseDouble.failStorageUpload('new row violates row-level security policy');
    await expect(uploadCmsImage(image())).rejects.toThrow(/The image could not be uploaded/);
    await expect(uploadCmsImage(image())).rejects.not.toThrow(/violates row-level security/);
    expect(supabaseDouble.storageUploads).toHaveLength(0);
  });
});
