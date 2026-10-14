import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquareQuote, Star } from 'lucide-react';
import { useMyReviews } from '../features/reviews/hooks/useReviews';

/**
 * My Reviews (/account/reviews) — every review the signed-in customer has
 * written, read from the `reviews` table by author. Seller replies stored
 * on the review are shown under it; ratings are the customer's own.
 */
export const AccountReviewsPage: React.FC = () => {
  const { data: reviews, isLoading, isError } = useMyReviews();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-outfit text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
          My Reviews
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Reviews you have written for products you bought on Vendora.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4" aria-label="Loading your reviews">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-white/80 bg-white/80 p-8 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
          <h2 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
            Your reviews could not be loaded
          </h2>
          <p className="mt-1 text-xs text-slate-500">Please refresh the page in a moment.</p>
        </div>
      ) : !reviews || reviews.length === 0 ? (
        <div className="rounded-3xl border border-white/80 bg-white/80 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
          <MessageSquareQuote
            className="mx-auto mb-2 h-10 w-10 text-slate-400"
            aria-hidden="true"
          />
          <h2 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
            You have not reviewed anything yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            After an order is delivered, you can review its products from the product page.
            Your reviews help other shoppers and the sellers.
          </p>
          <Link
            to="/orders"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-sun-orange-600"
          >
            Go to My Orders
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-3xl border border-white/80 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
            >
              <div className="flex items-start gap-4">
                {review.productImage ? (
                  <img
                    src={review.productImage}
                    alt={review.productTitle}
                    className="h-14 w-14 shrink-0 rounded-2xl bg-slate-100 object-cover dark:bg-slate-800"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <Star className="h-6 w-6 text-slate-400" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to={`/products/${review.productSlug}`}
                      className="truncate font-outfit text-sm font-bold text-slate-900 transition-colors hover:text-sun-orange sm:text-base dark:text-white"
                    >
                      {review.productTitle}
                    </Link>
                    <span className="text-[11px] font-medium text-slate-400">
                      {new Date(review.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div
                    className="mt-1 flex items-center gap-0.5"
                    aria-label={`Rated ${review.rating} out of 5`}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(review.rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                    {review.verifiedPurchase && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Verified purchase
                      </span>
                    )}
                  </div>
                  {review.headline && (
                    <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                      {review.headline}
                    </h3>
                  )}
                  {review.body && (
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {review.body}
                    </p>
                  )}
                  {review.sellerReply && (
                    <div className="mt-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Seller reply
                      </span>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {review.sellerReply.body}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AccountReviewsPage;
