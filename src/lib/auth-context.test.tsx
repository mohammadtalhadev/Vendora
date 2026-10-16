import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('./supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { AuthProvider, useAuth } from './auth-context';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';
import { queryClient } from './query-client';
import { profileRow, supabaseDouble } from '../test/supabase-double';

function Probe() {
  const { user, loading, signIn, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <span data-testid="status">{loading ? 'loading' : user ? user.name : 'guest'}</span>
      <button type="button" onClick={() => void signIn('buyer@demo.test', 'demo1234').catch((e: Error) => setError(e.message))}>
        sign in
      </button>
      <button type="button" onClick={() => void signOut()}>
        sign out
      </button>
      <span data-testid="error">{error}</span>
    </div>
  );
}

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    supabaseDouble.reset();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    useCartStore.getState().initializeForUser(null);
  });

  it('applies the profile and session the server returns, and re-keys the cart', async () => {
    supabaseDouble.seedProfile(profileRow({ roles: ['vendor'] }));
    renderProbe();

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('Talha Javaid'));
    expect(useAuthStore.getState().user?.roles).toEqual(['vendor']);
    expect(useAuthStore.getState().token).toBe('test-access-token');
    expect(useCartStore.getState().activeUserId).toBe('user-1');
  });

  it('refuses a session with no profile row instead of half-signing in', async () => {
    supabaseDouble.authState.signInUser = { id: 'auth-orphan', email: 'orphan@demo.test' };
    renderProbe();

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(/no profile/));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(screen.getByTestId('status')).toHaveTextContent('guest');
  });

  it('reports the server rejection for bad credentials', async () => {
    renderProbe();

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Email or password is incorrect. Check both and try again.',
      ),
    );
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('clears app state when the server confirms sign-out', async () => {
    supabaseDouble.seedProfile(profileRow());
    renderProbe();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
    expect(useAuthStore.getState().token).toBeNull();
    expect(useCartStore.getState().activeUserId).toBeNull();
    expect(supabaseDouble.auth.signOut).toHaveBeenCalled();
  });

  it('clears the query cache and the departing user\u2019s local caches on sign-out', async () => {
    supabaseDouble.seedProfile(profileRow());
    renderProbe();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));

    queryClient.setQueryData(['orders', 'mine'], [{ id: 'order-1' }]);
    localStorage.setItem('vd:v1:cart:user-1', '[{"productId":"p1"}]');
    localStorage.setItem('vd:v1:wishlist:user-1', '[{"id":"p1"}]');
    localStorage.setItem('vd:v1:cart:guest', '[{"productId":"p9"}]');

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(localStorage.getItem('vd:v1:cart:user-1')).toBeNull();
    expect(localStorage.getItem('vd:v1:wishlist:user-1')).toBeNull();
    // The device's own guest bucket is not the departing account's data.
    expect(localStorage.getItem('vd:v1:cart:guest')).not.toBeNull();
  });

  it('holds the signed-in state when a profile re-read fails on a live session', async () => {
    supabaseDouble.seedProfile(profileRow({ roles: ['admin'] }));
    renderProbe();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));

    // A token refresh whose profile read is refused (a transient PostgREST
    // failure) must not be read as a sign-out or a lost role.
    supabaseDouble.failures.profiles = 'connection reset by peer';
    act(() =>
      supabaseDouble.emit('TOKEN_REFRESHED', {
        access_token: 'test-access-token',
        user: { id: 'user-1', email: 'talha@demo.test' },
      }),
    );

    // Give the failed read time to land, then confirm nothing was dropped.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.roles).toEqual(['admin']);
    expect(screen.getByTestId('status')).toHaveTextContent('Talha Javaid');
    delete supabaseDouble.failures.profiles;
  });

  it('drops the session when the server reports sign-out on its own', async () => {
    supabaseDouble.seedProfile(profileRow());
    renderProbe();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));

    act(() => supabaseDouble.emit('SIGNED_OUT', null));

    await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
  });
});
