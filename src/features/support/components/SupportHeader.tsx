import React from 'react';
import {
  Inbox,
  UserCheck,
  AlertTriangle,
  Headphones,
  Search,
  Filter,
} from 'lucide-react';
import { useAuthStore } from '../../../store/auth-store';
import { cn } from '../../../lib/utils';

export type SupportQueueType = 'unassigned' | 'mine' | 'escalated' | 'all';

export interface SupportHeaderProps {
  /** Count of unassigned tickets/disputes in triage pool */
  unassignedCount?: number;
  /** Count of tickets claimed by the active support agent */
  mineCount?: number;
  /** Count of escalated high-priority disputes requiring urgent action */
  escalatedCount?: number;
  /** Currently selected queue filter */
  activeQueue?: SupportQueueType;
  /** Callback when support agent clicks a queue indicator tab */
  onSelectQueue?: (queue: SupportQueueType) => void;
  /** Optional agent display name override */
  agentName?: string;
  /** Search query state */
  searchQuery?: string;
  /** Search change handler */
  onSearchChange?: (query: string) => void;
  className?: string;
}

export const SupportHeader: React.FC<SupportHeaderProps> = ({
  unassignedCount = 0,
  mineCount = 0,
  escalatedCount = 0,
  activeQueue = 'all',
  onSelectQueue,
  agentName,
  searchQuery = '',
  onSearchChange,
  className,
}) => {
  const { user } = useAuthStore();
  const displayName = agentName || user?.name || 'Support Agent';

  const queues = [
    {
      id: 'unassigned' as const,
      label: 'Unassigned',
      count: unassignedCount,
      icon: Inbox,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
      pillClass: 'bg-amber-100/80 text-amber-900',
      activeRing: 'ring-2 ring-amber-400',
    },
    {
      id: 'mine' as const,
      label: 'Mine',
      count: mineCount,
      icon: UserCheck,
      badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200/80',
      pillClass: 'bg-cyan-100/80 text-cyan-900',
      activeRing: 'ring-2 ring-cyan-400',
    },
    {
      id: 'escalated' as const,
      label: 'Escalated',
      count: escalatedCount,
      icon: AlertTriangle,
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
      pillClass: 'bg-rose-100/80 text-rose-900',
      activeRing: 'ring-2 ring-rose-400',
    },
  ];

  return (
    <header
      data-testid="support-header"
      className={cn(
        'w-full rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-md transition-all',
        className
      )}
      aria-label="Support Triage and Queue Header"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Agent & Queue Overview title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-xs">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 leading-none">
                Support Triage
              </h1>
              <span className="glass-pill rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                Online
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Logged in as <strong className="text-slate-700">{displayName}</strong>
            </p>
          </div>
        </div>

        {/* Center: Interactive Queue Count Indicators */}
        <div
          data-testid="queue-indicators"
          className="flex flex-wrap items-center gap-2 sm:gap-3"
          role="tablist"
          aria-label="Ticket triage queues"
        >
          {queues.map((q) => {
            const Icon = q.icon;
            const isSelected = activeQueue === q.id;

            return (
              <button
                key={q.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-testid={`queue-${q.id}`}
                onClick={() => onSelectQueue?.(q.id)}
                className={cn(
                  'group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer select-none',
                  q.badgeClass,
                  isSelected ? `${q.activeRing} shadow-md` : 'hover:scale-[1.02]'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{q.label}</span>
                <span
                  data-testid={`count-${q.id}`}
                  className={cn(
                    'rounded-full px-2 py-0.2 text-[11px] font-bold',
                    q.pillClass
                  )}
                >
                  {q.count}
                </span>
              </button>
            );
          })}

          {onSelectQueue && (
            <button
              type="button"
              onClick={() => onSelectQueue('all')}
              className={cn(
                'glass-pill inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900',
                activeQueue === 'all' && 'bg-slate-900 text-white hover:text-white border-transparent'
              )}
            >
              <Filter className="h-3 w-3" />
              <span>All Queues</span>
            </button>
          )}
        </div>

        {/* Right: Quick Search input for ticket ID / customer */}
        {onSearchChange && (
          <div className="relative w-full sm:w-60">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter ticket or sub-order #..."
              className="w-full rounded-full border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          </div>
        )}
      </div>
    </header>
  );
};
