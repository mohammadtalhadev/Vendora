import React, { useState } from 'react';
import { Star, ShieldCheck, PenSquare } from 'lucide-react';
import { WriteReviewModal } from '../../reviews/components/WriteReviewModal';
import type { NewReviewInput } from '../../reviews/types';

export interface CustomerReviewsShowcaseProps {
  productId?: string;
  productTitle?: string;
}

export const CustomerReviewsShowcase: React.FC<CustomerReviewsShowcaseProps> = ({
  productTitle = 'iPhone 16 Pro Max',
}) => {
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [featuredReviews, setFeaturedReviews] = useState([
    {
      id: 'rev-tariq',
      author: 'Tariq Al-Mansoor',
      initials: 'TA',
      badge: 'Verified UAE Purchaser · Dubai',
      time: '2 days ago',
      rating: 5,
      specLabel: 'Natural Titanium 1TB in Review',
      comment:
        'Upgraded from 14 Pro Max. The weight reduction and rounded titanium border make a dramatic difference when holding it one-handed. Camera Control button is exceptionally responsive.',
    },
  ]);

  const handleReviewSubmit = (review: NewReviewInput) => {
    setFeaturedReviews((prev) => [
      {
        id: `rev-${Date.now()}`,
        author: 'Verified Buyer',
        initials: 'VB',
        badge: 'Verified UAE Purchaser · Dubai',
        time: 'Just now',
        rating: review.rating,
        specLabel: review.title || 'Verified Purchase',
        comment: review.comment,
      },
      ...prev,
    ]);
    setIsWriteModalOpen(false);
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

      {/* Two Column Layout matching Mockup */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Rating Card: 4.9 summary & breakdown bars (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-black text-slate-900 tracking-tight">4.9</span>
            <div>
              <div className="flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400 font-medium">
                Based on 2,542 verified buyers
              </p>
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="space-y-2.5 pt-1">
            {/* 5 star */}
            <div className="flex items-center gap-3 text-xs">
              <span className="w-11 font-medium text-slate-500">5 Star</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-600 w-[88%]" />
              </div>
              <span className="w-8 text-right font-bold text-slate-700">88%</span>
            </div>

            {/* 4 star */}
            <div className="flex items-center gap-3 text-xs">
              <span className="w-11 font-medium text-slate-500">4 Star</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-600 w-[9%]" />
              </div>
              <span className="w-8 text-right font-bold text-slate-700">9%</span>
            </div>

            {/* 3 star */}
            <div className="flex items-center gap-3 text-xs">
              <span className="w-11 font-medium text-slate-500">3 Star</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-600 w-[3%]" />
              </div>
              <span className="w-8 text-right font-bold text-slate-700">3%</span>
            </div>
          </div>
        </div>

        {/* Right Featured Review Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {featuredReviews.map((rev) => (
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
                    <h4 className="text-sm font-bold text-slate-900">{rev.author}</h4>
                    <p className="flex items-center gap-1 text-[11px] text-slate-400">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      <span>{rev.badge}</span>
                    </p>
                  </div>
                </div>

                <span className="text-xs text-slate-400">{rev.time}</span>
              </div>

              {/* Star Rating & Spec Label */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {rev.specLabel}
                </span>
              </div>

              {/* Review Text */}
              <p className="text-xs leading-relaxed text-slate-600 font-normal">
                "{rev.comment}"
              </p>
            </div>
          ))}
        </div>
      </div>

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
