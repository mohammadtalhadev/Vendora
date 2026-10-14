import { supabase } from '../../../lib/supabase';

/**
 * The admin review-moderation queue (Admin → Reviews).
 *
 * Reads and writes both go through Postgres: `admin_review_queue` pages the
 * platform's reviews with the visibility counts, and `admin_set_review_hidden`
 * is the audited governance write behind Hide / Restore. The database refuses
 * both for non-admins, so nothing here falls back to a local copy.
 */

export type AdminReviewStatusFilter = 'all' | 'visible' | 'hidden';

export interface AdminReviewRow {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  storeName: string | null;
  authorId: string | null;
  authorName: string;
  rating: number;
  headline: string;
  body: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  hasSellerReply: boolean;
  hidden: boolean;
  moderationNote: string | null;
  createdAt: string;
}

export interface AdminReviewQueue {
  page: number;
  pageSize: number;
  total: number;
  counts: Record<'total' | 'visible' | 'hidden', number>;
  rows: AdminReviewRow[];
}

const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function mapRow(row: Record<string, unknown>): AdminReviewRow {
  return {
    id: text(row.id),
    productId: text(row.productId),
    productTitle: text(row.productTitle),
    productSlug: text(row.productSlug),
    storeName:
      row.storeName === null || row.storeName === undefined ? null : text(row.storeName),
    authorId: row.authorId === null || row.authorId === undefined ? null : text(row.authorId),
    authorName: text(row.authorName),
    rating: num(row.rating),
    headline: text(row.headline),
    body: text(row.body),
    verifiedPurchase: row.verifiedPurchase === true,
    helpfulCount: num(row.helpfulCount),
    hasSellerReply: row.hasSellerReply === true,
    hidden: row.hidden === true,
    moderationNote:
      row.moderationNote === null || row.moderationNote === undefined
        ? null
        : text(row.moderationNote),
    createdAt: text(row.createdAt),
  };
}

export async function fetchAdminReviewQueue(
  params: {
    status?: AdminReviewStatusFilter;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
  signal?: AbortSignal,
): Promise<AdminReviewQueue> {
  let query = supabase.rpc('admin_review_queue', {
    p_status: params.status ?? 'all',
    p_search: params.search ?? '',
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 20,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load the review queue: ${error.message}`);

  const root = asRecord(data);
  const counts = asRecord(root.counts);
  return {
    page: num(root.page),
    pageSize: num(root.pageSize),
    total: num(root.total),
    counts: {
      total: num(counts.total),
      visible: num(counts.visible),
      hidden: num(counts.hidden),
    },
    rows: Array.isArray(root.rows) ? root.rows.map((row) => mapRow(asRecord(row))) : [],
  };
}

/**
 * Hide or restore one review. The rating rollup triggers fire on the update,
 * so the product and vendor aggregates follow without a client-side patch.
 */
export async function setReviewHidden(
  reviewId: string,
  hidden: boolean,
  note?: string | null,
): Promise<{ id: string; hidden: boolean }> {
  const { data, error } = await supabase.rpc('admin_set_review_hidden', {
    p_review_id: reviewId,
    p_hidden: hidden,
    p_note: note ?? null,
  });
  if (error) {
    throw new Error(
      `${hidden ? 'Could not hide' : 'Could not restore'} that review: ${error.message}`,
    );
  }
  const root = asRecord(data);
  return { id: text(root.id), hidden: root.hidden === true };
}
