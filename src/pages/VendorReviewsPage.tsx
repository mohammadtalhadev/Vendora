import React, { useState } from 'react';
import {
  Download,
  Zap,
  Search,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  Flag,
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

interface ReviewItem {
  id: string;
  author: string;
  isVerified: boolean;
  timeAgo: string;
  rating: number;
  productTitle: string;
  sku: string;
  title: string;
  body: string;
  helpfulCount: number;
  orderRef: string;
  needsAction?: boolean;
  needsActionReason?: string;
  merchantReply?: {
    author: string;
    timeAgo: string;
    body: string;
  };
  hasPhotos?: boolean;
}

export const VendorReviewsPage: React.FC = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | '5' | '4' | 'critical' | 'photos'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('30d');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const [replyingReview, setReplyingReview] = useState<ReviewItem | null>(null);
  const [replyModalText, setReplyModalText] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenReplyModal = (rev: ReviewItem) => {
    setReplyingReview(rev);
    setReplyModalText(`Thank you for your review, ${rev.author}! We appreciate your feedback and are always here to help.`);
  };

  const handleSaveReplyModal = () => {
    if (!replyingReview || !replyModalText.trim()) return;
    setReviews((prev) =>
      prev.map((item) =>
        item.id === replyingReview.id
          ? {
              ...item,
              needsAction: false,
              merchantReply: {
                author: 'Nova Electronics Response',
                timeAgo: 'Just now',
                body: replyModalText.trim(),
              },
            }
          : item
      )
    );
    showToast(`Merchant reply posted to ${replyingReview.author}'s review`);
    setReplyingReview(null);
  };

  // Inline reply for critical review
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [criticalReplied, setCriticalReplied] = useState(false);

  const [reviews, setReviews] = useState<ReviewItem[]>([
    {
      id: 'rev-1',
      author: 'Alex K.',
      isVerified: true,
      timeAgo: '2 days ago',
      rating: 5,
      productTitle: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones (Silver)',
      sku: 'SNY-XM5-SLV',
      title: 'Phenomenal headphones and blazing fast delivery!',
      body: "Ordered these late Tuesday afternoon and they arrived pristine on Thursday morning. The noise cancellation creates absolute total silence in my open office, and the ear cushion comfort is substantially lighter than the XM4s. Authenticity seals were intact and packaging was reinforced with double-bubble wrap. Couldn't be happier with Nova Electronics!",
      helpfulCount: 50,
      orderRef: '#ORD-98210',
      hasPhotos: true,
      merchantReply: {
        author: 'Nova Electronics Response',
        timeAgo: '1 day ago',
        body: 'Thank you Alex! We take extra care with our express warehouse packing to ensure high-end audio gear arrives in mint condition. Enjoy the ANC on your flights and commutes, and please reach out anytime should you need additional accessories or setup tips.',
      },
    },
    {
      id: 'rev-2',
      author: 'Marcus V.',
      isVerified: true,
      timeAgo: '4 days ago',
      rating: 5,
      productTitle: 'Keychron Q1 Pro Wireless Custom Mechanical Keyboard (Red Switches, Carbon Black)',
      sku: 'KEY-Q1P-RED',
      title: 'Best mechanical keyboard layout I have used',
      body: 'The CNC aluminum body is hefty, rigid, and eliminates all hollow resonance. Bluetooth 5.1 seamlessly connects between my MacBook Pro and custom gaming desktop with zero wake-up lag. Pre-lubed red switches feel butter smooth with consistent key travel. Highly recommend this vendor for keeping full stock of genuine ISO/ANSI layouts.',
      helpfulCount: 19,
      orderRef: '#ORD-98104',
      merchantReply: {
        author: 'Nova Electronics Response',
        timeAgo: '3 days ago',
        body: 'Thanks Marcus! We carry only official factory-lubed Keychron batches. Delighted to hear the latency is flawless across your dual macOS/Windows desk setup.',
      },
    },
    {
      id: 'rev-3',
      author: 'Rachel G.',
      isVerified: true,
      needsAction: true,
      needsActionReason: 'Unresolved - Pending Merchant Reply (Due: 18h remaining)',
      timeAgo: '6 hours ago',
      rating: 3,
      productTitle: 'CalDigit TS4 Thunderbolt 4 Dock (18-in-1 Ports, 98W Power Delivery)',
      sku: 'CDG-TS4-GEN',
      title: '⚠ Great dock but runs warm during 8K video output',
      body: "The port selection on this dock is unmatched and the 2.5Gb Ethernet operates at line speed. However, when daisy-chaining two high-refresh studio displays with 98W host charging, the aluminum chassis gets uncomfortably hot to the touch (approx 44°C). The user manual doesn't mention whether auxiliary active fan cooling is suggested or if this thermal behavior is within spec.",
      helpfulCount: 8,
      orderRef: '#ORD-98704',
    },
    {
      id: 'rev-4',
      author: 'Elena R.',
      isVerified: true,
      timeAgo: '1 week ago',
      rating: 5,
      productTitle: 'Anker 737 GaN 24,000mAh Power Bank (PowerCore 24K 140W Output)',
      sku: 'ANK-737-24K',
      title: 'Super fast charge and solid build',
      body: 'The smart display screen showing real-time wattage draw and cycle count is awesome. Handled charging both my iPad Pro and iPhone simultaneously with 98W host charging, with 30% battery still left over. Shipping was fast and included warranty registration card.',
      helpfulCount: 12,
      orderRef: '#ORD-97442',
      hasPhotos: true,
    },
  ]);

  const handlePostCriticalReply = () => {
    if (!inlineReplyText.trim()) return;
    setCriticalReplied(true);
    setReviews((prev) =>
      prev.map((r) =>
        r.id === 'rev-3'
          ? {
              ...r,
              needsAction: false,
              merchantReply: {
                author: 'Nova Electronics Response',
                timeAgo: 'Just now',
                body: inlineReplyText,
              },
            }
          : r
      )
    );
    setInlineReplyText('');
    showToast('Merchant response posted to public product catalog!');
  };

  const filteredReviews = reviews.filter((r) => {
    if (activeTab === '5' && r.rating !== 5) return false;
    if (activeTab === '4' && r.rating !== 4) return false;
    if (activeTab === 'critical' && !r.needsAction) return false;
    if (activeTab === 'photos' && !r.hasPhotos) return false;
    if (ratingFilter !== 'all' && r.rating.toString() !== ratingFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.author.toLowerCase().includes(q) ||
        r.productTitle.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage) || 1;
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
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
              Monitor customer feedback, product ratings, sentiment trends, and manage merchant replies.
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
                    { header: 'Title', key: 'title' },
                    { header: 'Body', key: 'body' },
                    { header: 'Helpful Votes', key: 'helpfulCount' },
                    { header: 'Replied', key: 'merchantReply' },
                  ],
                  data: filteredReviews,
                });
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-500" />
              Export CSV
            </button>
            <button
              onClick={() => setIsTemplatesModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Zap className="h-4 w-4 fill-amber-400 text-amber-400" />
              Reply Templates &amp; Automation
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
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  +0.2 vs last Qtr
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">4.8</span>
                <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
              </div>
              <div className="mt-1 flex items-center text-amber-400 text-sm">
                {'★'.repeat(5)}
              </div>
            </div>
            <div className="mt-4 pt-2 text-xs text-slate-500 flex items-center gap-1 border-t border-slate-100">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Based on 1,208 verified customer ratings</span>
            </div>
          </div>

          {/* Card 2: Star Distribution */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>STAR DISTRIBUTION</span>
                <span className="text-slate-400 font-semibold text-[10px]">1,208 Total</span>
              </div>

              <div className="mt-2.5 space-y-1 text-[11px]">
                {[
                  { star: 5, pct: '82%', count: 990, width: '82%' },
                  { star: 4, pct: '12%', count: 145, width: '12%' },
                  { star: 3, pct: '4%', count: 48, width: '4%' },
                  { star: 2, pct: '1%', count: 15, width: '1%' },
                  { star: 1, pct: '1%', count: 10, width: '1%' },
                ].map((s) => (
                  <div key={s.star} className="flex items-center gap-2">
                    <span className="w-4 font-bold text-slate-600">{s.star}★</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.star >= 4 ? 'bg-slate-900' : 'bg-amber-500'}`}
                        style={{ width: s.width }}
                      />
                    </div>
                    <span className="w-10 text-right text-slate-400 text-[10px]">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 pt-1.5 text-[11px] text-slate-500 border-t border-slate-100">
              94% of shoppers rate 4 stars or higher
            </div>
          </div>

          {/* Card 3: Sentiment Index */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>SENTIMENT INDEX</span>
                <span className="text-[10px] font-bold text-emerald-700">92% Pos, 4% Neu, 4% Neg</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-200">
                  ✓ Fast Shipping (96%)
                </span>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-200">
                  ✓ Product Quality (94%)
                </span>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-200">
                  ✓ Packaging (91%)
                </span>
                <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800 border border-amber-200">
                  ⚠ Manual Clarity (76% - Needs Attention)
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[11px] text-slate-400 border-t border-slate-100">
              Analyzed via natural language NLP
            </div>
          </div>

          {/* Card 4: Merchant Response SLA */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>MERCHANT RESPONSE SLA</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Tier 1 Target
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">96.5%</span>
                <span className="text-xs font-bold text-emerald-700">2.4h Avg</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                &lt;24h reply rate across all verified customer inquiries
              </p>
            </div>
            <div className="mt-3 pt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
              Public seller replies boost customer conversion by up to <strong>18%</strong> on critical listings.
            </div>
          </div>
        </div>

        {/* ── Filters & Tabs Bar ──────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" data-lenis-prevent>
              {[
                { id: 'all', label: 'All Reviews', count: '1,208' },
                { id: '5', label: '5 Star', count: '990' },
                { id: '4', label: '4 Star', count: '145' },
                { id: 'critical', label: 'Critical / Needs Reply', count: '25', isCritical: true },
                { id: 'photos', label: 'With Photos', count: '312' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
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
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-slate-500">
              <span>Sort by:</span>
              <select className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none">
                <option>Most Recent</option>
                <option>Highest Rating</option>
                <option>Lowest Rating</option>
                <option>Most Helpful</option>
              </select>
            </div>
          </div>

          {/* Search Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
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
              className="w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
            >
              <option value="all">All Ratings (1 - 5)</option>
              <option value="5">5 Stars Only</option>
              <option value="4">4 Stars Only</option>
              <option value="3">3 Stars Only</option>
            </select>

            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
            >
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
        </div>

        {/* ── Reviews Feed ────────────────────────────────────────── */}
        <div className="space-y-4">
          {paginatedReviews.map((rev) => (
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
                    {rev.author.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{rev.author}</span>
                      {rev.isVerified && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          ✓ Verified Purchase
                        </span>
                      )}
                      {rev.needsAction && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.2 text-[10px] font-bold text-amber-800 border border-amber-200">
                          NEEDS ACTION
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Purchased: <strong className="text-slate-800">{rev.productTitle}</strong> • SKU: {rev.sku}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex items-center text-amber-400 text-xs">
                    {'★'.repeat(rev.rating)}
                    {'☆'.repeat(5 - rev.rating)}
                  </div>
                  <span className="text-xs font-bold text-slate-900">{rev.rating}.0</span>
                  <span className="text-xs text-slate-400">• {rev.timeAgo}</span>
                </div>
              </div>

              {/* Title & Body */}
              <div className="space-y-1.5 text-xs">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  {rev.needsAction && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                  <span>{rev.title}</span>
                </h3>
                <p className="text-slate-700 leading-relaxed text-xs">{rev.body}</p>
              </div>

              {/* Photos tag if present */}
              {rev.hasPhotos && (
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <div className="h-14 w-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                    [Photo 1]
                  </div>
                  <div className="h-14 w-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                    [Photo 2]
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    +2 verified media attachments
                  </span>
                </div>
              )}

              {/* Helpful footer */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setReviews((prev) =>
                        prev.map((item) =>
                          item.id === rev.id
                            ? { ...item, helpfulCount: item.helpfulCount + 1 }
                            : item
                        )
                      );
                    }}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>{rev.helpfulCount} customers found this helpful</span>
                  </button>
                  <span>•</span>
                  <span>Order {rev.orderRef}</span>
                </div>

                <div className="flex items-center gap-3">
                  {rev.merchantReply ? (
                    <span className="text-emerald-700 font-bold text-[11px]">
                      ✓ Publicly Replied
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
                  <button
                    type="button"
                    onClick={() => showToast(`Review #${rev.id} flagged for platform moderation audit.`)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Flag review for audit"
                  >
                    <Flag className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Existing Merchant Reply Indented Box */}
              {rev.merchantReply && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-1.5 text-xs ml-4 sm:ml-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[9px] font-bold">
                        NE
                      </div>
                      <span className="font-bold text-slate-900 text-xs">
                        {rev.merchantReply.author}
                      </span>
                      <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[9px] font-bold text-slate-700">
                        Official Merchant
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Replied {rev.merchantReply.timeAgo}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-xs pl-7">
                    {rev.merchantReply.body}
                  </p>
                </div>
              )}

              {/* Inline Reply Composer for Critical Review */}
              {rev.needsAction && !criticalReplied && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2.5 ml-4 sm:ml-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        ↩ Public Merchant Reply as Nova Electronics
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setInlineReplyText(
                          'Hi Rachel, thanks for sharing your setup specs! The aluminum chassis of the TS4 functions as a passive heatsink; surface temperatures up to 45°C during dual 8K display driving with 98W Power Delivery are well within normal operating spec. Our logistics team will also reach out to provide our dedicated aluminum thermal riser accessory free of charge.'
                        )
                      }
                      className="text-[11px] font-bold text-slate-700 hover:underline flex items-center gap-1"
                    >
                      <Zap className="h-3 w-3 text-amber-600" />
                      Insert Thermal Spec Template
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={inlineReplyText}
                    onChange={(e) => setInlineReplyText(e.target.value)}
                    placeholder="Acknowledge the customer's technical concern, clarify thermal envelope safety limits, and offer direct support ticket creation..."
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                  />

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] text-slate-400">
                      Response will be indexed publicly on Vendora product catalog.
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInlineReplyText('')}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={handlePostCriticalReply}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs"
                      >
                        <span>Post Merchant Reply</span>
                        <Send className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Guidelines Callout Box & Pagination ──────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-slate-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900 text-xs">Vendora Review Guidelines</div>
              <p className="mt-0.5 text-slate-500 text-[11px] leading-relaxed">
                Keep responses professional and objective. Merchant replies must never solicit off-platform contact, disclose buyer PII, or offer monetary rewards in exchange for rating alterations. Read Merchant Response Policy ↗
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

        {/* ── Templates & Automation Modal ─────────────────────────── */}
        <Dialog open={isTemplatesModalOpen} onOpenChange={setIsTemplatesModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Zap className="h-5 w-5 fill-amber-500 text-amber-500" />
                Reply Templates &amp; Automated Rules
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Create pre-approved brand response snippets and automatic acknowledgment triggers.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900">5-Star Express Delivery Praise</div>
                <p className="text-[11px] text-slate-600">
                  "Thank you for trusting Nova Electronics! We take immense pride in our protective warehouse packaging and rapid carrier dispatches..."
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900">Technical Spec Clarification &amp; Support</div>
                <p className="text-[11px] text-slate-600">
                  "Hi [Customer], our hardware engineers have reviewed your report. Operating tolerances and firmware updates are detailed here..."
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900">Immediate RMA Replacement Concierge</div>
                <p className="text-[11px] text-slate-600">
                  "We sincerely apologize for the inconvenience. A prepaid express replacement manifest has been initiated for your order..."
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsTemplatesModalOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </DialogContent>
        </Dialog>

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
                onClick={handleSaveReplyModal}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Post Response
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Floating Toast Notification ───────────────────────────── */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
