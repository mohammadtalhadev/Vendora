import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import type { ProductReview, RatingBreakdown, ReviewSort } from '../types';

type ReviewRow = Database['public']['Tables']['reviews']['Row'];

const REVIEW_SELECT =
  'id, product_id, author_id, author_name, author_avatar, author_country, verified_purchase, ' +
  'order_number, rating, headline, body, photos, helpful_count, seller_reply, created_at';

/** How many reviews one product page aggregates; the rollup needs the whole set. */
const REVIEWS_PER_PRODUCT = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toReview(row: ReviewRow): ProductReview {
  const name = row.author_name?.trim() || 'Verified Buyer';
  return {
    id: row.id,
    productId: row.product_id,
    authorName: name,
    authorAvatar: row.author_avatar || null,
    authorCountry: row.author_country || null,
    initials: name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    rating: Number(row.rating),
    headline: row.headline,
    body: row.body,
    photos: row.photos ?? [],
    helpfulCount: row.helpful_count,
    verifiedPurchase: row.verified_purchase,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    sellerReply: row.seller_reply as ProductReview['sellerReply'],
  };
}

const emptyBreakdown = (): RatingBreakdown => ({
  average: 0,
  total: 0,
  verifiedShare: 0,
  counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
});

/** Star spread of the reviews actually on the page - no invented percentages. */
function breakdownOf(reviews: ProductReview[]): RatingBreakdown {
  if (reviews.length === 0) return emptyBreakdown();
  const counts: RatingBreakdown['counts'] = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  let verified = 0;
  for (const review of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    counts[star] += 1;
    sum += review.rating;
    if (review.verifiedPurchase) verified += 1;
  }
  return {
    average: sum / reviews.length,
    total: reviews.length,
    verifiedShare: verified / reviews.length,
    counts,
  };
}

const SORTS: Record<ReviewSort, { column: string; ascending: boolean }> = {
  recent: { column: 'created_at', ascending: false },
  helpful: { column: 'helpful_count', ascending: false },
  highest: { column: 'rating', ascending: false },
  lowest: { column: 'rating', ascending: true },
};

export interface ProductReviewsResult {
  reviews: ProductReview[];
  breakdown: RatingBreakdown;
}

/** Everything the storefront shows for one product; reviews are public under RLS. */
export async function fetchProductReviews(
  productId: string,
  sort: ReviewSort = 'recent',
  signal?: AbortSignal,
): Promise<ProductReviewsResult> {
  const { column, ascending } = SORTS[sort];

  let query = supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('product_id', productId)
    .order(column, { ascending })
    .order('created_at', { ascending: false })
    .limit(REVIEWS_PER_PRODUCT);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  const reviews = (data ?? []).map((row) => toReview(row as unknown as ReviewRow));
  return { reviews, breakdown: breakdownOf(reviews) };
}

/** A review the signed-in customer wrote, with the product it belongs to. */
export interface MyReview extends ProductReview {
  productTitle: string;
  productSlug: string;
  productImage: string | null;
}

/** The signed-in customer's own reviews, newest first (Account → My Reviews). */
export async function fetchMyReviews(signal?: AbortSignal): Promise<MyReview[]> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sign in to see your reviews.');

  let query = supabase
    .from('reviews')
    .select(`${REVIEW_SELECT}, product:products(title, slug, images)`)
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your reviews: ${error.message}`);

  return (data ?? []).map((raw) => {
    const row = raw as unknown as ReviewRow & {
      product?: { title?: string; slug?: string; images?: string[] } | null;
    };
    const base = toReview(row);
    return {
      ...base,
      productTitle: row.product?.title ?? 'Product',
      productSlug: row.product?.slug ?? base.productId,
      productImage: row.product?.images?.[0] ?? null,
    };
  });
}

export interface NewReview {
  productId: string;
  rating: number;
  headline: string;
  body: string;
  photos?: string[];
}

/**
 * Posts a review for the signed-in customer. The author is taken from the profile row and
 * `verified_purchase` is never sent: the database decides it from delivered sub-orders, so
 * a browser cannot stamp its own review as a verified purchase.
 */
export async function submitReview(review: NewReview): Promise<ProductReview> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (sessionError) throw new Error(`Could not read your session: ${sessionError.message}`);
  if (!userId) throw new Error('Sign in to review this product.');
  if (!UUID.test(review.productId)) throw new Error('This product cannot be reviewed yet.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw new Error(`Could not read your profile: ${profileError.message}`);

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      product_id: review.productId,
      author_id: userId,
      author_name: profile?.name || 'Verified Buyer',
      author_avatar: profile?.avatar_url || '',
      rating: review.rating,
      headline: review.headline,
      body: review.body,
      photos: review.photos ?? [],
    })
    .select(REVIEW_SELECT)
    .single();

  if (error) {
    if (/duplicate key/.test(error.message)) {
      throw new Error('You have already reviewed this product. Edit your existing review instead.');
    }
    throw new Error(`Could not post your review: ${error.message}`);
  }
  return toReview(data as unknown as ReviewRow);
}

/**
 * A merchant reply, guarded server-side by `owns_review`: a store can only answer reviews
 * of its own products, so the client never has to prove who it is.
 */
export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  const { error } = await supabase.rpc('reply_to_review', {
    p_review_id: reviewId,
    p_reply: reply,
  });
  if (error) {
    if (/does not belong/i.test(error.message)) {
      throw new Error('That review belongs to another store.');
    }
    throw new Error(`Could not post the reply: ${error.message}`);
  }
}

export interface VendorReview {
  review: ProductReview;
  productTitle: string;
  productSlug: string;
}

/**
 * Reviews of one store's products, addressed by that store's product ids. Reading reviews
 * directly is public, so scoping happens here rather than hoping RLS does it.
 */
export async function fetchVendorReviews(sellerId: string, signal?: AbortSignal): Promise<VendorReview[]> {
  let productsQuery = supabase.from('products').select('id, title, slug').eq('seller_id', sellerId);
  if (signal) productsQuery = productsQuery.abortSignal(signal);

  const { data: productRows, error: productError } = await productsQuery;
  if (productError) throw new Error(`Failed to load your products: ${productError.message}`);

  const productById = new Map(
    (productRows ?? []).map((row) => [row.id, { title: row.title, slug: row.slug }]),
  );
  if (productById.size === 0) return [];

  let reviewsQuery = supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .in('product_id', [...productById.keys()])
    .order('created_at', { ascending: false })
    .limit(REVIEWS_PER_PRODUCT);
  if (signal) reviewsQuery = reviewsQuery.abortSignal(signal);

  const { data, error } = await reviewsQuery;
  if (error) throw new Error(`Failed to load your reviews: ${error.message}`);

  return (data ?? []).map((row) => {
    const review = toReview(row as unknown as ReviewRow);
    const product = productById.get(review.productId);
    return {
      review,
      productTitle: product?.title ?? 'Delisted product',
      productSlug: product?.slug ?? '',
    };
  });
}
