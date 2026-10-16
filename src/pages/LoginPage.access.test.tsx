import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The access matrix at page level: role × entry → landing, driven
 * through the real LoginPage and the real landing pages (chooser,
 * no-access, seller status, blocked). The unit half of the matrix lives in
 * features/auth/api/destinations.test.ts; the guard half in
 * components/auth/ProtectedRoute.test.tsx.
 */
const state = vi.hoisted(() => ({
  user: null as null | Record<string, unknown>,
  signInUser: null as null | Record<string, unknown>,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(async () => {}),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: state.user,
    loading: state.loading,
    signIn: state.signIn,
    signInAsDemo: vi.fn(),
    signInWithProvider: vi.fn(),
    signOut: state.signOut,
    refreshUser: vi.fn(async () => {}),
  }),
}));

vi.mock('../store/cart-store', () => ({
  useCartStore: () => ({ mergeGuestCartIntoUser: vi.fn() }),
}));

import { LoginPage } from './LoginPage';
import { ChooseWorkspacePage } from './ChooseWorkspacePage';
import { NoAccessPage } from './NoAccessPage';
import { SellerStatusPage } from './SellerStatusPage';
import { AccountBlockedPage } from './AccountBlockedPage';

const customer = {
  id: 'u-customer',
  email: 'buyer@example.com',
  name: 'Buyer One',
  roles: ['customer'],
  vendorStatus: 'none',
  accountStatus: 'active',
};
const vendor = {
  id: 'u-vendor',
  email: 'seller@shop.pk',
  name: 'Seller One',
  roles: ['customer', 'vendor'],
  vendorStatus: 'approved',
  accountStatus: 'active',
};
const pendingVendor = { ...vendor, id: 'u-pending', vendorStatus: 'pending' };
const suspendedCustomer = { ...customer, id: 'u-suspended', accountStatus: 'suspended' };

function LocationProbe() {
  const location = useLocation();
  return <div>{`LOC:${location.pathname}${location.search}${location.hash}`}</div>;
}

function renderApp(entry = '/login') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>STOREFRONT HOME</div>} />
        <Route path="/vendor" element={<div>VENDOR CONSOLE</div>} />
        <Route path="/checkout" element={<div>CHECKOUT</div>} />
        <Route path="/account/orders" element={<LocationProbe />} />
        <Route path="/choose-workspace" element={<ChooseWorkspacePage />} />
        <Route path="/no-access" element={<NoAccessPage />} />
        <Route path="/seller-status" element={<SellerStatusPage />} />
        <Route path="/account-blocked" element={<AccountBlockedPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('Email Address'), {
    target: { value: 'someone@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Sign In to Vendora/i }));
}

const enc = encodeURIComponent;

beforeEach(() => {
  window.localStorage.clear();
  state.user = null;
  state.signInUser = null;
  state.loading = false;
  state.signOut.mockClear();
  state.signIn.mockReset();
  state.signIn.mockImplementation(async () => {
    state.user = state.signInUser;
    return state.signInUser;
  });
});

describe('LoginPage access matrix', () => {
  it('customer + storefront deep link → returns to the full path, query and hash intact', async () => {
    state.signInUser = customer;
    renderApp(`/login?redirect=${enc('/account/orders?status=packed#row-5')}`);

    fillAndSubmit();

    expect(
      await screen.findByText('LOC:/account/orders?status=packed#row-5'),
    ).toBeInTheDocument();
  });

  it('vendor + workspace deep link → the seller console page named', async () => {
    state.signInUser = vendor;
    renderApp(`/login?redirect=${enc('/vendor')}`);

    fillAndSubmit();

    expect(await screen.findByText('VENDOR CONSOLE')).toBeInTheDocument();
  });

  it('customer + wrong-role /vendor link → the no-access page (no loop, seller next step offered)', async () => {
    state.signInUser = customer;
    renderApp(`/login?redirect=${enc('/vendor')}`);

    fillAndSubmit();

    expect(
      await screen.findByRole('heading', { name: /No Seller Console access/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Apply to sell on Vendora/i })).toHaveAttribute(
      'href',
      '/become-a-seller',
    );
  });

  it('customer + hostile redirect → the fallback landing, never the hostile URL', async () => {
    state.signInUser = customer;
    renderApp(`/login?redirect=${enc('//evil.com')}`);

    fillAndSubmit();

    expect(await screen.findByText('STOREFRONT HOME')).toBeInTheDocument();
  });

  it('pending vendor signing in through the seller path → the seller status page, application under review', async () => {
    state.signInUser = pendingVendor;
    renderApp();

    // Fill first (the email label changes in seller mode), then pick the
    // seller path, then submit — the pending seller's meaningful entry.
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'someone@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verified Seller' }));
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Vendora/i }));

    expect(await screen.findByText('Application Under Review')).toBeInTheDocument();
  });

  it('suspended account sign-in → the blocked page', async () => {
    state.signInUser = suspendedCustomer;
    renderApp();

    fillAndSubmit();

    expect(
      await screen.findByRole('heading', { name: /account is suspended/i }),
    ).toBeInTheDocument();
  });

  it('already signed-in customer opening /login → no form, straight to the storefront', async () => {
    state.user = customer;
    renderApp();

    expect(await screen.findByText('STOREFRONT HOME')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sign In to Vendora/i })).not.toBeInTheDocument();
  });

  it('already signed-in multi-role vendor → the chooser, showing only their workspaces', async () => {
    state.user = vendor;
    renderApp();

    expect(await screen.findByText(/Where are you headed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Storefront/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seller Console/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Admin Console/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rider Board/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Seller Console/i }));

    expect(await screen.findByText('VENDOR CONSOLE')).toBeInTheDocument();
    expect(window.localStorage.getItem('vendora:last-workspace:u-vendor')).toBe('/vendor');
  });

  it('remembered workspace + "always" on → already signed-in vendor skips the chooser', async () => {
    window.localStorage.setItem('vendora:last-workspace:u-vendor', '/vendor');
    window.localStorage.setItem('vendora:auto-workspace:u-vendor', '1');
    state.user = vendor;
    renderApp();

    expect(await screen.findByText('VENDOR CONSOLE')).toBeInTheDocument();
    expect(screen.queryByText(/Where are you headed/i)).not.toBeInTheDocument();
  });
});
