import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  Lock,
  MessageSquareOff,
  RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useCurrency } from '../store/currency-store';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { SupportHeader, type SupportQueueType } from '../features/support/components/SupportHeader';
import { SupportNav } from '../features/support/components/SupportNav';
import { DisputeQueueList, type QueueFilterTab } from '../features/support/components/DisputeQueueList';
import { DisputeConversationThread } from '../features/support/components/DisputeConversationThread';
import { DisputeContextBar } from '../features/support/components/DisputeContextBar';
import type { SupportDisputeRow } from '../features/support/api/disputes';
import {
  useCannedResponses,
  useDisputeQueue,
  useDisputeThread,
  useSupportAgents,
} from '../features/support/hooks/useSupportQueries';
import { useSupportActions } from '../features/support/hooks/useSupportActions';
import { useSupportLive } from '../features/support/hooks/useLive';
import { cn } from '../lib/utils';

/** Which pool the queue read asks Postgres for. The tabs are filters, not client-side slices. */
const POOL: Record<QueueFilterTab, { status: string; unassigned?: boolean; mine?: boolean }> = {
  all: { status: 'all' },
  unassigned: { status: 'awaiting_staff', unassigned: true },
  mine: { status: 'awaiting_staff', mine: true },
  escalated: { status: 'escalated' },
  resolved: { status: 'resolved' },
};

/** `disputes.status` in Postgres - the five states the queue row can carry. */
const STATUS_LABEL: Record<SupportDisputeRow['status'], string> = {
  open: 'Open',
  under_review: 'Under review',
  escalated: 'Escalated',
  resolved_refund: 'Resolved with a refund',
  resolved_denied: 'Claim denied',
};

/** `disputes.urgency`, as the row reported it. Nothing here is scored in the browser. */
const URGENCY_LABEL: Record<SupportDisputeRow['urgency'], string> = {
  urgent: 'Urgent',
  standard: 'Standard',
};

/** What the ruling write asks Postgres for, held until the desk confirms it. */
interface PendingRuling {
  outcome: 'resolved_refund' | 'resolved_denied';
  note: string;
  amount?: number;
}

/** A Postgres enum read as text: underscores are the only thing the browser rewrites. */
const humanize = (value: string) => value.replace(/_/g, ' ');

const EmptyPane: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center">
    <MessageSquareOff className="mb-2 h-10 w-10 text-slate-300" />
    <h3 className="text-sm font-bold text-slate-700">{title}</h3>
    <p className="mt-1 max-w-xs text-xs text-slate-400">{body}</p>
  </div>
);

