import { supabase } from '../../../lib/supabase';
import { asRecord, num, rpcFailed, text } from './admin-client';
import { cleanFolderName } from '../../media/mediaData';
import type { VendorMediaItem } from '../../vendor/api/media';

/**
 * The platform-wide media library. The vendor workspace reads `media_items`
 * through `current_vendor_id()`, which is the wrong question for staff: the
 * table's select policy (`media_select_owner`) already admits an admin to
 * every store's rows, so this read simply does not filter by owner, and joins
 * each row back to the store that owns it.
 *
 * Batch 61 widens the staff writes to full file management. Rename and move
 * ride the same `media_moderate_admin` UPDATE policy the moderation verdict
 * uses (a move also moves the bucket object under the OWNER's slug, exactly
 * like the vendor `moveMedia`). Row deletion goes through the
 * `admin_delete_media` RPC instead: it captures the storage paths, deletes
 * the row and audits the delete in one transaction, and the client then
 * removes the object with the paths it returns. Folders are real rows in
 * `media_folders` since Batch 61, written directly under that table's RLS
 * (owner or admin); renaming one also relabels its files' `folder` column.
 *
 * Batch 72 adds the platform itself as an owner: since migration
 * 20261017020000 a NULL `vendor_id` IS the platform's own library - its
 * folders, and the banners / CMS assets staff upload into them (objects
 * under the `platform/` path prefix, rows recorded through the guarded
 * `admin_upload_media` RPC and born `approved`). Platform rows resolve to
 * the store name "Platform" everywhere a store's rows resolve to theirs.
 */

/** The bucket every store's files live in; the vendor API uses the same name. */
const BUCKET = 'vendor-assets';

/** How a platform-owned (NULL vendor) row names its owner across the console. */
export const PLATFORM_STORE_NAME = 'Platform';
export const PLATFORM_STORE_SLUG = 'platform';

export interface AdminMediaItem extends VendorMediaItem {
  /** The owning store's id, or null for a platform-owned asset. */
  vendorId: string | null;
  storeName: string;
  storeSlug: string;
}

export type MediaStatus = VendorMediaItem['status'];

/** Mirrors the guard the other console writes open with. */
async function requireAdmin(operation: string): Promise<void> {
  const { error } = await supabase.rpc('admin_require_admin', { p_operation: operation });
  if (error) throw rpcFailed(operation, error.message);
}

function mapAdminMedia(
  row: Record<string, unknown>,
  stores: Map<string, { name: string; slug: string }>,
): AdminMediaItem {
  // A NULL vendor_id is a platform-owned row (Batch 72), not a missing store.
  const vendorId =
    row.vendor_id === null || row.vendor_id === undefined ? null : text(row.vendor_id);
  const store =
    vendorId === null
      ? { name: PLATFORM_STORE_NAME, slug: PLATFORM_STORE_SLUG }
      : stores.get(vendorId);
  const status = text(row.status);
  return {
    id: text(row.id),
    name: text(row.name),
    folder: text(row.folder),
    objectPath: text(row.object_path),
    cdnUrl: text(row.cdn_url),
    mimeType: text(row.mime_type),
    sizeBytes: num(row.size_bytes),
    width: row.width === null || row.width === undefined ? undefined : num(row.width),
    height: row.height === null || row.height === undefined ? undefined : num(row.height),
    status: status === 'approved' || status === 'flagged' ? status : 'pending',
    createdAt: text(row.created_at),
    vendorId,
    storeName: store?.name ?? '',
    storeSlug: store?.slug ?? '',
  };
}

/** Every store's assets, newest first, each resolved to its owning store. */
export async function fetchAdminMediaLibrary(signal?: AbortSignal): Promise<AdminMediaItem[]> {
  let query = supabase
    .from('media_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the media library', error.message);
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;

  // The owner names ride a second read keyed by the rows actually returned, so
  // the listing never claims a store the row does not point at.
  const stores = new Map<string, { name: string; slug: string }>();
  const vendorIds = [...new Set(rows.map((row) => text(row.vendor_id)).filter(Boolean))];
  if (vendorIds.length > 0) {
    let storeQuery = supabase
      .from('vendor_profiles')
      .select('id, store_name, slug')
      .in('id', vendorIds);
    if (signal) storeQuery = storeQuery.abortSignal(signal);

    const { data: storeRows, error: storeError } = await storeQuery;
    if (storeError) throw rpcFailed('Failed to load the media library', storeError.message);
    for (const store of (storeRows ?? []) as unknown as Array<Record<string, unknown>>) {
      stores.set(text(store.id), { name: text(store.store_name), slug: text(store.slug) });
    }
  }

  return rows.map((row) => mapAdminMedia(row, stores));
}

