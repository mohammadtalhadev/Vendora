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
 */

/** The bucket every store's files live in; the vendor API uses the same name. */
const BUCKET = 'vendor-assets';

export interface AdminMediaItem extends VendorMediaItem {
  vendorId: string;
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
  const vendorId = text(row.vendor_id);
  const store = stores.get(vendorId);
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
  if (!item.storeSlug) {
    throw rpcFailed('Could not move the asset', 'the owning store could not be resolved, so the stored path cannot be rebuilt');
  }
  const fileName = text(item.objectPath.split('/').pop());
  if (!fileName) {
    throw rpcFailed('Could not move the asset', 'the asset has no stored object path to move');
  }

  const nextPath = `${item.storeSlug}/${folder}/${fileName}`;
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
// Folders: real `media_folders` rows since Batch 61, one per (store, name).
// ---------------------------------------------------------------------------

export interface AdminMediaFolder {
  id: string;
  vendorId: string;
  name: string;
  createdAt: string;
}

function mapAdminMediaFolder(row: Record<string, unknown>): AdminMediaFolder {
  return {
    id: text(row.id),
    vendorId: text(row.vendor_id),
    name: text(row.name),
    createdAt: text(row.created_at),
  };
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

export async function createAdminMediaFolder(vendorId: string, name: string): Promise<AdminMediaFolder> {
  await requireAdmin('create a media folder');

  const folder = cleanFolderName(name);
  if (!vendorId) throw rpcFailed('Could not create the folder', 'choose the store the folder belongs to');
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
  vendorId: string,
  oldName: string,
  newName: string,
): Promise<AdminMediaFolder> {
  await requireAdmin('rename a media folder');

  const folder = cleanFolderName(newName);
  if (!folder) {
    throw rpcFailed('Could not rename the folder', 'give the folder a name of letters, numbers, dashes or underscores');
  }
  if (folder === oldName) {
    const { data } = await supabase
      .from('media_folders')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('name', oldName)
      .maybeSingle();
    if (!data) throw rpcFailed('Could not rename the folder', 'that folder does not exist for this store');
    return mapAdminMediaFolder(data as unknown as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from('media_folders')
    .update({ name: folder })
    .eq('vendor_id', vendorId)
    .eq('name', oldName)
    .select('*')
    .maybeSingle();
  if (error) throw rpcFailed('Could not rename the folder', error.message);
  if (!data) throw rpcFailed('Could not rename the folder', 'that folder does not exist for this store');

  const { error: relabelError } = await supabase
    .from('media_items')
    .update({ folder })
    .eq('vendor_id', vendorId)
    .eq('folder', oldName);
  if (relabelError) {
    throw rpcFailed(
      'Could not rename the folder',
      `the folder row was renamed but its files could not be relabelled: ${relabelError.message}`,
    );
  }

  return mapAdminMediaFolder(data as unknown as Record<string, unknown>);
}

/** Refuses while files still sit in the folder: deleting it would orphan their label. */
export async function deleteAdminMediaFolder(vendorId: string, name: string): Promise<void> {
  await requireAdmin('delete a media folder');

  const { count, error: countError } = await supabase
    .from('media_items')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', vendorId)
    .eq('folder', name);
  if (countError) throw rpcFailed('Could not delete the folder', countError.message);
  if ((count ?? 0) > 0) {
    throw rpcFailed(
      'Could not delete the folder',
      `this folder still holds ${count} file${count === 1 ? '' : 's'} - move or delete them first`,
    );
  }

  const { error } = await supabase
    .from('media_folders')
    .delete()
    .eq('vendor_id', vendorId)
    .eq('name', name);
  if (error) throw rpcFailed('Could not delete the folder', error.message);
}
