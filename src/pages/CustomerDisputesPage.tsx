import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Scale,
  Send,
  Plus,
} from 'lucide-react';
import { mockDb } from '../mocks/db';
import { useAuthStore } from '../store/auth-store';
import type { Dispute, DisputeStatus } from '../types/domain';

export const CustomerDisputesPage: React.FC = () => {
  const { id: disputeIdParam } = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [disputes, setDisputes] = useState<Dispute[]>(mockDb.disputes);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string>(
    disputeIdParam || disputes[0]?.id || 'DSP-401',
  );

  const [replyMessage, setReplyMessage] = useState('');
  const [isFilingNew, setIsFilingNew] = useState(false);
  const [newReason, setNewReason] = useState('Item arrived defective or damaged');
  const [newSubOrderId, setNewSubOrderId] = useState('SUB-98421-A');
  const [newNotes, setNewNotes] = useState('');

  const activeDispute = disputes.find((d) => d.id === selectedDisputeId) || disputes[0];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeDispute) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      senderRole: 'customer' as const,
      senderName: user?.name || 'Customer',
      content: replyMessage.trim(),
      isInternalNote: false,
      timestamp: new Date().toISOString(),
    };

    const updatedDispute: Dispute = {
      ...activeDispute,
      messages: [...activeDispute.messages, newMessage],
    };

    setDisputes((prev) =>
      prev.map((d) => (d.id === activeDispute.id ? updatedDispute : d)),
    );
    setReplyMessage('');
  };

  const handleCreateDispute = (e: React.FormEvent) => {
    e.preventDefault();
    const newDisputeObj: Dispute = {
      id: `DSP-${Math.floor(100 + Math.random() * 900)}`,
      subOrderId: newSubOrderId,
      orderGroupId: 'ORD-98421',
      customerId: user?.id || 'usr-customer-1',
      customerName: user?.name || 'Sarah Customer',
      vendorId: 'vendor-tech-1',
      vendorName: 'Apex Audio & Gear',
      reason: newReason,
      status: 'open',
      urgency: 'standard',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderRole: 'customer',
          senderName: user?.name || 'Customer',
          content: newNotes || `Dispute opened for order ${newSubOrderId}: ${newReason}`,
          isInternalNote: false,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setDisputes([newDisputeObj, ...disputes]);
    setSelectedDisputeId(newDisputeObj.id);
    setIsFilingNew(false);
    setNewNotes('');
  };

  const getStatusBadge = (status: DisputeStatus) => {
    switch (status) {
      case 'open':
        return <span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-[10px] font-bold">Open</span>;
      case 'under_review':
        return <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold">Under Review</span>;
      case 'escalated':
        return <span className="rounded-full bg-purple-100 text-purple-700 px-2.5 py-0.5 text-[10px] font-bold">Escalated</span>;
      case 'resolved_refund':
        return <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">Refund Approved</span>;
      case 'resolved_denied':
        return <span className="rounded-full bg-rose-100 text-rose-700 px-2.5 py-0.5 text-[10px] font-bold">Claim Denied</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0071DC] mb-1">
              <Scale className="h-3.5 w-3.5" />
              Customer Protection Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Order Disputes & Return Claims
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track active dispute resolutions, communicate with sellers and platform mediators, or file a claim.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsFilingNew(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#0071DC] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-[#005bb5] transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            File New Dispute
          </button>
        </div>

        {/* 2-Column Dispute Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Disputes Queue List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              My Disputes ({disputes.length})
            </h3>

            {disputes.map((dispute) => (
              <button
                key={dispute.id}
                type="button"
                onClick={() => setSelectedDisputeId(dispute.id)}
                className={`w-full text-left rounded-3xl p-4 sm:p-5 border transition-all cursor-pointer ${
                  activeDispute?.id === dispute.id
                    ? 'border-[#0071DC] bg-white shadow-lg shadow-blue-500/10 ring-2 ring-[#0071DC]/10'
                    : 'border-slate-200/80 bg-white/70 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-900">#{dispute.id}</span>
                  {getStatusBadge(dispute.status)}
                </div>

                <h4 className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-1 mb-1">
                  {dispute.reason}
                </h4>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Seller: <strong>{dispute.vendorName || 'Apex Tech'}</strong></span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {new Date(dispute.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Right: Active Dispute Conversation Thread */}
          <div className="lg:col-span-2">
            {activeDispute ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 flex flex-col h-[650px] overflow-hidden">
                {/* Thread Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">
                        Dispute #{activeDispute.id}
                      </h3>
                      {getStatusBadge(activeDispute.status)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Order Reference: <strong className="font-mono">{activeDispute.subOrderId}</strong> • Seller:{' '}
                      <strong>{activeDispute.vendorName}</strong>
                    </p>
                  </div>

                  <Link
                    to={`/orders/${activeDispute.orderGroupId}`}
                    className="text-xs font-bold text-[#0071DC] hover:underline flex items-center gap-1"
                  >
                    View Order Details
                  </Link>
                </div>

                {/* Conversation Messages */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                  {activeDispute.messages
                    .filter((msg) => !msg.isInternalNote) // Customer does NOT see staff internal notes
                    .map((msg) => {
                      const isCustomer = msg.senderRole === 'customer';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
                            <span className="font-bold text-slate-700">{msg.senderName}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[9px] font-bold uppercase text-slate-500">
                              {msg.senderRole}
                            </span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`max-w-md rounded-2xl p-3.5 text-xs leading-relaxed ${
                              isCustomer
                                ? 'bg-[#0071DC] text-white rounded-tr-none shadow-md shadow-blue-500/10'
                                : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60'
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
                  className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your response to the seller and mediator..."
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0071DC] focus:ring-2 focus:ring-[#0071DC]/20"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-2xl bg-[#0071DC] text-white px-4 py-2.5 text-xs font-bold hover:bg-[#005bb5] transition-colors cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </button>
                </form>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-12 text-center text-slate-400">
                Select a dispute to view the resolution thread.
              </div>
            )}
          </div>
        </div>

        {/* Modal: File New Dispute */}
        {isFilingNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
              <h3 className="text-lg font-bold text-slate-900 mb-1">File an Order Dispute</h3>
              <p className="text-xs text-slate-500 mb-5">
                Our support team will review your claim and coordinate with the vendor within 24-48 hours.
              </p>

              <form onSubmit={handleCreateDispute} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sub-Order Reference</label>
                  <input
                    type="text"
                    value={newSubOrderId}
                    onChange={(e) => setNewSubOrderId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reason for Claim</label>
                  <select
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    <option value="Item arrived defective or damaged">Item arrived defective or damaged</option>
                    <option value="Item not as described / wrong item received">Item not as described / wrong item received</option>
                    <option value="Package missing / delivery failed">Package missing / delivery failed</option>
                    <option value="Return rejected unfairly by seller">Return rejected unfairly by seller</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Details & Evidence Description</label>
                  <textarea
                    rows={4}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsFilingNew(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0071DC] px-5 py-2 font-bold text-white shadow-md hover:bg-[#005bb5] cursor-pointer"
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
