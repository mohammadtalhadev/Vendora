import React, { useState, useEffect } from 'react';
import type { Dispute, SubOrder } from '../types/domain';
import { mockDb } from '../mocks/db';
import { SEED_DISPUTES, SEED_SUB_ORDERS } from '../mocks/seed/operations';
import { useAuthStore } from '../store/auth-store';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { SupportHeader, type SupportQueueType } from '../features/support/components/SupportHeader';
import { DisputeQueueList, type QueueFilterTab } from '../features/support/components/DisputeQueueList';
import { DisputeConversationThread } from '../features/support/components/DisputeConversationThread';
import { DisputeContextBar } from '../features/support/components/DisputeContextBar';
import { MessageSquareOff } from 'lucide-react';

export const SupportDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const currentAgentId = user?.id || 'usr-support-1';
  const currentAgentName = user?.name || 'Jordan Support Lead';

  // 1. Disputes state initialized from mockDb / localStorage / seed
  const [disputes, setDisputes] = useState<Dispute[]>(() => {
    if (mockDb.disputes && mockDb.disputes.length > 0) {
      return [...mockDb.disputes];
    }
    return [...SEED_DISPUTES];
  });

  // 2. Sub-orders state
  const [subOrders, setSubOrders] = useState<SubOrder[]>(() => {
    if (mockDb.subOrders && mockDb.subOrders.length > 0) {
      return [...mockDb.subOrders];
    }
    return [...SEED_SUB_ORDERS];
  });

  // 3. Queue selection & Search state
  const [activeQueue, setActiveQueue] = useState<QueueFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 4. Active Dispute selection
  const [selectedDisputeId, setSelectedDisputeId] = useState<string>(() => {
    return disputes[0]?.id || 'DSP-401';
  });

  // Keep mockDb and state in sync on initial mount if mockDb was empty
  useEffect(() => {
    if (mockDb.disputes.length === 0) {
      mockDb.disputes = [...disputes];
    }
    if (mockDb.subOrders.length === 0) {
      mockDb.subOrders = [...subOrders];
    }
  }, [disputes, subOrders]);

  // Derive counts for SupportHeader
  const unassignedCount = disputes.filter(
    (d) => !d.assignedAgentId && d.status !== 'resolved_refund' && d.status !== 'resolved_denied'
  ).length;
  const mineCount = disputes.filter(
    (d) => d.assignedAgentId === currentAgentId && d.status !== 'resolved_refund' && d.status !== 'resolved_denied'
  ).length;
  const escalatedCount = disputes.filter((d) => d.status === 'escalated').length;

  // Currently selected dispute object
  const activeDispute = disputes.find((d) => d.id === selectedDisputeId) || disputes[0] || null;

  // Associated sub-order object
  const activeSubOrder = activeDispute
    ? subOrders.find((so) => so.id === activeDispute.subOrderId) || null
    : null;

  // Handle header queue indicator change
  const handleSelectHeaderQueue = (q: SupportQueueType) => {
    setActiveQueue(q as QueueFilterTab);
  };

  // Helper to persist disputes to mockDb and localStorage
  const persistDisputes = (updatedList: Dispute[]) => {
    setDisputes(updatedList);
    mockDb.disputes = updatedList;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('vd:v1:disputes', JSON.stringify(updatedList));
      } catch (err) {
        console.error('Failed to persist disputes to localStorage:', err);
      }
    }
  };

  // Helper to persist sub-orders
  const persistSubOrders = (updatedList: SubOrder[]) => {
    setSubOrders(updatedList);
    mockDb.subOrders = updatedList;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('vd:v1:suborders', JSON.stringify(updatedList));
      } catch (err) {
        console.error('Failed to persist suborders to localStorage:', err);
      }
    }
  };

  // Send message or post internal note
  const handleSendMessage = (content: string, isInternalNote: boolean) => {
    if (!activeDispute) return;

    try {
      mockDb.addDisputeMessage(activeDispute.id, {
        senderRole: 'support',
        senderName: currentAgentName,
        content,
        isInternalNote,
      });

      const updatedDisputes = mockDb.disputes.map((d) => (d.id === activeDispute.id ? { ...d } : d));
      persistDisputes(updatedDisputes);
    } catch {
      // Fallback in-memory update
      const newMsg = {
        id: `msg-${Date.now()}`,
        senderRole: 'support' as const,
        senderName: currentAgentName,
        content,
        isInternalNote,
        timestamp: new Date().toISOString(),
      };
      const updatedList = disputes.map((d) =>
        d.id === activeDispute.id ? { ...d, messages: [...d.messages, newMsg] } : d
      );
      persistDisputes(updatedList);
    }
  };

  // Resolution 1: Full Refund
  const handleResolveFullRefund = (disputeId: string, subOrderId: string, amount: number) => {
    try {
      mockDb.updateDisputeStatus(
        disputeId,
        'resolved_refund',
        `Full escrow refund authorized for $${amount.toFixed(2)}. Sub-order marked as refunded.`,
        amount
      );
      persistDisputes([...mockDb.disputes]);
      persistSubOrders([...mockDb.subOrders]);
    } catch {
      // Fallback update
      const updatedDisputes = disputes.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status: 'resolved_refund' as const,
              resolutionNote: `Full escrow refund authorized for $${amount.toFixed(2)}.`,
              resolutionAmount: amount,
            }
          : d
      );
      const updatedSubOrders = subOrders.map((so) =>
        so.id === subOrderId ? { ...so, status: 'refunded' as const } : so
      );
      persistDisputes(updatedDisputes);
      persistSubOrders(updatedSubOrders);
    }
  };

  // Resolution 2: Partial Refund / Store Credit
  const handleResolvePartialRefund = (
    disputeId: string,
    _subOrderId: string,
    amount: number,
    note?: string
  ) => {
    const finalNote = note || `Partial refund issued: $${amount.toFixed(2)}`;
    try {
      mockDb.updateDisputeStatus(disputeId, 'resolved_refund', finalNote, amount);
      persistDisputes([...mockDb.disputes]);
    } catch {
      const updatedDisputes = disputes.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status: 'resolved_refund' as const,
              resolutionNote: finalNote,
              resolutionAmount: amount,
            }
          : d
      );
      persistDisputes(updatedDisputes);
    }
  };

  // Resolution 3: Deny Dispute
  const handleDenyDispute = (disputeId: string, note?: string) => {
    const finalNote = note || 'Dispute claim denied following policy review.';
    try {
      mockDb.updateDisputeStatus(disputeId, 'resolved_denied', finalNote);
      persistDisputes([...mockDb.disputes]);
    } catch {
      const updatedDisputes = disputes.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status: 'resolved_denied' as const,
              resolutionNote: finalNote,
            }
          : d
      );
      persistDisputes(updatedDisputes);
    }
  };

  // Resolution 4: Escalate to Admin
  const handleEscalateToAdmin = (disputeId: string, note?: string) => {
    const finalNote = note || 'Escalated to platform admin for binding arbitration.';
    try {
      mockDb.updateDisputeStatus(disputeId, 'escalated', finalNote);
      persistDisputes([...mockDb.disputes]);
    } catch {
      const updatedDisputes = disputes.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status: 'escalated' as const,
              resolutionNote: finalNote,
            }
          : d
      );
      persistDisputes(updatedDisputes);
    }
  };

  return (
    <WorkspaceLayout
      role="support"
      title="Support & Dispute Resolution"
      subtitle="Escrow mediation, dispute triage, and customer protection desk"
    >
      <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">
        {/* Support Header with Triage Queues and Search */}
        <SupportHeader
          unassignedCount={unassignedCount}
          mineCount={mineCount}
          escalatedCount={escalatedCount}
          activeQueue={activeQueue === 'resolved' ? 'all' : (activeQueue as SupportQueueType)}
          onSelectQueue={handleSelectHeaderQueue}
          agentName={currentAgentName}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* 3-Pane Responsive Triage Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[680px] h-[calc(100vh-220px)]">
          {/* Pane 1: Left Queue List (3 cols) */}
          <section className="lg:col-span-4 xl:col-span-3 h-full overflow-hidden">
            <DisputeQueueList
              disputes={disputes}
              selectedDisputeId={selectedDisputeId}
              onSelectDispute={(dispute) => setSelectedDisputeId(dispute.id)}
              activeFilter={activeQueue}
              onFilterChange={setActiveQueue}
              currentAgentId={currentAgentId}
              searchQuery={searchQuery}
              className="h-full"
            />
          </section>

          {/* Pane 2: Center Conversation Thread (5-6 cols) */}
          <section className="lg:col-span-4 xl:col-span-5 h-full overflow-hidden">
            {activeDispute ? (
              <DisputeConversationThread
                dispute={activeDispute}
                onSendMessage={handleSendMessage}
                currentAgentName={currentAgentName}
                currentAgentRole="support"
                className="h-full"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center">
                <MessageSquareOff className="h-10 w-10 text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-700">No dispute selected</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Choose a dispute ticket from the triage queue on the left to inspect conversation timeline.
                </p>
              </div>
            )}
          </section>

          {/* Pane 3: Right Context & Actions Sidebar (4 cols) */}
          <section className="lg:col-span-4 xl:col-span-4 h-full overflow-hidden">
            {activeDispute ? (
              <DisputeContextBar
                dispute={activeDispute}
                subOrder={activeSubOrder}
                onResolveFullRefund={handleResolveFullRefund}
                onResolvePartialRefund={handleResolvePartialRefund}
                onDenyDispute={handleDenyDispute}
                onEscalateToAdmin={handleEscalateToAdmin}
                className="h-full"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center">
                <p className="text-xs text-slate-400">
                  Select a dispute to view order breakdown and resolution controls.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
