import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Scale,
  Send,
  Plus,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth-store';
import { createDispute, fetchMyDisputes, postDisputeMessage } from '../features/orders/api/disputes';
import type { Dispute, DisputeStatus } from '../types/domain';

export const CustomerDisputesPage: React.FC = () => {
  const { id: disputeIdParam } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const disputesQuery = useQuery({
    queryKey: ['my-disputes', user?.id ?? 'anon'],
    queryFn: ({ signal }) => fetchMyDisputes(signal),
    enabled: Boolean(user),
  });
  const disputes: Dispute[] = disputesQuery.data ?? [];

  const [selectedDisputeId, setSelectedDisputeId] = useState<string>(disputeIdParam || '');

  const [replyMessage, setReplyMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isFilingNew, setIsFilingNew] = useState(false);
  const fileClaimTriggerRef = useRef<HTMLButtonElement>(null);
  const fileClaimPanelRef = useRef<HTMLDivElement>(null);
  const fileClaimWasOpenRef = useRef(false);

  // Focus the File-a-Claim dialog when it opens and return focus to its trigger when it
  // closes, without moving focus on first render.
  useEffect(() => {
    if (isFilingNew && !fileClaimWasOpenRef.current) {
      fileClaimPanelRef.current?.focus();
    } else if (!isFilingNew && fileClaimWasOpenRef.current) {
      fileClaimTriggerRef.current?.focus();
    }
    fileClaimWasOpenRef.current = isFilingNew;
  }, [isFilingNew]);
  const [newReason, setNewReason] = useState('Item arrived defective or damaged');
  const [newSubOrderId, setNewSubOrderId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const activeDispute = disputes.find((d) => d.id === selectedDisputeId) || disputes[0];

  const replyMutation = useMutation({
    mutationFn: ({ disputeId, content }: { disputeId: string; content: string }) =>
      postDisputeMessage(disputeId, content),
    onSuccess: () => {
      setFormError(null);
      setReplyMessage('');
      void queryClient.invalidateQueries({ queryKey: ['my-disputes'] });
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to send your message.'),
  });

  const createMutation = useMutation({
    mutationFn: createDispute,
    onSuccess: (dispute) => {
      setFormError(null);
      setSelectedDisputeId(dispute.id);
      setIsFilingNew(false);
      setNewNotes('');
      void queryClient.invalidateQueries({ queryKey: ['my-disputes'] });
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to file your dispute.'),
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeDispute) return;
    replyMutation.mutate({ disputeId: activeDispute.id, content: replyMessage });
  };

  const handleCreateDispute = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ subOrderId: newSubOrderId, reason: newReason, notes: newNotes });
  };

  const getStatusBadge = (status: DisputeStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-3 py-1 text-[11px] font-bold border border-blue-200 dark:border-blue-900/50">
            Open
          </span>
        );
      case 'under_review':
        return (
          <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-3 py-1 text-[11px] font-bold border border-amber-200 dark:border-amber-900/50">
            Under Review
          </span>
        );
      case 'escalated':
        return (
          <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-3 py-1 text-[11px] font-bold border border-purple-200 dark:border-purple-900/50">
            Escalated
          </span>
        );
      case 'resolved_refund':
        return (
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-[11px] font-bold border border-emerald-200 dark:border-emerald-900/50">
            Refund Approved
          </span>
        );
      case 'resolved_denied':
        return (
          <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-3 py-1 text-[11px] font-bold border border-rose-200 dark:border-rose-900/50">
            Claim Denied
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Content column only: AccountLayout carries the account sidebar and
          the full-width container; RootLayout paints the ambient background. */}
      <div className="relative z-10">
        {/* Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-white/80 dark:border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-sun-orange dark:text-orange-400 mb-2">
              <Scale className="h-3.5 w-3.5" />
              <span>Buyer Protection</span>
            </div>
            <h1 className="font-outfit text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Order Disputes & Claims Center
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Direct mediation between buyers, independent sellers, and Vendora customer advocate mediators.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsFilingNew(true)}
            ref={fileClaimTriggerRef}
            aria-haspopup="dialog"
            aria-controls="dispute-file-modal"
            aria-expanded={isFilingNew}
            className="inline-flex items-center gap-2 rounded-full bg-sun-orange px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 hover:bg-sun-orange-600 active:scale-95 transition-all cursor-pointer self-start md:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>File New Claim</span>
          </button>
        </div>

        {!user && (
          <div className="glass-panel rounded-3xl p-6 mb-8 text-sm text-slate-600 dark:text-slate-300">
            Please <Link to="/login" className="font-bold text-sun-orange underline">sign in</Link> to view and manage your disputes.
          </div>
        )}
        {user && disputesQuery.isLoading && (
          <p className="text-sm text-slate-500 mb-8" role="status">Loading your disputes…</p>
        )}
        {user && disputesQuery.isError && (
          <div className="rounded-3xl bg-rose-50 border border-rose-200 p-6 mb-8 text-sm font-bold text-rose-900" role="alert">
            {disputesQuery.error instanceof Error ? disputesQuery.error.message : 'Your disputes could not be loaded.'}
          </div>
        )}
        {formError && (
          <div className="rounded-3xl bg-rose-50 border border-rose-200 p-4 mb-8 text-xs font-bold text-rose-900" role="alert">
            {formError}
          </div>
        )}

        {/* 2-Column Dispute Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Disputes Queue List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-2 mb-1">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500">
                Active Claims ({disputes.length})
              </h3>
              <span className="text-[11px] font-bold text-slate-400">Real-time status</span>
            </div>

            {disputes.map((dispute) => {
              const isSelected = activeDispute?.id === dispute.id;
              return (
                <button
                  key={dispute.id}
                  type="button"
                  onClick={() => setSelectedDisputeId(dispute.id)}
                  className={`w-full text-left rounded-3xl p-5 border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'glass-panel-elevated ring-2 ring-sun-orange/40 border-sun-orange/30 shadow-xl'
                      : 'glass-panel hover:bg-white/90 dark:hover:bg-slate-800/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                      #{dispute.id}
                    </span>
                    {getStatusBadge(dispute.status)}
                  </div>

                  <h4 className="font-outfit font-extrabold text-slate-900 dark:text-white text-sm line-clamp-1 mb-1.5">
                    {dispute.reason}
                  </h4>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span>
                      Vendor: <strong className="text-slate-700 dark:text-slate-300">{dispute.vendorName || 'Apex Tech'}</strong>
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Active Dispute Conversation Thread (8 cols) */}
          <div className="lg:col-span-8">
            {activeDispute ? (
              <div className="glass-panel rounded-3xl border border-white/80 dark:border-white/10 shadow-2xl flex flex-col h-[700px] overflow-hidden">
                {/* Thread Header */}
                <div className="p-6 border-b border-slate-100 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-outfit font-black text-slate-900 dark:text-white text-lg">
                        Dispute #{activeDispute.id}
                      </h3>
                      {getStatusBadge(activeDispute.status)}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Order Reference: <strong className="font-mono text-slate-700 dark:text-slate-300">{activeDispute.subOrderId}</strong> • Seller:{' '}
                      <strong className="text-slate-700 dark:text-slate-300">{activeDispute.vendorName}</strong>
                    </p>
                  </div>

                  <Link
                    to={`/orders/${activeDispute.orderGroupId}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-800/80 px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-sun-orange hover:text-sun-orange transition-colors"
                  >
                    <span>Inspect Order Package</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Mediation Status Bar */}
                <div className="px-6 py-3 bg-orange-50/50 dark:bg-orange-950/20 border-b border-orange-100/60 dark:border-orange-900/30 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-sun-orange shrink-0" />
                  <span>
                    Your case is reviewed by Vendora mediators together with the seller until a resolution is recorded.
                  </span>
                </div>

                {/* Conversation Messages */}
                <div className="flex-1 p-6 overflow-y-auto space-y-5">
                  {activeDispute.messages
                    .filter((msg) => !msg.isInternalNote)
                    .map((msg) => {
                      const isCustomer = msg.senderRole === 'customer';
                      const isStaff = msg.senderRole === 'support' || msg.senderRole === 'admin';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{msg.senderName}</span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                                isCustomer
                                  ? 'bg-orange-100 dark:bg-orange-950 text-sun-orange'
                                  : isStaff
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              {msg.senderRole}
                            </span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`max-w-lg rounded-3xl p-4 text-xs sm:text-sm leading-relaxed shadow-md ${
                              isCustomer
                                ? 'bg-sun-orange text-white rounded-tr-none shadow-orange-500/20'
                                : 'bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/80 dark:border-white/10'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Reply Form */}
                <form
                  onSubmit={handleSendReply}
                  className="p-4 border-t border-slate-100 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your response to the seller and mediator..."
                    aria-label="Type your response to the seller and mediator"
                    className="flex-1 rounded-full border border-slate-200/90 dark:border-white/15 bg-white dark:bg-slate-800 px-5 py-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sun-orange focus:ring-2 focus:ring-orange-500/20"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-full bg-sun-orange text-white px-6 py-3 text-xs font-extrabold hover:bg-sun-orange-600 shadow-md hover:shadow-orange-glow transition-all active:scale-95 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="glass-panel h-full rounded-3xl flex items-center justify-center p-12 text-center text-slate-400">
                Select a dispute to view the resolution thread.
              </div>
            )}
          </div>
        </div>

        {/* Modal: File New Dispute */}
        {isFilingNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
            <div
              ref={fileClaimPanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dispute-modal-title"
              tabIndex={-1}
              onKeyDown={(e) => { if (e.key === 'Escape') setIsFilingNew(false); }}
              className="glass-panel-elevated w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 border border-white/80 dark:border-white/15"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 id="dispute-modal-title" className="font-outfit text-xl font-black text-slate-900 dark:text-white">
                  File an Order Dispute
                </h3>
                <span className="rounded-full bg-orange-100 dark:bg-orange-950/60 text-sun-orange px-3 py-1 text-[11px] font-bold">
                  Buyer Protection
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Our mediation team will review your claim and coordinate directly with the independent vendor within 24 hours.
              </p>

              <form onSubmit={handleCreateDispute} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="dispute-suborder" className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Sub-Order Reference
                  </label>
                  <input
                    id="dispute-suborder"
                    type="text"
                    value={newSubOrderId}
                    onChange={(e) => setNewSubOrderId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 p-3 font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sun-orange"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="dispute-reason" className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reason for Claim
                  </label>
                  <select
                    id="dispute-reason"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    className="native-select w-full rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sun-orange"
                  >
                    <option value="Item arrived defective or damaged">Item arrived defective or damaged</option>
                    <option value="Item not as described / wrong item received">Item not as described / wrong item received</option>
                    <option value="Package missing / delivery failed">Package missing / delivery failed</option>
                    <option value="Return rejected unfairly by seller">Return rejected unfairly by seller</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="dispute-notes" className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Details & Evidence Description
                  </label>
                  <textarea
                    id="dispute-notes"
                    rows={4}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Describe the issue, defect, or missing parcel in detail..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sun-orange"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsFilingNew(false)}
                    className="rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 px-5 py-2.5 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-sun-orange px-6 py-2.5 font-bold text-white shadow-md hover:shadow-orange-glow hover:bg-sun-orange-600 cursor-pointer text-xs active:scale-95 transition-all"
                  >
                    Submit Dispute Claim
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
