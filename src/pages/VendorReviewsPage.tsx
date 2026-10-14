import React, { useEffect, useMemo, useState } from 'react';
import { Toast } from '../components/common/Toast';
import { useToast } from '../hooks/useToast';
import {
  Download,
  Search,
  CheckCircle2,
  Check,
  Star,
  AlertTriangle,
  ThumbsUp,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { exportToCsv } from '../lib/export-csv';
import { useAuthStore } from '../store/auth-store';
import { useReplyToReview, useVendorReviews } from '../features/reviews/hooks/useReviews';
import type { VendorReview } from '../features/reviews/api/reviews';
import type { ReviewSort } from '../features/reviews/types';
import { timeAgo } from '../features/reviews/utils/time';

interface ReviewItem {
  id: string;
  author: string;
  initials: string;
  isVerified: boolean;
  createdAt: string;
  timeAgo: string;
  rating: number;
  productTitle: string;
  sku: string;
  title: string;
  body: string;
  photos: string[];
  helpfulCount: number;
  orderRef: string;
  needsAction: boolean;
  needsActionReason?: string;
  /** The reply text on its own, so an export carries prose rather than a jsonb object. */
  replyBody: string;
  merchantReply?: {
    author: string;
    timeAgo: string;
    body: string;
  };
}

type TabId = 'all' | '5' | '4' | 'critical' | 'photos';

const TIME_WINDOWS: Record<string, number> = { '30d': 30, '90d': 90, '1y': 365 };

const SORT_LABELS: Record<ReviewSort, string> = {
  recent: 'Most Recent',
  highest: 'Highest Rating',
  lowest: 'Lowest Rating',
  helpful: 'Most Helpful',
};

function toReviewItem({ review, productTitle, productSlug }: VendorReview): ReviewItem {
  const needsAction = !review.sellerReply && review.rating <= 3;
  return {
    id: review.id,
    author: review.authorName,
    initials: review.initials,
    isVerified: review.verifiedPurchase,
    createdAt: review.createdAt,
    timeAgo: timeAgo(review.createdAt),
    rating: review.rating,
    productTitle,
    sku: productSlug || review.productId,
    title: review.headline,
    body: review.body,
    photos: review.photos,
    helpfulCount: review.helpfulCount,
    orderRef: review.orderNumber || 'No order reference',
    needsAction,
    needsActionReason: needsAction ? 'Pending merchant reply' : undefined,
    replyBody: review.sellerReply?.body ?? '',
    merchantReply: review.sellerReply ?? undefined,
  };
}

export const VendorReviewsPage: React.FC = () => {
  const sellerId = useAuthStore((s) => s.user?.vendorId ?? null);
  const reviewsQuery = useVendorReviews(sellerId);
  const replyMutation = useReplyToReview(sellerId);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('30d');
  const [sortBy, setSortBy] = useState<ReviewSort>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const [replyingReview, setReplyingReview] = useState<ReviewItem | null>(null);
  const [replyModalText, setReplyModalText] = useState('');
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, string>>({});

  const items = useMemo(
    () => (reviewsQuery.data ?? []).map(toReviewItem),
    [reviewsQuery.data],
  );

  const stats = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    let verified = 0;
    let withPhotos = 0;
    let replied = 0;
    for (const item of items) {
      const star = Math.min(5, Math.max(1, Math.round(item.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[star] += 1;
      sum += item.rating;
      if (item.isVerified) verified += 1;
      if (item.photos.length > 0) withPhotos += 1;
      if (item.merchantReply) replied += 1;
    }
    const total = items.length;
    return {
      total,
      average: total === 0 ? 0 : sum / total,
      counts,
      verified,
      withPhotos,
      replied,
      answeredShare: total === 0 ? 0 : replied / total,
      fourStarPlus: counts[4] + counts[5],
      critical: items.filter((item) => item.needsAction).length,
    };
  }, [items]);

  const tabCounts: Record<TabId, number> = {
    all: stats.total,
    '5': stats.counts[5],
    '4': stats.counts[4],
    critical: stats.critical,
    photos: stats.withPhotos,
  };

  const visibleReviews = useMemo(() => {
    const cutoff = TIME_WINDOWS[timeFilter]
      ? Date.now() - TIME_WINDOWS[timeFilter] * 86400_000
      : null;
    const query = searchQuery.toLowerCase();

    const filtered = items.filter((r) => {
      if (activeTab === '5' && r.rating !== 5) return false;
      if (activeTab === '4' && r.rating !== 4) return false;
      if (activeTab === 'critical' && !r.needsAction) return false;
      if (activeTab === 'photos' && r.photos.length === 0) return false;
      if (ratingFilter !== 'all' && r.rating.toString() !== ratingFilter) return false;
      if (cutoff && new Date(r.createdAt).getTime() < cutoff) return false;
      if (!query) return true;
      return (
        r.author.toLowerCase().includes(query) ||
        r.productTitle.toLowerCase().includes(query) ||
        r.sku.toLowerCase().includes(query) ||
        r.title.toLowerCase().includes(query) ||
        r.body.toLowerCase().includes(query)
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'helpful') return b.helpfulCount - a.helpfulCount;
      if (sortBy === 'highest') return b.rating - a.rating || +new Date(b.createdAt) - +new Date(a.createdAt);
      if (sortBy === 'lowest') return a.rating - b.rating || +new Date(b.createdAt) - +new Date(a.createdAt);
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }, [items, activeTab, ratingFilter, timeFilter, searchQuery, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, ratingFilter, timeFilter, searchQuery, sortBy]);

  const totalPages = Math.ceil(visibleReviews.length / itemsPerPage) || 1;
  const paginatedReviews = visibleReviews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const { toast, showToast, hideToast } = useToast(3000);

  const postReply = async (review: ReviewItem, text: string) => {
    const reply = text.trim();
    if (!reply) return;
    try {
      await replyMutation.mutateAsync({ reviewId: review.id, reply });
      setReplyingReview(null);
      setInlineDrafts((prev) => ({ ...prev, [review.id]: '' }));
      showToast(`Merchant reply posted to ${review.author}'s review`);
    } catch {
      // the mutation error is rendered next to the composer that triggered it
    }
  };

  const handleOpenReplyModal = (rev: ReviewItem) => {
    setReplyingReview(rev);
    setReplyModalText(`Thank you for the review, ${rev.author}. `);
  };

  const replyError = replyMutation.error instanceof Error ? replyMutation.error.message : null;

  return (
    <WorkspaceLayout
      role="vendor"
      sidebar={<VendorNav onOpenAddProduct={() => setIsProductModalOpen(true)} />}
    >
      <div className="space-y-6">
        {/* ── Breadcrumb & Header ─────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              STORE PERFORMANCE <span className="text-slate-300">/</span> REVIEWS
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Reviews &amp; Ratings
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Read the ratings customers left on your listings and post a public reply to each one.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                exportToCsv({
                  filename: `vendor-reviews-${new Date().toISOString().slice(0, 10)}.csv`,
                  columns: [
                    { header: 'Review ID', key: 'id' },
                    { header: 'Author', key: 'author' },
                    { header: 'Rating', key: 'rating' },
                    { header: 'Product', key: 'productTitle' },
                    { header: 'Listing', key: 'sku' },
                    { header: 'Title', key: 'title' },
                    { header: 'Body', key: 'body' },
                    { header: 'Helpful Votes', key: 'helpfulCount' },
                    { header: 'Verified Purchase', key: 'isVerified' },
                    { header: 'Merchant Reply', key: 'replyBody' },
                  ],
                  data: visibleReviews,
                });
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>

        {/* ── 4 Top KPI Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Overall Store Score */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>OVERALL STORE SCORE</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {stats.total} review{stats.total === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">
                  {stats.average.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
              </div>
              <div className="mt-1 flex items-center gap-0.5 text-amber-400 text-sm">
                {Math.round(stats.average) > 0 ? (
                  Array.from({ length: Math.round(stats.average) }, (_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  ))
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div className="mt-4 pt-2 text-xs text-slate-500 flex items-center gap-1 border-t border-slate-100">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>
                Average covers all {stats.total} rating{stats.total === 1 ? '' : 's'};{' '}
                {stats.verified} {stats.verified === 1 ? 'is' : 'are'} a verified purchase
              </span>
            </div>
          </div>

          {/* Card 2: Star Distribution */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>STAR DISTRIBUTION</span>
                <span className="text-slate-400 font-semibold text-[10px]">{stats.total} Total</span>
              </div>

              <div className="mt-2.5 space-y-1 text-[11px]">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.counts[star as 1 | 2 | 3 | 4 | 5];
                  const pct = stats.total === 0 ? 0 : Math.round((count / stats.total) * 100);
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="flex w-5 items-center gap-0.5 font-bold text-slate-600">
                        {star}
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${star >= 4 ? 'bg-slate-900' : 'bg-amber-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-slate-400 text-[10px]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 pt-1.5 text-[11px] text-slate-500 border-t border-slate-100">
              {stats.total === 0
                ? 'No ratings recorded yet'
                : `${Math.round((stats.fourStarPlus / stats.total) * 100)}% of shoppers rate 4 stars or higher`}
            </div>
          </div>

          {/* Card 3: Sentiment Index */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>SENTIMENT INDEX</span>
                <span className="text-[10px] font-bold text-slate-500">Not connected</span>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Topic-level sentiment needs review text analysed against your catalogue. No model is
                wired to this store yet, so no scores are shown.
              </p>
            </div>
            <div className="mt-3 pt-2 text-[11px] text-slate-400 border-t border-slate-100">
              Average rating and star spread above are computed from live review rows.
            </div>
          </div>

          {/* Card 4: Merchant Replies */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>MERCHANT RESPONSE</span>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  {Math.round(stats.answeredShare * 100)}% answered
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {stats.replied}/{stats.total}
                </span>
                <span className="text-xs font-bold text-slate-500">reviews replied</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                {stats.critical === 0
                  ? 'No reviews are waiting on a reply.'
                  : `${stats.critical} review${stats.critical === 1 ? '' : 's'} of 3 stars or below ${stats.critical === 1 ? 'is' : 'are'} still unanswered.`}
              </p>
            </div>
            <div className="mt-3 pt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
              Public seller replies appear on the product page beside the customer review.
            </div>
          </div>
        </div>

        {/* ── Filters & Tabs Bar ──────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" data-lenis-prevent>
              {([
                { id: 'all', label: 'All Reviews' },
                { id: '5', label: '5 Star' },
                { id: '4', label: '4 Star' },
                { id: 'critical', label: 'Critical / Needs Reply', isCritical: true },
                { id: 'photos', label: 'With Photos' },
              ] as Array<{ id: TabId; label: string; isCritical?: boolean }>).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.isCritical && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tabCounts[tab.id]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-slate-500">
              <span>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ReviewSort)}
                className="native-select rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
              >
                {(Object.keys(SORT_LABELS) as ReviewSort[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                placeholder="Filter reviews by keyword, product name, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
            </div>

            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="native-select w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
            >
              <option value="all">All Ratings (1 - 5)</option>
              <option value="5">5 Stars Only</option>
              <option value="4">4 Stars Only</option>
              <option value="3">3 Stars Only</option>
            </select>

            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="native-select w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
            >
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
        </div>

        {/* ── Reviews Feed ────────────────────────────────────────── */}
        {!sellerId && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-xs text-slate-600 shadow-xs">
            Sign in with a vendor account that owns a store to see its reviews.
          </div>
        )}

        {sellerId && reviewsQuery.isPending && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-xs text-slate-500 shadow-xs">
            Loading your reviews...
          </div>
        )}

        {sellerId && reviewsQuery.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-5 text-xs shadow-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-700">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Could not load your reviews
            </div>
            <p className="text-rose-600">
              {reviewsQuery.error instanceof Error
                ? reviewsQuery.error.message
                : 'Unexpected error reading from Supabase.'}
            </p>
            <button
              type="button"
              onClick={() => reviewsQuery.refetch()}
              className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-bold text-rose-700 hover:bg-rose-100"
            >
              Try again
            </button>
          </div>
        )}

        {sellerId && reviewsQuery.isSuccess && stats.total === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-1.5 shadow-xs">
            <div className="text-sm font-bold text-slate-900">No reviews yet</div>
            <p className="text-xs text-slate-500">
              Reviews appear here as soon as customers rate your products.
            </p>
          </div>
        )}

        {sellerId &&
          reviewsQuery.isSuccess &&
          stats.total > 0 &&
          paginatedReviews.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-xs text-slate-500 shadow-xs">
              No reviews match these filters. Widen the time window or clear the search.
            </div>
          )}

        <div className="space-y-4">
          {paginatedReviews.map((rev) => {
            const draft = inlineDrafts[rev.id] ?? '';
            return (
              <div
                key={rev.id}
                className={`rounded-xl border bg-white p-5 shadow-xs space-y-3.5 transition-all ${
                  rev.needsAction
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs">
                      {rev.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{rev.author}</span>
                        {rev.isVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <Check className="h-3 w-3" aria-hidden="true" />
                            Verified Purchase
                          </span>
                        )}
                        {rev.needsAction && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.2 text-[10px] font-bold text-amber-800 border border-amber-200">
                            NEEDS ACTION
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        On listing: <strong className="text-slate-800">{rev.productTitle}</strong> ·{' '}
                        {rev.sku}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < Math.floor(rev.rating) ? 'fill-amber-400 text-amber-400' : 'text-amber-400'}`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-900">{rev.rating.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">• {rev.timeAgo}</span>
                  </div>
                </div>

                {/* Title & Body */}
                <div className="space-y-1.5 text-xs">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    {rev.needsAction && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />}
                    <span>{rev.title}</span>
                  </h3>
                  <p className="text-slate-700 leading-relaxed text-xs">{rev.body}</p>
                </div>

                {/* Customer photos */}
                {rev.photos.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    {rev.photos.slice(0, 4).map((src) => (
                      <img
                        key={src}
                        src={src}
                        alt={`Attachment on ${rev.author}'s review`}
                        className="h-14 w-14 rounded-lg border border-slate-200 bg-slate-100 object-cover"
                      />
                    ))}
                    <span className="text-[11px] font-semibold text-slate-500">
                      {rev.photos.length} customer {rev.photos.length === 1 ? 'photo' : 'photos'}
                    </span>
                  </div>
                )}

                {/* Helpful footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{rev.helpfulCount} customers found this helpful</span>
                    </span>
                    <span>•</span>
                    <span>Order {rev.orderRef}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {rev.merchantReply ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Publicly Replied
                      </span>
                    ) : rev.needsAction ? (
                      <span className="text-amber-800 font-bold text-[11px]">
                        {rev.needsActionReason}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenReplyModal(rev)}
                        className="font-bold text-slate-900 hover:underline cursor-pointer"
                      >
                        ↩ Write Seller Reply
                      </button>
                    )}
                  </div>
                </div>

                {/* Existing Merchant Reply */}
                {rev.merchantReply && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-1.5 text-xs ml-4 sm:ml-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[9px] font-bold">
                          MR
                        </div>
                        <span className="font-bold text-slate-900 text-xs">
                          {rev.merchantReply.author}
                        </span>
                        <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[9px] font-bold text-slate-700">
                          Official Merchant
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Reply posted · no reply time is stored
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed text-xs pl-7">
                      {rev.merchantReply.body}
                    </p>
                  </div>
                )}

                {/* Inline Reply Composer for unanswered low ratings */}
                {rev.needsAction && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2.5 ml-4 sm:ml-8">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        ↩ Public Merchant Reply
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={draft}
                      onChange={(e) => setInlineDrafts((prev) => ({ ...prev, [rev.id]: e.target.value }))}
                      placeholder="Acknowledge the customer's concern and offer direct support..."
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                    />

                    {replyError && (
                      <p className="text-[11px] font-semibold text-rose-700">{replyError}</p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[11px] text-slate-400">
                        Your reply appears publicly beside the review on that listing.
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInlineDrafts((prev) => ({ ...prev, [rev.id]: '' }))}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          disabled={replyMutation.isPending || draft.trim() === ''}
                          onClick={() => postReply(rev, draft)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>{replyMutation.isPending ? 'Posting...' : 'Post Merchant Reply'}</span>
                          <Send className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Guidelines Callout Box & Pagination ──────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-slate-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-bold text-slate-900 text-xs">Vendora Review Guidelines</div>
              <p className="mt-0.5 text-slate-500 text-[11px] leading-relaxed">
                A reply is one public text field on the review. Replying again replaces the earlier
                text - there is no threaded conversation, no edit history and no private channel to
                the buyer, and the rating itself is written by the customer, not by you.
              </p>
              <p className="mt-1 text-slate-500 text-[11px] leading-relaxed">
                The queue reads the 200 most recent reviews across your listings, so the averages
                here are over that window rather than the store's whole history.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 self-start sm:self-auto shrink-0">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              &lt; Prev
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next &gt;
            </button>
          </div>
        </div>

        {/* ── Product Form Modal ───────────────────────────────────── */}
        <ProductFormModal
          open={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
        />

        {/* ── Write Merchant Reply Modal ────────────────────────────── */}
        <Dialog open={!!replyingReview} onOpenChange={(open) => !open && setReplyingReview(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Write Public Seller Response
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Responding to review by <strong className="text-slate-800">{replyingReview?.author}</strong> on "{replyingReview?.productTitle}".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <div className="font-semibold text-slate-700">Customer feedback:</div>
                <div className="mt-1 text-slate-600 italic">"{replyingReview?.body}"</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Your Official Public Response:
                </label>
                <textarea
                  rows={4}
                  value={replyModalText}
                  onChange={(e) => setReplyModalText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="Enter helpful response..."
                />
              </div>

              {replyError && <p className="text-[11px] font-semibold text-rose-700">{replyError}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReplyingReview(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={replyMutation.isPending || replyModalText.trim() === ''}
                onClick={() => replyingReview && postReply(replyingReview, replyModalText)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {replyMutation.isPending ? 'Posting...' : 'Post Response'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Floating Toast Notification ───────────────────────────── */}
        {/* Shared toast (Batch 47) — replaces this page's private pill. */}
        <Toast toast={toast} onDismiss={hideToast} />
      </div>
    </WorkspaceLayout>
  );
};
