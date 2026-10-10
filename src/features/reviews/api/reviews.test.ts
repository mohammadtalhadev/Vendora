import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as reviews from './reviews';
import { productRow, reviewRow, storeRow, supabaseDouble } from '../../../test/supabase-double';

const USER = 'user-1';
const HEADPHONES = '00000000-0000-4000-8000-000000000101';
const EARBUDS = '00000000-0000-4000-8000-000000000102';
const VENDOR = 'store-1';
const OTHER_VENDOR = 'store-2';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.authState.session = { access_token: 't', user: { id: USER, email: 'buyer@demo.test' } };
  supabaseDouble.seedVendorProfile(storeRow({ id: VENDOR, store_name: 'Nova Tech', slug: 'nova-tech' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: OTHER_VENDOR, store_name: 'Other Shop', slug: 'other-shop' }));
  supabaseDouble.seedProduct(productRow({ id: HEADPHONES, title: 'Reference Headphones', slug: 'reference-headphones', seller_id: VENDOR }));
  supabaseDouble.seedProduct(productRow({ id: EARBUDS, title: 'Budget Earbuds', slug: 'budget-earbuds', seller_id: VENDOR }));
  supabaseDouble.seedProduct(productRow({ id: '00000000-0000-4000-8000-000000000104', title: 'Other Shop Lamp', slug: 'other-lamp', seller_id: OTHER_VENDOR }));
  supabaseDouble.seedProfile({ id: USER, email: 'buyer@demo.test', name: 'Alex Buyer', avatar_url: 'https://example.test/alex.png' });
});

describe('fetchProductReviews', () => {
  it('maps rows and rolls up the spread of the ratings actually stored', async () => {
    supabaseDouble.seedReview(reviewRow({ id: 'r1', product_id: HEADPHONES, rating: 5, verified_purchase: true, helpful_count: 4, created_at: '2026-10-08T00:00:00.000Z' }));
    supabaseDouble.seedReview(reviewRow({ id: 'r2', product_id: HEADPHONES, rating: 3, verified_purchase: false, helpful_count: 9, created_at: '2026-10-07T00:00:00.000Z' }));
    supabaseDouble.seedReview(reviewRow({ id: 'r3', product_id: EARBUDS, rating: 1 }));

    const { reviews: list, breakdown } = await reviews.fetchProductReviews(HEADPHONES);

    expect(list.map((review) => review.id)).toEqual(['r1', 'r2']);
    expect(list[0]).toMatchObject({
      authorName: 'Alex Buyer',
      initials: 'AB',
      headline: 'Excellent',
      verifiedPurchase: true,
      orderNumber: null,
      sellerReply: null,
    });
    expect(breakdown).toEqual({
      average: 4,
      total: 2,
      verifiedShare: 0.5,
      counts: { 5: 1, 4: 0, 3: 1, 2: 0, 1: 0 },
    });
  });

  it('re-orders by the requested sort key', async () => {
    supabaseDouble.seedReview(reviewRow({ id: 'r1', product_id: HEADPHONES, rating: 5, helpful_count: 1, created_at: '2026-10-08T00:00:00.000Z' }));
    supabaseDouble.seedReview(reviewRow({ id: 'r2', product_id: HEADPHONES, rating: 2, helpful_count: 12, created_at: '2026-10-07T00:00:00.000Z' }));

    const { reviews: helpful } = await reviews.fetchProductReviews(HEADPHONES, 'helpful');
    expect(helpful.map((review) => review.id)).toEqual(['r2', 'r1']);

    const { reviews: lowest } = await reviews.fetchProductReviews(HEADPHONES, 'lowest');
    expect(lowest.map((review) => review.id)).toEqual(['r2', 'r1']);
  });

  it('reports an empty product honestly rather than inventing a rating', async () => {
    const { reviews: list, breakdown } = await reviews.fetchProductReviews(HEADPHONES);

    expect(list).toEqual([]);
    expect(breakdown).toEqual({ average: 0, total: 0, verifiedShare: 0, counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  });

  it('surfaces a failed read', async () => {
    supabaseDouble.failures.reviews = 'connection terminated';

    await expect(reviews.fetchProductReviews(HEADPHONES)).rejects.toThrow('Failed to load reviews: connection terminated');
  });
});

describe('submitReview', () => {
  it('authors the review from the profile row and leaves the trust flag to the database', async () => {
    const created = await reviews.submitReview({
      productId: HEADPHONES,
      rating: 4,
      headline: 'Good value',
      body: 'Solid sound for the price.',
    });

    const stored = supabaseDouble.tables.reviews[0];
    expect(stored).toMatchObject({
      product_id: HEADPHONES,
      author_id: USER,
      author_name: 'Alex Buyer',
      author_avatar: 'https://example.test/alex.png',
      rating: 4,
      headline: 'Good value',
    });
    // verified_purchase is derived by flag_verified_purchase(); the client must not send it.
    expect('verified_purchase' in stored).toBe(false);
    expect(created.authorName).toBe('Alex Buyer');
  });

  it('refuses a review without a session', async () => {
    supabaseDouble.authState.session = null;

    await expect(
      reviews.submitReview({ productId: HEADPHONES, rating: 4, headline: 'Good', body: 'Works well.' }),
    ).rejects.toThrow('Sign in to review this product.');
  });

  it('refuses a product id that cannot exist in the database', async () => {
    await expect(
      reviews.submitReview({ productId: 'cat-legacy-1', rating: 4, headline: 'Good', body: 'Works well.' }),
    ).rejects.toThrow('This product cannot be reviewed yet.');
  });

  it('turns the unique index into a message the customer can act on', async () => {
    supabaseDouble.seedReview(reviewRow({ product_id: HEADPHONES, author_id: USER }));

    await expect(
      reviews.submitReview({ productId: HEADPHONES, rating: 4, headline: 'Again', body: 'Still good.' }),
    ).rejects.toThrow('You have already reviewed this product. Edit your existing review instead.');
  });
});

describe('replyToReview', () => {
  it('posts through the guarded RPC rather than writing the row from the browser', async () => {
    supabaseDouble.seedReview(reviewRow({ id: 'r1', product_id: HEADPHONES }));

    await reviews.replyToReview('r1', 'Thanks for the feedback.');

    expect(supabaseDouble.rpcCalls).toEqual([
      { fn: 'reply_to_review', args: { p_review_id: 'r1', p_reply: 'Thanks for the feedback.' } },
    ]);
    expect(supabaseDouble.tables.reviews[0].seller_reply).toMatchObject({ body: 'Thanks for the feedback.' });
  });

  it('explains a review that belongs to another store', async () => {
    supabaseDouble.failRpc('Review does not belong to your store');

    await expect(reviews.replyToReview('r1', 'Thanks!')).rejects.toThrow('That review belongs to another store.');
  });
});

describe('fetchVendorReviews', () => {
  it('scopes reviews to the store’s own products and names them', async () => {
    supabaseDouble.seedReview(reviewRow({ id: 'r1', product_id: HEADPHONES }));
    supabaseDouble.seedReview(reviewRow({ id: 'r2', product_id: '00000000-0000-4000-8000-000000000104' }));

    const list = await reviews.fetchVendorReviews(VENDOR);

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      review: { id: 'r1' },
      productTitle: 'Reference Headphones',
      productSlug: 'reference-headphones',
    });
  });

  it('returns nothing for a store with no products instead of reading every review', async () => {
    supabaseDouble.seedReview(reviewRow({ id: 'r1', product_id: HEADPHONES }));

    const list = await reviews.fetchVendorReviews('store-empty');

    expect(list).toEqual([]);
  });
});
