import { captureException } from './error-reporter';

/**
 * The one error-mapping layer for the whole app (Batch 54).
 *
 * Before this module existed, Supabase errors travelled verbatim to the
 * screen: `session.ts` rethrew `error.message` raw and every page rendered
 * it, which is how a signed-out visitor came to be told "Database error
 * querying schema" on the login page. Now every error a user can meet is
 * classified here first — by the service's own `code`, then its HTTP
 * `status`, then message-pattern backstops — and what comes out is a plain
 * sentence the person can act on, plus flags saying whether it is worth
 * retrying and whether it should be reported to `error_logs`.
 *
 * The mapper itself never logs and never throws. Reporting is the caller's
 * one step (see `friendlyErrorText`), so a handled error is reported exactly
 * once, by the layer that decided to show it.
 */

export type FriendlyErrorKind =
  | 'credentials'
  | 'unconfirmed'
  | 'rate-limit'
  | 'network'
  | 'server'
  | 'permission'
  | 'conflict'
  | 'validation'
  | 'session'
  | 'unknown';

export interface FriendlyError {
  message: string;
  kind: FriendlyErrorKind;
  /** A retry stands a chance of succeeding (network blip, rate limit, 5xx). */
  retryable: boolean;
  /** Server-class: the caller should report it and may show the reference. */
  report: boolean;
}

export interface FriendlyErrorOptions {
  /** Free-text label for the report context (e.g. 'auth', 'checkout'). */
  context?: string;
  /**
   * Staff surfaces (admin/vendor/rider/support consoles) may keep the
   * database's own RPC wording — those `raise exception` texts are written
   * for the person seeing them. Customer surfaces never get them.
   */
  staff?: boolean;
  /** Composed in front of the mapped sentence ("Could not load your profile: …"). */
  prefix?: string;
}

/** An Error already mapped by this module; re-mapping returns it unchanged. */
export interface FriendlyMarkedError extends Error {
  vendoraFriendly?: FriendlyError & { text: string };
}

/** An Error produced by an `rpcFailed(...)` helper, with its operation kept. */
export interface RpcTaggedError extends Error {
  vendoraRpcOperation?: string;
}

/**
 * Tags an error thrown by an `rpcFailed(operation, message)` helper so the
 * mapper can recognise it later: staff surfaces keep the database wording,
 * customer surfaces keep only the operation. The error's own `message` is
 * left exactly as the helper composed it.
 */
export function markRpcError(error: Error, operation: string): Error {
  (error as RpcTaggedError).vendoraRpcOperation = operation;
  return error;
}

const SERVER_TEXT = 'Something went wrong on our side — please try again in a moment.';
const RATE_LIMIT_TEXT = 'Too many attempts — wait a few minutes before trying again.';
const SESSION_TEXT = 'Your session has expired. Sign in again to continue.';
const NETWORK_TEXT = "Can't reach Vendora — check your connection and try again.";
const PERMISSION_TEXT = "You don't have permission to do that.";

const server = (): FriendlyError => ({ message: SERVER_TEXT, kind: 'server', retryable: true, report: true });
const rateLimit = (): FriendlyError => ({ message: RATE_LIMIT_TEXT, kind: 'rate-limit', retryable: true, report: false });
const session = (): FriendlyError => ({ message: SESSION_TEXT, kind: 'session', retryable: false, report: false });
const validation = (message: string): FriendlyError => ({ message, kind: 'validation', retryable: false, report: false });

interface ErrorShape {
  message: string;
  code?: string;
  status?: number;
}

function shapeOf(error: unknown): ErrorShape | null {
  if (typeof error === 'string') return error ? { message: error } : null;
  if (!error || typeof error !== 'object') return null;
  const record = error as { message?: unknown; code?: unknown; status?: unknown };
  const message = typeof record.message === 'string' ? record.message : '';
  const code = typeof record.code === 'string' ? record.code : undefined;
  const statusRaw = typeof record.status === 'number' ? record.status : Number(record.status);
  return { message, code, status: Number.isFinite(statusRaw) ? statusRaw : undefined };
}

