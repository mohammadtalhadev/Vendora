import React from 'react';
import type { SupportDisputeRow } from '../api/disputes';
import { cn } from '../../../lib/utils';
import {
  Inbox,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  ListFilter,
  Store,
  ExternalLink,
  MessageSquare,
  Truck,
  Headphones,
} from 'lucide-react';

export type QueueFilterTab = 'all' | 'unassigned' | 'mine' | 'escalated' | 'resolved';

export interface DisputeQueueListProps {
  /** One page of the queue, already filtered, searched and paged in Postgres. */
  disputes: SupportDisputeRow[];
  /** Tab badges, counted over every case by the server, not over this page. */
  counts: Record<QueueFilterTab, number>;
  activeFilter: QueueFilterTab;
  onFilterChange: (tab: QueueFilterTab) => void;
  selectedId: string | null;
  onSelect: (disputeId: string) => void;
  loading?: boolean;
  /** A failed read is shown as an error, never as an empty list. */
  error?: string | null;
  className?: string;
}

const money = (amount: number) => `$${amount.toFixed(2)}`;

const humanize = (value: string) => value.replace(/_/g, ' ');

export const DisputeQueueList: React.FC<DisputeQueueListProps> = ({
  disputes,
  counts,
  activeFilter,
  onFilterChange,
  selectedId,
  onSelect,
  loading = false,
  error = null,
  className,
}) => {
  const filterTabs: Array<{
    id: QueueFilterTab;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'all', label: 'All', count: counts.all, icon: ListFilter },
    { id: 'unassigned', label: 'Unassigned', count: counts.unassigned, icon: Inbox },
    { id: 'mine', label: 'Mine', count: counts.mine, icon: UserCheck },
    { id: 'escalated', label: 'Escalated', count: counts.escalated, icon: AlertTriangle },
    { id: 'resolved', label: 'Resolved', count: counts.resolved, icon: CheckCircle2 },
  ];

  const getStatusBadge = (status: SupportDisputeRow['status']) => {
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

  const isUrgent = (dispute: SupportDisputeRow) => {
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
          <h2 className="text-xs font-bold text-slate-500">
            Dispute Triage Queue
          </h2>
          <span className="text-[11px] font-medium text-slate-400">
            {loading
              ? 'Loading…'
              : `Showing ${disputes.length} of ${counts[activeFilter]} case${counts[activeFilter] === 1 ? '' : 's'}`}
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
                onClick={() => onFilterChange(tab.id)}
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
        {error ? (
          <div data-testid="dispute-queue-error" className="py-12 px-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 mb-3">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-rose-700">Could not load the queue</p>
            <p className="text-[11px] text-slate-500 mt-0.5 break-words">{error}</p>
          </div>
        ) : loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`queue-skeleton-${index}`}
              data-testid="dispute-item-skeleton"
              aria-hidden="true"
              className="p-3 rounded-xl border border-transparent animate-pulse"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="h-3 w-20 rounded bg-slate-100" />
                <div className="h-3.5 w-16 rounded-full bg-slate-100" />
              </div>
              <div className="mt-2.5 h-2.5 w-2/3 rounded bg-slate-100" />
              <div className="mt-2 h-2.5 w-1/3 rounded bg-slate-100" />
            </div>
          ))
        ) : disputes.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No disputes found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              There are no active tickets in this queue.
            </p>
          </div>
        ) : (
          disputes.map((dispute) => {
            const isSelected = dispute.id === selectedId;
            const urgent = isUrgent(dispute);
            const customerName = dispute.customerName || 'Customer';
            const vendorName = dispute.vendorName || 'Store';

            return (
              <div
                key={dispute.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                data-testid={`dispute-item-${dispute.id}`}
                onClick={() => onSelect(dispute.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelect(dispute.id);
                  }
                }}
                className={cn(
                  'group relative block w-full text-left p-3 rounded-xl transition-all cursor-pointer border select-none',
                  isSelected
                    ? 'bg-sky-50/70 border-sky-300/80 shadow-xs ring-1 ring-sky-300/60'
                    : 'bg-white border-transparent hover:border-slate-200/90 hover:bg-slate-50/80'
                )}
              >
                {/* Top Row: Ticket ID, Urgency Indicator, Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Urgency as reported by the queue row: coral dot for urgent, amber for standard */}
                    {urgent ? (
                      <span
                        data-testid="urgency-urgent"
                        title="Urgent priority"
                        className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 animate-pulse shrink-0"
                      />
                    ) : (
                      <span
                        data-testid="urgency-standard"
                        title="Standard priority"
                        className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100 shrink-0"
                      />
                    )}
                    <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {dispute.id}
                    </span>
                  </div>
                  <div>{getStatusBadge(dispute.status)}</div>
                </div>

                {/* Buyer and Store Info */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 shrink-0">
                      {customerName.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {customerName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                    <Store className="h-3 w-3 text-slate-400" />
                    <span className="truncate max-w-[110px]">{vendorName}</span>
                  </div>
                </div>

                {/* Case Facts: package status, thread size, ownership, money still owed */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1" title="Package status">
                    <Truck className="h-3 w-3 text-slate-400" />
                    <span className="capitalize">{humanize(dispute.packageStatus)}</span>
                  </span>

                  <span className="inline-flex items-center gap-1" title="Messages in this case">
                    <MessageSquare className="h-3 w-3 text-slate-400" />
                    <span>{dispute.messages}</span>
                  </span>

                  <span
                    className="inline-flex items-center gap-1"
                    title={dispute.agentName ? 'Assigned agent' : 'No agent has this case'}
                  >
                    <Headphones className="h-3 w-3 text-slate-400" />
                    <span className={cn('truncate max-w-[110px]', !dispute.agentName && 'italic text-slate-400')}>
                      {dispute.agentName ?? 'Unassigned'}
                    </span>
                  </span>

                  <span className="ml-auto inline-flex items-center gap-1 font-mono font-bold text-slate-900">
                    {money(dispute.remainingGross)}
                    <span className="font-sans font-medium text-slate-500">still owed</span>
                  </span>
                </div>

                {/* Bottom Row: Reason Tag Pill & Sub-order Reference Link */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100/80">
                  <span
                    title={dispute.reason}
                    className="inline-block max-w-[190px] truncate rounded-md bg-amber-50 px-2 py-0.5 align-middle text-[10px] font-medium text-amber-800 border border-amber-200/50"
                  >
                    {dispute.reason}
                  </span>

                  {dispute.subOrderId && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-400 group-hover:text-slate-600">
                      <span>#{dispute.subOrderId}</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
