import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Inbox,
  MessageSquare,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Ticket,
  Truck,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  useDisputeMessages,
  usePostDisputeMessage,
  useVendorDisputes,
} from '../features/vendor/hooks/useVendorDisputes';
import type { DisputeStatus, VendorDispute } from '../features/vendor/api/disputes';

const STATUS_LABEL: Record<DisputeStatus, string> = {
  open: 'Open',
  under_review: 'Under review',
  escalated: 'Escalated',
  resolved_refund: 'Resolved · refund',
  resolved_denied: 'Resolved · denied',
};

const STATUS_STYLE: Record<DisputeStatus, string> = {
  open: 'bg-amber-50 text-amber-800 border-amber-200',
  under_review: 'bg-blue-50 text-blue-800 border-blue-200',
  escalated: 'bg-red-50 text-red-800 border-red-200',
  resolved_refund: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  resolved_denied: 'bg-slate-100 text-slate-700 border-slate-200',
};

const awaitingDecision = (status: DisputeStatus) =>
  status === 'open' || status === 'under_review' || status === 'escalated';

const dateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** One case's exchange, loaded when the seller opens it so the list stays a single query. */
const DisputeThread: React.FC<{ dispute: VendorDispute }> = ({ dispute }) => {
  const messages = useDisputeMessages(dispute.id);
  const reply = usePostDisputeMessage();
  const [draft, setDraft] = useState('');

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    await reply.mutateAsync({ disputeId: dispute.id, body });
    setDraft('');
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Reason filed
          </span>
          <span className="font-mono text-[10px] text-slate-400">{dispute.id.slice(0, 8)}</span>
        </div>
        <p className="font-semibold text-slate-800 leading-relaxed">{dispute.reason}</p>
        <p className="text-[11px] text-slate-500">
          Opened by {dispute.customerName || 'the buyer'} · {dateTime(dispute.createdAt)}
        </p>
        {dispute.resolutionNote && (
          <p className="pt-1.5 border-t border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-900">Staff resolution note: </span>
            {dispute.resolutionNote}
            {dispute.resolutionAmount !== undefined && (
              <span className="ml-1 font-mono">· {dispute.resolutionAmount.toFixed(2)} recorded</span>
            )}
          </p>
        )}
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {messages.isLoading && <p className="text-slate-400">Loading the exchange…</p>}
        {messages.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-800">
            {messages.error.message}
          </p>
        )}
        {messages.data?.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 p-3 text-slate-400">
            No one has written in this case yet.
          </p>
        )}
        {messages.data?.map((message) => (
          <div
            key={message.id}
            className={`rounded-xl border p-3 space-y-1 ${
              message.isInternalNote
                ? 'border-dashed border-violet-200 bg-violet-50/60'
                : message.senderRole === 'vendor'
                  ? 'border-orange-100 bg-orange-50/50'
                  : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-slate-900">
                {message.senderName || (message.senderRole === 'customer' ? 'Buyer' : 'Vendora')}
              </span>
              <span className="text-[10px] text-slate-400">{dateTime(message.createdAt)}</span>
            </div>
            {message.isInternalNote && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
                Internal note — staff wrote it, your copy shows because the thread is shared
              </span>
            )}
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{message.body}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-100">
        <textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add the tracking numbers, delivery proof or clarification your side of the case needs…"
          className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-[#FF7A1A]"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400">
            Posted as your store. Only staff can change the status or close a case.
          </span>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!draft.trim() || reply.isPending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#FF7A1A] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#EA580C] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
            {reply.isPending ? 'Sending…' : 'Send reply'}
          </button>
        </div>
        {reply.isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-800">
            {reply.error.message}
          </p>
        )}
      </div>
    </div>
  );
};

export const VendorSupportPage: React.FC = () => {
  const disputes = useVendorDisputes();
  const [filter, setFilter] = useState('');
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);

  const rows = disputes.data ?? [];
  const awaitingCount = rows.filter((d) => awaitingDecision(d.status)).length;
  const urgentCount = rows.filter((d) => d.urgency === 'urgent' && awaitingDecision(d.status)).length;

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (d) =>
        d.reason.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        STATUS_LABEL[d.status].toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q),
    );
  }, [rows, filter]);

  const openCase = rows.find((d) => d.id === openCaseId) ?? null;

  return (
    <WorkspaceLayout role="vendor" sidebar={<VendorNav />}>
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-black font-outfit tracking-tight text-slate-900">
            Help &amp; Support
          </h1>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-3xl">
            This is your arbitration queue: the cases that name{' '}
            <strong className="text-slate-700">your store</strong>, read live from the{' '}
            <code className="font-mono text-[11px]">disputes</code> table. This build has no ticket
            desk, knowledge base or live-chat queue, so anything not on this page is not something
            a seller can do.
          </p>
        </div>

        {/* ── Counts taken from the queue itself ──────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Cases naming your store',
              value: rows.length,
              hint: 'Every dispute row whose vendor id is yours',
            },
            {
              label: 'Awaiting a decision',
              value: awaitingCount,
              hint: 'Open, under review or escalated',
            },
            {
              label: 'Flagged urgent by the buyer',
              value: urgentCount,
              hint: `${rows.length - awaitingCount} resolved or denied`,
            },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {tile.label}
              </div>
              <div className="text-2xl font-black text-slate-900 tabular-nums">{tile.value}</div>
              <div className="text-[11px] text-slate-500">{tile.hint}</div>
            </div>
          ))}
        </div>

        {/* ── Queue ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">Case queue</h2>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by reason, buyer, status or case id"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs placeholder-slate-400 focus:outline-none focus:border-[#FF7A1A]"
              />
            </div>
          </div>

          {disputes.isLoading && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              Loading your cases…
            </div>
          )}

          {disputes.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4" />
                The queue could not be read
              </div>
              <p className="leading-relaxed">{disputes.error.message}</p>
              <p className="text-[11px] text-red-700">
                Nothing here falls back to a sample file — the list stays empty until the read
                succeeds.
              </p>
            </div>
          )}

          {!disputes.isLoading && !disputes.error && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center space-y-2">
              <Inbox className="mx-auto h-6 w-6 text-slate-300" />
              <div className="text-sm font-bold text-slate-900">
                {rows.length === 0 ? 'No case names your store' : 'No case matches the filter'}
              </div>
              <p className="mx-auto max-w-md text-xs text-slate-500 leading-relaxed">
                {rows.length === 0
                  ? 'A dispute is opened by the buyer of an order, never by the seller: the insert policy only accepts a row whose customer id is the signed-in account. An empty queue means nothing is against you.'
                  : 'Widen the filter to see the rest of the queue.'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((dispute) => (
              <div
                key={dispute.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_STYLE[dispute.status]}`}
                      >
                        {STATUS_LABEL[dispute.status]}
                      </span>
                      {dispute.urgency === 'urgent' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          Urgent
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-slate-400">
                        {dispute.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                      {dispute.reason}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {dispute.customerName || 'Buyer'} · opened {dateTime(dispute.createdAt)} ·
                      last touched {dateTime(dispute.updatedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {dispute.orderGroupId && (
                      <Link
                        to={`/vendor/orders/${dispute.orderGroupId}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Order
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setOpenCaseId(dispute.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Open thread
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Where the work actually happens ─────────────────────── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              to: '/vendor/messages',
              icon: MessageSquare,
              title: 'Customer Messages',
              body: 'Buyer threads your store is party to. Answering there is the fastest way to stop a question becoming a case.',
            },
            {
              to: '/vendor/returns',
              icon: RotateCcw,
              title: 'Returns',
              body: 'Return requests live on the sub-order rows, and approving or refusing one happens on that page.',
            },
            {
              to: '/vendor/shipping-settings',
              icon: Truck,
              title: 'Shipping & Origin',
              body: 'Handling time, carriers and origin set the delivery promise a case is usually arguing about.',
            },
            {
              to: '/vendor/store-settings',
              icon: Settings,
              title: 'Store Settings',
              body: 'Return window, restocking fee and vacation mode — the policy staff read before deciding a case.',
            },
          ].map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2 hover:border-slate-300 hover:shadow-xs transition-all"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <card.icon className="h-4 w-4" />
              </div>
              <div className="text-xs font-bold text-slate-900">{card.title}</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{card.body}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF7A1A]">
                Open
                <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>

        {/* ── Boundaries ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">What this queue can and cannot do</h2>
          </div>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-[11px] text-slate-600 leading-relaxed md:grid-cols-2">
            <li>
              <span className="font-bold text-slate-900">You can reply.</span> The message policy
              accepts a post from a party to the case, sent under your own account id.
            </li>
            <li>
              <span className="font-bold text-slate-900">You cannot change status.</span> Updates
              and <code className="font-mono">resolve_dispute</code> are admin and support only.
            </li>
            <li>
              <span className="font-bold text-slate-900">You cannot open a case.</span> The insert
              policy requires the buyer to be the filer, so there is no seller ticket form here.
            </li>
            <li>
              <span className="font-bold text-slate-900">No ticket history, no SLA meters.</span>{' '}
              There is no ticket table in this schema, so there is nothing to count or list.
            </li>
            <li>
              <span className="font-bold text-slate-900">Staff internal notes reach you.</span> The
              shared-thread policy does not filter them; the thread labels each one.
            </li>
            <li>
              <span className="font-bold text-slate-900">Evidence is not uploadable here.</span> A
              case row carries <code className="font-mono">evidence_photos</code>, but no policy
              lets a seller write it.
            </li>
          </ul>
        </div>

        {/* ── Thread dialog ───────────────────────────────────────── */}
        <Dialog
          open={openCase !== null}
          onOpenChange={(next) => {
            if (!next) setOpenCaseId(null);
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-[#FF7A1A]" />
                Dispute thread
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Read-only status, writable message — the decision stays with Vendora staff.
              </DialogDescription>
            </DialogHeader>
            {openCase && <DisputeThread dispute={openCase} />}
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
