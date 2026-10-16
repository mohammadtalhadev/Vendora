import { beforeEach, describe, expect, it, vi } from 'vitest';

const { captureException } = vi.hoisted(() => ({
  captureException: vi.fn(() => 'abcdef01-2345-6789-abcd-ef0123456789'),
}));
vi.mock('./error-reporter', () => ({ captureException }));

import {
  friendlyError,
  friendlyErrorText,
  markRpcError,
  toFriendlyError,
} from './friendly-error';

const SERVER = 'Something went wrong on our side — please try again in a moment.';
const RATE = 'Too many attempts — wait a few minutes before trying again.';
const SESSION = 'Your session has expired. Sign in again to continue.';
const CREDENTIALS = 'Email or password is incorrect. Check both and try again.';
const EXISTS =
  'An account with this email already exists. Sign in instead, or reset your password.';
const MFA_CONFLICT =
  'An authenticator is already set up on this account. Sign in and enter your code — or remove the existing authenticator from your profile first if you need to start over.';
const OTP = 'That code is incorrect or has expired. Use the newest email and try again.';

describe('friendlyError — code table', () => {
  const cases: Array<[unknown, string, string]> = [
    [{ code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 }, CREDENTIALS, 'credentials'],
    [
      { code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 },
      'Confirm your email first — check your inbox for the code or link, or resend it below.',
      'unconfirmed',
    ],
    [
      { code: 'email_address_invalid', message: 'Unable to validate email address: invalid format' },
      "That email address doesn't look valid. Check it and try again.",
      'validation',
    ],
    [{ code: 'user_already_exists', message: 'User already registered' }, EXISTS, 'conflict'],
    [{ code: 'email_exists', message: 'Email already registered' }, EXISTS, 'conflict'],
    [
      {
        code: 'mfa_factor_name_conflict',
        message: 'A factor with the friendly name "Vendora authenticator" already exists',
        status: 422,
      },
      MFA_CONFLICT,
      'conflict',
    ],
    [
      { code: 'weak_password', message: 'Password should be at least 8 characters' },
      'Use a stronger password — at least 8 characters with mixed case and a number.',
      'validation',
    ],
    [{ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }, RATE, 'rate-limit'],
    [{ code: 'otp_expired', message: 'Token has expired or is invalid', status: 422 }, OTP, 'validation'],
    [
      { code: 'same_password', message: 'New password should be different from the old password.' },
      'Your new password must be different from the current one.',
      'validation',
    ],
    [
      { code: '23505', message: 'duplicate key value violates unique constraint "newsletter_subscribers_email_key"' },
      'That already exists.',
      'conflict',
    ],
    [{ code: '42501', message: 'permission denied for table orders' }, "You don't have permission to do that.", 'permission'],
    [
      { code: '42P17', message: 'infinite recursion detected in policy for relation "profiles"' },
      SERVER,
      'server',
    ],
    [
      { code: 'PGRST202', message: 'Could not find the function public.admin_set_payment_status in the schema cache' },
      SERVER,
      'server',
    ],
    [
      { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
      'That could not be found. It may have been removed.',
      'validation',
    ],
    [{ code: 'PGRST301', message: 'JWT expired' }, SESSION, 'session'],
    [{ code: 'session_not_found', message: 'Session from session_id claim in JWT does not exist' }, SESSION, 'session'],
  ];

  it.each(cases)('maps %o to the %s copy', (input, message, kind) => {
    const result = friendlyError(input);
    expect(result.message).toBe(message);
    expect(result.kind).toBe(kind);
  });
});

describe('friendlyError — status and message backstops', () => {
  it('maps the exact failure the owner hit to the server sentence and flags it for reporting', () => {
    const result = friendlyError({ status: 500, message: 'Database error querying schema' });
    expect(result.message).toBe(SERVER);
    expect(result.kind).toBe('server');
    expect(result.report).toBe(true);
    expect(result.retryable).toBe(true);
  });

  it('catches "Database error" text even when no status rides along', () => {
    expect(friendlyError({ message: 'Database error saving new user' }).kind).toBe('server');
  });

  it('maps an infinite-recursion policy fault to the server sentence and flags it for reporting', () => {
    const byMessageOnly = friendlyError({
      message: 'infinite recursion detected in policy for relation "profiles"',
    });
    expect(byMessageOnly.message).toBe(SERVER);
    expect(byMessageOnly.kind).toBe('server');
    expect(byMessageOnly.report).toBe(true);

    const byCodeOnly = friendlyError({ code: '42P17', message: 'query failed' });
    expect(byCodeOnly.message).toBe(SERVER);
    expect(byCodeOnly.kind).toBe('server');
    expect(byCodeOnly.report).toBe(true);
  });

  it('maps HTTP 429 to the rate-limit sentence', () => {
    expect(friendlyError({ status: 429, message: 'Request rate limit reached' }).message).toBe(RATE);
  });

  it('maps any 5xx status to the server sentence', () => {
    expect(friendlyError({ status: 503, message: 'upstream unavailable' }).message).toBe(SERVER);
  });

  it('maps fetch failures to the network sentence', () => {
    const result = friendlyError(new TypeError('Failed to fetch'));
    expect(result.message).toBe("Can't reach Vendora — check your connection and try again.");
    expect(result.kind).toBe('network');
  });

  it('maps a codeless credentials refusal by its wording', () => {
    expect(friendlyError({ message: 'Invalid login credentials' }).message).toBe(CREDENTIALS);
  });

  it('maps a codeless rate-limit refusal by its wording', () => {
    expect(friendlyError({ message: 'Email rate limit exceeded' }).message).toBe(RATE);
  });

  it('keeps a database raise exception (P0001) verbatim — it is authored for the user', () => {
    const result = friendlyError({ code: 'P0001', message: 'This order has already been refunded in full.' });
    expect(result.message).toBe('This order has already been refunded in full.');
    expect(result.kind).toBe('validation');
  });

  it('never prints an unclassifiable service object', () => {
    const result = friendlyError({ message: 'something obscure happened in shard 7', details: 'pg trace', hint: 'x' });
    expect(result.message).toBe(SERVER);
    expect(result.kind).toBe('unknown');
    expect(result.report).toBe(true);
  });

  it('falls back for values that are not errors at all', () => {
    expect(friendlyError(null).message).toBe(SERVER);
    expect(friendlyError(undefined).message).toBe(SERVER);
    expect(friendlyError(42).message).toBe(SERVER);
  });

  it('passes app-authored copy through untouched', () => {
    expect(friendlyError(new Error('"SAVE10" has expired.')).message).toBe('"SAVE10" has expired.');
    expect(friendlyError('Enter a promotion code.').message).toBe('Enter a promotion code.');
  });
});

describe('friendlyError — MFA factor conflicts', () => {
  it('maps a factor conflict that arrives by code to the authenticator sentence', () => {
    const result = friendlyError({
      code: 'mfa_factor_name_conflict',
      message: 'A factor with the friendly name "Vendora authenticator" already exists',
      status: 422,
    });
    expect(result.message).toBe(MFA_CONFLICT);
    expect(result.kind).toBe('conflict');
  });

  it('maps a codeless factor conflict by its wording — never to the sign-up sentence', () => {
    const result = friendlyError({
      message: 'A factor with the friendly name "Vendora authenticator" already exists',
    });
    expect(result.message).toBe(MFA_CONFLICT);
    expect(result.message).not.toBe(EXISTS);
  });

  it('a real sign-up duplicate still maps to the email sentence', () => {
    expect(friendlyError({ message: 'User already registered' }).message).toBe(EXISTS);
    expect(
      friendlyError({ code: 'user_already_exists', message: 'User already registered' }).message,
    ).toBe(EXISTS);
  });
});

describe('friendlyError — rpcFailed tagging', () => {
  const tagged = () =>
    markRpcError(new Error('Could not refund the package: the order is already settled'), 'Could not refund the package');

  it('keeps the database wording on staff surfaces', () => {
    expect(friendlyError(tagged(), { staff: true }).message).toBe(
      'Could not refund the package: the order is already settled',
    );
  });

  it('keeps only the operation on customer surfaces', () => {
    expect(friendlyError(tagged()).message).toBe('Could not refund the package. Please try again.');
  });

  it('keeps a governance refusal whole on staff surfaces even when its wording matches a backstop', () => {
    const refusal = markRpcError(
      new Error('Failed to load the merchant queue: permission denied for function admin_vendor_queue'),
      'Failed to load the merchant queue',
    );
    expect(friendlyError(refusal, { staff: true }).message).toBe(
      'Failed to load the merchant queue: permission denied for function admin_vendor_queue',
    );
    // The same refusal on a customer surface collapses to the permission sentence.
    expect(friendlyError(refusal).message).toBe("You don't have permission to do that.");
  });

  it('never passes a hard internal pattern through, even tagged and on a staff surface', () => {
    const internal = markRpcError(
      new Error('Failed to load orders: Could not find the function public.admin_order_queue in the schema cache'),
      'Failed to load orders',
    );
    expect(friendlyError(internal, { staff: true }).message).toBe(SERVER);
    expect(friendlyError(internal, { staff: true }).report).toBe(true);
  });
});

describe('friendlyErrorText — reporting and references', () => {
  beforeEach(() => captureException.mockClear());

  it('appends the report reference for server-class errors and reports once', () => {
    const text = friendlyErrorText({ status: 500, message: 'Database error querying schema' }, { context: 'auth' });
    expect(text).toBe(`${SERVER} Reference: abcdef01.`);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('does not report expected refusals', () => {
    expect(friendlyErrorText({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(CREDENTIALS);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('composes the caller prefix in front of the mapped sentence', () => {
    expect(
      friendlyErrorText({ message: 'Email rate limit exceeded' }, { prefix: 'Could not resend the confirmation email' }),
    ).toBe(`Could not resend the confirmation email: ${RATE}`);
  });

  it('returns an already-mapped error unchanged and does not report it again', () => {
    const wrapped = toFriendlyError({ status: 500, message: 'Database error querying schema' });
    expect(captureException).toHaveBeenCalledTimes(1);
    captureException.mockClear();

    expect(wrapped.message).toBe(`${SERVER} Reference: abcdef01.`);
    expect(friendlyError(wrapped).message).toBe(SERVER);
    expect(friendlyErrorText(wrapped)).toBe(wrapped.message);
    expect(captureException).not.toHaveBeenCalled();
  });
});
