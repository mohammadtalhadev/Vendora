import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insert, getSession } = vi.hoisted(() => ({
  insert: vi.fn(async () => ({ error: null })),
  getSession: vi.fn(async () => ({ data: { session: { user: { id: 'user-9' } } } })),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession },
    from: vi.fn(() => ({ insert })),
  },
  isSupabaseConfigured: true,
  TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
}));

import { captureException } from './error-reporter';

beforeEach(() => {
  insert.mockClear();
  getSession.mockClear();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('captureException', () => {
  it('never throws, even for a non-Error value', () => {
    expect(() => captureException({ weird: true })).not.toThrow();
    expect(() => captureException(undefined)).not.toThrow();
  });

  it('records the error in error_logs with the signed-in user', async () => {
    captureException(new Error('kaboom'), { route: '/checkout' });
    await vi.waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-9', message: 'kaboom', route: '/checkout' }),
    );
  });

  it('posts a Sentry envelope only when VITE_SENTRY_DSN is set', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    captureException(new Error('no dsn yet'));
    await vi.waitFor(() => expect(insert).toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalled();

    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc123@o1.ingest.sentry.io/42');
    captureException(new Error('with dsn'));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://o1.ingest.sentry.io/api/42/envelope/');
    expect((init.headers as Record<string, string>)['X-Sentry-Auth']).toContain('sentry_key=abc123');
    expect(String(init.body)).toContain('with dsn');
  });
});
