import { supabase } from '../../../lib/supabase';
import { toFriendlyError } from '../../../lib/friendly-error';

/**
 * CMS image uploads (the Admin CMS page's hero-banner image field, and any
 * future CMS image field that stores a URL).
 *
 * Storage route, chosen against the policies that actually exist rather than
 * by habit — no new bucket and no migration are needed:
 *  - `product-images` is a PUBLIC bucket, and its insert policy
 *    (`product_images_vendor_upload`, migration 20261011000300) admits an
 *    admin under any vendor folder — the same route the first-party product
 *    uploader already uses (`uploadFirstPartyProductImage` in
 *    features/admin/api/moderation.ts writes under the platform store's
 *    'vendora' folder). CMS files go one level deeper, `vendora/cms/…`, so
 *    they sit in the platform store's own space, never a seller's.
 *  - A bare `cms/` prefix would FAIL that policy: the first path segment
 *    must be a vendor slug. And `vendor-assets` is the media library's
 *    bucket, owned by the vendor/admin media surfaces — CMS uploads do not
 *    belong in their namespace.
 *  - The bucket's hosted limits (migration 20261015040000) already cap it at
 *    5 MB with an image-only MIME allowlist; the validation below mirrors
 *    those numbers so the admin hears the honest reason before the upload
 *    is attempted, not from a raw storage refusal after it.
 */
export const CMS_IMAGE_BUCKET = 'product-images';

/** The platform store's folder, one level down: where CMS files live. */
export const CMS_IMAGE_PREFIX = 'vendora/cms';

/** 5 MB: the `product-images` bucket's own hosted file_size_limit. */
export const CMS_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** The bucket's hosted MIME allowlist, mapped to the extension we store. */
export const CMS_IMAGE_ACCEPTED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const CMS_IMAGE_ACCEPT = Object.keys(CMS_IMAGE_ACCEPTED_TYPES).join(',');

/** Returns the reason a file cannot be a CMS image, or null when it can. */
export function validateCmsImageFile(file: { type: string; size: number }): string | null {
  if (!CMS_IMAGE_ACCEPTED_TYPES[file.type]) {
    return 'Pick a JPG, PNG, WebP or GIF image for this field.';
  }
  if (file.size <= 0) {
    return 'That file is empty — pick an image with content.';
  }
  if (file.size > CMS_IMAGE_MAX_BYTES) {
    return 'That image is over 5 MB. Pick a smaller image for this field.';
  }
  return null;
}

/**
 * Uploads the image under `vendora/cms/` in the public `product-images`
 * bucket and returns its public URL — the same shape of value the CMS form
 * has always stored, so the save flow downstream is unchanged. Failures
 * throw a friendly-mapped error; the storage service's raw wording never
 * reaches the admin.
 */
export async function uploadCmsImage(file: File): Promise<string> {
  const problem = validateCmsImageFile(file);
  if (problem) throw new Error(problem);

  const extension = CMS_IMAGE_ACCEPTED_TYPES[file.type];
  const baseName =
    file.name
      .substring(0, Math.max(0, file.name.lastIndexOf('.')))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/^_+|_+$/g, '') || 'image';
  const objectPath = `${CMS_IMAGE_PREFIX}/${Date.now()}_${baseName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(CMS_IMAGE_BUCKET)
    .upload(objectPath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (uploadError) {
    throw toFriendlyError(uploadError, {
      prefix: 'The image could not be uploaded',
      context: 'cms-image-upload',
    });
  }

  const { data: urlData } = supabase.storage.from(CMS_IMAGE_BUCKET).getPublicUrl(objectPath);
  return urlData.publicUrl;
}
