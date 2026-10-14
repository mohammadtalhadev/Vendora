import React from 'react';
import {
  TICKET_STATUS_LABEL,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from '../api/tickets';
import { cn } from '../../../lib/utils';

/**
 * Ticket status/priority pills. The shared StatusBadge map predates tickets
 * and has no entries for these statuses, so - like the dispute desk's own
 * STATUS_LABEL pills - the ticket surfaces share this one local map instead
 * of each page inventing its own colours.
 */

const STATUS_TONE: Record<SupportTicketStatus, string> = {
  open: 'border-sky-300 bg-sky-50 text-sky-800',
  in_progress: 'border-amber-300 bg-amber-50 text-amber-800',
  waiting_customer: 'border-purple-300 bg-purple-50 text-purple-800',
  resolved: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  closed: 'border-slate-300 bg-slate-100 text-slate-600',
};

const PRIORITY_TONE: Record<SupportTicketPriority, string> = {
  urgent: 'border-rose-300 bg-rose-50 text-rose-800',
  high: 'border-amber-300 bg-amber-50 text-amber-800',
  normal: 'border-slate-200 bg-slate-50 text-slate-600',
  low: 'border-slate-200 bg-white text-slate-400',
};

const PRIORITY_LABEL: Record<SupportTicketPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

export const TicketStatusBadge: React.FC<{ status: SupportTicketStatus; className?: string }> = ({
  status,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap',
      STATUS_TONE[status],
      className,
    )}
  >
    {TICKET_STATUS_LABEL[status]}
  </span>
);

export const TicketPriorityBadge: React.FC<{ priority: SupportTicketPriority; className?: string }> = ({
  priority,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap',
      PRIORITY_TONE[priority],
      className,
    )}
  >
    {PRIORITY_LABEL[priority]}
  </span>
);
