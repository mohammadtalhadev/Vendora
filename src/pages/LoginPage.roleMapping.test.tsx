import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

/**
 * Pins the login toggle's label → role contract (Batch 24): the path the
 * visitor picks on the "Buyer | Verified Seller" toggle is the path they
 * get. The toggle used to be cosmetic while routing followed the account's
 * stored roles, so the two paths read as swapped.
 */
const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(async () => {}),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    signIn: mocks.signIn,
    signInAsDemo: vi.fn(),
    signInWithProvider: vi.fn(),
    signOut: mocks.signOut,
  }),
}));

vi.mock('../store/cart-store', () => ({
  useCartStore: () => ({ mergeGuestCartIntoUser: vi.fn() }),
}));

import { LoginPage } from './LoginPage';

const vendorUser = {
  id: 'u-vendor',
  email: 'seller@shop.pk',
  name: 'Seller One',
  roles: ['customer', 'vendor'],
  vendorStatus: 'approved' as const,
};

const customerUser = {
  id: 'u-customer',
  email: 'buyer@example.com',
  name: 'Buyer One',
  roles: ['customer'],
  vendorStatus: 'none' as const,
};

const riderUser = {
  id: 'u-rider',
  email: 'rider@example.com',
  name: 'Rider One',
  roles: ['customer', 'rider'],
  vendorStatus: 'none' as const,
};

const supportUser = {
  id: 'u-support',
  email: 'agent@example.com',
  name: 'Agent One',
  roles: ['customer', 'support'],
  vendorStatus: 'none' as const,
};

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>STOREFRONT HOME</div>} />
        <Route path="/vendor" element={<div>VENDOR CONSOLE</div>} />
        <Route path="/rider" element={<div>RIDER BOARD</div>} />
        <Route path="/support" element={<div>SUPPORT CONSOLE</div>} />
        <Route path="/choose-workspace" element={<div>CHOOSE WORKSPACE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// Filled before any toggle click: in seller mode the email label changes to
// "Merchant Identifier or Email", and the typed values survive the switch.
function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('Email Address'), {
    target: { value: 'someone@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Sign In to Vendora/i }));
}

function pickSellerThenSubmit() {
  fireEvent.change(screen.getByLabelText('Email Address'), {
    target: { value: 'someone@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Verified Seller' }));
  fireEvent.click(screen.getByRole('button', { name: /Sign In to Vendora/i }));
}

describe('LoginPage role toggle mapping', () => {
  // Batch 63 supersedes the Batch 24 pin for this one case: a customer+vendor
  // account has TWO destinations, so a Buyer sign-in no longer silently picks
  // the storefront for them — they land on the workspace chooser (or, with a
  // remembered workspace + the "always" preference, straight there; covered
  // in LoginPage.access.test.tsx). The toggle's own contract is unchanged:
  // Verified Seller still means the merchant console, and the seller path
  // still refuses accounts with no vendor role.
  it('Buyer selected + vendor account → the workspace chooser (Batch 63 multi-destination rule)', async () => {
    mocks.signIn.mockResolvedValue(vendorUser);
    renderLogin();

    fillAndSubmit();

    expect(await screen.findByText('CHOOSE WORKSPACE')).toBeInTheDocument();
    expect(screen.queryByText('STOREFRONT HOME')).not.toBeInTheDocument();
    expect(screen.queryByText('VENDOR CONSOLE')).not.toBeInTheDocument();
  });

  it('Verified Seller selected + vendor account → the merchant console', async () => {
    mocks.signIn.mockResolvedValue(vendorUser);
    renderLogin();

    pickSellerThenSubmit();

    expect(await screen.findByText('VENDOR CONSOLE')).toBeInTheDocument();
    expect(screen.queryByText('STOREFRONT HOME')).not.toBeInTheDocument();
  });

  it('Verified Seller selected + customer-only account → refused, signed out, no buyer landing', async () => {
    mocks.signIn.mockResolvedValue(customerUser);
    renderLogin();

    pickSellerThenSubmit();

    expect(await screen.findByText(/not a verified seller account/i)).toBeInTheDocument();
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('STOREFRONT HOME')).not.toBeInTheDocument();
    expect(screen.queryByText('VENDOR CONSOLE')).not.toBeInTheDocument();
  });

  it('Buyer selected + customer account → the storefront', async () => {
    mocks.signIn.mockResolvedValue(customerUser);
    renderLogin();

    fillAndSubmit();

    expect(await screen.findByText('STOREFRONT HOME')).toBeInTheDocument();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('rider account → the rider board, not the storefront (Batch 59)', async () => {
    mocks.signIn.mockResolvedValue(riderUser);
    renderLogin();

    fillAndSubmit();

    expect(await screen.findByText('RIDER BOARD')).toBeInTheDocument();
    expect(screen.queryByText('STOREFRONT HOME')).not.toBeInTheDocument();
  });

  it('support account → the support console, not the storefront (Batch 59)', async () => {
    mocks.signIn.mockResolvedValue(supportUser);
    renderLogin();

    fillAndSubmit();

    expect(await screen.findByText('SUPPORT CONSOLE')).toBeInTheDocument();
    expect(screen.queryByText('STOREFRONT HOME')).not.toBeInTheDocument();
  });
});
