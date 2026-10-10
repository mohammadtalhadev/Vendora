export interface Review {
  id: string;
  productId: string;
  authorName: string;
  authorAvatar?: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  createdAt: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
}

export type ReviewSortOption = 'recent' | 'highest' | 'lowest' | 'helpful';

/** Sort keys the server understands; same names as the client-only ReviewList control. */
export type ReviewSort = ReviewSortOption;

export interface RatingBreakdown {
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
  total: number;
  average: number;
  /** Share of the reviews the database marked as verified purchases, 0..1. */
  verifiedShare: number;
}

/** A reviews row as the storefront renders it, with the server-derived trust flag. */
export interface ProductReview {
  id: string;
  productId: string;
  authorName: string;
  authorAvatar: string | null;
  authorCountry: string | null;
  initials: string;
  rating: number;
  headline: string;
  body: string;
  photos: string[];
  helpfulCount: number;
  verifiedPurchase: boolean;
  orderNumber: string | null;
  createdAt: string;
  sellerReply: { author: string; timeAgo: string; body: string } | null;
}

export interface NewReviewInput {
  rating: number;
  title: string;
  comment: string;
}
