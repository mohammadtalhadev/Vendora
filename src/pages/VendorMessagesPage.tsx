import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Search,
  Send,
  Download,
  MessageSquare,
  Inbox,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import {
  useMarkThreadRead,
  useSendThreadMessage,
  useSetThreadStatus,
  useThreadMessages,
  useVendorThreads,
} from '../features/vendor/hooks/useVendorMessages';
import type {
  ThreadChannel,
  ThreadStatus,
  VendorThreadSummary,
} from '../features/vendor/api/messages';

/** Threads are labelled by the buyer's context, not by our own subject lines. */
const CHANNEL_LABEL: Record<ThreadChannel, string> = {
  order_inquiry: 'Order',
  return_rma: 'Return / RMA',
  product_question: 'Listing',
  dispute: 'Dispute',
};

/** Static class maps: Tailwind cannot generate interpolated class names. */
const STATUS_STYLE: Record<ThreadStatus, string> = {
  open: 'bg-slate-100 text-slate-700 border-slate-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
  escalated: 'bg-violet-50 text-violet-800 border-violet-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const KPI_GRID = 'rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs';

const STATUSES: ThreadStatus[] = ['pending', 'urgent', 'escalated', 'resolved'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function clockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return dateLabel(iso);
}

/**
 * A reply is due when the newest message came from the buyer and nobody has closed the
 * thread. There is no response-time metric stored, so the inbox says this rather than
 * quoting an SLA.
 */
function isReplyDue(thread: VendorThreadSummary): boolean {
  return (
    thread.status !== 'resolved' &&
    (thread.lastMessage?.senderRole === 'customer' || thread.unreadCount > 0)
  );
}

const QUICK_REPLIES = [
  {
    label: 'Order status',
    body: 'Your order is still with us and moving through the usual packing queue. I will post the tracking number here the moment the courier scans the parcel.',
  },
  {
    label: 'Product answer',
    body: 'Thanks for asking before buying. Here is what that variant includes, and I can confirm the rest from the supplier sheet if you need it.',
  },
  {
    label: 'Return next step',
    body: 'I can open the return from the Returns page once the buyer requests it on the order. After I approve it the store issues the RMA and the refund amount is booked automatically.',
  },
];

type Filter = 'all' | 'unread' | 'needs-reply' | 'resolved';

export const VendorMessagesPage: React.FC = () => {
  const threadsQuery = useVendorThreads();
  const markRead = useMarkThreadRead();
  const sendMessage = useSendThreadMessage();
  const setStatus = useSetThreadStatus();

  const { threadId: linkedThreadId } = useParams();
  const [activeId, setActiveId] = useState<string | null>(linkedThreadId ?? null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [draft, setDraft] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const threads = threadsQuery.data ?? [];
  const active = threads.find((thread) => thread.id === activeId) ?? threads[0] ?? null;
  const messagesQuery = useThreadMessages(active?.id ?? '');
  const messages = messagesQuery.data ?? [];

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  // Opening a thread clears the buyer's unread marks; the mutation refreshes both queries.
  useEffect(() => {
    if (active && active.unreadCount > 0) markRead.mutate(active.id);
    setFormError(null);
  }, [active?.id]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, active?.id]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return threads.filter((thread) => {
      if (filter === 'unread' && thread.unreadCount === 0) return false;
      if (filter === 'needs-reply' && !isReplyDue(thread)) return false;
      if (filter === 'resolved' && thread.status !== 'resolved') return false;
      if (!query) return true;
      const haystack = [
        thread.customerName,
        CHANNEL_LABEL[thread.channel],
        thread.orderRef ?? '',
        thread.productRef ?? '',
        thread.lastMessage?.body ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [threads, search, filter]);

  const unreadTotal = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);
  const dueTotal = threads.filter(isReplyDue).length;
  const hotTotal = threads.filter(
    (thread) => thread.status === 'urgent' || thread.status === 'escalated',
  ).length;

  const handleSend = () => {
    const body = draft.trim();
    if (!active || !body) return;
    setFormError(null);
    sendMessage.mutate(
      { threadId: active.id, body },
      {
        onSuccess: () => {
          setDraft('');
          showToast('Reply sent to the buyer');
        },
        onError: (error: Error) => setFormError(error.message),
      },
    );
  };

  const handleStatus = (status: ThreadStatus) => {
    if (!active) return;
    setFormError(null);
    setStatus.mutate(
      { threadId: active.id, status },
      {
        onSuccess: () => showToast(`Marked ${status}`),
        onError: (error: Error) => setFormError(error.message),
      },
    );
  };

  const exportTranscript = () => {
    if (!active || messages.length === 0) return;
    const lines = [
      `Vendora conversation · ${active.customerName}`,
      `Channel: ${CHANNEL_LABEL[active.channel]}`,
      active.orderRef ? `Order: ${active.orderRef}` : '',
      '',
      ...messages.map(
        (message) =>
          `[${new Date(message.createdAt).toLocaleString()}] ${message.senderName} (${message.senderRole}): ${message.body}`,
      ),
    ].filter(Boolean);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `vendora-thread-${active.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('Transcript downloaded');
  };

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav />}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              COMMUNICATIONS <span className="text-slate-300">/</span> MESSAGES
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Customer Messages
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Buyers open a thread from an order, a return or a listing. You can reply and change
              its status. You cannot start one: the insert policy requires the buyer&apos;s own
              account, and the transcript has no private-note column or file uploader.
            </p>
          </div>
          <button
            type="button"
            onClick={exportTranscript}
            disabled={messages.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Export transcript
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={KPI_GRID}>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Conversations</span>
              <Inbox className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{threads.length}</div>
            <p className="mt-2 text-[11px] text-slate-500">
              Threads attached to this store&apos;s orders and listings.
            </p>
          </div>

          <div className={KPI_GRID}>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Unread</span>
              <MessageSquare className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{unreadTotal}</div>
            <p className="mt-2 text-[11px] text-slate-500">
              Buyer messages you have not opened yet. Marking read happens when you open the
              thread.
            </p>
          </div>

          <div className={KPI_GRID}>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Awaiting your reply</span>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{dueTotal}</div>
            <p className="mt-2 text-[11px] text-slate-500">
              The newest message is from the buyer and the thread is not resolved. No response-time
              target is stored.
            </p>
          </div>

          <div className={KPI_GRID}>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Urgent / escalated</span>
              <AlertTriangle className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{hotTotal}</div>
            <p className="mt-2 text-[11px] text-slate-500">
              Statuses you set yourself. Staff see the same thread through the admin inbox.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 xl:col-span-3 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col h-[640px]">
            <div className="p-3.5 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search buyer, order, message"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold">
                {(
                  [
                    ['all', `All (${threads.length})`],
                    ['unread', `Unread (${unreadTotal})`],
                    ['needs-reply', `Reply due (${dueTotal})`],
                    ['resolved', `Resolved (${threads.filter((t) => t.status === 'resolved').length})`],
                  ] as [Filter, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`rounded-md px-2.5 py-1 ${
                      filter === key
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {threadsQuery.isLoading && (
                <div className="p-4 text-xs text-slate-500">Loading your conversations…</div>
              )}
              {threadsQuery.error && (
                <div className="p-4 text-xs text-rose-700">
                  {(threadsQuery.error as Error).message}
                </div>
              )}
              {!threadsQuery.isLoading && filtered.length === 0 && (
                <div className="p-4 text-xs text-slate-500">
                  {threads.length === 0
                    ? 'No buyer has opened a conversation with this store yet. Threads appear when a buyer writes from an order, a return or a listing.'
                    : 'No conversation matches this filter.'}
                </div>
              )}
              {filtered.map((thread) => {
                const isSelected = active?.id === thread.id;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setActiveId(thread.id)}
                    className={`w-full p-3.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-slate-100/80 border-l-3 border-slate-900'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                          {initials(thread.customerName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-slate-900">
                            {thread.customerName}
                          </span>
                          <span className="block truncate font-mono text-[10px] text-slate-400">
                            {thread.orderRef ?? thread.productRef ?? CHANNEL_LABEL[thread.channel]}
                          </span>
                        </span>
                      </div>
                      <span className="shrink-0 text-right">
                        <span className="block text-[10px] text-slate-400">
                          {relativeTime(thread.updatedAt)}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span className="mt-1 inline-block rounded-full bg-slate-900 px-1.5 text-[9px] font-bold text-white">
                            {thread.unreadCount}
                          </span>
                        )}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-600">
                      {thread.lastMessage
                        ? `${thread.lastMessage.senderRole === 'vendor' ? 'You: ' : ''}${thread.lastMessage.body}`
                        : 'No messages in this thread yet.'}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                        {CHANNEL_LABEL[thread.channel]}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLE[thread.status]}`}
                      >
                        {thread.status}
                      </span>
                      {isReplyDue(thread) && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800">
                          Reply due
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col h-[640px] overflow-hidden">
            {!active ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-500">
                Select a conversation to read it. A store cannot start a thread — the buyer has to
                write first.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {initials(active.customerName)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {active.customerName}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[active.status]}`}
                        >
                          {active.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {CHANNEL_LABEL[active.channel]}
                        {active.orderRef ? ` · ${active.orderRef}` : ''}
                        {active.productRef ? ` · ${active.productRef}` : ''} · opened{' '}
                        {dateLabel(active.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Set status
                    </span>
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatus(status)}
                        disabled={active.status === status || setStatus.isPending}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          active.status === status
                            ? STATUS_STYLE[status]
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4">
                  {messagesQuery.isLoading && (
                    <div className="text-center text-xs text-slate-500">Loading messages…</div>
                  )}
                  {messagesQuery.error && (
                    <div className="text-center text-xs text-rose-700">
                      {(messagesQuery.error as Error).message}
                    </div>
                  )}
                  {!messagesQuery.isLoading && messages.length === 0 && (
                    <div className="text-center text-xs text-slate-500">
                      This thread has no messages stored yet.
                    </div>
                  )}
                  {messages.map((message) => {
                    const mine = message.senderRole !== 'customer';
                    return (
                      <div
                        key={message.id}
                        className={`flex max-w-xl items-start gap-2.5 ${
                          mine ? 'ml-auto flex-row-reverse' : ''
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            mine ? 'bg-[#EA6C13]' : 'bg-slate-900'
                          }`}
                        >
                          {mine ? 'YOU' : initials(message.senderName)}
                        </span>
                        <div className="min-w-0">
                          <div
                            className={`rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs ${
                              mine
                                ? 'rounded-tr-xs bg-slate-900 text-white'
                                : 'rounded-tl-xs border border-slate-200/80 bg-white text-slate-800'
                            }`}
                          >
                            {message.body}
                          </div>
                          <div
                            className={`mt-1 text-[10px] text-slate-400 ${
                              mine ? 'pr-1 text-right' : 'pl-1'
                            }`}
                          >
                            {message.senderName} · {clockTime(message.createdAt)} ·{' '}
                            {dateLabel(message.createdAt)}
                            {message.attachments.length > 0 && (
                              <>
                                {' · '}
                                {message.attachments.map((url) => (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline"
                                  >
                                    attachment
                                  </a>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2.5 border-t border-slate-200 bg-white p-3.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Prefill
                    </span>
                    {QUICK_REPLIES.map((reply) => (
                      <button
                        key={reply.label}
                        type="button"
                        onClick={() => setDraft(reply.body)}
                        className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {reply.label}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-2.5 focus-within:border-slate-900">
                    <textarea
                      rows={3}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Reply to the buyer… (Ctrl+Enter to send)"
                      className="w-full resize-none text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                      <span className="text-[10px] text-slate-400">
                        Sent as your store name, straight to the messages table.
                      </span>
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={draft.trim().length === 0 || sendMessage.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span>{sendMessage.isPending ? 'Sending…' : 'Send reply'}</span>
                        <Send className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {formError && (
                    <div className="flex items-start justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                      <span>{formError}</span>
                      <button type="button" onClick={() => setFormError(null)} aria-label="Dismiss">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 text-[11px] leading-relaxed text-slate-500 shadow-xs">
          <div className="font-bold uppercase tracking-wider text-slate-400">
            What this page can and cannot do
          </div>
          <ul className="mt-2 space-y-1">
            <li>
              · Reply as the store, move a thread between pending, urgent, escalated and resolved,
              and export the transcript.
            </li>
            <li>
              · Start a conversation. <code>threads_insert_customer</code> only lets the buyer's own
              account create a thread, so an empty inbox stays empty until they write.
            </li>
            <li>
              · Add private staff notes or upload attachments. The messages table has an
              <code>attachments</code> column but no uploader wired to it, and no column for a note
              the buyer cannot read.
            </li>
            <li>
              · Track first-response time or CSAT. Nothing in the schema stores when a reply landed
              relative to the question, so no target or score is shown.
            </li>
          </ul>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </WorkspaceLayout>
  );
};
