import React, { useState, useMemo } from 'react';
import {
  Star,
  ThumbsUp,
  Check,
  Filter,
  PenSquare,
  MessageSquare,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { WriteReviewModal } from './WriteReviewModal';
import type { Review, ReviewSortOption, NewReviewInput } from '../types';

export interface ReviewListProps {
  productId?: string;
  productTitle?: string;
  reviews?: Review[];
  initialReviews?: Review[];
  allowWriteReview?: boolean;
}

const DEFAULT_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    productId: 'default',
    authorName: 'Marcus Vance',
    rating: 5,
    title: 'Outstanding sound quality and deep bass',
    comment:
      'These exceeded my expectations. The active noise cancellation creates total silence in busy transit, and the battery easily lasts multiple days of regular listening. Fast delivery too!',
    createdAt: '2026-03-28T14:20:00Z',
    isVerifiedPurchase: true,
    helpfulCount: 24,
  },
  {
    id: 'rev-2',
    productId: 'default',
    authorName: 'Elena Rostova',
    rating: 5,
    title: 'Premium build and ultra-comfortable fit',
    comment:
      'Cushions are remarkably soft even during 8-hour design work sessions. The physical volume dial and tactile buttons feel solid. Highly recommended!',
    createdAt: '2026-03-15T09:15:00Z',
    isVerifiedPurchase: true,
    helpfulCount: 18,
  },
  {
    id: 'rev-3',
    productId: 'default',
    authorName: 'David K.',
    rating: 4,
    title: 'Great overall, slight learning curve for companion app',
    comment:
      'Hardware is phenomenal. The Bluetooth multipoint switching between phone and laptop works seamlessly. The app EQ was slightly tricky to configure initially, but sounds great now.',
    createdAt: '2026-02-20T17:45:00Z',
    isVerifiedPurchase: true,
    helpfulCount: 9,
  },
  {
    id: 'rev-4',
    productId: 'default',
    authorName: 'Chloe Bennett',
    rating: 5,
    title: 'Flawless packaging and swift delivery',
    comment:
      'Arrived in pristine condition within 48 hours. The travel hardshell case is a great touch. Worth every penny.',
    createdAt: '2026-01-30T11:00:00Z',
    isVerifiedPurchase: true,
    helpfulCount: 6,
  },
  {
    id: 'rev-5',
    productId: 'default',
    authorName: 'Julian Miller',
    rating: 3,
    title: 'Solid sound, but earcups run a bit warm',
    comment:
      'Audio fidelity is crisp with balanced highs. However, after about 2-3 hours of gym usage, the pleather earcups get quite warm. Still a good product for indoor listening.',
    createdAt: '2026-01-12T16:30:00Z',
    isVerifiedPurchase: false,
    helpfulCount: 3,
  },
];

