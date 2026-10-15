import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The staff door at /admin/login (Batch 24): staff roles get in, everyone
 * else is signed back out with a plain denial — never silently landed in a
 * buyer session.
 *
 * Batch 64 rewrite note: the pins that once read "sign-in continues to the
 * console" now stop at the two-factor step first, because a fresh password
 * sign-in is an aal1 session and the console requires aal2. Each rewritten
 * pin drives the code step and then asserts the same destination it always
 * asserted. The already-signed-in pins are unchanged in substance: the auth
 * mock below defaults to an aal2 session (a returning staff browser that
 * already proved its factor), and the new step-up pin covers the aal1 case.
 */
const auth = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; name: string; roles: string[]; vendorStatus: string },
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(async () => {}),
  aal: 'aal2' as 'aal1' | 'aal2',
  mfaLoaded: true,
  refreshAal: vi.fn(async () => {}),
}));

const mfaApi = vi.hoisted(() => ({
  listTotpFactors: vi.fn(),
  enrollTotp: vi.fn(),
  verifyTotp: vi.fn(),
  markStepUpVerified: vi.fn(),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: auth.user,
    loading: auth.loading,
    signIn: auth.signIn,
    signOut: auth.signOut,
    aal: auth.aal,
    mfaLoaded: auth.mfaLoaded,
    refreshAal: auth.refreshAal,
  }),
}));

