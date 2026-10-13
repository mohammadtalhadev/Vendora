import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  ScrollText,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useBroadcastLog } from '../features/admin/hooks/useAdminQueries';
import { useNotificationActions } from '../features/notifications/hooks/useNotifications';
import type { NotificationKind } from '../features/notifications/api/notifications';

/**
 * What the console can honestly do with notifications: say something to a role through
 * `broadcast_notification()`, and read back the announcements the platform has sent.
 * Delivery rates, gateway health and trigger switches are not stripped here because they
 * would be nice - they are stripped because no table or RPC reports them.
 */

/** The audiences `broadcast_notification()` addresses; anything else it refuses outright. */
type Audience = 'all' | 'customer' | 'vendor' | 'support' | 'admin' | 'rider';

const AUDIENCES: ReadonlyArray<{ value: Audience; label: string }> = [
  { value: 'all', label: 'Everyone' },
  { value: 'customer', label: 'Customers' },
  { value: 'vendor', label: 'Sellers' },
  { value: 'support', label: 'Support desk' },
  { value: 'admin', label: 'Platform team' },
  { value: 'rider', label: 'Riders' },
];

/** `public.notification_type`, the enum the RPC casts `p_type` into. */
const KINDS: ReadonlyArray<{ value: NotificationKind; label: string }> = [
  { value: 'system', label: 'System notice' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'order_status', label: 'Order status' },
  { value: 'payout', label: 'Payout' },
  { value: 'dispute', label: 'Dispute' },
  { value: 'review', label: 'Review' },
  { value: 'security', label: 'Security' },
];

const PAGE_SIZE = 10;

const labelOf = (catalogue: ReadonlyArray<{ value: string; label: string }>, value: string): string =>
  catalogue.find((entry) => entry.value === value)?.label ?? value;

const accounts = (count: number) => `${count.toLocaleString()} account${count === 1 ? '' : 's'}`;

/** The database's own refusal, which is the only explanation this console can give. */
const reason = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim() !== '' ? error.message : fallback;

