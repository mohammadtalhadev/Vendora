import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronLeft,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { SupportNav } from '../features/support/components/SupportNav';
import { TicketThread } from '../features/support/components/TicketThread';
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from '../features/support/components/TicketStatusBadge';
import { TICKET_CATEGORIES, type SupportTicketStatus } from '../features/support/api/tickets';
import { useSupportAgents } from '../features/support/hooks/useSupportQueries';
import { useTicketActions, useTicketDetail } from '../features/support/hooks/useTickets';
import { useSupportLive } from '../features/support/hooks/useLive';
import { cn } from '../lib/utils';

/**
 * /support/tickets/:id - one ticket worked on its own page, the same shape as
 * a dispute case: facts bar on top, thread on the left, the working controls
 * (assignment + status) on the right. Deliberate status moves confirm first
 * when they end the conversation (resolve/close), like a dispute ruling.
 */

const STATUS_ACTIONS: { status: SupportTicketStatus; label: string; confirm?: boolean }[] = [
  { status: 'in_progress', label: 'Start work' },
  { status: 'waiting_customer', label: 'Wait on customer' },
  { status: 'resolved', label: 'Resolve', confirm: true },
  { status: 'closed', label: 'Close', confirm: true },
];

const categoryLabel = (value: string): string =>
  TICKET_CATEGORIES.find((c) => c.value === value)?.label ?? 'Something else';

