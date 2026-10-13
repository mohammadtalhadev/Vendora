import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
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
});
