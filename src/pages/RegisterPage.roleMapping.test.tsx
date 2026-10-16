import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

/**
 * Pins the register account-type cards' semantics (audit): the
 * Customer card submits a plain customer sign-up (no vendor application),
 * and the Seller card submits a sign-up PLUS a vendor application. If the
 * two ever swap, this file fails.
 */
const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  submitVendorApplication: vi.fn(async () => {}),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    signUp: mocks.signUp,
    signInWithProvider: vi.fn(),
  }),
}));

vi.mock('../store/cart-store', () => ({
  useCartStore: () => ({ mergeGuestCartIntoUser: vi.fn() }),
}));

vi.mock('../features/vendor/api/applications', () => ({
  submitVendorApplication: mocks.submitVendorApplication,
}));

import { RegisterPage } from './RegisterPage';

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<div>STOREFRONT HOME</div>} />
        <Route path="/become-a-seller" element={<div>SELLER ONBOARDING</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillPasswords() {
  const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
  fireEvent.change(passwordInputs[0], { target: { value: 'ValidPass123!' } });
  fireEvent.change(passwordInputs[1], { target: { value: 'ValidPass123!' } });
}

describe('RegisterPage account-type mapping', () => {
  it('Customer card → customer sign-up only, no vendor application', async () => {
    mocks.signUp.mockResolvedValue({
      user: { id: 'u-customer', roles: ['customer'] },
      session: {},
      requiresEmailConfirmation: false,
    });
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText('e.g. Ayesha Khan'), {
      target: { value: 'Ayesha Khan' },
    });
    fireEvent.change(screen.getByPlaceholderText('ayesha@example.com'), {
      target: { value: 'ayesha@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('300 1234567'), {
      target: { value: '3001234567' },
    });
    fillPasswords();
    // Terms start unticked and the submit stays disabled until agreed.
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Create Customer Account/i }));

    expect(await screen.findByText('STOREFRONT HOME')).toBeInTheDocument();
    expect(mocks.signUp).toHaveBeenCalledWith('Ayesha Khan', 'ayesha@example.com', 'ValidPass123!');
    expect(mocks.submitVendorApplication).not.toHaveBeenCalled();
  });

  it('Seller card → sign-up plus a vendor application for the same business', async () => {
    mocks.signUp.mockResolvedValue({
      user: { id: 'u-seller', roles: ['customer'] },
      session: {},
      requiresEmailConfirmation: false,
    });
    renderRegister();

    fireEvent.click(screen.getByRole('button', { name: /Seller \(Merchant Store\)/i }));

    fireEvent.change(screen.getByPlaceholderText('e.g. Khaadi Studio or Volt Audio PK'), {
      target: { value: 'Volt Audio PK' },
    });
    fireEvent.change(screen.getByPlaceholderText('Authorized Representative Name'), {
      target: { value: 'Bilal Owner' },
    });
    fireEvent.change(screen.getByPlaceholderText('sales@yourbrand.pk'), {
      target: { value: 'sales@voltaudio.pk' },
    });
    fireEvent.change(screen.getByPlaceholderText('321 9876543'), {
      target: { value: '3219876543' },
    });
    fillPasswords();
    // Terms start unticked and the submit stays disabled until agreed.
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Submit Merchant Application/i }));

    expect(await screen.findByText('SELLER ONBOARDING')).toBeInTheDocument();
    expect(mocks.signUp).toHaveBeenCalledWith('Bilal Owner', 'sales@voltaudio.pk', 'ValidPass123!');
    expect(mocks.submitVendorApplication).toHaveBeenCalledTimes(1);
    expect(mocks.submitVendorApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        proposedStoreName: 'Volt Audio PK',
        proposedSlug: 'volt-audio-pk',
        contactEmail: 'sales@voltaudio.pk',
      }),
      'u-seller',
    );
  });
});