/**
 * Writes the moderation verdict, then re-reads the row: the row that comes
 * back is the proof it landed, and a row the policy keeps from staff comes
 * back as no row at all, which is reported instead of toasted over.
 */
/** Re-reads the owning store for one written row, so the returned item names it. */
async function resolveAdminMedia(row: Record<string, unknown>): Promise<AdminMediaItem> {
  const stores = new Map<string, { name: string; slug: string }>();
  const vendorId = text(row.vendor_id);
  if (vendorId) {
    const { data: store } = await supabase
      .from('vendor_profiles')
      .select('id, store_name, slug')
      .eq('id', vendorId)
      .maybeSingle();
    if (store) {
      const storeRow = store as unknown as Record<string, unknown>;
      stores.set(vendorId, { name: text(storeRow.store_name), slug: text(storeRow.slug) });
    }
  }
  return mapAdminMedia(row, stores);
}

export async function setMediaStatus(id: string, status: MediaStatus): Promise<AdminMediaItem> {
  await requireAdmin('moderate a media asset');

  const { data, error } = await supabase
    .from('media_items')
    .update({ status })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw rpcFailed('Could not update the asset', error.message);
  if (!data) throw rpcFailed('Could not update the asset', 'that asset is not moderatable');

  return resolveAdminMedia(data as unknown as Record<string, unknown>);
}

/** Renames the label only; the stored object keeps its path, so live links stay valid. */
export async function renameAdminMedia(id: string, name: string): Promise<AdminMediaItem> {
  await requireAdmin('rename a media asset');

  const { data, error } = await supabase
    .from('media_items')
    .update({ name })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw rpcFailed('Could not rename the asset', error.message);
  if (!data) throw rpcFailed('Could not rename the asset', 'that asset is not editable');

  return resolveAdminMedia(data as unknown as Record<string, unknown>);
}

/**
 * Moves another store's asset between folders: the object itself moves under
 * the OWNER's slug (the path prefix the storage policy keys on), then the row
 * records the new folder and path. If the row write fails after the object
 * moved, the object is moved back before the error is reported, so the row
 * never points at a path the file no longer occupies. Demo rows point at an
 * external CDN with no object in the bucket, so they cannot be moved - the
 * error says so instead of faking a move (same rule as the vendor move).
 */
export async function moveAdminMedia(item: AdminMediaItem, targetFolder: string): Promise<AdminMediaItem> {
  await requireAdmin('move a media asset');

  const folder = cleanFolderName(targetFolder);
  if (!folder) {
    throw rpcFailed('Could not move the asset', 'give the destination folder a name of letters, numbers, dashes or underscores');
  }
  if (folder === item.folder) return item;
  if (!item.cdnUrl.includes(`/${BUCKET}/`)) {
    throw rpcFailed('Could not move the asset', 'this demo asset has no file stored in the vendor-assets bucket, so it cannot be moved');
  }
  // The first path segment is the owner: the store's slug, or 'platform' for
  // the platform's own files (Batch 72). A move only ever takes a folder, so
  // an asset can only travel between folders of the same owner, platform
  // included - cross-owner moves stay impossible by construction.
  const ownerSlug = item.vendorId === null ? PLATFORM_STORE_SLUG : item.storeSlug;
  if (!ownerSlug) {
    throw rpcFailed('Could not move the asset', 'the owning store could not be resolved, so the stored path cannot be rebuilt');
  }
  const fileName = text(item.objectPath.split('/').pop());
  if (!fileName) {
    throw rpcFailed('Could not move the asset', 'the asset has no stored object path to move');
  }

  const nextPath = `${ownerSlug}/${folder}/${fileName}`;
  const { error: moveError } = await supabase.storage.from(BUCKET).move(item.objectPath, nextPath);
  if (moveError) throw rpcFailed('Could not move the asset', moveError.message);

  const { data, error } = await supabase
    .from('media_items')
    .update({ folder, object_path: nextPath })
    .eq('id', item.id)
    .select('*')
    .maybeSingle();
  if (error || !data) {
    // The object already moved; put it back so the surviving row stays true.
    await supabase.storage.from(BUCKET).move(nextPath, item.objectPath);
    throw rpcFailed(
      'Could not move the asset',
      error?.message ?? 'the row did not accept the new path, so the file was moved back',
    );
  }

  return resolveAdminMedia(data as unknown as Record<string, unknown>);
}

/**
 * Batch 72: a staff upload. The object goes to the bucket first at
 * `<owner slug>/<folder>/<timestamp>_<name>` - `platform/...` for the
 * platform's own files, the store's slug for a file uploaded on a seller's
 * behalf - and the row is then recorded through `admin_upload_media`: the
 * direct insert is closed to staff by `media_insert_owner` (it demands the
 * caller's own store), so the guarded RPC is the one write path for both
 * destinations, and its rows are born `approved`. If recording fails, the
 * orphaned object is removed again, mirroring the vendor upload. Image
 * dimensions are left unknown rather than guessed, exactly as the vendor
 * upload leaves them.
 */
