import React, { useState } from 'react';
import { Star, ShieldCheck, PenSquare } from 'lucide-react';
import { WriteReviewModal } from '../../reviews/components/WriteReviewModal';
import type { NewReviewInput } from '../../reviews/types';
import { useProductReviews, useSubmitReview } from '../../reviews/hooks/useReviews';
import { timeAgo } from '../../reviews/utils/time';

export interface CustomerReviewsShowcaseProps {
  productId?: string;
  productTitle?: string;
}

const FEATURED_LIMIT = 3;

export const CustomerReviewsShowcase: React.FC<CustomerReviewsShowcaseProps> = ({
  productId,
  productTitle = 'this product',
}) => {
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useProductReviews(productId);
  const submitReview = useSubmitReview(productId);

  const reviews = data?.reviews ?? [];
  const breakdown = data?.breakdown;
  const total = breakdown?.total ?? 0;
  const average = breakdown?.average ?? 0;

  // Submit review mutation handler
  const handleReviewSubmit = async (review: NewReviewInput) => {
    if (!productId) throw new Error('This product cannot be reviewed yet.');
    await submitReview.mutateAsync({
      productId,
      rating: review.rating,
      headline: review.title || 'Verified Purchase',
      body: review.comment,
    });
  };

  return (
    <section id="reviews-section" className="mt-14 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            VERIFIED PURCHASES
          </span>
          <h3 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Customer Reviews & Ratings
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsWriteModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <PenSquare className="h-3.5 w-3.5 text-slate-500" />
          <span>Write a Review</span>
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-500">Loading reviews…</p>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <p className="font-bold">Reviews could not be loaded.</p>
          <p className="mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left Rating Card: average and the star spread of the reviews that exist */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-4">
              <span className="text-4xl font-black text-slate-900 tracking-tight">
                {average.toFixed(1)}
              </span>
              <div>
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(average) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-400 font-medium">
                  {total === 0
                    ? `No reviews of ${productTitle} yet`
                    : `Based on ${total} ${total === 1 ? 'review' : 'reviews'}`}
                </p>
              </div>
            </div>

            {total > 0 && (
              <div className="space-y-2.5 pt-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = breakdown?.counts[star as 1 | 2 | 3 | 4 | 5] ?? 0;
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <span className="w-11 font-medium text-slate-500">{star} Star</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-bold text-slate-700">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span>
                {total === 0
                  ? 'All reviews are verified through confirmed customer orders.'
                  : `${Math.round((breakdown?.verifiedShare ?? 0) * 100)}% verified customer purchases`}
              </span>
            </p>
          </div>

          {/* Right Featured Review Cards */}
          <div className="lg:col-span-7 space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-sm font-bold text-slate-900">No reviews yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Buy {productTitle} and be the first to review it.
                </p>
              </div>
            ) : (
              reviews.slice(0, FEATURED_LIMIT).map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-3.5 relative"
                >
                  {/* Review Author Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
                        {rev.initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{rev.authorName}</h4>
                        <p className="flex items-center gap-1 text-[11px] text-slate-400">
                          <ShieldCheck className="h-3 w-3 text-emerald-500" />
                          <span>
                            {rev.verifiedPurchase
                              ? ['Verified Purchaser', rev.authorCountry].filter(Boolean).join(' · ')
                              : 'Buyer Review'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <span className="text-xs text-slate-400">{timeAgo(rev.createdAt)}</span>
                  </div>

                  {/* Star Rating & Headline */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: Math.round(rev.rating) }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{rev.headline}</span>
                  </div>

                  {/* Review Text */}
                  <p className="text-xs leading-relaxed text-slate-600 font-normal">
                    "{rev.body}"
                  </p>

                  {rev.sellerReply?.body && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[11px] font-bold text-slate-700">{rev.sellerReply.author}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{rev.sellerReply.body}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSubmit={handleReviewSubmit}
        productTitle={productTitle}
      />
    </section>
  );
};
