import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, LifeBuoy, Loader2, Ticket } from 'lucide-react';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type SupportTicketCategory,
  type SupportTicketPriority,
} from '../features/support/api/tickets';
import { TicketThread } from '../features/support/components/TicketThread';
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from '../features/support/components/TicketStatusBadge';
import { useMyTickets, useTicketActions, useTicketDetail } from '../features/support/hooks/useTickets';
import { useOrders } from '../features/orders/hooks/useOrders';
import { useAuthStore } from '../store/auth-store';
import { cn } from '../lib/utils';

/**
 * My Support Tickets (/account/support) - the customer's side of the general
 * ticket system. Disputes live on their own page; everything else a buyer
 * needs help with starts here, gets a real ticket number (VD-000123), and is
 * answered in a thread the support desk works. Internal staff notes are
 * never part of what this page can read - RLS withholds them.
 */

const stamp = (iso: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const categoryLabel = (value: string): string =>
  TICKET_CATEGORIES.find((c) => c.value === value)?.label ?? 'Something else';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-shadow focus:border-sun-orange focus:ring-2 focus:ring-orange-500/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export const AccountSupportPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tickets = useMyTickets();
  const orders = useOrders();
  const actions = useTicketActions();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('other');
  const [priority, setPriority] = useState<SupportTicketPriority>('normal');
  const [orderId, setOrderId] = useState('');
  const [body, setBody] = useState('');
  const [createdNo, setCreatedNo] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const detail = useTicketDetail(selectedId);
  const selectedSummary = (tickets.data ?? []).find((t) => t.id === selectedId) ?? null;
  const selected = detail.data?.ticket ?? null;

  const createError =
    actions.createTicket.isError && actions.createTicket.error instanceof Error
      ? actions.createTicket.error.message
      : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (actions.createTicket.isPending) return;
    actions.createTicket.mutate(
      {
        subject: subject.trim(),
        category,
        body: body.trim(),
        priority,
        orderId: orderId || null,
      },
      {
        onSuccess: (result) => {
          setCreatedNo(result.ticketNo);
          setSubject('');
          setBody('');
          setOrderId('');
          setCategory('other');
          setPriority('normal');
          setSelectedId(result.id);
        },
      },
    );
  };

  if (!user) {
    return (
      <div className="rounded-3xl border border-white/80 bg-white/80 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <LifeBuoy className="mx-auto mb-2 h-10 w-10 text-slate-400" aria-hidden="true" />
        <h1 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
          Sign in to contact support
        </h1>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          Support tickets are tied to your account, so the team can see your orders and reply in
          one thread.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-sun-orange-600"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-outfit text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
          Support Tickets
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          For order disputes use Disputes &amp; Claims. For anything else - an account problem, a
          question about an order, something technical - open a ticket here and the support team
          will reply in the thread.
        </p>
      </div>

      {/* ── Open a ticket ─────────────────────────────────────────────────── */}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-3xl border border-white/80 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
      >
        <h2 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">Open a ticket</h2>

        {createdNo && (
          <p
            role="status"
            data-testid="ticket-created"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Ticket {createdNo} is open. The support team can see it now, and their replies will
            appear in the thread below.
          </p>
        )}
        {createError && (
          <p role="alert" className="rounded-xl border-2 border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
            {createError}
          </p>
        )}

        <div>
          <label htmlFor="ticket-subject" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
            Subject
          </label>
          <input
            id="ticket-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            maxLength={140}
            placeholder="A short line about the problem"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="ticket-category" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
              Category
            </label>
            <select
              id="ticket-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as SupportTicketCategory)}
              className={inputClass}
            >
              {TICKET_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ticket-priority" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
              Priority
            </label>
            <select
              id="ticket-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as SupportTicketPriority)}
              className={inputClass}
            >
              {TICKET_PRIORITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ticket-order" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
              Related order (optional)
            </label>
            <select
              id="ticket-order"
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              className={inputClass}
            >
              <option value="">No specific order</option>
              {(orders.data?.orderGroups ?? []).map((order) => (
                <option key={order.id} value={order.id}>
                  Order #{order.id.slice(0, 8).toUpperCase()} ·{' '}
                  {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="ticket-body" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
            What happened?
          </label>
          <textarea
            id="ticket-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            rows={4}
            placeholder="Describe the problem and what you have already tried."
            className={cn(inputClass, 'resize-none')}
          />
        </div>

        <button
          type="submit"
          disabled={actions.createTicket.isPending || subject.trim() === '' || body.trim() === ''}
          className="inline-flex items-center gap-2 rounded-full bg-sun-orange px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-sun-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actions.createTicket.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Ticket className="h-3.5 w-3.5" />
          )}
          <span>Open ticket</span>
        </button>
      </form>

      {/* ── My tickets ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">Your tickets</h2>

        {tickets.isLoading ? (
          <div className="space-y-3" aria-label="Loading your tickets">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800" />
            ))}
          </div>
        ) : tickets.isError ? (
          <div className="rounded-3xl border border-white/80 bg-white/80 p-8 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
              Your tickets could not be loaded
            </h3>
            <p className="mt-1 text-xs text-slate-500">Please refresh the page in a moment.</p>
          </div>
        ) : !tickets.data || tickets.data.length === 0 ? (
          <div className="rounded-3xl border border-white/80 bg-white/80 p-8 text-center backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <Ticket className="mx-auto mb-2 h-10 w-10 text-slate-400" aria-hidden="true" />
            <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
              No tickets yet
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              When you open a ticket it will be listed here with its number and status, and you can
              follow the whole conversation in one place.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.data.map((ticket) => {
              const active = selectedId === ticket.id;
              return (
                <article
                  key={ticket.id}
                  className={cn(
                    'rounded-3xl border bg-white/80 backdrop-blur-xl dark:bg-slate-900/80',
                    active ? 'border-sun-orange/60 shadow-md' : 'border-white/80 dark:border-white/10',
                  )}
                >
                  <button
                    type="button"
                    data-testid={`my-ticket-${ticket.id}`}
                    aria-expanded={active}
                    onClick={() => setSelectedId(active ? null : ticket.id)}
                    className="w-full cursor-pointer p-5 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {ticket.ticketNo}
                      </span>
                      <TicketStatusBadge status={ticket.status} />
                      <TicketPriorityBadge priority={ticket.priority} />
                      <span className="text-[11px] font-semibold text-slate-400">
                        {categoryLabel(ticket.category)}
                      </span>
                      <span className="ml-auto text-[11px] text-slate-400">
                        Updated {stamp(ticket.updatedAt)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{ticket.subject}</h3>
                    {ticket.lastMessagePreview && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{ticket.lastMessagePreview}</p>
                    )}
                    <p className="mt-2 text-[11px] text-slate-400">
                      {ticket.agentName
                        ? `Looked after by ${ticket.agentName}`
                        : 'Waiting for an agent to pick it up'}
                      {' · '}
                      {ticket.messages} message{ticket.messages === 1 ? '' : 's'}
                    </p>
                  </button>

                  {active && (
                    <div className="border-t border-slate-100 px-5 pt-4 pb-5 dark:border-slate-800">
                      {detail.isLoading ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin text-sun-orange" />
                          Reading this conversation…
                        </div>
                      ) : detail.isError || !selected ? (
                        <p role="alert" className="text-xs font-medium text-rose-700">
                          This conversation could not be loaded. Please try again in a moment.
                        </p>
                      ) : (
                        <TicketThread
                          messages={detail.data?.messages ?? []}
                          canReply={selected.status !== 'closed'}
                          pending={actions.replyTicket.isPending}
                          error={
                            actions.replyTicket.isError && actions.replyTicket.error instanceof Error
                              ? actions.replyTicket.error.message
                              : null
                          }
                          onSend={async (replyBody) => {
                            try {
                              await actions.replyTicket.mutateAsync({ ticketId: selected.id, body: replyBody });
                              return true;
                            } catch {
                              // The mutation's error renders above the
                              // composer; false keeps the draft alive.
                              return false;
                            }
                          }}
                          className="border-slate-200/80 shadow-none"
                        />
                      )}
                      {selectedSummary && selectedSummary.agentName && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          Replies from {selectedSummary.agentName} appear in this thread as Support.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
