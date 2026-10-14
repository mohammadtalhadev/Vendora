import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The staff door at /admin/login (Batch 24): staff roles get in, everyone
 * else is signed back out with a plain denial — never silently landed in a
 * buyer session.
 */
const auth = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; name: string; roles: string[]; vendorStatus: string },
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(async () => {}),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: auth.user,
    loading: auth.loading,
    signIn: auth.signIn,
    signOut: auth.signOut,
  }),
}));

import { AdminLoginPage } from './AdminLoginPage';

const adminUser = { id: 'u-admin', email: 'admin@vendora.market', name: 'Admin', roles: ['admin', 'customer'], vendorStatus: 'none' };
const supportUser = { id: 'u-support', email: 'help@vendora.market', name: 'Support', roles: ['support'], vendorStatus: 'none' };
const customerUser = { id: 'u-customer', email: 'buyer@example.com', name: 'Buyer', roles: ['customer'], vendorStatus: 'none' };

function renderPage(entry = '/admin/login') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<div>ADMIN HOME</div>} />
        <Route path="/admin/orders" element={<div>ADMIN ORDERS</div>} />
        <Route path="/support" element={<div>SUPPORT HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('Staff Email Address'), {
    target: { value: 'someone@vendora.market' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Sign In to Staff Console/i }));
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
    auth.signIn.mockReset();
    auth.signOut.mockClear();
  });

  it('renders the staff sign-in form when signed out', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Admin Sign In' })).toBeInTheDocument();
    expect(screen.getByLabelText('Staff Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByText(/no staff access/i)).not.toBeInTheDocument();
  });

  it('admin sign-in continues to the admin console', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    renderPage();

    fillAndSubmit();

    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('admin sign-in honours the guard redirect target inside /admin', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    renderPage('/admin/login?redirect=%2Fadmin%2Forders');

    fillAndSubmit();

    expect(await screen.findByText('ADMIN ORDERS')).toBeInTheDocument();
  });

  it('support sign-in continues to the support console', async () => {
    auth.signIn.mockResolvedValue(supportUser);
    renderPage();

    fillAndSubmit();

    expect(await screen.findByText('SUPPORT HOME')).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('non-staff sign-in is signed back out and shown the denial', async () => {
    auth.signIn.mockResolvedValue(customerUser);
    renderPage();

    fillAndSubmit();

    expect(await screen.findByText(/no staff access/i)).toBeInTheDocument();
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('heading', { name: 'Admin Sign In' })).toBeInTheDocument();
  });

  it('an already-signed-in non-staff visitor is signed out and shown the denial', async () => {
    auth.user = customerUser;
    renderPage();

    expect(await screen.findByText(/no staff access/i)).toBeInTheDocument();
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
  });

  it('an already-signed-in admin is continued to the admin console', async () => {
    auth.user = adminUser;
    renderPage();

    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('shows the denial when the guard sent the visitor here with ?denied=1', () => {
    renderPage('/admin/login?denied=1');

    expect(screen.getByText(/no staff access/i)).toBeInTheDocument();
  });

  it('surfaces a failed sign-in as an error, not a denial', async () => {
    auth.signIn.mockRejectedValue(new Error('Invalid login credentials'));
    renderPage();

    fillAndSubmit();

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
    expect(screen.queryByText(/no staff access/i)).not.toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
