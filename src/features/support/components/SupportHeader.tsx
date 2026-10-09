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

  const [agentStatus, setAgentStatus] = React.useState<'online' | 'away' | 'busy'>('online');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = React.useState(false);

  const totalActiveCount = unassignedCount + mineCount + escalatedCount;

  const queues = [
    {
      id: 'unassigned' as const,
      label: 'Unassigned',
      count: unassignedCount,
      icon: Inbox,
      badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
      pillClass: 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200',
      activeRing: 'ring-2 ring-amber-400',
    },
    {
      id: 'mine' as const,
      label: 'Mine',
      count: mineCount,
      icon: UserCheck,
      badgeClass: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-200/80 dark:border-cyan-800/60',
      pillClass: 'bg-cyan-100/80 dark:bg-cyan-900/60 text-cyan-900 dark:text-cyan-200',
      activeRing: 'ring-2 ring-cyan-400',
    },
    {
      id: 'escalated' as const,
      label: 'Escalated',
      count: escalatedCount,
      icon: AlertTriangle,
      badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
      pillClass: 'bg-rose-100/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200',
      activeRing: 'ring-2 ring-rose-400',
    },
    {
      id: 'all' as const,
      label: 'All Queues',
      count: totalActiveCount,
      icon: Filter,
      badgeClass: 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700',
      pillClass: 'bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
      activeRing: 'ring-2 ring-slate-400',
    },
  ];

  return (
    <header
      data-testid="support-header"
      className={cn(
        'w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 shadow-sm backdrop-blur-md transition-all',
        className
      )}
      aria-label="Support Triage and Queue Header"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Agent & Queue Overview title with Interactive Availability Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 shadow-xs">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 relative">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                Support Triage
              </h1>

              {/* Interactive Agent Status Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-all cursor-pointer shadow-2xs',
                    agentStatus === 'online'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60'
                      : agentStatus === 'away'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60'
                  )}
                  title="Change agent shift availability"
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      agentStatus === 'online'
                        ? 'bg-emerald-500 animate-pulse'
                        : agentStatus === 'away'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    )}
                  />
                  <span className="capitalize">{agentStatus === 'busy' ? 'In-Call' : agentStatus}</span>
                </button>

                {isStatusMenuOpen && (
                  <div className="absolute top-6 left-0 mt-1 w-32 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-lg z-50 text-xs">
                    {(['online', 'away', 'busy'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setAgentStatus(st);
                          setIsStatusMenuOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer capitalize text-[11px] font-medium',
                          agentStatus === st
                            ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            st === 'online' ? 'bg-emerald-500' : st === 'away' ? 'bg-amber-500' : 'bg-rose-500'
                          )}
                        />
                        <span>{st === 'busy' ? 'In-Call' : st}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Logged in as <strong className="text-slate-700 dark:text-slate-200 font-semibold">{displayName}</strong>
            </p>
          </div>
        </div>

        {/* Center: Interactive Queue Count Indicators (4 Standard Uniform Pills) */}
        <div
          data-testid="queue-indicators"
          className="flex flex-wrap items-center gap-2 sm:gap-2.5"
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
                  'group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer select-none',
                  q.badgeClass,
                  isSelected ? `${q.activeRing} shadow-sm font-bold scale-[1.02]` : 'hover:scale-[1.02]'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
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
