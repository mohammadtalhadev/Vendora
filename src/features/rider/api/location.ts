import { supabase } from '../../../lib/supabase';
import { asRows, rpcFailed, text } from './rider-client';

/**
 * Live rider location (Batch 42).
 *
 * Writes go through `update_rider_location`, which resolves the rider from the
 * session and refuses a delivery that is not theirs or not on the road. Reads
 * for the customer side go through `get_order_delivery_live`: customers hold
 * no `deliveries` read policy at all, so a direct table read would silently
 * return nothing - the RPC answers for one order the caller owns, is staff
 * on, or is riding, and returns no rows for anyone else.
 */

const nullableNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const nullableText = (value: unknown): string | null =>
  value === null || value === undefined || value === '' ? null : text(value);

export async function updateRiderLocation(
  deliveryId: string,
  fix: { lat: number; lng: number; accuracyM?: number | null },
): Promise<void> {
  const { error } = await supabase.rpc('update_rider_location', {
    p_delivery_id: deliveryId,
    p_lat: fix.lat,
    p_lng: fix.lng,
    p_accuracy: fix.accuracyM ?? null,
  });
  if (error) throw rpcFailed('Could not share your location', error.message);
}

/** One delivery on an order, with its live position and proof as Postgres holds them. */
export interface OrderDeliveryLive {
  deliveryId: string;
  subOrderId: string;
  /** `deliveries.status` - the delivery enum, not the package state machine. */
  status: string;
  riderFirstName: string | null;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  locationUpdatedAt: string | null;
  /** Storage path inside the private `delivery-proofs` bucket, once a photo is attached. */
  proofPhotoUrl: string | null;
}

export async function fetchOrderDeliveryLive(
  orderId: string,
  signal?: AbortSignal,
): Promise<OrderDeliveryLive[]> {
  let query = supabase.rpc('get_order_delivery_live', { p_order_id: orderId });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw rpcFailed('Could not read live delivery tracking', error.message);
  return asRows(data).map((row) => ({
    deliveryId: text(row.deliveryId),
    subOrderId: text(row.subOrderId),
    status: text(row.status),
    riderFirstName: nullableText(row.riderFirstName),
    lat: nullableNum(row.lat),
    lng: nullableNum(row.lng),
    accuracyM: nullableNum(row.accuracyM),
    locationUpdatedAt: nullableText(row.locationUpdatedAt),
    proofPhotoUrl: nullableText(row.proofPhotoUrl),
  }));
}

/**
 * The send throttle for a live share: a fix is worth an RPC when it is the
 * first one, when ten seconds have passed, or when the rider has moved at
 * least ~25 metres - whichever comes first. Anything tighter is battery and
 * database spent on a dot that has not visibly moved.
 */
export class LocationSendThrottle {
  private lastSentAt = 0;
  private lastLat: number | null = null;
  private lastLng: number | null = null;

  shouldSend(fix: { lat: number; lng: number }, nowMs: number): boolean {
    if (this.lastLat === null || this.lastLng === null) return true;
    if (nowMs - this.lastSentAt >= 10_000) return true;
    return LocationSendThrottle.distanceM(this.lastLat, this.lastLng, fix.lat, fix.lng) >= 25;
  }

  record(fix: { lat: number; lng: number }, nowMs: number): void {
    this.lastSentAt = nowMs;
    this.lastLat = fix.lat;
    this.lastLng = fix.lng;
  }

  static distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

/** OpenStreetMap embed around a fix - no API key, no tile account. */
export function osmEmbedUrl(lat: number, lng: number): string {
  const pad = 0.01;
  const bbox = [lng - pad, lat - pad, lng + pad, lat + pad].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/** "just now", "2 min ago", "1 h ago" - freshness a buyer can judge at a glance. */
export function freshnessLabel(iso: string | null, now = new Date()): string {
  if (!iso) return 'not shared yet';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'not shared yet';
  const seconds = Math.max(0, Math.floor((now.getTime() - then) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/**
 * Photo proof (Batch 42): the file lands in the private `delivery-proofs`
 * bucket under the delivery's own folder - the storage policy checks that
 * folder against the caller's assigned deliveries - and the row is stamped
 * through `set_delivery_proof_photo`, never a direct table write.
 */
export async function uploadDeliveryProof(deliveryId: string, file: File): Promise<string> {
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : undefined;
  const safeExtension = extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'jpg';
  const path = `${deliveryId}/${Date.now()}.${safeExtension}`;
  const { error: uploadError } = await supabase.storage
    .from('delivery-proofs')
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
  if (uploadError) throw rpcFailed('Could not upload the photo', uploadError.message);

  const { error } = await supabase.rpc('set_delivery_proof_photo', {
    p_delivery_id: deliveryId,
    p_photo_url: path,
  });
  if (error) throw rpcFailed('Could not attach the photo to this delivery', error.message);
  return path;
}

/**
 * A short-lived signed URL for a proof photo. The bucket is private, so the
 * read rides the caller's own storage policy (the order's customer, staff, or
 * the rider who took it). Returns null when no URL can be minted - the page
 * then says the photo exists but cannot be shown, rather than faking an image.
 */
export async function fetchProofPhotoSignedUrl(path: string): Promise<string | null> {
  const bucket = supabase.storage.from('delivery-proofs');
  if (typeof bucket.createSignedUrl !== 'function') return null;
  const { data, error } = await bucket.createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
