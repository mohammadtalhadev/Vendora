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

export interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
  total: number;
  average: number;
}

export interface NewReviewInput {
  rating: number;
  title: string;
  comment: string;
}
