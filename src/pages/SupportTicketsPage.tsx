import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Inbox, Loader2, Search } from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { SupportNav } from '../features/support/components/SupportNav';
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from '../features/support/components/TicketStatusBadge';
import { useTicketQueue } from '../features/support/hooks/useTickets';
import { useSupportLive } from '../features/support/hooks/useLive';
import { cn } from '../lib/utils';

/**
 * /support/tickets - the general ticket queue. Same desk shape as the dispute
 * queue (status tabs are server-side pools, counts come from the same read),
 * because a ticket and a dispute are both work an agent picks up - only the
 * subject differs.
 */

type QueueTab = 'all' | 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed' | 'unassigned' | 'mine';

const TABS: { key: QueueTab; label: string; countKey?: string }[] = [
  { key: 'all', label: 'All', countKey: 'all' },
  { key: 'open', label: 'Open', countKey: 'open' },
  { key: 'in_progress', label: 'In progress', countKey: 'inProgress' },
  { key: 'waiting_customer', label: 'Waiting for customer', countKey: 'waitingCustomer' },
  { key: 'unassigned', label: 'Unassigned', countKey: 'unassigned' },
  { key: 'mine', label: 'Mine', countKey: 'mine' },
  { key: 'resolved', label: 'Resolved', countKey: 'resolved' },
  { key: 'closed', label: 'Closed', countKey: 'closed' },
];

const PAGE_SIZE = 12;

const stamp = (iso: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** How long a ticket has been waiting, in words a queue can scan. */
const age = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

export const SupportTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<QueueTab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);

  useSupportLive();

  const queue = useTicketQueue({
    status: tab === 'mine' ? 'all' : tab,
    mine: tab === 'mine',
    search: appliedSearch,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows = queue.data?.rows ?? [];
  const counts = queue.data?.counts;
  const total = queue.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const readError =
    queue.isError && queue.error instanceof Error ? queue.error.message : 'The ticket queue could not be read.';

  const changeTab = (next: QueueTab) => {
    setTab(next);
    setPage(1);
  };

  const applySearch = (next: string) => {
    setSearchInput(next);
    setAppliedSearch(next);
    setPage(1);
  };

  return (
    <WorkspaceLayout
      role="support"
      title="Support Tickets"
      subtitle="General help cases - account, order and technical problems that are not disputes"
      sidebar={<SupportNav />}
    >
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-8">
        {/* Status pools: the tabs are filters the RPC owns, not client slices. */}
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((item) => {
            const count = item.countKey && counts ? counts[item.countKey as keyof typeof counts] : undefined;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                data-testid={`ticket-tab-${item.key}`}
                onClick={() => changeTab(item.key)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors',
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                <span>{item.label}</span>
                {count !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-extrabold',
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => applySearch(event.target.value)}
              placeholder="Search subject, customer, VD- number…"
              aria-label="Search tickets"
              className="w-full rounded-full border border-slate-200 bg-white py-2 pr-3 pl-9 text-xs text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
        </div>

        {queue.isError ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-2 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-xs font-medium text-rose-900"
          >
            <span>{readError}</span>
            <button
              type="button"
              disabled={queue.isFetching}
              onClick={() => void queue.refetch()}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {queue.isFetching ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        ) : queue.isLoading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-6 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
            Reading the ticket queue…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-10 text-center">
            <Inbox className="mb-2 h-10 w-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No tickets in this pool</h3>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              {appliedSearch
                ? `No ticket matches “${appliedSearch}” in this pool.`
                : 'Tickets customers open from their account page will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Age</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((ticket) => (
                    <tr
                      key={ticket.id}
                      data-testid={`ticket-row-${ticket.id}`}
                      onClick={() => navigate(`/support/tickets/${ticket.id}`)}
                      className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-sky-50/40"
                    >
                      <td className="px-4 py-3 font-mono font-bold whitespace-nowrap text-slate-900">
                        {ticket.ticketNo}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{ticket.customerName || 'Customer'}</div>
                        <div className="text-[11px] text-slate-400">{ticket.customerEmail}</div>
                      </td>
                      <td className="max-w-[340px] px-4 py-3">
                        <div className="truncate font-semibold text-slate-800">{ticket.subject}</div>
                        <div className="truncate text-[11px] text-slate-400">
                          {ticket.lastMessagePreview ?? 'No messages yet'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TicketPriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <TicketStatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {ticket.agentName ?? <span className="text-slate-400">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap text-slate-600">
                        {age(ticket.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{stamp(ticket.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600">
                <span>
                  Page {queue.data?.page ?? page} of {totalPages} · {total} tickets
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Previous page of the ticket queue"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="cursor-pointer rounded-lg border border-slate-200 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next page of the ticket queue"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    className="cursor-pointer rounded-lg border border-slate-200 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