export const AdminNotificationsPage = () => {
  const [audience, setAudience] = useState<Audience>('all');
  const [type, setType] = useState<NotificationKind>('system');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [href, setHref] = useState('');
  const [page, setPage] = useState(1);

  const { broadcast } = useNotificationActions();
  const log = useBroadcastLog({ page, pageSize: PAGE_SIZE });

  const rows = log.data?.rows ?? [];
  const total = log.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const path = href.trim();
    broadcast.mutate(
      {
        audience,
        type,
        // Title and body go in as written: `broadcast_notification()` is what refuses an empty
        // one, and its message is the answer the operator needs.
        title: title.trim(),
        message: message.trim(),
        href: path === '' ? undefined : path,
      },
      {
        onSuccess: () => {
          // `audit_logs` is not in the realtime publication, so re-reading is the only honest way
          // to see the record this write just produced.
          void log.refetch();
          setTitle('');
          setMessage('');
          setHref('');
        },
      },
    );
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="Broadcasts"
      subtitle="Send an announcement to a role and read back the ones the platform has already sent."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">
            Broadcasts &amp; Announcement Log
          </h1>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            A broadcast is one row per account in the audience, written by{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-semibold text-slate-700">
              broadcast_notification()
            </code>
            . Only staff are allowed to call it, and the database counts who it reached.
          </p>
        </div>

        {/* Composer */}
        <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-600">
              <Megaphone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Send an announcement</h2>
              <p className="text-xs text-slate-500">
                Everyone in the audience gets their own notice, so each of them can read it on
                their own schedule.
              </p>
            </div>
          </div>

          <form onSubmit={send} className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div>
              <label htmlFor="broadcast-audience" className="mb-1 block font-bold text-slate-700">
                Audience
              </label>
              <select
                id="broadcast-audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value as Audience)}
                className="admin-select w-full"
              >
                {AUDIENCES.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="broadcast-kind" className="mb-1 block font-bold text-slate-700">
                Kind
              </label>
              <select
                id="broadcast-kind"
                value={type}
                onChange={(event) => setType(event.target.value as NotificationKind)}
                className="admin-select w-full"
              >
                {KINDS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="broadcast-title" className="mb-1 block font-bold text-slate-700">
                Title
              </label>
              <input
                id="broadcast-title"
                type="text"
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Scheduled maintenance tonight"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="broadcast-message" className="mb-1 block font-bold text-slate-700">
                Message
              </label>
              <textarea
                id="broadcast-message"
                rows={3}
                maxLength={500}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="What is happening, who it affects and when."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="broadcast-href" className="mb-1 block font-bold text-slate-700">
                In-app link <span className="font-medium text-slate-400">(optional)</span>
              </label>
              <input
                id="broadcast-href"
                type="text"
                value={href}
                onChange={(event) => setHref(event.target.value)}
                placeholder="/orders"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={broadcast.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sun-orange to-[#FF9233] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all hover:from-sun-orange-600 hover:to-[#e88020] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {broadcast.isPending ? 'Sending…' : 'Send announcement'}
              </button>
              <p className="text-[11px] text-slate-400">
                Sent as the signed-in account. There is no preview and no undo.
              </p>
            </div>
          </form>

          {/* The count the RPC returned, not a delivery rate this database cannot measure. */}
          {broadcast.isSuccess && (
            <div
              role="status"
              aria-live="polite"
              data-testid="broadcast-result"
              className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>
                Reached {accounts(broadcast.data ?? 0)}
                {broadcast.data === 0
                  ? ' — no account carries that role, so nothing was written.'
                  : '.'}
              </span>
            </div>
          )}

          {broadcast.isError && (
            <div
              role="alert"
              aria-live="assertive"
              data-testid="broadcast-error"
              className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              <span>{reason(broadcast.error, 'The announcement could not be sent.')}</span>
            </div>
          )}
        </section>

        {/* Delivery log */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-600">
                <ScrollText className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Announcement log</h2>
                <p className="text-xs text-slate-500">
                  Each broadcast writes one audit record. The notices themselves live in other
                  accounts&apos; trays, which is why this read lists the sends, not the opens.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void log.refetch()}
              disabled={log.isFetching}
              className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:opacity-50 sm:self-auto cursor-pointer"
            >
              {log.isFetching ? 'Reading…' : 'Reload'}
            </button>
          </div>

          {log.isPending ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-3 px-5 py-8 text-sm text-slate-700"
            >
              <ScrollText className="h-4 w-4" aria-hidden="true" />
              Reading the announcement log…
            </div>
          ) : log.isError ? (
            /* A log that could not be read is not a platform that never announced anything. */
            <div
              role="alert"
              data-testid="log-error"
              className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 m-5"
            >
              <div className="mb-1 font-semibold">Failed to load the announcement log</div>
              <div className="mb-3 text-xs">
                {reason(log.error, 'The broadcast audit records could not be read.')}
              </div>
              <button
                type="button"
                onClick={() => void log.refetch()}
                className="inline-flex cursor-pointer rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          ) : total === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Megaphone className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No announcements sent yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                Nothing has called <code className="text-[11px]">broadcast_notification()</code>{' '}
                since this table began recording it.
              </p>
            </div>
          ) : rows.length === 0 ? (
            /* `total` counts every send; this page simply has none of them on it. */
            <div data-testid="log-page-empty" className="px-5 py-12 text-center text-xs text-slate-500">
              No announcements on this page.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table
                  className="w-full text-left text-xs"
                  aria-label="Announcement delivery log"
                >
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3.5">Sent by</th>
                      <th scope="col" className="px-4 py-3.5">Audience</th>
                      <th scope="col" className="px-4 py-3.5">Announcement</th>
                      <th scope="col" className="px-4 py-3.5 text-right">Reached</th>
                      <th scope="col" className="px-4 py-3.5 text-right">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.id} data-testid={`log-row-${row.id}`} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-semibold text-slate-900">{row.actorName || '—'}</div>
                          <div className="text-[11px] text-slate-400">
                            {labelOf(KINDS, row.type)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                            {labelOf(AUDIENCES, row.audience)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-bold text-slate-900">{row.title}</div>
                          <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-slate-600">
                            {row.message}
                          </p>
                          {row.href !== null && row.href !== '' && (
                            <p className="mt-1 text-[11px] text-slate-400">
                              Opens <code className="text-[11px] text-slate-500">{row.href}</code>
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right align-top">
                          <div
                            data-testid={`log-reached-${row.id}`}
                            className="font-bold text-slate-900"
                          >
                            {row.recipients.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {row.recipients === 1 ? 'account' : 'accounts'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right align-top text-[11px] text-slate-500">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Page <strong className="text-slate-800">{log.data?.page ?? page}</strong> of{' '}
                  <strong className="text-slate-800">{totalPages}</strong> · {accounts(total)} sent
                </span>
                <span className="flex gap-1 self-end sm:self-auto">
                  <button
                    type="button"
                    data-testid="log-prev"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="cursor-pointer rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Previous page"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    data-testid="log-next"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="cursor-pointer rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Next page"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              </div>
            </>
          )}
        </section>
      </div>
    </WorkspaceLayout>
  );
};
