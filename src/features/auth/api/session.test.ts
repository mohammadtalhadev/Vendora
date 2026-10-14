import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as session from './session';
import { profileRow, supabaseDouble } from '../../../test/supabase-double';

describe('session.signIn', () => {
  beforeEach(() => supabaseDouble.reset());

  it('maps the authorized profiles row into a domain user, with roles from the database', async () => {
    supabaseDouble.seedProfile(profileRow({ roles: ['vendor', 'customer'], vendor_status: 'approved' }));
    supabaseDouble.seedVendorProfile({ id: 'store-1', user_id: 'user-1' });

    const { user, session: next } = await session.signIn('buyer@demo.test', 'demo1234');

    expect(user).toMatchObject({
      id: 'user-1',
      email: 'buyer@demo.test',
      name: 'Talha Javaid',
      roles: ['vendor', 'customer'],
      vendorStatus: 'approved',
      vendorId: 'store-1',
    });
    expect(next.access_token).toBe('test-access-token');
  });

  it('leaves vendorId unset when the account owns no store', async () => {
    supabaseDouble.seedProfile(profileRow({ roles: ['customer'] }));

    const { user } = await session.signIn('buyer@demo.test', 'demo1234');

    expect(user.vendorId).toBeUndefined();
  });

  it('surfaces the server rejection instead of inventing a user', async () => {
    await expect(session.signIn('ghost@demo.test', 'wrong-password')).rejects.toThrow(
      'Email or password is incorrect. Check both and try again.',
    );
  });

  it('translates a coded invalid_credentials refusal into the friendly credentials sentence', async () => {
    supabaseDouble.authState.signInError = {
      message: 'Invalid login credentials',
      code: 'invalid_credentials',
      status: 400,
    };

    await expect(session.signIn('buyer@demo.test', 'wrong-password')).rejects.toThrow(
      'Email or password is incorrect. Check both and try again.',
    );
  });

  it('never leaks a GoTrue 500 to the caller — it becomes the server sentence with a reference', async () => {
    supabaseDouble.authState.signInError = {
      message: 'Database error querying schema',
      status: 500,
    };

    const failure = await session.signIn('buyer@demo.test', 'demo1234').catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toMatch(/^Something went wrong on our side/);
    expect((failure as Error).message).not.toContain('Database error');
  });

  it('signs the session back out when the profile row is missing', async () => {
    supabaseDouble.authState.signInUser = { id: 'auth-orphan', email: 'orphan@demo.test' };

    await expect(session.signIn('orphan@demo.test', 'demo1234')).rejects.toThrow(/no profile/);
    expect(supabaseDouble.auth.signOut).toHaveBeenCalled();
  });

  it('propagates a profile read failure rather than dropping to guest', async () => {
    supabaseDouble.seedProfile(profileRow());
    supabaseDouble.failures.profiles = 'relation "profiles" does not exist';

    await expect(session.signIn('buyer@demo.test', 'demo1234')).rejects.toThrow(/Could not load your profile/);
  });
});

describe('session.signUp', () => {
  beforeEach(() => supabaseDouble.reset());

  it('returns the profile the trigger created when the project skips confirmation', async () => {
    const result = await session.signUp('Talha Javaid', 'new@demo.test', 'demo1234');

    expect(result.requiresEmailConfirmation).toBe(false);
    expect(result.user).toMatchObject({ email: 'new@demo.test', name: 'Talha Javaid', roles: ['customer'] });
    expect(supabaseDouble.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@demo.test', options: { data: { name: 'Talha Javaid' } } }),
    );
  });

  it('reports email confirmation when the server returns no session', async () => {
    supabaseDouble.authState.confirmEmail = true;

    const result = await session.signUp('Talha Javaid', 'new@demo.test', 'demo1234');

    expect(result).toEqual({ user: null, session: null, requiresEmailConfirmation: true });
  });

  it('rejects with the server message when the email is taken', async () => {
    supabaseDouble.authState.signUpError = { message: 'User with this email already registered' };

    await expect(session.signUp('Talha', 'buyer@demo.test', 'demo1234')).rejects.toThrow(/already exists/);
  });
});

describe('session.signOut and OAuth', () => {
  beforeEach(() => supabaseDouble.reset());

  it('clears the stored session', async () => {
    supabaseDouble.seedProfile(profileRow());
    await session.signIn('buyer@demo.test', 'demo1234');

    await session.signOut();

    expect(supabaseDouble.authState.session).toBeNull();
  });

  it('rejects when the server refuses to revoke the session', async () => {
    supabaseDouble.authState.signOutError = { message: 'Failing to fetch jwt keys' };

    await expect(session.signOut()).rejects.toThrow(/Something went wrong on our side/);
  });

  it('starts the provider flow and comes back to the app root', async () => {
    await session.signInWithOAuth('google');

    expect(supabaseDouble.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
  });

  it('reports a provider the project has not enabled', async () => {
    supabaseDouble.authState.oAuthError = { message: 'Provider is not enabled' };

    await expect(session.signInWithOAuth('apple')).rejects.toThrow(/not available/);
  });
});

describe('session.refreshProfile', () => {
  beforeEach(() => supabaseDouble.reset());

  it('returns nothing without a stored session', async () => {
    await expect(session.refreshProfile()).resolves.toEqual({ user: null, session: null });
  });

  it('re-reads roles for the stored session', async () => {
    supabaseDouble.seedProfile(profileRow({ roles: ['vendor'], vendor_status: 'pending_review' }));
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'user-1', email: 'buyer@demo.test' } };

    const { user } = await session.refreshProfile();

    expect(user).toMatchObject({ roles: ['vendor'], vendorStatus: 'pending_review' });
  });

  it('treats a vanished profile as signed out', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'gone', email: 'gone@demo.test' } };

    await expect(session.refreshProfile()).resolves.toEqual({ user: null, session: null });
  });
});

describe('session.onAuthStateChange', () => {
  beforeEach(() => supabaseDouble.reset());

  it('delivers the profile for a session and null after sign-out', async () => {
    supabaseDouble.seedProfile(profileRow({ roles: ['admin'] }));
    const listener = vi.fn();
    session.onAuthStateChange(listener);

    supabaseDouble.emit('SIGNED_IN', { access_token: 't', user: { id: 'user-1', email: 'buyer@demo.test' } });
    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(expect.anything(), expect.anything()));

    expect(listener.mock.calls.at(-1)?.[0]).toMatchObject({ roles: ['admin'] });

    supabaseDouble.emit('SIGNED_OUT', null);
    await vi.waitFor(() => expect(listener).toHaveBeenLastCalledWith(null, null));
  });

  it('reports guest when the profile read behind a session fails', async () => {
    const listener = vi.fn();
    session.onAuthStateChange(listener);
    supabaseDouble.failures.profiles = 'permission denied for table profiles';

    supabaseDouble.emit('SIGNED_IN', { access_token: 't', user: { id: 'user-1', email: 'buyer@demo.test' } });

    await vi.waitFor(() => expect(listener).toHaveBeenLastCalledWith(null, null));
  });

  it('stops delivering after unsubscribe', () => {
    supabaseDouble.seedProfile(profileRow());
    const listener = vi.fn();
    const unsubscribe = session.onAuthStateChange(listener);

    unsubscribe();
    supabaseDouble.emit('SIGNED_IN', { access_token: 't', user: { id: 'user-1', email: 'buyer@demo.test' } });

    expect(listener).not.toHaveBeenCalled();
  });
});
