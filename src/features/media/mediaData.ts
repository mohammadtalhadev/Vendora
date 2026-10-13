import {
  FileArchive,
  FileText,
  Film,
  Image as ImageIcon,
  type LucideIcon,
} from 'lucide-react';
import type { VendorMediaItem } from '../vendor/api/media';

/**
 * Presentation helpers for the media console. This file holds no assets: every row the
 * console renders comes from `src/features/vendor/api/media.ts`, which reads the
 * `media_items` table and the `vendor-assets` storage bucket.
 *
 * A row's real columns are `id, vendor_id, name, folder, object_path, cdn_url, mime_type,
 * size_bytes, width, height, status, created_at`. Nothing outside those columns is shown
 * as if it were stored, which is why the seed arrays, the invented folder tree, the vendor
 * tiers and the CDN/quota figures that used to live here are gone.
 */

export type MediaKind = 'image' | 'document' | 'video' | 'archive' | 'other';
export type MediaKindFilter = 'all' | MediaKind;
export type DateFilter = 'all' | '7d' | '30d';
export type MediaLayout = 'grid' | 'list';

export const MEDIA_PAGE_SIZE = 8;

export const KIND_FILTERS: ReadonlyArray<{ value: MediaKindFilter; label: string }> = [
  { value: 'all', label: 'All file types' },
  { value: 'image', label: 'Images' },
  { value: 'document', label: 'Documents' },
  { value: 'video', label: 'Video' },
  { value: 'archive', label: 'Archives' },
];

export const DATE_FILTERS: ReadonlyArray<{ value: DateFilter; label: string }> = [
  { value: 'all', label: 'Any date' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const DATE_WINDOW_DAYS: Record<Exclude<DateFilter, 'all'>, number> = { '7d': 7, '30d': 30 };

/** `null` for "any date", so the caller filters on the real `created_at` column. */
export function dateWindowOf(filter: DateFilter): number | null {
  return filter === 'all' ? null : DATE_WINDOW_DAYS[filter];
}

/** The kind is read off the row's own `mime_type`; nothing is guessed from the file name. */
export function mediaKindOf(mimeType: string): MediaKind {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('compressed')) return 'archive';
  if (mime === 'application/pdf' || mime.startsWith('text/')) return 'document';
  return 'other';
}

export const FILE_KIND_ICONS: Record<MediaKind, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  document: FileText,
  archive: FileArchive,
  other: FileText,
};

/** `image/webp` -> `WEBP`, `application/pdf` -> `PDF`: the subtype the row actually carries. */
export function formatOf(mimeType: string): string {
  const subtype = mimeType.split('/')[1];
  if (!subtype) return 'FILE';
  const cleaned = subtype.split(';')[0].split('+')[0].trim();
  return cleaned ? cleaned.toUpperCase() : 'FILE';
}

/** Bytes are the stored unit (`size_bytes`); this only formats it. */
export function formatBytes(bytes: number): string {
  const size = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'] as const;
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

/** Dimensions are only ever what the row recorded; an unrecorded pair says so. */
export function dimensionLabel(item: VendorMediaItem): string {
  return item.width && item.height ? `${item.width} × ${item.height} px` : 'Not recorded';
}

export function folderLabel(folder: string): string {
  return folder.trim() ? folder : 'root';
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export function withinDays(iso: string, days: number): boolean {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
}

export function matchesQuery(item: VendorMediaItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.name.toLowerCase().includes(q) ||
    item.folder.toLowerCase().includes(q) ||
    item.mimeType.toLowerCase().includes(q) ||
    item.cdnUrl.toLowerCase().includes(q)
  );
}

/**
 * `media_items.folder` is a plain text column, not a table, so a folder is only ever a
 * label on a row. This is the path-safe shape the API layer writes; it stops a typed name
 * from producing an object path the bucket policy would reject.
 */
export function cleanFolderName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const STATUS_LABEL: Record<VendorMediaItem['status'], string> = {
  approved: 'Approved',
  pending: 'Awaiting review',
  flagged: 'Flagged',
};

export const STATUS_STYLE: Record<VendorMediaItem['status'], string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  flagged: 'bg-rose-50 text-rose-700 border-rose-200',
};

/**
 * True when the URL points at our own `vendor-assets` bucket. A demo row pointing elsewhere
 * has no object in the bucket, which is why it can be renamed but not moved.
 */
export function isStoredObject(url: string): boolean {
  return url.includes('/vendor-assets/');
}
