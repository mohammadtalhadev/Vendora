import { supabase } from './supabase';

/**
 * Error monitoring.
 *
 * Every captured error goes to two places, both fire-and-forget:
 *  1. The `error_logs` table in our own database (always on — this is the
 *     baseline that works with no third-party account at all; admins read it
 *     under RLS).
 *  2. Sentry, but only when the operator has set VITE_SENTRY_DSN. A minimal
 *     envelope is POSTed straight to the DSN's ingest endpoint; no Sentry
 *     SDK is bundled.
 *
 * captureException NEVER throws and never returns a promise the caller has
 * to handle: an error reporter that can break the error path is worse than
 * none. It does return the report's event id: the id is stored as
 * the `error_logs` row id, so a "Reference: xxxxxxxx" line shown to a user
 * can be looked up by an admin. Reporting the same error object twice
 * returns the same id without writing a second row — the global handlers,
 * the query cache and the page that displays the error may all report one
 * failure without triplicating it.
 */
export interface ErrorReportContext {
  route?: string;
  [key: string]: unknown;
}

function describe(error: unknown): { message: string; stack: string | null; name: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack ?? null, name: error.name };
  }
  if (typeof error === 'string') return { message: error, stack: null, name: 'Error' };
  try {
    return { message: JSON.stringify(error) ?? String(error), stack: null, name: 'Error' };
  } catch {
    return { message: String(error), stack: null, name: 'Error' };
  }
}

function newEventId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }
}

/** A dashed UUID, the shape `error_logs.id` stores. */
function newReportId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    const hex = newEventId();
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}

/** DSN shape: https://<public-key>@<host>/<project-id> (an ingest path may follow the host). */
function parseSentryDsn(dsn: string): { key: string; host: string; projectId: string } | null {
  try {
    const url = new URL(dsn);
    const key = url.username;
    const segments = url.pathname.split('/').filter(Boolean);
    const projectId = segments[segments.length - 1];
    if (!key || !projectId) return null;
    const basePath = segments.slice(0, -1).join('/');
    const host = basePath ? `${url.host}/${basePath}` : url.host;
    return { key, host, projectId };
  } catch {
    return null;
  }
}

function reportToSentry(
  dsn: string,
  info: { message: string; stack: string | null; name: string },
  context?: ErrorReportContext,
  reportId?: string,
): void {
  const parsed = parseSentryDsn(dsn);
  if (!parsed) return;
  const eventId = reportId ? reportId.replace(/-/g, '') : newEventId();
  const event = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level: 'error',
    exception: {
      values: [
        {
          type: info.name,
          value: info.message,
          stacktrace: info.stack ? { frames: [] } : undefined,
        },
      ],
    },
    extra: { stack: info.stack, ...(context ?? {}) },
    request: {
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    },
  };
  const envelope = [
    JSON.stringify({ event_id: eventId, dsn, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: 'event', content_type: 'application/json' }),
    JSON.stringify(event),
  ].join('\n');

  void fetch(`https://${parsed.host}/api/${parsed.projectId}/envelope/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-sentry-envelope',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=vendora-web/1.0, sentry_key=${parsed.key}`,
    },
    body: envelope,
    keepalive: true,
  }).catch(() => {
    // Monitoring must never surface its own failures to the user.
  });
}

async function reportToErrorLogs(
  info: { message: string; stack: string | null },
  context?: ErrorReportContext,
  reportId?: string,
): Promise<void> {
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user?.id ?? null;
  } catch {
    // No session (or no backend yet): userId stays null, the report still counts.
  }
  const route =
    context?.route ??
    (typeof window !== 'undefined' ? window.location.pathname : undefined);
  await supabase.from('error_logs').insert({
    ...(reportId ? { id: reportId } : {}),
    user_id: userId,
    message: info.message.slice(0, 2000),
    stack: info.stack?.slice(0, 8000) ?? null,
    route: route ?? null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });
}

/** Error objects already reported, so one failure writes one row. */
const reportedIds = new WeakMap<object, string>();

export function captureException(error: unknown, context?: ErrorReportContext): string | undefined {
  try {
    if (error && typeof error === 'object') {
      const existing = reportedIds.get(error);
      if (existing) return existing;
    }
    const reportId = newReportId();
    if (error && typeof error === 'object') reportedIds.set(error, reportId);
    const info = describe(error);
    const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
    if (dsn) reportToSentry(dsn, info, context, reportId);
    void reportToErrorLogs(info, context, reportId).catch(() => {
      // Fire-and-forget: a failed insert is a lost report, never a crash.
    });
    return reportId;
  } catch {
    // Never throws. Deliberately empty.
    return undefined;
  }
}
