import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    signIn: mocks.signIn,
    signInAsDemo: vi.fn(),
    signInWithProvider: vi.fn(),
  }),
}));

vi.mock('../store/cart-store', () => ({
  useCartStore: () => ({ mergeGuestCartIntoUser: vi.fn() }),
}));

describe('LoginPage', () => {
  it('shows a working remember-me checkbox and omits the removed trust decorations', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const rememberMe = screen.getByRole('checkbox', { name: 'Remember me for 30 days' });
    const checkboxLabel = rememberMe.closest('label');

    expect(rememberMe).toBeChecked();
    expect(checkboxLabel?.querySelector('svg')).not.toBeNull();

    fireEvent.click(rememberMe);
    expect(rememberMe).not.toBeChecked();
    expect(checkboxLabel?.querySelector('svg')).toBeNull();

    fireEvent.click(rememberMe);
    expect(rememberMe).toBeChecked();
    expect(checkboxLabel?.querySelector('svg')).not.toBeNull();

    expect(screen.getByRole('button', { name: 'Buyer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verified Seller' })).toBeInTheDocument();
    expect(screen.queryByText('Platform Status: 100% Operational')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected by Vendora Escrow Shield')).not.toBeInTheDocument();
    expect(screen.queryByText("Pakistan's Premier Multi-Vendor Marketplace")).not.toBeInTheDocument();
  });

  it('shows the friendly sentence, never the raw service text, for a coded invalid_credentials refusal', async () => {
    mocks.signIn.mockRejectedValue(
      Object.assign(new Error('Invalid login credentials'), {
        code: 'invalid_credentials',
        status: 400,
      }),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'someone@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Vendora/i }));

    expect(
      await screen.findByText('Email or password is incorrect. Check both and try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Invalid login credentials')).not.toBeInTheDocument();
  });
});
