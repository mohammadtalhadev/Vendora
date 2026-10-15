import { supabase } from '../../../lib/supabase';
import { toFriendlyError } from '../../../lib/friendly-error';
import { updateProfileIdentity } from '../../auth/api/session';

/**
 * Profile photos. The `user-avatars` bucket and its owner policies already
 * exist (migration 20261011000300): reads are public, and writes are allowed
 * only under the caller's own `<auth uid>/` prefix — `avatars_owner_write`
 * keys on `(storage.foldername(name))[1] = auth.uid()`. What was missing was
 * any client that used them: no page offered an upload, so `profiles.avatar_url`
 * could never be set from the product. This module is that client.
 */
export const AVATAR_BUCKET = 'user-avatars';

/** 2 MB: a profile photo renders at 80px; anything larger is upload time for nothing. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const AVATAR_ACCEPTED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Returns the reason a file cannot be a profile photo, or null when it can. */
export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!AVATAR_ACCEPTED_TYPES[file.type]) {
    return 'Pick a JPG, PNG or WebP image for your profile photo.';
  }
  if (file.size <= 0) {
    return 'That file is empty — pick a photo with content.';
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'That photo is over 2 MB. Pick a smaller image for your profile photo.';
  }
  return null;
}

/**
 * Uploads the photo under the caller's own uid prefix (the only prefix the
 * bucket policy lets them write), then points `profiles.avatar_url` at its
 * public URL through the session layer. Returns the public URL so the caller
 * can refresh the session user and have the new photo reflected everywhere
 * the account appears (profile header, account sidebar, navbar).
 */
export async function uploadAvatar(file: File): Promise<string> {
  const problem = validateAvatarFile(file);
  if (problem) throw new Error(problem);

  // getUser answers with an error and a null user when there is no session;
  // both shapes mean the same thing to the person: sign in first.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Sign in before changing your profile photo.');

  const extension = AVATAR_ACCEPTED_TYPES[file.type];
  const objectPath = `${userData.user.id}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (uploadError) {
    // Never surface the storage service's raw wording: map it through the
    // friendly-error layer (which reports server-class failures via
    // captureException and appends their reference) under the same prefix
    // the profile-save path uses.
    throw toFriendlyError(uploadError, { prefix: 'Failed to save your profile', context: 'avatar-upload' });
  }

  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);

  try {
    await updateProfileIdentity({ avatar: urlData.publicUrl });
  } catch (cause) {
    // The object is stored but unreferenced; remove it rather than orphan it.
    await supabase.storage.from(AVATAR_BUCKET).remove([objectPath]);
    throw cause;
  }
  return urlData.publicUrl;
}
