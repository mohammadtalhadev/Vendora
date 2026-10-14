import { supabase } from '../../../lib/supabase';
import { num, rpcFailed, text } from './admin-client';
import type { VendorMediaItem } from '../../vendor/api/media';

/**
 * The platform-wide media library. The vendor workspace reads `media_items`
 * through `current_vendor_id()`, which is the wrong question for staff: the
 * table's select policy (`media_select_owner`) already admits an admin to
 * every store's rows, so this read simply does not filter by owner, and joins
 * each row back to the store that owns it.
 *
 * The one write staff hold over another store's assets is the moderation
 * verdict - `media_moderate_admin` permits an admin update - so that is the
 * only write here. Row deletion stays owner-only in the table policy
 * (`media_delete_owner`), even though the storage policy would let staff
 * remove the object: deleting the object while its row survives would strand
 * the record, so no delete is offered until a policy grants the row too.
 */

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

  const row = data as unknown as Record<string, unknown>;
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
