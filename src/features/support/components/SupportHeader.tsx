import React from 'react';
import {
  Inbox,
  UserCheck,
  AlertTriangle,
  Headphones,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../../store/auth-store';
import { cn } from '../../../lib/utils';

export type SupportQueueType = 'unassigned' | 'mine' | 'escalated' | 'all';

export interface SupportHeaderProps {
  /** Unassigned cases in the triage pool, counted by the Postgres RPC */
  unassignedCount: number;
  /** Cases claimed by the signed-in support agent, counted by the Postgres RPC */
  mineCount: number;
  /** Escalated high-priority disputes requiring urgent action, counted by the Postgres RPC */
  escalatedCount: number;
  /** Every case awaiting a ruling, counted in Postgres. */
  openCount: number;
  /** Currently selected queue filter */
  activeQueue: SupportQueueType;
  /** Callback when support agent clicks a queue indicator tab */
  onSelectQueue: (queue: SupportQueueType) => void;
  /** Optional agent display name override */
  agentName?: string;
  /** The query the server last filtered on - the input mirrors it, it does not filter a page here */
  searchQuery: string;
  /** Commits a query so the desk re-reads rows and counts from Postgres */
  onSearchChange: (query: string) => void;
  /** A failed read is surfaced here so the desk does not act on stale counts. */
  error?: string | null;
  loading?: boolean;
  className?: string;
}

export const SupportHeader: React.FC<SupportHeaderProps> = ({
  unassignedCount,
  mineCount,
  escalatedCount,
  openCount,
  activeQueue,
  onSelectQueue,
  agentName,
  searchQuery,
  onSearchChange,
  error,
  loading,
  className,
}) => {
  const { user } = useAuthStore();
  const displayName = agentName || user?.name;

  // Filtering is the RPC's job (`p_search`), so keystrokes stay local until the form is submitted.
  const [draft, setDraft] = React.useState(searchQuery);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchChange(draft.trim());
  };

  const handleClear = () => {
    setDraft('');
    onSearchChange('');
  };

  const countsUnavailable = Boolean(error);

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
      // The RPC's open-case total - not a sum of the three pools above, which overlap it.
      count: openCount,
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
        {/* Left: Agent & Queue Overview title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 shadow-xs">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
              Support Triage
            </h1>
            {displayName && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Logged in as <strong className="text-slate-700 dark:text-slate-200 font-semibold">{displayName}</strong>
              </p>
            )}
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
                onClick={() => onSelectQueue(q.id)}
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
                  data-state={countsUnavailable ? 'error' : loading ? 'loading' : 'ready'}
                  title={
                    countsUnavailable
                      ? 'Counts unavailable - this read failed'
                      : loading
                      ? `Loading ${q.label.toLowerCase()} count...`
                      : `${q.count} case${q.count === 1 ? '' : 's'} in this queue`
                  }
                  className={cn(
                    'rounded-full px-2 py-0.2 text-[11px] font-bold tabular-nums',
                    q.pillClass,
                    (countsUnavailable || loading) && 'opacity-70'
                  )}
                >
                  {countsUnavailable ? '—' : loading ? '…' : q.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Submitted search - the RPC filters on the committed query */}
        <form
          onSubmit={handleSubmit}
          role="search"
          data-testid="support-search"
          className="relative w-full sm:w-60"
        >
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search ticket or sub-order #..."
            aria-label="Search tickets or sub-orders - press Enter to run the search"
            data-testid="support-search-input"
            className="w-full rounded-full border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-20 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {draft.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                data-testid="support-search-clear"
                title="Clear the committed search"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors cursor-pointer hover:bg-slate-200/70 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <button
              type="submit"
              data-testid="support-search-submit"
              title="Run the search against the queue"
              className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition-all cursor-pointer hover:bg-slate-800"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* A failed read is shown rather than papered over with counts that may be stale */}
      {error && (
        <div
          role="alert"
          data-testid="support-header-error"
          className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </header>
  );
};
