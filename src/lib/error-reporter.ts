import { supabase } from './supabase';

/**
 * Error monitoring (Batch 44).
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
 * none.
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
): void {
  const parsed = parseSentryDsn(dsn);
  if (!parsed) return;
  const eventId = newEventId();
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
    user_id: userId,
    message: info.message.slice(0, 2000),
    stack: info.stack?.slice(0, 8000) ?? null,
    route: route ?? null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });
}

export function captureException(error: unknown, context?: ErrorReportContext): void {
  try {
    const info = describe(error);
    const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
    if (dsn) reportToSentry(dsn, info, context);
    void reportToErrorLogs(info, context).catch(() => {
      // Fire-and-forget: a failed insert is a lost report, never a crash.
    });
  } catch {
    // Never throws. Deliberately empty.
  }
}