export const ReviewList: React.FC<ReviewListProps> = ({
  productId = 'default',
  productTitle = 'Product',
  reviews: externalReviews,
  initialReviews,
  allowWriteReview = true,
}) => {
  const baseReviews = useMemo(() => {
    if (externalReviews) return externalReviews;
    if (initialReviews && initialReviews.length > 0) return initialReviews;
    return DEFAULT_REVIEWS;
  }, [externalReviews, initialReviews]);

  const [userAddedReviews, setUserAddedReviews] = useState<Review[]>([]);
  const [votedReviews, setVotedReviews] = useState<Set<string>>(new Set());
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<ReviewSortOption>('recent');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  // Combined reviews
  const reviews = useMemo(() => {
    return [...userAddedReviews, ...baseReviews];
  }, [userAddedReviews, baseReviews]);

  // Breakdown metrics calculation
  const breakdown = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    reviews.forEach((r) => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating)));
      counts[star] = (counts[star] || 0) + 1;
      sum += r.rating;
    });
    const total = reviews.length;
    const average = total > 0 ? sum / total : 0;
    return { counts, total, average };
  }, [reviews]);

  // Toggle helpful vote
  const handleToggleHelpful = (reviewId: string) => {
    setVotedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  // Add review from modal
  const handleAddReview = (newReview: NewReviewInput) => {
    const created: Review = {
      id: `rev-${Date.now()}`,
      productId,
      authorName: 'Verified Customer',
      rating: newReview.rating,
      title: newReview.title,
      comment: newReview.comment,
      createdAt: new Date().toISOString(),
      isVerifiedPurchase: true,
      helpfulCount: 0,
    };
    setUserAddedReviews((prev) => [created, ...prev]);
  };

  // Filtered and Sorted reviews
  const displayReviews = useMemo(() => {
    let list = [...reviews];

    if (filterRating !== null) {
      list = list.filter((r) => Math.round(r.rating) === filterRating);
    }

    switch (sortBy) {
      case 'highest':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        list.sort((a, b) => a.rating - b.rating);
        break;
      case 'helpful':
        list.sort((a, b) => {
          const aCount = a.helpfulCount + (votedReviews.has(a.id) ? 1 : 0);
          const bCount = b.helpfulCount + (votedReviews.has(b.id) ? 1 : 0);
          return bCount - aCount;
        });
        break;
      case 'recent':
      default:
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
    }

    return list;
  }, [reviews, filterRating, sortBy, votedReviews]);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Rating Breakdown Bar Chart Section */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
          <div>
            <h2 className="text-xl font-extrabold text-ink sm:text-2xl">
              Customer Reviews & Ratings
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Verified feedback from genuine Vendora shoppers.
            </p>
          </div>

          {allowWriteReview && (
            <Button
              variant="orange-cta"
              size="default"
              onClick={() => setIsWriteModalOpen(true)}
            >
              <PenSquare className="h-4 w-4" />
              <span>Write a Review</span>
            </Button>
          )}
        </div>

        {/* Breakdown Grid */}
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-12 md:items-center">
          {/* Overall Rating Big Card (4 cols) */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200/50 bg-amber-50/40 p-6 text-center md:col-span-4">
            <span className="text-5xl font-black text-amber-500">
              {breakdown.average.toFixed(1)}
            </span>

            {/* Stars */}
            <div className="mt-2.5 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFull = star <= Math.floor(breakdown.average);
                return (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      isFull
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-100 text-slate-300'
                    }`}
                  />
                );
              })}
            </div>

            <p className="mt-2 text-xs font-semibold text-slate-600">
              Based on {breakdown.total} verified {breakdown.total === 1 ? 'review' : 'reviews'}
            </p>
            <span className="mt-1 text-[11px] text-slate-400">
              100% authentic buyer ratings
            </span>
          </div>

          {/* Rating Breakdown Bar Chart (8 cols) */}
          <div className="space-y-3 md:col-span-8">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = breakdown.counts[star] || 0;
              const percentage =
                breakdown.total > 0
                  ? Math.round((count / breakdown.total) * 100)
                  : 0;
              const isSelected = filterRating === star;

              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFilterRating(isSelected ? null : star)}
                  className={`group flex w-full items-center gap-3 rounded-xl p-1.5 text-xs text-left transition-colors ${
                    isSelected ? 'bg-orange-50/80 font-bold' : 'hover:bg-slate-50'
                  }`}
                  aria-label={`Filter by ${star} star reviews`}
                >
                  <span className="flex w-14 items-center gap-1 font-semibold text-slate-700">
                    <span>{star}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </span>

                  {/* Horizontal Bar Chart Track */}
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-sun-orange transition-all duration-300 group-hover:bg-[#EA6C13]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="w-16 text-right font-medium text-slate-500">
                    {percentage}% ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Review List Controls (Filter status & Sort options) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          <h3 className="text-base font-bold text-ink">
            {filterRating !== null
              ? `${filterRating} Star Reviews (${displayReviews.length})`
              : `All Reviews (${displayReviews.length})`}
          </h3>

          {filterRating !== null && (
            <button
              onClick={() => setFilterRating(null)}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              <span>Clear Filter</span>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Sort Options dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ReviewSortOption)}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs focus:border-sun-orange focus:outline-none focus:ring-1 focus:ring-sun-orange"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* 3. Customer Review Cards List */}
      {displayReviews.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <Filter className="mx-auto h-8 w-8 text-slate-300" />
          <h4 className="mt-3 text-base font-bold text-ink">No reviews found</h4>
          <p className="mt-1 text-xs text-slate-500">
            {filterRating !== null
              ? `No ${filterRating}-star reviews match your filter.`
              : 'Be the first to review this product!'}
          </p>
          {filterRating !== null && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setFilterRating(null)}
            >
              Reset Filter
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayReviews.map((review) => {
            const hasVoted = votedReviews.has(review.id);

            return (
              <div
                key={review.id}
                className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm sm:p-6"
              >
                {/* Review Header: User Info, Star Ratings & Verified Badge */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {/* User Avatar */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                      {review.authorName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink">
                          {review.authorName}
                        </span>
                        {review.isVerifiedPurchase && (
                          <Badge variant="in-stock" size="sm">
                            <Check className="h-3 w-3" />
                            <span>Verified Purchase</span>
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Reviewed on {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= review.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-slate-100 text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Review Title & Comment */}
                <div className="mt-3">
                  <h4 className="text-sm font-bold text-ink sm:text-base">
                    {review.title}
                  </h4>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed sm:text-sm">
                    {review.comment}
                  </p>
                </div>

                {/* Review Footer: Helpful Vote Button */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-400">
                    Was this review helpful?
                  </span>

                  <Button
                    type="button"
                    variant={hasVoted ? 'glass-pill' : 'outline'}
                    size="sm"
                    className={`gap-1.5 text-xs transition-colors ${
                      hasVoted
                        ? 'border-sun-orange text-sun-orange font-semibold bg-orange-50/50'
                        : 'text-slate-600 hover:text-ink'
                    }`}
                    onClick={() => handleToggleHelpful(review.id)}
                    aria-label={`Mark review as helpful (${review.helpfulCount + (hasVoted ? 1 : 0)} votes)`}
                  >
                    <ThumbsUp
                      className={`h-3.5 w-3.5 ${
                        hasVoted ? 'fill-current text-sun-orange' : ''
                      }`}
                    />
                    <span>Helpful ({review.helpfulCount + (hasVoted ? 1 : 0)})</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Write Review Modal */}
      <WriteReviewModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSubmit={handleAddReview}
        productTitle={productTitle}
      />
    </div>
  );
};
