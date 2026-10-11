import { supabase } from '../../../lib/supabase';
import type { ProductType, ModerationStatus } from '../../../types/domain';
import {
  asRecord,
  asRows,
  json,
  num,
  rpcFailed,
  text,
} from './admin-client';

/** A listing in the moderation queue, with the seller who submitted it. */
export interface ModerationRow {
  id: string;
  title: string;
  slug: string;
  brand: string;
  price: number;
  stock: number;
  type: ProductType;
  status: ModerationStatus;
  images: string[];
  rejectionReason: string | null;
  createdAt: string;
  moderatedAt: string | null;
  moderatedBy: string | null;
  sellerId: string;
  storeName: string;
  sellerStatus: string;
  category: string | null;
  /** A resubmission after a rejection, which is what puts it back in front of a human. */
  flagged: boolean;
}

export interface ModerationQueue {
  page: number;
  pageSize: number;
  total: number;
  counts: Record<'pendingReview' | 'approved' | 'rejected' | 'draft' | 'archived', number>;
  rows: ModerationRow[];
}

const STATUSES: ModerationStatus[] = ['draft', 'pending_review', 'approved', 'rejected', 'archived'];

function mapRow(row: Record<string, unknown>): ModerationRow {
  const status = text(row.status) as ModerationStatus;
  return {
    id: text(row.id),
    title: text(row.title),
    slug: text(row.slug),
    brand: text(row.brand),
    price: num(row.price),
    stock: num(row.stock),
    type: row.type === 'digital' ? 'digital' : 'physical',
    status: STATUSES.includes(status) ? status : 'pending_review',
    images: Array.isArray(row.images) ? row.images.map(text) : [],
    rejectionReason:
      row.rejectionReason === null || row.rejectionReason === undefined
        ? null
        : text(row.rejectionReason),
    createdAt: text(row.createdAt),
    moderatedAt: row.moderatedAt ? text(row.moderatedAt) : null,
    moderatedBy: row.moderatedBy ? text(row.moderatedBy) : null,
    sellerId: text(row.sellerId),
    storeName: text(row.storeName),
    sellerStatus: text(row.sellerStatus),
    category: row.category === null || row.category === undefined ? null : text(row.category),
    flagged: row.flagged === true,
  };
}

function mapQueue(value: unknown): ModerationQueue {
  const root = asRecord(value);
  const counts = asRecord(root.counts);
  return {
    page: num(root.page),
    pageSize: num(root.pageSize),
    total: num(root.total),
    counts: {
      pendingReview: num(counts.pendingReview),
      approved: num(counts.approved),
      rejected: num(counts.rejected),
      draft: num(counts.draft),
      archived: num(counts.archived),
    },
    rows: asRows(root.rows).map(mapRow),
  };
}

export async function fetchModerationQueue(
  params: { status?: string; search?: string; categoryId?: string | null; page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<ModerationQueue> {
  let query = supabase.rpc('admin_moderation_queue', {
    p_status: params.status ?? 'pending_review',
    p_search: params.search ?? '',
    p_category: params.categoryId ?? null,
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 12,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the moderation queue', error.message);
  return mapQueue(data);
}

/**
 * Approve, reject, archive or return listings to review. The RPC skips rows already at
 * the requested state and reports how many it actually decided, so a batch of twenty
 * that only changed three says three.
 */
export async function moderateProducts(
  productIds: string[],
  status: 'approved' | 'rejected' | 'archived' | 'pending_review',
  reason?: string,
): Promise<{ decided: number; ids: string[] }> {
  const { data, error } = await supabase.rpc('admin_moderate_products', {
    p_product_ids: productIds,
    p_status: status,
    p_reason: reason ?? null,
  });
  if (error) throw rpcFailed('Could not record that decision', error.message);
  const root = asRecord(data);
  return { decided: num(root.decided), ids: Array.isArray(root.ids) ? root.ids.map(text) : [] };
}

export async function assignModerator(
  productId: string,
  moderatorId: string,
): Promise<{ id: string; moderatorId: string }> {
  const { data, error } = await supabase.rpc('admin_assign_moderator', {
    p_product_id: productId,
    p_moderator_id: moderatorId,
  });
  if (error) throw rpcFailed('Could not assign that listing', error.message);
  const root = asRecord(data);
  return { id: text(root.id), moderatorId: text(root.moderatorId) };
}

export interface FirstPartyDraft {
  title: string;
  slug?: string;
  description?: string;
  categoryId?: string | null;
  brand?: string;
  images?: string[];
  price: number;
  compareAtPrice?: number | null;
  type?: ProductType;
  variants?: unknown[];
  stock?: number;
  status?: 'draft' | 'pending_review' | 'approved';
}

/**
 * A "Sold by Vendora" listing is written by the platform's own store, which the RPC
 * looks up rather than trusting the caller to name.
 */
export async function createFirstPartyProduct(draft: FirstPartyDraft): Promise<{ id: string; status: string; sellerId: string }> {
  const { data, error } = await supabase.rpc('admin_create_product_1p', {
    p_input: json({
      title: draft.title,
      slug: draft.slug ?? null,
      description: draft.description ?? '',
      categoryId: draft.categoryId ?? null,
      brand: draft.brand ?? '',
      images: draft.images ?? [],
      price: draft.price,
      compareAtPrice: draft.compareAtPrice ?? null,
      type: draft.type ?? 'physical',
      variants: draft.variants ?? [],
      stock: draft.stock ?? 0,
      status: draft.status ?? 'pending_review',
    }),
  });
  if (error) throw rpcFailed('Could not publish the listing', error.message);
  const root = asRecord(data);
  return { id: text(root.id), status: text(root.status), sellerId: text(root.sellerId) };
}
