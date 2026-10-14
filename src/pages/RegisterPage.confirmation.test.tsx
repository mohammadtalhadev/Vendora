import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { AuthProvider } from '../lib/auth-context';
import { useAuthStore } from '../store/auth-store';
import { supabaseDouble } from '../test/supabase-double';

/**
 * The post-register confirmation state (Batch 24): when the project requires
 * email verification, the register page must say so unmistakably — a panel
 * naming the address, the next step, a spam note, and a working Resend —
 * instead of firing an email behind a small dismissible notice.
 */
vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>,
  );

function fillCustomerForm() {
  fireEvent.change(screen.getByPlaceholderText('e.g. Ayesha Khan'), {
    target: { value: 'Ayesha Khan' },
  });
  fireEvent.change(screen.getByPlaceholderText('ayesha@example.com'), {
    target: { value: 'ayesha@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('300 1234567'), {
    target: { value: '3001234567' },
  });
  const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
  fireEvent.change(passwordInputs[0], { target: { value: 'ValidPass123!' } });
  fireEvent.change(passwordInputs[1], { target: { value: 'ValidPass123!' } });
  // Terms start unticked (Batch 45) and the submit stays disabled until agreed.
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('RegisterPage email confirmation state', () => {
  beforeEach(() => {
    localStorage.clear();
    supabaseDouble.reset();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    supabaseDouble.authState.confirmEmail = true;
  });

  it('replaces the form with a check-your-inbox panel naming the address', async () => {
    renderPage();
    fillCustomerForm();
    fireEvent.click(screen.getByRole('button', { name: /Create Customer Account/i }));

    expect(await screen.findByRole('heading', { name: /Check your inbox to finish/i })).toBeInTheDocument();
    expect(screen.getByText('ayesha@example.com')).toBeInTheDocument();
    expect(screen.getByText(/spam or junk folder/i)).toBeInTheDocument();
    // The form is gone — the state cannot be missed or submitted past.
    expect(screen.queryByRole('button', { name: /Create Customer Account/i })).not.toBeInTheDocument();
  });

  it('Resend re-issues the confirmation through the real auth call', async () => {
    renderPage();
    fillCustomerForm();
    fireEvent.click(screen.getByRole('button', { name: /Create Customer Account/i }));

    fireEvent.click(await screen.findByRole('button', { name: /Resend confirmation email/i }));

    await waitFor(() => expect(supabaseDouble.resendCalls).toHaveLength(1));
    expect(supabaseDouble.resendCalls[0]).toMatchObject({ type: 'signup', email: 'ayesha@example.com' });
    expect(await screen.findByText(/on its way to ayesha@example\.com/i)).toBeInTheDocument();
  });

  it('a failed registration shows the error state, never the confirmation panel', async () => {
    supabaseDouble.authState.signUpError = { message: 'Email already registered' };
    renderPage();
    fillCustomerForm();
    fireEvent.click(screen.getByRole('button', { name: /Create Customer Account/i }));

    expect(await screen.findByText('Email already registered')).toBeInTheDocument();
    expect(screen.queryByText(/Check your inbox/i)).not.toBeInTheDocument();
  });
});