export const SupportDashboardPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  // `/support/disputes/:id` is served by this same component, so the route param decides
  // whether the desk shows its queue or one case out of it.
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const [tab, setTab] = useState<QueueFilterTab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  /**
   * Internal notes are kept out of the rendering only when the desk asks for the buyer's view.
   * Default off, so an agent reading a case still sees the notes their colleagues left.
   */
  const [hideInternalNotes, setHideInternalNotes] = useState(false);
  /** A ruling closes the case and can record money, so it waits here for a confirm step. */
  const [pendingRuling, setPendingRuling] = useState<PendingRuling | null>(null);

  const pool = POOL[tab];
  useSupportLive();

  /**
   * There is no per-case read at the desk: `support_dispute_queue` is the only source of a
   * dispute row, and its `p_search` covers the case id. So a detail route asks that same read
   * for the slice holding the id and then matches the id exactly - the row is still the
   * database's, and a case the read does not return is reported as missing rather than shown
   * as an empty panel.
   */
  const queue = useDisputeQueue(
    caseId
      ? { status: 'all', search: caseId, page: 1, pageSize: 25 }
      : {
          status: pool.status,
          search: appliedSearch,
          page,
          pageSize,
          unassigned: pool.unassigned ?? false,
          assignedTo: pool.mine ? (user?.id ?? null) : null,
        },
  );
  const rows = queue.data?.rows ?? [];
  const counts = queue.data?.counts;

  // Placeholder data is another query's page: it must never answer "is this case here?".
  const casePending = queue.isPending || queue.isPlaceholderData;
  const caseRow = caseId && !casePending ? (rows.find((row) => row.id === caseId) ?? null) : null;

  // The queue route previews the top case of the pool it read; opening a case goes to the URL.
  const active = caseId ? caseRow : (rows[0] ?? null);
  const activeId = active?.id ?? null;

  const thread = useDisputeThread(activeId);
  const directory = useSupportAgents();
  const templates = useCannedResponses();
  const actions = useSupportActions();

  const writes = [
    actions.assignDispute,
    actions.escalateDispute,
    actions.postMessage,
    actions.refundPackage,
    actions.resolveDispute,
  ];
  const failed = writes.find((mutation) => mutation.isError);
  const writeError = failed?.error instanceof Error ? failed.error.message : null;
  const writing = writes.some((mutation) => mutation.isPending);
  /** The ruling's own refusal, kept apart so the confirm step can show it and stay open. */
  const rulingError =
    actions.resolveDispute.isError && actions.resolveDispute.error instanceof Error
      ? actions.resolveDispute.error.message
      : null;

  /** `dispute_messages` as read, minus the notes the buyer is never shown when that view is on. */
  const threadMessages = thread.data ?? [];
  const visibleMessages = hideInternalNotes
    ? threadMessages.filter((message) => !message.internalNote)
    : threadMessages;

  const openCase = (disputeId: string) => {
    navigate(`/support/disputes/${disputeId}`);
  };

  const changeTab = (next: QueueFilterTab) => {
    setTab(next);
    setPage(1);
  };

  const search = (next: string) => {
    setAppliedSearch(next);
    setSearchInput(next);
    setPage(1);
  };

  const readError = queue.isError && queue.error instanceof Error ? queue.error.message : 'The queue could not be read.';

  return (
    <WorkspaceLayout
      role="support"
      title="Support & Dispute Resolution"
      subtitle="Escrow mediation, dispute triage, and customer protection desk"
      sidebar={<SupportNav />}
    >
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-8">
        {caseId ? (
          /* ── /support/disputes/:id - one case, not the queue ───────────────── */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                to="/support/disputes"
                data-testid="btn-back-to-queue"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to the triage queue
              </Link>
              <span className="font-mono text-[11px] text-slate-500">case {caseId}</span>
            </div>

            {queue.isError ? (
              <div
                role="alert"
                data-testid="case-error"
                className="flex items-start gap-2 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-xs font-medium text-rose-900"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span className="flex-1">{readError}</span>
                <button
                  type="button"
                  data-testid="btn-retry-case"
                  disabled={queue.isFetching}
                  onClick={() => void queue.refetch()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {queue.isFetching ? 'Retrying…' : 'Retry'}
                </button>
              </div>
            ) : casePending ? (
              <div
                data-testid="case-loading"
                className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-6 text-xs text-slate-500"
              >
                <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                Reading this case from the desk…
              </div>
            ) : caseRow === null ? (
              <div
                data-testid="case-not-found"
                className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-10 text-center"
              >
                <Inbox className="mb-2 h-10 w-10 text-slate-300" />
                <h3 className="text-sm font-bold text-slate-800">No such case in your desk</h3>
                <p className="mt-1 max-w-md text-xs text-slate-400">
                  The dispute queue returned no case with id {caseId}. Either it was resolved and
                  left the pool your agent can read, or the link points at a case your role is not
                  assigned. The desk will not show another case in its place.
                </p>
                <button
                  type="button"
                  data-testid="btn-retry-case"
                  disabled={queue.isFetching}
                  onClick={() => void queue.refetch()}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {queue.isFetching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  <span>Read the desk again</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Case facts, straight off the queue row this case id asked for. */}
                <div
                  data-testid="case-facts"
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-xs shadow-2xs"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400">
                      Status
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-bold text-slate-800">
                      {STATUS_LABEL[caseRow.status]}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400">
                      Urgency
                    </span>
                    <span
                      data-testid="case-urgency"
                      className={cn(
                        'rounded-full border px-2 py-0.5 font-bold',
                        caseRow.urgency === 'urgent'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                      )}
                    >
                      {URGENCY_LABEL[caseRow.urgency]}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="text-[10px] font-extrabold text-slate-400">
                      Package
                    </span>
                    <span className="capitalize">{humanize(caseRow.packageStatus)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="text-[10px] font-extrabold text-slate-400">
                      Agent
                    </span>
                    <span>{caseRow.agentName ?? 'Unassigned'}</span>
                  </span>
                  <span className="ml-auto inline-flex items-baseline gap-1.5 font-mono font-bold text-slate-900">
                    <span className="font-sans text-[10px] font-extrabold text-slate-400">
                      Still owed
                    </span>
                    <span data-testid="case-remaining">{formatPrice(Math.max(caseRow.remainingGross, 0))}</span>
                  </span>
                </div>

                {/* Whose rendering this is: internal notes are staff-only, so the desk can ask
                    for the thread exactly as the buyer sees it. */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Lock className="h-3.5 w-3.5 text-amber-600" />
                    <span>
                      {hideInternalNotes
                        ? 'Buyer view: messages flagged internal are not rendered.'
                        : 'Desk view: internal notes are shown, marked, and stay staff-only.'}
                    </span>
                  </span>
                  <button
                    type="button"
                    data-testid="btn-buyer-view"
                    aria-pressed={hideInternalNotes}
                    title="Switch between the desk thread and the thread the buyer can see"
                    onClick={() => setHideInternalNotes((current) => !current)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all',
                      hideInternalNotes
                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {hideInternalNotes ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>{hideInternalNotes ? 'Buyer view' : 'Desk view'}</span>
                  </button>
                </div>

                <div className="grid min-h-[620px] grid-cols-1 gap-4 lg:h-[calc(100vh-260px)] lg:grid-cols-12">
                  <section className="h-full overflow-hidden lg:col-span-7">
                    <DisputeConversationThread
                      dispute={caseRow}
                      messages={visibleMessages}
                      templates={templates.data ?? []}
                      loading={thread.isLoading}
                      pending={actions.postMessage.isPending}
                      error={
                        thread.isError && thread.error instanceof Error
                          ? thread.error.message
                          : actions.postMessage.isError && writeError
                            ? writeError
                            : null
                      }
                      onSend={(content, internalNote) => {
                        actions.postMessage.mutate({ disputeId: caseRow.id, content, internalNote });
                      }}
                      className="h-full"
                    />
                  </section>
                  <section className="h-full overflow-hidden lg:col-span-5">
                    <DisputeContextBar
                      dispute={caseRow}
                      agents={directory.data ?? []}
                      pending={writing}
                      error={writeError}
                      onRefund={(amount, note) => {
                        if (!caseRow.subOrderId) return;
                        actions.refundPackage.mutate({
                          subOrderId: caseRow.subOrderId,
                          amount,
                          reason: note,
                        });
                      }}
                      onResolve={(outcome, note, amount) => setPendingRuling({ outcome, note, amount })}
                      onEscalate={(note) => actions.escalateDispute.mutate({ disputeId: caseRow.id, note })}
                      onAssign={(agentId) => actions.assignDispute.mutate({ disputeId: caseRow.id, agentId })}
                      className="h-full"
                    />
                  </section>
                </div>
              </div>
            )}

            {/* 7. The ruling closes the case, so it is confirmed before it is written. */}
            {pendingRuling && caseRow && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="ruling-confirm-title"
                  tabIndex={-1}
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setPendingRuling(null);
                  }}
                  className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 id="ruling-confirm-title" className="text-sm font-bold text-slate-900">
                        {pendingRuling.outcome === 'resolved_refund'
                          ? 'Close this claim as refunded'
                          : 'Close this claim as denied'}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        `resolve_dispute` writes the ruling on case {caseRow.id} and the note with
                        it. Once a case is closed the desk cannot re-open it.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-slate-500">Ruling</span>
                      <span className="font-semibold text-slate-800">
                        {pendingRuling.outcome === 'resolved_refund' ? 'resolved_refund' : 'resolved_denied'}
                      </span>
                    </div>
                    {pendingRuling.amount !== undefined && (
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-slate-500">Refund rows already on the package</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {formatPrice(pendingRuling.amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-slate-500">Package</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-800">
                        #{caseRow.subOrderId ?? 'unknown'}
                      </span>
                    </div>
                    <p className="border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-700">
                      {pendingRuling.note}
                    </p>
                  </div>

                  {rulingError && (
                    <p
                      role="alert"
                      className="rounded-xl border-2 border-rose-300 bg-rose-50 p-2.5 text-[11px] font-semibold text-rose-900"
                    >
                      {rulingError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      data-testid="cancel-ruling-btn"
                      onClick={() => setPendingRuling(null)}
                      className="cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="confirm-ruling-btn"
                      disabled={actions.resolveDispute.isPending || writing}
                      onClick={() =>
                        actions.resolveDispute.mutate(
                          {
                            disputeId: caseRow.id,
                            outcome: pendingRuling.outcome,
                            note: pendingRuling.note,
                            amount: pendingRuling.amount,
                          },
                          { onSuccess: () => setPendingRuling(null) },
                        )
                      }
                      className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actions.resolveDispute.isPending ? 'Recording…' : 'Record the ruling'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
        <>
        <SupportHeader
          unassignedCount={counts?.unassigned ?? 0}
          mineCount={counts?.mine ?? 0}
          escalatedCount={counts?.escalated ?? 0}
          openCount={counts?.awaitingStaff ?? 0}
          activeQueue={tab === 'resolved' ? 'all' : (tab as SupportQueueType)}
          onSelectQueue={(next) => changeTab(next)}
          agentName={user?.name}
          searchQuery={searchInput}
          onSearchChange={search}
          error={queue.isError ? readError : null}
          loading={queue.isPlaceholderData || queue.isFetching}
        />

        {/* The queue is the list; a case is worked on its own route, so a refresh or Back still
            lands on the same case. What sits beside it here is the top row of this pool. */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2 text-[11px] text-slate-500 shadow-2xs">
          <span>
            Quick look at the first case this pool returned. Choosing a row opens that case on its
            own page, where the ruling is confirmed before it is written.
          </span>
          {active && (
            <Link
              to={`/support/disputes/${active.id}`}
              data-testid="btn-open-quick-look-case"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open case {active.id.slice(0, 8)}</span>
            </Link>
          )}
        </div>

        <div className="grid min-h-[680px] grid-cols-1 gap-4 lg:h-[calc(100vh-220px)] lg:grid-cols-12">
          <section className="h-full overflow-hidden lg:col-span-4 xl:col-span-3">
            <DisputeQueueList
              disputes={rows}
              counts={{
                // `total` is the filtered pool's size, so as an "All" figure
                // it contradicted every other chip (and shrank under search).
                // The RPC's counts are desk-wide partitions of the same
                // payload, so All is their sum — one read, one truth.
                all: counts
                  ? counts.open + counts.underReview + counts.escalated + counts.resolved
                  : 0,
                unassigned: counts?.unassigned ?? 0,
                mine: counts?.mine ?? 0,
                escalated: counts?.escalated ?? 0,
                resolved: counts?.resolved ?? 0,
              }}
              activeFilter={tab}
              onFilterChange={changeTab}
              selectedId={activeId}
              onSelect={openCase}
              loading={queue.isLoading}
              error={queue.isError ? readError : null}
              className="h-full"
            />

            {queue.data && queue.data.total > pageSize && (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-600">
                <span>
                  Page {queue.data.page} of {Math.ceil(queue.data.total / pageSize)} · {queue.data.total} cases
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    data-testid="queue-prev"
                    aria-label="Previous page of the dispute queue"
                    title="Previous page of the dispute queue"
                    disabled={queue.data.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="cursor-pointer rounded-lg border border-slate-200 p-1 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    data-testid="queue-next"
                    aria-label="Next page of the dispute queue"
                    title="Next page of the dispute queue"
                    disabled={queue.data.page * pageSize >= queue.data.total}
                    onClick={() => setPage((current) => current + 1)}
                    className="cursor-pointer rounded-lg border border-slate-200 p-1 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            )}
          </section>

          <section className="h-full overflow-hidden lg:col-span-4 xl:col-span-5">
            {active ? (
              <DisputeConversationThread
                dispute={active}
                messages={thread.data ?? []}
                templates={templates.data ?? []}
                loading={thread.isLoading}
                pending={actions.postMessage.isPending}
                error={
                  thread.isError && thread.error instanceof Error
                    ? thread.error.message
                    : writeError && actions.postMessage.isError
                      ? writeError
                      : null
                }
                onSend={(content, internalNote) => {
                  actions.postMessage.mutate({ disputeId: active.id, content, internalNote });
                }}
                className="h-full"
              />
            ) : (
              <EmptyPane
                title="No case selected"
                body={
                  queue.isError
                    ? 'The queue could not be read, so there is nothing to open.'
                    : 'Pick a case from the triage queue to read its conversation.'
                }
              />
            )}
          </section>

          <section className="h-full overflow-hidden lg:col-span-4 xl:col-span-4">
            {active ? (
              <DisputeContextBar
                dispute={active}
                agents={directory.data ?? []}
                pending={writing}
                error={writeError}
                onRefund={(amount, note) => {
                  if (!active.subOrderId) return;
                  actions.refundPackage.mutate({ subOrderId: active.subOrderId, amount, reason: note });
                }}
                onResolve={(outcome, note, amount) => {
                  actions.resolveDispute.mutate({ disputeId: active.id, outcome, note, amount });
                }}
                onEscalate={(note) => actions.escalateDispute.mutate({ disputeId: active.id, note })}
                onAssign={(agentId) => actions.assignDispute.mutate({ disputeId: active.id, agentId })}
                className="h-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center text-xs text-slate-400">
                Open a case to see its money and record a ruling.
              </div>
            )}
          </section>
        </div>
        </>
        )}
      </div>
    </WorkspaceLayout>
  );
};
