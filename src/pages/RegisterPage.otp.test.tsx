import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { AuthProvider } from '../lib/auth-context';
import { useAuthStore } from '../store/auth-store';
import { supabaseDouble } from '../test/supabase-double';

/**
 * The email-code (OTP) path on the register page (Batch 36): when sign-up
 * waits on verification, the panel offers six code boxes beside the link;
 * a correct code verifies through Supabase and lands the new customer on
 * the storefront, a wrong one explains itself and stays put.
 */
vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<div>STORE HOME</div>} />
          <Route path="/become-a-seller" element={<div>SELLER HUB</div>} />
        </Routes>
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
}

function typeCode(code: string) {
  code.split('').forEach((digit, i) => {
    fireEvent.change(screen.getByLabelText(`Digit ${i + 1}`), { target: { value: digit } });
  });
}

describe('RegisterPage email code (OTP) verification', () => {
  beforeEach(() => {
    localStorage.clear();
    supabaseDouble.reset();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    supabaseDouble.authState.confirmEmail = true;
  });

  it('verifies the typed code and lands the customer on the storefront', async () => {
    renderPage();
    fillCustomerForm();
    fireEvent.click(screen.getByRole('button', { name: /Create Customer Account/i }));

    expect(await screen.findByRole('heading', { name: /Check your inbox to finish/i })).toBeInTheDocument();

    typeCode('123456');
    fireEvent.click(screen.getByRole('button', { name: /Verify & activate account/i }));

    expect(await screen.findByText('STORE HOME')).toBeInTheDocument();
    expect(supabaseDouble.verifyOtpCalls).toHaveLength(1);
    expect(supabaseDouble.verifyOtpCalls[0]).toMatchObject({
      email: 'ayesha@example.com',
      token: '123456',
      type: 'signup',
    });
  });

  it('keeps the panel and explains a wrong code', async () => {
    supabaseDouble.authState.verifyOtpError = { message: 'Token has expired or is invalid' };
    renderPage();
    fillCustomerForm();
    fireEvent.click(screen.getByRole('button', { name: /Create Customer Account/i }));

    expect(await screen.findByRole('heading', { name: /Check your inbox to finish/i })).toBeInTheDocument();

    typeCode('000000');
    fireEvent.click(screen.getByRole('button', { name: /Verify & activate account/i }));

    expect(await screen.findByText(/incorrect or has expired/i)).toBeInTheDocument();
    expect(screen.queryByText('STORE HOME')).not.toBeInTheDocument();
  });

  it('keeps the verify button disabled until all six digits are in', async () => {
    renderPage();
    fillCustomerForm();
    fireEvent.click(screen.getByRole('button', { name: /Create Customer Account/i }));

    expect(await screen.findByRole('heading', { name: /Check your inbox to finish/i })).toBeInTheDocument();

    const verify = screen.getByRole('button', { name: /Verify & activate account/i });
    expect(verify).toBeDisabled();
    typeCode('12345');
    expect(verify).toBeDisabled();
    typeCode('123456');
    expect(verify).toBeEnabled();
  });
});
