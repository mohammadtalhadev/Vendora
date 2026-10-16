import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { num, requireVendorId, text } from './vendor-client';
import { fetchVendorStore } from './store';

type MediaRow = Database['public']['Tables']['media_items']['Row'];

/** The bucket the store's own files live in; the RLS policy keys on the path prefix. */
const BUCKET = 'vendor-assets';

/**
 * An asset in the store's library. `status` is the platform's moderation verdict and is
 * never writable from here: a fresh upload is `pending` until review, and a seller update
 * that changed it is refused by `media_update_owner`.
 */
export interface VendorMediaItem {
  id: string;
  name: string;
  folder: string;
  objectPath: string;
  cdnUrl: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  status: 'approved' | 'pending' | 'flagged';
  createdAt: string;
}

function mapMedia(row: MediaRow): VendorMediaItem {
  return {
    id: row.id,
    name: row.name,
    folder: row.folder,
    objectPath: row.object_path,
    cdnUrl: row.cdn_url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width === null ? undefined : num(row.width),
    height: row.height === null ? undefined : num(row.height),
    status: row.status === 'approved' || row.status === 'flagged' ? row.status : 'pending',
    createdAt: row.created_at,
  };
}

export async function fetchMediaLibrary(signal?: AbortSignal): Promise<VendorMediaItem[]> {
  const vendorId = await requireVendorId();
  let query = supabase
    .from('media_items')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your media library: ${error.message}`);
  return ((data ?? []) as unknown as MediaRow[]).map(mapMedia);
}

/** Folders are derived from the assets themselves; there is no folder table to keep in sync. */
export function foldersOf(items: VendorMediaItem[]): string[] {
  return [...new Set(items.map((item) => item.folder).filter(Boolean))].sort();
}

/**
 * Uploads a file under the store's own slug - `vendor_assets_owner_write` allows a
 * seller to write only inside `vendor-assets/<their slug>/` - then records the asset as
 * `pending`. Dimensions are left unknown rather than guessed; the page reads them from
 * the image once it renders.
 */
export async function uploadMedia(file: File, folder = 'products'): Promise<VendorMediaItem> {
  // Never invent a type for the record: a file whose type the browser cannot
  // name is rejected here instead of being stored as application/octet-stream,
  // which would slip it past the bucket's MIME allowlist bookkeeping.
  if (!file.type) {
    throw new Error('This file has no detectable type and cannot be uploaded. Choose an image or video file.');
  }
  const store = await fetchVendorStore();
  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, '_');
  const objectPath = `${store.slug}/${folder}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

  const { data, error } = await supabase
    .from('media_items')
    .insert({
      vendor_id: store.id,
      name: file.name,
      folder,
      object_path: objectPath,
      cdn_url: publicUrl.publicUrl,
      mime_type: file.type,
      size_bytes: file.size,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) {
    // The file is already in the bucket; leaving it there would make it unreachable.
    await supabase.storage.from(BUCKET).remove([objectPath]);
    throw new Error(`Failed to record the asset: ${error.message}`);
  }

  // The folder exists as a `media_folders` row as well as a label on the
  // asset, so the destination the upload filed into is a real
  // subfolder of this store in the library tree - created on demand here,
  // exactly as the admin upload creates its destination row. Best-effort:
  // the asset already carries the label, so an existing row (the unique
  // constraint answering) must not fail the upload.
  try {
    await supabase.from('media_folders').insert({ vendor_id: store.id, name: folder });
  } catch {
    // The label is already carried by the asset; nothing else to do.
  }

  return mapMedia(data as unknown as MediaRow);
}

/**
 * Files the seller's current profile photo into the library's Profile Images
 * section. The photo itself lives in the `user-avatars` bucket
 * under the account's uid prefix and `profiles.avatar_url` points at it; this
 * records the same file as a media row for the store the account owns, so it
 * sits in the library alongside the store's other assets. The previous
 * profile photo's row is replaced, not piled up. Best-effort by design: an
 * account with no store has no library to file into, and a failed record
 * must never fail the photo change itself.
 */
export async function recordProfileImage(input: {
  name: string;
  objectPath: string;
  cdnUrl: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<void> {
  try {
    const store = await fetchVendorStore();

    // Only earlier avatar records are replaced - a file the seller uploaded
    // into the profile folder from the media page is theirs to keep.
    await supabase
      .from('media_items')
      .delete()
      .eq('vendor_id', store.id)
      .eq('folder', 'profile')
      .ilike('cdn_url', '%/user-avatars/%');

    const { error } = await supabase.from('media_items').insert({
      vendor_id: store.id,
      name: input.name,
      folder: 'profile',
      object_path: input.objectPath,
      cdn_url: input.cdnUrl,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      status: 'pending',
    });
    if (error) return;

    try {
      await supabase.from('media_folders').insert({ vendor_id: store.id, name: 'profile' });
    } catch {
      // The label is already carried by the asset; nothing else to do.
    }
  } catch {
    // No store, or the library write was refused: the photo change stands.
  }
}

/** Renames the label only; the stored object keeps its path, so live links stay valid. */
export async function renameMedia(itemId: string, name: string): Promise<VendorMediaItem> {
  const vendorId = await requireVendorId();
  const { data, error } = await supabase
    .from('media_items')
    .update({ name })
    .eq('id', itemId)
    .eq('vendor_id', vendorId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`Failed to rename the asset: ${error.message}`);
  if (!data) throw new Error('This asset is not yours to rename.');
  return mapMedia(data as unknown as MediaRow);
}

/**
 * Moves an asset between folders by moving the object itself and recording the new path.
 * Demo rows point at an external CDN with no object in the bucket, so they can be
 * relabelled but not moved - the error says so instead of faking a move.
 */
export async function moveMedia(itemId: string, folder: string): Promise<VendorMediaItem> {
  const vendorId = await requireVendorId();
  const store = await fetchVendorStore();

  const { data: current, error: readError } = await supabase
    .from('media_items')
    .select('*')
    .eq('id', itemId)
    .eq('vendor_id', vendorId)
    .maybeSingle();
  if (readError) throw new Error(`Failed to load the asset: ${readError.message}`);
  if (!current) throw new Error('This asset is not yours to move.');

  const item = mapMedia(current as unknown as MediaRow);
  if (!item.cdnUrl.includes(`/${BUCKET}/`)) {
    throw new Error('This demo asset has no file stored in your bucket, so it cannot be moved.');
  }

  const fileName = text(item.objectPath.split('/').pop());
  const nextPath = `${store.slug}/${folder}/${fileName}`;
  const { error: moveError } = await supabase.storage
    .from(BUCKET)
    .move(item.objectPath, nextPath);
  if (moveError) throw new Error(`Failed to move the file: ${moveError.message}`);

  const { data, error } = await supabase
    .from('media_items')
    .update({ folder, object_path: nextPath })
    .eq('id', itemId)
    .eq('vendor_id', vendorId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`Failed to record the move: ${error.message}`);
  if (!data) throw new Error('This asset is not yours to move.');
  return mapMedia(data as unknown as MediaRow);
}

/** Deletes the record, and the stored file too when this workspace put it there. */
export async function deleteMedia(itemId: string): Promise<void> {
  const vendorId = await requireVendorId();
  const { data, error } = await supabase
    .from('media_items')
    .delete()
    .eq('id', itemId)
    .eq('vendor_id', vendorId)
    .select('cdn_url, object_path');
  if (error) throw new Error(`Failed to delete the asset: ${error.message}`);
  if (!data || data.length === 0) throw new Error('This asset is not yours to delete.');

  const removed = data[0] as unknown as { cdn_url: string; object_path: string };
  if (text(removed.cdn_url).includes(`/${BUCKET}/`)) {
    await supabase.storage.from(BUCKET).remove([removed.object_path]);
  }
}