/** Rule 1 — the services' own error codes, the most precise signal available. */
function byCode(code: string): FriendlyError | null {
  switch (code) {
    case 'invalid_credentials':
      return {
        message: 'Email or password is incorrect. Check both and try again.',
        kind: 'credentials',
        retryable: true,
        report: false,
      };
    case 'email_not_confirmed':
      return {
        message: 'Confirm your email first — check your inbox for the code or link, or resend it below.',
        kind: 'unconfirmed',
        retryable: false,
        report: false,
      };
    case 'email_address_invalid':
      return validation("That email address doesn't look valid. Check it and try again.");
    case 'user_already_exists':
    case 'email_exists':
      return {
        message: 'An account with this email already exists. Sign in instead, or reset your password.',
        kind: 'conflict',
        retryable: false,
        report: false,
      };
    case 'weak_password':
      return validation('Use a stronger password — at least 8 characters with mixed case and a number.');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return rateLimit();
    case 'otp_expired':
      return validation('That code is incorrect or has expired. Use the newest email and try again.');
    case 'same_password':
      return validation('Your new password must be different from the current one.');
    case 'session_expired':
    case 'session_not_found':
    case 'refresh_token_not_found':
    case 'PGRST301':
      return session();
    case '23505':
      return { message: 'That already exists.', kind: 'conflict', retryable: false, report: false };
    case '42501':
      return { message: PERMISSION_TEXT, kind: 'permission', retryable: false, report: false };
    case 'PGRST202':
      // A function the client calls is missing from the schema — a migration
      // has not been run. Never shown; always reported.
      return server();
    case 'PGRST116':
      return validation('That could not be found. It may have been removed.');
    default:
      return null;
  }
}

/** Rule 2 — HTTP status, for errors that arrive without a usable code. */
function byStatus(shape: ErrorShape): FriendlyError | null {
  const { status, message } = shape;
  if (/database error/i.test(message)) return server();
  if (status === 429) return rateLimit();
  if (status !== undefined && status >= 500 && status <= 599) return server();
  if (status === 401 || status === 403) {
    return { message: PERMISSION_TEXT, kind: 'permission', retryable: false, report: false };
  }
  if (status === 400) {
    return validation('That request could not be completed. Check your entries and try again.');
  }
  return null;
}

/**
 * Rule 3 — the hard internal patterns. These name machinery, not a refusal:
 * a missing migration, a broken schema, a database fault. They are caught
 * before the staff passthrough below, because no audience — staff included —
 * is ever shown them; they are reported instead.
 */
function byHardInternal(message: string): FriendlyError | null {
  const text = message.toLowerCase();
  if (!text) return null;
  if (/database error/.test(text)) return server();
  if (/could not find the function|schema cache/.test(text)) return server();
  if (/relation .* does not exist|column .* does not exist/.test(text)) return server();
  return null;
}

/**
 * Rule 4 — message-pattern backstops. Services do not always attach a code
 * (older GoTrue responses, wrapped errors, fixture-shaped objects), so the
 * recognisable raw sentences are caught here before anything can leak.
 */
function byMessage(message: string): FriendlyError | null {
  const text = message.toLowerCase();
  if (!text) return null;
  if (/invalid login credentials|invalid credentials/.test(text)) {
    return {
      message: 'Email or password is incorrect. Check both and try again.',
      kind: 'credentials',
      retryable: true,
      report: false,
    };
  }
  if (/email.*not confirmed/.test(text)) {
    return {
      message: 'Confirm your email first — check your inbox for the code or link, or resend it below.',
      kind: 'unconfirmed',
      retryable: false,
      report: false,
    };
  }
  if (/already registered|user already exists|email already exists|already been registered/.test(text)) {
    return {
      message: 'An account with this email already exists. Sign in instead, or reset your password.',
      kind: 'conflict',
      retryable: false,
      report: false,
    };
  }
  if (/duplicate key value/.test(text)) {
    return { message: 'That already exists.', kind: 'conflict', retryable: false, report: false };
  }
  if (/rate limit|too many requests|too many attempts/.test(text)) return rateLimit();
  if (/new password should be different|same password/.test(text)) {
    return validation('Your new password must be different from the current one.');
  }
  if (/password should be at least|password is too weak|weak password/.test(text)) {
    return validation('Use a stronger password — at least 8 characters with mixed case and a number.');
  }
  if (/(token|code|otp).*(expired|invalid)|expired.*(token|code)/.test(text)) {
    return validation('That code is incorrect or has expired. Use the newest email and try again.');
  }
  if (/jwt expired|invalid jwt|refresh token|session.*(expired|not found|does not exist)/.test(text)) {
    return session();
  }
  if (/failed to fetch|networkerror|load failed|network request failed|fetch failed/.test(text)) {
    return { message: NETWORK_TEXT, kind: 'network', retryable: true, report: false };
  }
  if (/violates row-level security|permission denied/.test(text)) {
    return { message: PERMISSION_TEXT, kind: 'permission', retryable: false, report: false };
  }
  if (/provider is not enabled|provider.*not enabled|unsupported provider/.test(text)) {
    return validation('That sign-in option is not available. Try email and password instead.');
  }
  if (/unable to validate email|invalid.*email|email.*invalid format/.test(text)) {
    return validation("That email address doesn't look valid. Check it and try again.");
  }
  return null;
}

