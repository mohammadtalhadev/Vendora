import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchAdminReviewQueue, setReviewHidden } from './admin-reviews';
import { fetchProductReviews } from './reviews';
import { productRow, reviewRow, storeRow, supabaseDouble } from '../../../test/supabase-double';

const VENDOR = 'store-1';
const PRODUCT = '00000000-0000-4000-8000-000000000101';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
  supabaseDouble.seedVendorProfile(storeRow({ id: VENDOR, store_name: 'Nova Tech', slug: 'nova-tech' }));
  supabaseDouble.seedProduct(productRow({ id: PRODUCT, title: 'Reference Headphones', slug: 'reference-headphones', seller_id: VENDOR }));
});

describe('fetchAdminReviewQueue', () => {
  it('maps rows with their product, store and visibility, plus platform counts', async () => {
    supabaseDouble.seedReview(reviewRow({ id: 'r1', product_id: PRODUCT, rating: 5, seller_reply: { author: 'Merchant Response', timeAgo: '1d', body: 'Thanks!' } }));
    supabaseDouble.seedReview(reviewRow({ id: 'r2', product_id: PRODUCT, rating: 1, hidden: true, moderation_note: 'Abusive language' }));

    const queue = await fetchAdminReviewQueue({});

    expect(queue.counts).toEqual({ total: 2, visible: 1, hidden: 1 });
    expect(queue.total).toBe(2);
    const hidden = queue.rows.find((row) => row.id === 'r2');
    expect(hidden).toMatchObject({
      productTitle: 'Reference Headphones',
      productSlug: 'reference-headphones',
      storeName: 'Nova Tech',
      hidden: true,
      moderationNote: 'Abusive language',
      hasSellerReply: false,
    });
    expect(queue.rows.find((row) => row.id === 'r1')?.hasSellerReply).toBe(true);
  });

  it('filters by visibility and searches product, author and text', async () => {
    supabaseDouble.seedReview(reviewRow({ id: 'r1', product_id: PRODUCT, headline: 'Excellent' }));
    supabaseDouble.seedReview(reviewRow({ id: 'r2', product_id: PRODUCT, headline: 'Broken on arrival', hidden: true }));

    const hiddenOnly = await fetchAdminReviewQueue({ status: 'hidden' });
    expect(hiddenOnly.rows.map((row) => row.id)).toEqual(['r2']);
    expect(hiddenOnly.counts).toEqual({ total: 2, visible: 1, hidden: 1 });

    const byProduct = await fetchAdminReviewQueue({ search: 'headphones' });
    expect(byProduct.rows).toHaveLength(2);

    const byHeadline = await fetchAdminReviewQueue({ search: 'broken' });
    expect(byHeadline.rows.map((row) => row.id)).toEqual(['r2']);
  });
});

describe('setReviewHidden', () => {
  it('hides a review through the RPC, stores the note, and audits the change', async () => {
    supabaseDouble.seedReview(reviewRow({ id: 'r1', product_id: PRODUCT }));

    const result = await setReviewHidden('r1', true, 'Abusive language');

    expect(result).toEqual({ id: 'r1', hidden: true });
    expect(supabaseDouble.rpcCalls).toContainEqual({
      fn: 'admin_set_review_hidden',
      args: { p_review_id: 'r1', p_hidden: true, p_note: 'Abusive language' },
    });
    expect(supabaseDouble.tables.reviews[0]).toMatchObject({ hidden: true, moderation_note: 'Abusive language' });
    expect(supabaseDouble.tables.audit_logs.some((row) => row.action === 'review.hidden')).toBe(true);
  });

  it('restores a hidden review', async () => {
    supabaseDouble.seedReview(reviewRow({ id: 'r1', product_id: PRODUCT, hidden: true, moderation_note: 'Spam' }));

    const result = await setReviewHidden('r1', false);

    expect(result).toEqual({ id: 'r1', hidden: false });
    expect(supabaseDouble.tables.reviews[0].hidden).toBe(false);
  });

  it('surfaces a missing review instead of pretending it was moderated', async () => {
    await expect(setReviewHidden('nope', true)).rejects.toThrow('Could not hide that review: Review not found');
  });
});

describe('public reads after moderation', () => {
  it('fetchProductReviews never surfaces a hidden review', async () => {
    supabaseDouble.seedReview(reviewRow({ id: 'r1', product_id: PRODUCT, rating: 5 }));
    supabaseDouble.seedReview(reviewRow({ id: 'r2', product_id: PRODUCT, rating: 1, hidden: true }));

    const { reviews: list, breakdown } = await fetchProductReviews(PRODUCT);

    expect(list.map((review) => review.id)).toEqual(['r1']);
    expect(breakdown.total).toBe(1);
  });
});
