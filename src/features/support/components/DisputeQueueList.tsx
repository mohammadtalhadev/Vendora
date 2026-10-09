import React from 'react';
import type { Dispute } from '../../../types/domain';
import { cn } from '../../../lib/utils';
import {
  Inbox,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  ListFilter,
  Store,
  ExternalLink,
} from 'lucide-react';

export type QueueFilterTab = 'all' | 'unassigned' | 'mine' | 'escalated' | 'resolved';

export interface DisputeQueueListProps {
  disputes: Dispute[];
  selectedDisputeId?: string;
  onSelectDispute: (dispute: Dispute) => void;
  activeFilter?: QueueFilterTab;
  onFilterChange?: (filter: QueueFilterTab) => void;
  currentAgentId?: string;
  searchQuery?: string;
  className?: string;
}

export const DisputeQueueList: React.FC<DisputeQueueListProps> = ({
  disputes,
  selectedDisputeId,
  onSelectDispute,
  activeFilter = 'all',
  onFilterChange,
  currentAgentId = 'usr-support-1',
  searchQuery = '',
  className,
}) => {
  // Counts calculation
  const unassignedCount = disputes.filter(
    (d) => !d.assignedAgentId && d.status !== 'resolved_refund' && d.status !== 'resolved_denied'
  ).length;
  const mineCount = disputes.filter(
    (d) => d.assignedAgentId === currentAgentId && d.status !== 'resolved_refund' && d.status !== 'resolved_denied'
  ).length;
  const escalatedCount = disputes.filter((d) => d.status === 'escalated').length;
  const resolvedCount = disputes.filter(
    (d) => d.status === 'resolved_refund' || d.status === 'resolved_denied'
  ).length;

  const filterTabs: Array<{ id: QueueFilterTab; label: string; count: number; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'all', label: 'All', count: disputes.length, icon: ListFilter },
    { id: 'unassigned', label: 'Unassigned', count: unassignedCount, icon: Inbox },
    { id: 'mine', label: 'Mine', count: mineCount, icon: UserCheck },
    { id: 'escalated', label: 'Escalated', count: escalatedCount, icon: AlertTriangle },
    { id: 'resolved', label: 'Resolved', count: resolvedCount, icon: CheckCircle2 },
  ];

  // Filter list
  const filteredDisputes = disputes.filter((d) => {
    // 1. Queue filter tab
    if (activeFilter === 'unassigned') {
      const isUnassigned = !d.assignedAgentId && d.status !== 'resolved_refund' && d.status !== 'resolved_denied';
      if (!isUnassigned) return false;
    } else if (activeFilter === 'mine') {
      const isMine = d.assignedAgentId === currentAgentId;
      if (!isMine) return false;
    } else if (activeFilter === 'escalated') {
      if (d.status !== 'escalated') return false;
    } else if (activeFilter === 'resolved') {
      if (d.status !== 'resolved_refund' && d.status !== 'resolved_denied') return false;
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = d.id.toLowerCase().includes(q);
      const matchCustomer = (d.customerName || d.customerId).toLowerCase().includes(q);
      const matchVendor = (d.vendorName || d.vendorId).toLowerCase().includes(q);
      const matchReason = d.reason.toLowerCase().includes(q);
      const matchSubOrder = d.subOrderId.toLowerCase().includes(q);
      if (!matchId && !matchCustomer && !matchVendor && !matchReason && !matchSubOrder) {
        return false;
      }
    }

    return true;
  });

  const getReasonTag = (reason: string) => {
    if (reason.includes('-')) {
      return reason.split('-')[0].trim();
    }
    if (reason.includes(':')) {
      return reason.split(':')[0].trim();
    }
    return reason.length > 24 ? `${reason.slice(0, 24)}...` : reason;
  };

  const getStatusBadge = (status: Dispute['status']) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200/60">
            Open
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200/60">
            Under Review
          </span>
        );
      case 'escalated':
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200/60">
            Escalated
          </span>
        );
      case 'resolved_refund':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
            Refunded
          </span>
        );
      case 'resolved_denied':
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
            Denied
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {status}
          </span>
        );
    }
  };

  const isUrgent = (dispute: Dispute) => {
    return dispute.urgency === 'urgent' || dispute.status === 'escalated';
  };

  return (
    <div
      data-testid="dispute-queue-list"
      className={cn('flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden', className)}
    >
      {/* Filter Pills Header */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Dispute Triage Queue
          </h2>
          <span className="text-[11px] font-medium text-slate-400">
            {filteredDisputes.length} ticket{filteredDisputes.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Filter Pills */}
        <div
          role="tablist"
          aria-label="Queue Filter Tabs"
          className="flex flex-wrap items-center gap-1.5"
        >
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isTabActive}
                data-testid={`filter-tab-${tab.id}`}
                onClick={() => onFilterChange?.(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer',
                  isTabActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100/80 hover:text-slate-900'
                )}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                    isTabActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Disputes Item List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
        {filteredDisputes.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No disputes found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery ? 'Try clearing your search query.' : 'There are no active tickets in this queue.'}
            </p>
          </div>
        ) : (
          filteredDisputes.map((dispute) => {
            const isSelected = dispute.id === selectedDisputeId;
            const urgent = isUrgent(dispute);
            const customerName = dispute.customerName || `Customer #${dispute.customerId.slice(-4)}`;
            const vendorName = dispute.vendorName || `Store #${dispute.vendorId.slice(-4)}`;
            const reasonTag = getReasonTag(dispute.reason);

            return (
              <div
                key={dispute.id}
                role="button"
                tabIndex={0}
                data-testid={`dispute-item-${dispute.id}`}
                onClick={() => onSelectDispute(dispute)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectDispute(dispute);
                  }
                }}
                className={cn(
                  'group relative block w-full text-left p-3 rounded-xl transition-all cursor-pointer border select-none',
                  isSelected
                    ? 'bg-sky-50/70 border-sky-300/80 shadow-xs ring-1 ring-sky-300/60'
                    : 'bg-white border-transparent hover:border-slate-200/90 hover:bg-slate-50/80'
                )}
              >
                {/* Top Row: Ticket ID, SLA Urgency Indicator, Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Urgency indicator: coral dot for urgent, amber dot for standard */}
                    {urgent ? (
                      <span
                        data-testid="sla-urgent"
                        title="Urgent SLA (<2h remaining)"
                        className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 animate-pulse shrink-0"
                      />
                    ) : (
                      <span
                        data-testid="sla-standard"
                        title="Standard SLA (24h)"
                        className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100 shrink-0"
                      />
                    )}
                    <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {dispute.id}
                    </span>
                  </div>
                  <div>{getStatusBadge(dispute.status)}</div>
                </div>

                {/* Customer and Vendor Info */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {dispute.customerAvatar ? (
                      <img
                        src={dispute.customerAvatar}
                        alt={customerName}
                        className="h-6 w-6 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 shrink-0">
                        {customerName.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {customerName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                    <Store className="h-3 w-3 text-slate-400" />
                    <span className="truncate max-w-[110px]">{vendorName}</span>
                  </div>
                </div>

                {/* Bottom Row: Reason Tag Pill & Sub-order Reference Link */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100/80">
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200/50">
                    {reasonTag}
                  </span>

                  <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-400 group-hover:text-slate-600">
                    <span>#{dispute.subOrderId}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