/**
 * Classifies any thrown value into the sentence a user should see.
 * Pure: never logs, never throws, and an already-mapped error passes
 * through unchanged so layers can wrap defensively without double-mapping.
 */
export function friendlyError(error: unknown, opts?: FriendlyErrorOptions): FriendlyError {
  const marked = (error as FriendlyMarkedError | null)?.vendoraFriendly;
  if (marked) return marked;

  const shape = shapeOf(error);
  const operation = (error as RpcTaggedError | null)?.vendoraRpcOperation;

  if (shape) {
    const mapped =
      (shape.code ? byCode(shape.code) : null) ?? byStatus(shape) ?? byHardInternal(shape.message);
    if (mapped) return mapped;

    // rpcFailed output on a staff surface: the tag is a stronger signal
    // than any wording pattern — the database's refusal was written for
    // the staff member seeing it, so it survives whole (only the hard
    // internal patterns above outrank it).
    if (operation && opts?.staff) return validation(shape.message);

    const byWording = byMessage(shape.message);
    if (byWording) return byWording;

    // A database `raise exception` (Postgres P0001) is authored prose for
    // the person who triggered it — checkout guards, refund guards — so it
    // survives as-is once the internal-error patterns above have had their
    // chance to catch it.
    if (shape.code === 'P0001' && shape.message) return validation(shape.message);
  }

  // rpcFailed output on a customer surface: the friendly operation prefix
  // is ours, the suffix is the database's — only the operation is kept.
  if (operation && shape) {
    return { message: `${operation}. Please try again.`, kind: 'validation', retryable: true, report: false };
  }

  // Plain Errors and strings that matched nothing were authored by the app
  // itself (form validation, coupon rules, deliberate copy) — they are
  // already user-facing sentences, so they stand.
  if (error instanceof Error && error.message) return validation(error.message);
  if (typeof error === 'string' && error) return validation(error);

  // Anything else is a service-shaped object we could not classify: it is
  // never safe to print, so it becomes the generic server sentence and a
  // report, so the real text lands in error_logs instead of on the screen.
  return { message: SERVER_TEXT, kind: 'unknown', retryable: true, report: true };
}

/**
 * The display sentence for an error, with the reporting step done: when the
 * mapping is server-class, the error is captured and the report's reference
 * (first 8 characters of its id) is appended, so a user can quote it and an
 * admin can find the row in `error_logs`. Already-mapped errors return
 * their stored text untouched — they were reported where they were mapped.
 */
export function friendlyErrorText(error: unknown, opts?: FriendlyErrorOptions): string {
  const marked = (error as FriendlyMarkedError | null)?.vendoraFriendly;
  if (marked) return marked.text;

  const friendly = friendlyError(error, opts);
  const body = opts?.prefix ? `${opts.prefix}: ${friendly.message}` : friendly.message;
  if (!friendly.report) return body;
  const eventId = captureException(error, { source: opts?.context ?? 'friendly-error' });
  return eventId ? `${body} Reference: ${eventId.slice(0, 8)}.` : body;
}

/**
 * An Error ready to throw across a layer boundary: its message is the
 * display sentence (reference included when server-class) and it carries
 * its mapping, so any layer that catches it later re-renders it unchanged
 * instead of mapping it a second time.
 */
export function toFriendlyError(error: unknown, opts?: FriendlyErrorOptions): Error {
  const friendly = friendlyError(error, opts);
  const text = friendlyErrorText(error, opts);
  const wrapped = new Error(text) as FriendlyMarkedError;
  wrapped.vendoraFriendly = { ...friendly, text };
  return wrapped;
}