const stamp = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const SupportTicketDetailPage: React.FC = () => {
  const { id: ticketId } = useParams<{ id: string }>();
  /** Internal notes are hidden from the render only in the buyer view, like the dispute desk. */
  const [hideInternalNotes, setHideInternalNotes] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<SupportTicketStatus | null>(null);

  useSupportLive();

  const detail = useTicketDetail(ticketId ?? null);
  const directory = useSupportAgents();
  const actions = useTicketActions();

  const ticket = detail.data?.ticket;
  const messages = detail.data?.messages ?? [];
  const visibleMessages = hideInternalNotes
    ? messages.filter((message) => !message.internalNote)
    : messages;

  const writeError =
    [actions.replyTicket, actions.assignTicket, actions.setTicketStatus].find((m) => m.isError)?.error;
  const errorText = writeError instanceof Error ? writeError.message : null;
  const statusError =
    actions.setTicketStatus.isError && actions.setTicketStatus.error instanceof Error
      ? actions.setTicketStatus.error.message
      : null;

  const applyStatus = (status: SupportTicketStatus, needsConfirm: boolean) => {
    if (!ticket) return;
    if (needsConfirm) {
      setPendingStatus(status);
      return;
    }
    actions.setTicketStatus.mutate({ ticketId: ticket.id, status });
  };

  return (
    <WorkspaceLayout
      role="support"
      title="Support Ticket"
      subtitle="One customer's case - thread, assignment and status in one place"
      sidebar={<SupportNav />}
    >
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/support/tickets"
            data-testid="btn-back-to-tickets"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to the ticket queue
          </Link>
          {ticket && <span className="font-mono text-[11px] text-slate-500">ticket {ticket.ticketNo}</span>}
        </div>

        {detail.isError ? (
          <div
            role="alert"
            data-testid="ticket-error"
            className="flex items-start gap-2 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-xs font-medium text-rose-900"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span className="flex-1">
              {detail.error instanceof Error ? detail.error.message : 'This ticket could not be read.'}
            </span>
            <button
              type="button"
              disabled={detail.isFetching}
              onClick={() => void detail.refetch()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {detail.isFetching ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        ) : detail.isLoading || !ticket ? (
          <div
            data-testid="ticket-loading"
            className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-6 text-xs text-slate-500"
          >
            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
            Reading this ticket…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Facts bar: the ticket as the database holds it. */}
            <div
              data-testid="ticket-facts"
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-xs shadow-2xs"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">Status</span>
                <TicketStatusBadge status={ticket.status} />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">Priority</span>
                <TicketPriorityBadge priority={ticket.priority} />
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">Category</span>
                <span className="font-semibold">{categoryLabel(ticket.category)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">Customer</span>
                <span className="font-semibold">{ticket.customerName || ticket.customerEmail}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">Agent</span>
                <span className="font-semibold">{ticket.agentName ?? 'Unassigned'}</span>
              </span>
              {ticket.orderId && (
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">Order</span>
                  <span className="font-mono font-semibold">#{ticket.orderId.slice(0, 8).toUpperCase()}</span>
                </span>
              )}
              <span className="ml-auto text-[11px] text-slate-400">Opened {stamp(ticket.createdAt)}</span>
            </div>

            <h2 className="font-outfit text-lg font-black text-slate-900">{ticket.subject}</h2>

            {/* Whose rendering this is: internal notes are staff-only. */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span>
                  {hideInternalNotes
                    ? 'Buyer view: internal notes are not rendered.'
                    : 'Desk view: internal notes are shown, marked, and stay staff-only.'}
                </span>
              </span>
              <button
                type="button"
                data-testid="btn-ticket-buyer-view"
                aria-pressed={hideInternalNotes}
                onClick={() => setHideInternalNotes((current) => !current)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all',
                  hideInternalNotes
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {hideInternalNotes ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{hideInternalNotes ? 'Buyer view' : 'Desk view'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <section className="lg:col-span-7">
                <TicketThread
                  messages={visibleMessages}
                  canReply={ticket.status !== 'closed'}
                  allowInternalNote
                  pending={actions.replyTicket.isPending}
                  error={actions.replyTicket.isError ? errorText : null}
                  onSend={(body, internalNote) =>
                    actions.replyTicket.mutate({ ticketId: ticket.id, body, internalNote })
                  }
                  className="min-h-[480px]"
                />
              </section>

              <section className="lg:col-span-5">
                <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <div>
                    <h3 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                      Assigned agent
                    </h3>
                    <select
                      aria-label="Assigned agent"
                      data-testid="ticket-assign-select"
                      value={ticket.assignedAgentId ?? ''}
                      disabled={actions.assignTicket.isPending || directory.isLoading}
                      onChange={(event) => {
                        const agentId = event.target.value;
                        if (agentId) actions.assignTicket.mutate({ ticketId: ticket.id, agentId });
                      }}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500"
                    >
                      <option value="">{ticket.agentName ?? 'Unassigned'}</option>
                      {(directory.data ?? [])
                        .filter((agent) => agent.id !== ticket.assignedAgentId)
                        .map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                            {agent.isMe ? ' (you)' : ''} - {agent.openCases} open disputes
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      The directory lists staff accounts; the ticket RPC checks the role again.
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <h3 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                      Move the ticket
                    </h3>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {STATUS_ACTIONS.filter((action) => action.status !== ticket.status).map((action) => (
                        <button
                          key={action.status}
                          type="button"
                          data-testid={`ticket-status-${action.status}`}
                          disabled={actions.setTicketStatus.isPending}
                          onClick={() => applyStatus(action.status, action.confirm === true)}
                          className={cn(
                            'cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                            action.status === 'resolved'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : action.status === 'closed'
                                ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                          )}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                      A reply moves the ticket on its own: yours sets it to Waiting for customer,
                      the customer's answer brings it back to In progress.
                    </p>
                  </div>

                  {(actions.assignTicket.isError || actions.setTicketStatus.isError) && (
                    <p role="alert" className="rounded-xl border-2 border-rose-300 bg-rose-50 p-2.5 text-[11px] font-semibold text-rose-900">
                      {errorText ?? 'The change could not be saved.'}
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Resolve/close ends the conversation, so it is confirmed first. */}
            {pendingStatus && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="ticket-status-confirm-title"
                  className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 id="ticket-status-confirm-title" className="text-sm font-bold text-slate-900">
                        {pendingStatus === 'resolved' ? 'Resolve this ticket' : 'Close this ticket'}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {pendingStatus === 'resolved'
                          ? `Resolving ${ticket.ticketNo} tells the customer their case is done. They can still reply, which reopens it as In progress.`
                          : `Closing ${ticket.ticketNo} ends it for good: a closed ticket refuses new replies, and the customer would need a fresh ticket.`}
                      </p>
                    </div>
                  </div>

                  {statusError && (
                    <p role="alert" className="rounded-xl border-2 border-rose-300 bg-rose-50 p-2.5 text-[11px] font-semibold text-rose-900">
                      {statusError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      data-testid="ticket-status-cancel"
                      onClick={() => setPendingStatus(null)}
                      className="cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="ticket-status-confirm"
                      disabled={actions.setTicketStatus.isPending}
                      onClick={() =>
                        actions.setTicketStatus.mutate(
                          { ticketId: ticket.id, status: pendingStatus },
                          { onSuccess: () => setPendingStatus(null) },
                        )
                      }
                      className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actions.setTicketStatus.isPending
                        ? 'Saving…'
                        : pendingStatus === 'resolved'
                          ? 'Resolve ticket'
                          : 'Close ticket'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!detail.isLoading && !detail.isError && !ticket && (
          <div
            data-testid="ticket-not-found"
            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-10 text-center"
          >
            <Inbox className="mb-2 h-10 w-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No such ticket in your desk</h3>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              The ticket read returned nothing for this id. It may have been deleted, or the link
              points at a ticket your role cannot read.
            </p>
            <button
              type="button"
              disabled={detail.isFetching}
              onClick={() => void detail.refetch()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {detail.isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              <span>Read the desk again</span>
            </button>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