export async function uploadAdminMedia(
  file: File,
  target: { vendorId: string | null; folder: string },
): Promise<AdminMediaItem> {
  await requireAdmin('upload a media asset');

  if (!file.type) {
    throw rpcFailed(
      'Could not upload the asset',
      'this file has no detectable type and cannot be uploaded - choose an image or video file',
    );
  }
  const folder = cleanFolderName(target.folder);
  if (!folder) {
    throw rpcFailed('Could not upload the asset', 'give the destination folder a name of letters, numbers, dashes or underscores');
  }

  let ownerSlug = PLATFORM_STORE_SLUG;
  if (target.vendorId) {
    const { data: store, error: storeError } = await supabase
      .from('vendor_profiles')
      .select('id, slug')
      .eq('id', target.vendorId)
      .maybeSingle();
    if (storeError) throw rpcFailed('Could not upload the asset', storeError.message);
    if (!store) throw rpcFailed('Could not upload the asset', 'that store does not exist');
    ownerSlug = text((store as unknown as Record<string, unknown>).slug);
    if (!ownerSlug) {
      throw rpcFailed('Could not upload the asset', 'that store has no slug, so the stored path cannot be built');
    }
  }

  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, '_');
  const objectPath = `${ownerSlug}/${folder}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) throw rpcFailed('Could not upload the asset', uploadError.message);

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

  const { data, error } = await supabase.rpc('admin_upload_media', {
    p_vendor_id: target.vendorId,
    p_name: file.name,
    p_folder: folder,
    p_object_path: objectPath,
    p_cdn_url: publicUrl.publicUrl,
    p_mime_type: file.type,
    p_size_bytes: file.size,
  });
  if (error || !data) {
    // No row points at the object now; remove it so storage stays truthful.
    await supabase.storage.from(BUCKET).remove([objectPath]);
    throw rpcFailed('Could not record the upload', error?.message ?? 'the upload was not recorded');
  }

  // The sidebar reads folder rows, and staff destinations should exist as
  // rows whether or not a file landed in them yet. Best-effort: the recorded
  // item already carries the folder label, so an existing row (the unique
  // constraint answering) must not fail the upload.
  try {
    await supabase.from('media_folders').insert({ vendor_id: target.vendorId, name: folder });
  } catch {
    // The label is already carried by the item; nothing else to do.
  }

  return resolveAdminMedia(asRecord(data) as unknown as Record<string, unknown>);
}

/**
 * Deletes the row through `admin_delete_media` (guarded + audited in the
 * database), then removes the stored object with the paths the RPC captured -
 * only when the row's URL points at our own bucket, like the vendor delete.
 */
export async function deleteAdminMedia(id: string): Promise<{ objectPath: string; cdnUrl: string }> {
  await requireAdmin('delete a media asset');

  const { data, error } = await supabase.rpc('admin_delete_media', { p_id: id });
  if (error) throw rpcFailed('Could not delete the asset', error.message);

  const removed = asRecord(data);
  const objectPath = text(removed.objectPath);
  const cdnUrl = text(removed.cdnUrl);
  if (objectPath && cdnUrl.includes(`/${BUCKET}/`)) {
    await supabase.storage.from(BUCKET).remove([objectPath]);
  }
  return { objectPath, cdnUrl };
}

// ---------------------------------------------------------------------------
// Folders: real `media_folders` rows since Batch 61, one per (owner, name) -
// the owner is a store, or the platform itself (NULL) since Batch 72.
// ---------------------------------------------------------------------------

export interface AdminMediaFolder {
  id: string;
  /** The owning store's id, or null for a platform folder (Batch 72). */
  vendorId: string | null;
  name: string;
  createdAt: string;
}

function mapAdminMediaFolder(row: Record<string, unknown>): AdminMediaFolder {
  return {
    id: text(row.id),
    vendorId: row.vendor_id === null || row.vendor_id === undefined ? null : text(row.vendor_id),
    name: text(row.name),
    createdAt: text(row.created_at),
  };
}

export interface AdminMediaStore {
  id: string;
  label: string;
}

/**
 * EVERY store on the platform, whether or not it owns a file yet. The New
 * Folder dialog picks from this list: Batch 61 made folders real rows exactly
 * so one can be created before any file exists, so the picker must not be
 * derived from the files currently in the library (an empty library used to
 * leave it with nothing to offer and the button disabled).
 */
export async function listAdminMediaStores(signal?: AbortSignal): Promise<AdminMediaStore[]> {
  await requireAdmin('list media stores');

  let query = supabase
    .from('vendor_profiles')
    .select('id, store_name, slug')
    .order('store_name', { ascending: true });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the store list', error.message);
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: text(row.id),
    label: text(row.store_name) || text(row.slug) || 'Unnamed store',
  }));
}

/** Every store's folder rows, ordered so a store's folders stay together. */
export async function listAdminMediaFolders(signal?: AbortSignal): Promise<AdminMediaFolder[]> {
  await requireAdmin('read media folders');

  let query = supabase
    .from('media_folders')
    .select('*')
    .order('vendor_id', { ascending: true })
    .order('name', { ascending: true });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load media folders', error.message);
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapAdminMediaFolder);
}

/**
 * Creates a folder row for an owner: a store, or the platform itself when
 * `vendorId` is null (Batch 72 - the NULL is the platform's own row, and the
 * platform policies in migration 20261017020000 admit it).
 */
export async function createAdminMediaFolder(vendorId: string | null, name: string): Promise<AdminMediaFolder> {
  await requireAdmin('create a media folder');

  const folder = cleanFolderName(name);
  if (!folder) {
    throw rpcFailed('Could not create the folder', 'give the folder a name of letters, numbers, dashes or underscores');
  }

  const { data, error } = await supabase
    .from('media_folders')
    .insert({ vendor_id: vendorId, name: folder })
    .select('*')
    .single();
  if (error) throw rpcFailed('Could not create the folder', error.message);
  return mapAdminMediaFolder(data as unknown as Record<string, unknown>);
}

/**
 * Renames a folder row, then relabels every file that carried the old name for
 * that store - the admin UPDATE policy on `media_items` admits the bulk write.
 * The two writes are reported honestly: if the relabel fails after the row was
 * renamed, the error says which half landed.
 */
export async function renameAdminMediaFolder(
  vendorId: string | null,
  oldName: string,
  newName: string,
): Promise<AdminMediaFolder> {
  await requireAdmin('rename a media folder');

  const folder = cleanFolderName(newName);
  if (!folder) {
    throw rpcFailed('Could not rename the folder', 'give the folder a name of letters, numbers, dashes or underscores');
  }
  // A NULL owner cannot be matched with `.eq` (SQL NULL never equals
  // anything), so platform rows filter with `.is('vendor_id', null)`.
  const ownerLabel = vendorId === null ? 'the platform' : 'this store';
  if (folder === oldName) {
    const scoped = supabase.from('media_folders').select('*').eq('name', oldName);
    const { data } = await (vendorId === null
      ? scoped.is('vendor_id', null)
      : scoped.eq('vendor_id', vendorId)
    ).maybeSingle();
    if (!data) throw rpcFailed('Could not rename the folder', `that folder does not exist for ${ownerLabel}`);
    return mapAdminMediaFolder(data as unknown as Record<string, unknown>);
  }

  const scopedUpdate = supabase.from('media_folders').update({ name: folder }).eq('name', oldName);
  const { data, error } = await (vendorId === null
    ? scopedUpdate.is('vendor_id', null)
    : scopedUpdate.eq('vendor_id', vendorId)
  )
    .select('*')
    .maybeSingle();
  if (error) throw rpcFailed('Could not rename the folder', error.message);
  if (!data) throw rpcFailed('Could not rename the folder', `that folder does not exist for ${ownerLabel}`);

  const relabel = supabase.from('media_items').update({ folder }).eq('folder', oldName);
  const { error: relabelError } = await (vendorId === null
    ? relabel.is('vendor_id', null)
    : relabel.eq('vendor_id', vendorId));
  if (relabelError) {
    throw rpcFailed(
      'Could not rename the folder',
      `the folder row was renamed but its files could not be relabelled: ${relabelError.message}`,
    );
  }

  return mapAdminMediaFolder(data as unknown as Record<string, unknown>);
}

/** Refuses while files still sit in the folder: deleting it would orphan their label. */
export async function deleteAdminMediaFolder(vendorId: string | null, name: string): Promise<void> {
  await requireAdmin('delete a media folder');

  const itemCount = supabase
    .from('media_items')
    .select('*', { count: 'exact', head: true })
    .eq('folder', name);
  const { count, error: countError } = await (vendorId === null
    ? itemCount.is('vendor_id', null)
    : itemCount.eq('vendor_id', vendorId));
  if (countError) throw rpcFailed('Could not delete the folder', countError.message);
  if ((count ?? 0) > 0) {
    throw rpcFailed(
      'Could not delete the folder',
      `this folder still holds ${count} file${count === 1 ? '' : 's'} - move or delete them first`,
    );
  }

  const folderDelete = supabase.from('media_folders').delete().eq('name', name);
  const { error } = await (vendorId === null
    ? folderDelete.is('vendor_id', null)
    : folderDelete.eq('vendor_id', vendorId));
  if (error) throw rpcFailed('Could not delete the folder', error.message);
}