vi.mock('../features/auth/api/mfa', () => ({
  listTotpFactors: mfaApi.listTotpFactors,
  enrollTotp: mfaApi.enrollTotp,
  verifyTotp: mfaApi.verifyTotp,
  markStepUpVerified: mfaApi.markStepUpVerified,
  unenrollTotp: vi.fn(async () => {}),
  getAalLevel: vi.fn(async () => 'aal1'),
  clearStepUp: vi.fn(),
  isStaffRoles: (roles: readonly string[]) => roles.includes('admin') || roles.includes('support'),
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

/** Types a code into the segmented input and submits the challenge step. */
async function completeChallenge(code = '123456', buttonName = 'Verify code') {
  const firstBox = await screen.findByLabelText('Code digit 1');
  fireEvent.change(firstBox, { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: buttonName }));
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
    auth.aal = 'aal2';
    auth.mfaLoaded = true;
    auth.signIn.mockReset();
    auth.signOut.mockClear();
    auth.refreshAal.mockClear();
    mfaApi.listTotpFactors.mockReset();
    mfaApi.enrollTotp.mockReset();
    mfaApi.verifyTotp.mockReset();
    mfaApi.markStepUpVerified.mockClear();
    // Default staff account: one verified factor waiting to be challenged.
    mfaApi.listTotpFactors.mockResolvedValue({
      verified: [{ id: 'factor-1', status: 'verified', createdAt: '' }],
      unverified: [],
    });
    mfaApi.enrollTotp.mockResolvedValue({
      factorId: 'factor-new',
      qrCode: 'data:image/svg+xml;utf-8,<svg></svg>',
      secret: 'SETUPSECRET123',
      uri: 'otpauth://totp/Vendora:staff?secret=SETUPSECRET123',
    });
    mfaApi.verifyTotp.mockResolvedValue(undefined);
  });

  it('renders the staff sign-in form when signed out', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Admin Sign In' })).toBeInTheDocument();
    expect(screen.getByLabelText('Staff Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByText(/no staff access/i)).not.toBeInTheDocument();
  });

  it('admin sign-in passes the two-factor check, then continues to the admin console', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    renderPage();

    fillAndSubmit();

    expect(await screen.findByRole('heading', { name: 'Two-Factor Check' })).toBeInTheDocument();
    await completeChallenge();
    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(mfaApi.markStepUpVerified).toHaveBeenCalled();
  });

  it('admin sign-in honours the guard redirect target inside /admin, after the code', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    renderPage('/admin/login?redirect=%2Fadmin%2Forders');

    fillAndSubmit();
    await completeChallenge();

    expect(await screen.findByText('ADMIN ORDERS')).toBeInTheDocument();
  });

  it('support sign-in passes the two-factor check, then continues to the support console', async () => {
    auth.signIn.mockResolvedValue(supportUser);
    renderPage();

    fillAndSubmit();
    await completeChallenge();

    expect(await screen.findByText('SUPPORT HOME')).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('Batch 64: a staff account with no factor is walked through enrollment — never locked out', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    mfaApi.listTotpFactors.mockResolvedValue({ verified: [], unverified: [] });
    renderPage();

    fillAndSubmit();

    expect(
      await screen.findByRole('heading', { name: 'Set Up Two-Factor Authentication' }),
    ).toBeInTheDocument();
    expect(await screen.findByAltText('Authenticator setup QR code')).toBeInTheDocument();
    expect(screen.getByText('SETUPSECRET123')).toBeInTheDocument();

    await completeChallenge('123456', 'Verify and switch on');

    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
    expect(mfaApi.enrollTotp).toHaveBeenCalledTimes(1);
    expect(mfaApi.verifyTotp).toHaveBeenCalledWith('factor-new', '123456');
  });

  it('Batch 64: a wrong code stays on the challenge step with a clear message; the right code continues', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    mfaApi.verifyTotp.mockRejectedValueOnce(new Error('That code was not accepted. Check the code in your authenticator app and try again.'));
    renderPage();

    fillAndSubmit();
    await completeChallenge('000000');

    expect(await screen.findByText(/not accepted/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Two-Factor Check' })).toBeInTheDocument();
    expect(screen.queryByText('ADMIN HOME')).not.toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();

    await completeChallenge('123456');
    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
  });

  it('non-staff sign-in is signed back out and shown the denial, before any MFA step', async () => {
    auth.signIn.mockResolvedValue(customerUser);
    renderPage();

    fillAndSubmit();

    expect(await screen.findByText(/no staff access/i)).toBeInTheDocument();
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('heading', { name: 'Admin Sign In' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Code digit 1')).not.toBeInTheDocument();
    expect(mfaApi.listTotpFactors).not.toHaveBeenCalled();
  });

  it('an already-signed-in non-staff visitor is signed out and shown the denial', async () => {
    auth.user = customerUser;
    renderPage();

    expect(await screen.findByText(/no staff access/i)).toBeInTheDocument();
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
  });

  it('an already-signed-in admin at aal2 is continued to the admin console', async () => {
    auth.user = adminUser;
    renderPage();

    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(mfaApi.listTotpFactors).not.toHaveBeenCalled();
  });

  it('Batch 64: an already-signed-in admin at aal1 (the ?stepup=1 bounce) gets the challenge, then the deep link', async () => {
    auth.user = adminUser;
    auth.aal = 'aal1';
    renderPage(`/admin/login?redirect=${encodeURIComponent('/admin/orders')}&stepup=1`);

    expect(await screen.findByRole('heading', { name: 'Two-Factor Check' })).toBeInTheDocument();
    await completeChallenge();

    expect(await screen.findByText('ADMIN ORDERS')).toBeInTheDocument();
  });

  it('shows the denial when the guard sent the visitor here with ?denied=1', () => {
    renderPage('/admin/login?denied=1');

    expect(screen.getByText(/no staff access/i)).toBeInTheDocument();
  });

  it('Batch 63: a hostile redirect target falls back to the admin console', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    renderPage(`/admin/login?redirect=${encodeURIComponent('//evil.com')}`);

    fillAndSubmit();
    await completeChallenge();

    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
  });

  it('Batch 63: a redirect back to the login page itself falls back instead of looping', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    renderPage(`/admin/login?redirect=${encodeURIComponent('/admin/login')}`);

    fillAndSubmit();
    await completeChallenge();

    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
  });

  it('Batch 63: an admin deep link with a query string is honoured whole', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    renderPage(`/admin/login?redirect=${encodeURIComponent('/admin/orders?status=open')}`);

    fillAndSubmit();
    await completeChallenge();

    expect(await screen.findByText('ADMIN ORDERS')).toBeInTheDocument();
  });

  it('surfaces a failed sign-in as an error, not a denial', async () => {
    auth.signIn.mockRejectedValue(new Error('Invalid login credentials'));
    renderPage();

    fillAndSubmit();

    expect(
      await screen.findByText('Email or password is incorrect. Check both and try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no staff access/i)).not.toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(mfaApi.listTotpFactors).not.toHaveBeenCalled();
  });
});
