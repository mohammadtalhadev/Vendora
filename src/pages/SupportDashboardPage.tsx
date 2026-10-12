import React, { useState } from 'react';
import { MessageSquareOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { SupportHeader, type SupportQueueType } from '../features/support/components/SupportHeader';
import { DisputeQueueList, type QueueFilterTab } from '../features/support/components/DisputeQueueList';
import { DisputeConversationThread } from '../features/support/components/DisputeConversationThread';
import { DisputeContextBar } from '../features/support/components/DisputeContextBar';
import {
  useCannedResponses,
  useDisputeQueue,
  useDisputeThread,
  useSupportAgents,
} from '../features/support/hooks/useSupportQueries';
import { useSupportActions } from '../features/support/hooks/useSupportActions';
import { useSupportLive } from '../features/support/hooks/useLive';

/** Which pool the queue read asks Postgres for. The tabs are filters, not client-side slices. */
const POOL: Record<QueueFilterTab, { status: string; unassigned?: boolean; mine?: boolean }> = {
  all: { status: 'all' },
  unassigned: { status: 'awaiting_staff', unassigned: true },
  mine: { status: 'awaiting_staff', mine: true },
  escalated: { status: 'escalated' },
  resolved: { status: 'resolved' },
};

const EmptyPane: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center">
    <MessageSquareOff className="mb-2 h-10 w-10 text-slate-300" />
    <h3 className="text-sm font-bold text-slate-700">{title}</h3>
    <p className="mt-1 max-w-xs text-xs text-slate-400">{body}</p>
  </div>
);

export const SupportDashboardPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<QueueFilterTab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pool = POOL[tab];
  useSupportLive();
  const queue = useDisputeQueue({
    status: pool.status,
    search: appliedSearch,
    page,
    pageSize,
    unassigned: pool.unassigned ?? false,
    assignedTo: pool.mine ? (user?.id ?? null) : null,
  });
  const rows = queue.data?.rows ?? [];
  const counts = queue.data?.counts;

  // The selection follows the page: a case that is not in this pool is not "open" on the desk.
  const active = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
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

  const changeTab = (next: QueueFilterTab) => {
    setTab(next);
    setPage(1);
    setSelectedId(null);
  };

  const search = (next: string) => {
    setAppliedSearch(next);
    setSearchInput(next);
    setPage(1);
    setSelectedId(null);
  };

  const readError = queue.isError && queue.error instanceof Error ? queue.error.message : 'The queue could not be read.';

  return (
    <WorkspaceLayout
      role="support"
      title="Support & Dispute Resolution"
      subtitle="Escrow mediation, dispute triage, and customer protection desk"
    >
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-8">
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

        <div className="grid min-h-[680px] grid-cols-1 gap-4 lg:h-[calc(100vh-220px)] lg:grid-cols-12">
          <section className="h-full overflow-hidden lg:col-span-4 xl:col-span-3">
            <DisputeQueueList
              disputes={rows}
              counts={{
                all: queue.data?.total ?? 0,
                unassigned: counts?.unassigned ?? 0,
                mine: counts?.mine ?? 0,
                escalated: counts?.escalated ?? 0,
                resolved: counts?.resolved ?? 0,
              }}
              activeFilter={tab}
              onFilterChange={changeTab}
              selectedId={activeId}
              onSelect={setSelectedId}
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
                    disabled={queue.data.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="cursor-pointer rounded-lg border border-slate-200 p-1 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    data-testid="queue-next"
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
      </div>
    </WorkspaceLayout>
  );
};
