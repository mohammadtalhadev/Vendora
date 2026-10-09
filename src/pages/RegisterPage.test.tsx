import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { useAuthStore } from '../store/auth-store';

describe('RegisterPage Component', { timeout: 15000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('renders showcase benefits, brand logo, and registration form elements', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    // Visual Showcase (Left Column)
    expect(screen.getByText('Unlock Premier Tech Deals & Verified Shopping.')).toBeInTheDocument();
    expect(screen.getByText('Member Perks')).toBeInTheDocument();
    expect(screen.getByText('Up to $20 Welcome Coupon')).toBeInTheDocument();
    expect(screen.getByText('Live Delivery Handover')).toBeInTheDocument();
    expect(screen.getByText('100% Genuine Escrow Protection')).toBeInTheDocument();

    // Form (Right Column)
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sarah Jenkins')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sarah.jenkins@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Create a strong password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Repeat your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account & Claim Rewards/i })).toBeInTheDocument();

    // Trust strip (Bottom)
    expect(screen.getByText('Fast & Free Shipping')).toBeInTheDocument();
    expect(screen.getByText('100% Authentic')).toBeInTheDocument();
    expect(screen.getByText('30-Day Easy Returns')).toBeInTheDocument();
    expect(screen.getByText('24/7 Dedicated Support')).toBeInTheDocument();
  });

  it('toggles account type between customer and seller', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const merchantTab = screen.getByRole('button', { name: /Merchant/i });
    fireEvent.click(merchantTab);

    expect(screen.getByText('Merchant Registration Selected')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Continue to Seller Verification/i }),
    ).toBeInTheDocument();
  });

  it('displays live password strength meter as user enters password', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByPlaceholderText('Create a strong password');

    // Type weak password
    fireEvent.change(passwordInput, { target: { value: 'abc' } });
    expect(screen.getByText(/Strength: Weak/i)).toBeInTheDocument();

    // Type strong password
    fireEvent.change(passwordInput, { target: { value: 'Secret1234!@#' } });
    expect(screen.getByText(/Strength: Strong/i)).toBeInTheDocument();
  });

  it('detects password match and displays confirmation indicator', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByPlaceholderText('Create a strong password');
    const confirmInput = screen.getByPlaceholderText('Repeat your password');

    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmInput, { target: { value: 'Password123' } });

    expect(screen.getByText('Passwords match')).toBeInTheDocument();
  });

  it('submits registration form successfully and sets user state', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Sarah Jenkins'), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByPlaceholderText('sarah.jenkins@example.com'), {
      target: { value: 'alex.morgan@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a strong password'), {
      target: { value: 'SuperSecret123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), {
      target: { value: 'SuperSecret123' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create Account & Claim Rewards/i });
    fireEvent.click(submitBtn);

    const currentUser = useAuthStore.getState().user;
    expect(currentUser).not.toBeNull();
    expect(currentUser?.name).toBe('Alex Morgan');
    expect(currentUser?.email).toBe('alex.morgan@test.com');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
