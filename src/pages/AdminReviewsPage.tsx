import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, MessageSquareQuote, Search, Star } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { StatusBadge } from '../components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { DataTable, type DataTableColumn } from '../components/patterns/data-table';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  useAdminReviewQueue,
  useSetReviewHidden,
} from '../features/reviews/hooks/useReviews';
import type {
  AdminReviewRow,
  AdminReviewStatusFilter,
} from '../features/reviews/api/admin-reviews';

/**
 * Review Moderation (/admin/reviews) — the queue behind `admin_review_queue`.
 * A hidden review leaves the storefront, the author's public profile of the
 * product, and both rating rollups; the write itself is the audited
 * `admin_set_review_hidden` RPC, so this page holds no moderation state of
 * its own beyond the dialog being confirmed.
 */

const STATUS_FILTERS: { value: AdminReviewStatusFilter; label: string }[] = [
  { value: 'all', label: 'All reviews' },
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
];

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const excerpt = (text: string, max = 140): string =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
        }`}
        aria-hidden="true"
      />
    ))}
  </span>
);

interface PendingAction {
  review: AdminReviewRow;
  hidden: boolean;
}

export const AdminReviewsPage: React.FC = () => {
  const [status, setStatus] = useState<AdminReviewStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: queue, refetch, isPending, isError, error } = useAdminReviewQueue({
    status,
    search: debouncedSearch,
    page,
    pageSize,
  });
  const setHidden = useSetReviewHidden();

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { review, hidden } = pendingAction;
    try {
      await setHidden.mutateAsync({
        reviewId: review.id,
        hidden,
        note: note.trim() ? note.trim() : null,
      });
      setResultMessage(
        hidden
          ? `Review by ${review.authorName} hidden. It no longer counts toward any rating.`
          : `Review by ${review.authorName} restored and counts toward ratings again.`,
      );
    } catch (err) {
      setResultMessage(
        err instanceof Error ? err.message : 'That moderation change was not saved.',
      );
    } finally {
      setPendingAction(null);
      setNote('');
    }
  };

  const columns: DataTableColumn<AdminReviewRow>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (row) => (
        <div className="min-w-0">
          <Link
            to="/admin/products"
            className="font-bold text-slate-900 text-xs leading-tight hover:text-sun-orange-600 hover:underline"
          >
            {row.productTitle}
          </Link>
          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
            {row.storeName ?? 'Unknown store'}
          </p>
        </div>
      ),
    },
    {
      key: 'author',
      header: 'Author',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 text-xs leading-tight truncate">
            {row.authorName}
          </p>
          {row.verifiedPurchase && (
            <p className="text-[10px] font-semibold text-emerald-600 leading-tight mt-0.5">
              Verified purchase
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      cell: (row) => <Stars rating={row.rating} />,
    },
    {
      key: 'review',
      header: 'Review',
      cell: (row) => (
        <div className="max-w-md">
          <p className="font-semibold text-slate-800 text-xs leading-tight">{row.headline}</p>
          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{excerpt(row.body)}</p>
          {row.hasSellerReply && (
            <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
              <MessageSquareQuote className="h-3 w-3" aria-hidden="true" />
              Seller replied
            </p>
          )}
          {row.hidden && row.moderationNote && (
            <p className="mt-1 text-[10px] text-rose-600 leading-tight">
              Note: {row.moderationNote}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      align: 'right',
      className: 'text-[11px] text-slate-500 font-medium whitespace-nowrap',
      cell: (row) => formatDate(row.createdAt),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) =>
        // The shared status map has no review-visibility tokens, so the tone
        // is applied locally here rather than inventing shared statuses.
        row.hidden ? (
          <StatusBadge status="hidden" label="Hidden" className="bg-rose-50 text-rose-700 border-rose-200" />
        ) : (
          <StatusBadge status="visible" label="Visible" className="bg-emerald-50 text-emerald-700 border-emerald-200" />
        ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'center',
      cell: (row) =>
        row.hidden ? (
          <button
            type="button"
            disabled={setHidden.isPending}
            onClick={() => {
              setPendingAction({ review: row, hidden: false });
              setNote('');
            }}
            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <Eye className="h-3 w-3" aria-hidden="true" />
            Restore
          </button>
        ) : (
          <button
            type="button"
            disabled={setHidden.isPending}
            onClick={() => {
              setPendingAction({ review: row, hidden: true });
              setNote('');
            }}
            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <EyeOff className="h-3 w-3" aria-hidden="true" />
            Hide
          </button>
        ),
    },
  ];

  if (isPending) {
    return (
      <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Review Moderation" sidebar={<AdminNav />}>
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-sm text-slate-700">
          <MessageSquareQuote className="h-4 w-4" aria-hidden="true" />
          Reading reviews…
        </div>
      </WorkspaceLayout>
    );
  }

  if (isError || !queue) {
    return (
      <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Review Moderation" sidebar={<AdminNav />}>
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-semibold mb-1">Failed to load reviews</div>
          <div className="mb-3 text-xs">
            {error instanceof Error ? error.message : 'The review queue could not be read.'}
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </WorkspaceLayout>
    );
  }

  const { counts } = queue;

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Review Moderation"
      subtitle="Hide reviews that break policy and restore them when they should count again."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">
            Review Moderation
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Hidden reviews leave the storefront and stop counting toward product and vendor
            ratings. The author still sees their own review, marked as hidden.
          </p>
        </div>

        {resultMessage && (
          <div role="status" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 shadow-2xs">
            {resultMessage}
          </div>
        )}

        {/* Summary chips — platform-wide counts from the queue RPC. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              { label: 'Total reviews', value: counts.total, tone: 'text-slate-900' },
              { label: 'Visible', value: counts.visible, tone: 'text-emerald-600' },
              { label: 'Hidden', value: counts.hidden, tone: 'text-rose-600' },
            ] as const
          ).map((chip) => (
            <div key={chip.label} className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
              <span className="text-xs font-medium text-slate-600">{chip.label}</span>
              <div className={`mt-2 text-2xl font-bold tracking-tight ${chip.tone}`}>
                {chip.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Search & status filter — both are server-side queue params. */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              aria-label="Search reviews"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search product, author, headline or review text..."
              leftIcon={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
              className="h-9 rounded-lg bg-slate-50/80 text-xs text-slate-800 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Review visibility filter">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={status === filter.value}
                onClick={() => {
                  setStatus(filter.value);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  status === filter.value
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <DataTable
            columns={columns}
            rows={queue.rows}
            getRowKey={(row) => row.id}
            ariaLabel="Review moderation queue"
            emptyState={
              <div className="px-4 py-10 text-center text-xs text-slate-500">
                No reviews match these filters.
              </div>
            }
            pagination={{
              page,
              pageSize,
              totalItems: queue.total,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
              pageSizeOptions: [20, 50, 100],
              noun: 'reviews',
            }}
          />
        </div>
      </div>

      {/* Hide / Restore confirmation — the note is optional and is stored on
          the review as its moderation note. */}
      <Dialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {pendingAction?.hidden ? 'Hide this review?' : 'Restore this review?'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {pendingAction?.hidden
                ? 'It will leave the storefront and stop counting toward the product and vendor ratings. The author still sees it in their account, marked as hidden.'
                : 'It will appear on the storefront again and count toward the product and vendor ratings.'}
            </DialogDescription>
          </DialogHeader>
          {pendingAction && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-800">{pendingAction.review.headline}</p>
                <p className="mt-0.5 text-slate-500">{excerpt(pendingAction.review.body)}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {pendingAction.review.authorName} on {pendingAction.review.productTitle}
                </p>
              </div>
              <div>
                <label htmlFor="review-moderation-note" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Moderation note (optional)
                </label>
                <Textarea
                  id="review-moderation-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why is this being hidden or restored? Stored on the review and written to the audit log."
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setPendingAction(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={setHidden.isPending}
                  onClick={() => void confirmAction()}
                >
                  {pendingAction.hidden ? 'Hide review' : 'Restore review'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </WorkspaceLayout>
  );
};
