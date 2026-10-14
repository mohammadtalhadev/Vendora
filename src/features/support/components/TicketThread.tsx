import React, { useState } from 'react';
import { Loader2, Lock, MessageSquareOff, Send } from 'lucide-react';
import type { SupportTicketMessage } from '../api/tickets';
import { cn } from '../../../lib/utils';

/**
 * The ticket thread, shared by the support desk's ticket page and the
 * customer's own view. Presentation mirrors DisputeConversationThread (cards,
 * amber internal notes) so both desks read as one product. Internal notes are
 * marked - and, on the customer side, they never arrive here at all: RLS
 * withholds them before this component renders.
 */

const ROLE_META: Record<
  SupportTicketMessage['authorRole'],
  { label: string; badge: string }
> = {
  customer: { label: 'Customer', badge: 'bg-slate-100 text-slate-700' },
  support: { label: 'Support', badge: 'bg-sky-100/90 text-sky-900' },
  admin: { label: 'Admin', badge: 'bg-orange-100/80 text-orange-900' },
};

const stamp = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export interface TicketThreadProps {
  messages: SupportTicketMessage[];
  loading?: boolean;
  /** Closed tickets refuse replies in the RPC; the form hides rather than fails. */
  canReply: boolean;
  /** Only staff may mark a reply internal; customers never see the toggle. */
  allowInternalNote?: boolean;
  pending?: boolean;
  error?: string | null;
  onSend: (body: string, internalNote: boolean) => void;
  className?: string;
}

export const TicketThread: React.FC<TicketThreadProps> = ({
  messages,
  loading,
  canReply,
  allowInternalNote,
  pending,
  error,
  onSend,
  className,
}) => {
  const [draft, setDraft] = useState('');
  const [internalNote, setInternalNote] = useState(false);

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || pending) return;
    onSend(body, allowInternalNote ? internalNote : false);
    setDraft('');
    setInternalNote(false);
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs',
        className,
      )}
    >
      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/20 p-4 sm:p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
            Reading this conversation…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MessageSquareOff className="mb-2 h-10 w-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No messages yet</h3>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              The opening message will appear here once the ticket is read.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const meta = ROLE_META[message.authorRole];
            return (
              <article
                key={message.id}
                data-testid={message.internalNote ? 'ticket-internal-note' : `ticket-message-${message.id}`}
                className={cn(
                  'rounded-2xl p-4',
                  message.internalNote
                    ? 'border border-amber-300/80 bg-amber-50/90 ring-1 ring-amber-300/40'
                    : 'border border-slate-200/80 bg-white shadow-xs',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
                      meta.badge,
                    )}
                  >
                    {meta.label}
                  </span>
                  {message.internalNote && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                      <Lock className="h-3 w-3" />
                      Internal note - the customer cannot see this
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-slate-400">{stamp(message.createdAt)}</span>
                </div>
                <p
                  className={cn(
                    'mt-2 whitespace-pre-wrap text-sm leading-relaxed',
                    message.internalNote ? 'font-medium text-amber-950' : 'text-slate-700',
                  )}
                >
                  {message.body}
                </p>
              </article>
            );
          })
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-800"
        >
          {error}
        </div>
      )}

      {canReply ? (
        <form onSubmit={send} className="border-t border-slate-200/90 bg-white p-3.5 sm:p-4">
          {allowInternalNote && (
            <label className="mb-2.5 flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 select-none">
              <input
                type="checkbox"
                data-testid="ticket-internal-note-toggle"
                checked={internalNote}
                onChange={(event) => setInternalNote(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-amber-500"
              />
              Internal note (only staff can see it, and it does not change the status)
            </label>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder={internalNote ? 'Write an internal note…' : 'Write a reply…'}
              className={cn(
                'flex-1 resize-none rounded-xl border px-3 py-2 text-sm text-slate-800 outline-none transition-shadow focus:ring-2',
                internalNote
                  ? 'border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:ring-amber-500/30'
                  : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/30',
              )}
            />
            <button
              type="submit"
              disabled={pending || draft.trim() === ''}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>{internalNote ? 'Add note' : 'Send reply'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t border-slate-200/90 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
          This ticket is closed, so it no longer accepts replies.
        </div>
      )}
    </div>
  );
};
