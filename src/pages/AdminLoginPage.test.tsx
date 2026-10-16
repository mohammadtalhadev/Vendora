import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The staff door at /admin/login: staff roles get in, everyone
 * else is signed back out with a plain denial — never silently landed in a
 * buyer session.
 *
 * rewrite note: the pins that once read "sign-in continues to the
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
  // TEMPORARY testing exemption: defaults to not exempt, so every
  // pre-existing pin exercises the normal second-factor path unchanged.
  mfaExempt: false,
}));

const mfaApi = vi.hoisted(() => ({
  listTotpFactors: vi.fn(),
  enrollTotp: vi.fn(),
  verifyTotp: vi.fn(),
  markStepUpVerified: vi.fn(),
  isMfaExempt: vi.fn(async () => false),
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
    mfaExempt: auth.mfaExempt,
  }),
}));

vi.mock('../features/auth/api/mfa', () => ({
  listTotpFactors: mfaApi.listTotpFactors,
  enrollTotp: mfaApi.enrollTotp,
  verifyTotp: mfaApi.verifyTotp,
  markStepUpVerified: mfaApi.markStepUpVerified,
  isMfaExempt: mfaApi.isMfaExempt,
  // the branch guard the enroll form consults, faithful to the
  // real one — it recognises the typed error by its stable code.
  isMfaAlreadyEnrolledError: (cause: unknown) =>
    Boolean(
      cause &&
        typeof cause === 'object' &&
        (cause as { code?: unknown }).code === 'mfa_already_enrolled',
    ),
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
  fireEvent.click(await screen.findByRole('button', { name: buttonName }));
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
    auth.aal = 'aal2';
    auth.mfaLoaded = true;
    auth.mfaExempt = false;
    auth.signIn.mockReset();
    auth.signOut.mockClear();
    auth.refreshAal.mockClear();
    mfaApi.isMfaExempt.mockReset();
    mfaApi.isMfaExempt.mockResolvedValue(false);
    // The page resolves the stored theme preference and applies it to
    // <html>; clear both so cases never leak a scheme into each other.
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
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

  it('a staff account with no factor is walked through enrollment — never locked out', async () => {
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

  it('enrollment that finds an authenticator already set up moves to the code step, not a dead end', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    // The page's deciding read says "no factor yet" and opens enrollment;
    // every later read (the enroll form's self-heal re-check, then the
    // challenge form's own read) sees the verified factor that was on the
    // account all along.
    mfaApi.listTotpFactors.mockReset();
    mfaApi.listTotpFactors
      .mockResolvedValueOnce({ verified: [], unverified: [] })
      .mockResolvedValue({
        verified: [{ id: 'factor-1', status: 'verified', createdAt: '' }],
        unverified: [],
      });
    mfaApi.enrollTotp.mockRejectedValue(
      Object.assign(
        new Error(
          'An authenticator is already set up on this account. Sign in and enter your code — or remove the existing authenticator from your profile first if you need to start over.',
        ),
        { code: 'mfa_already_enrolled' },
      ),
    );
    renderPage();

    fillAndSubmit();

    expect(await screen.findByRole('heading', { name: 'Two-Factor Check' })).toBeInTheDocument();
    expect(screen.queryByText(/email already exists/i)).not.toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();

    await completeChallenge();
    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
  });

  it('a wrong code stays on the challenge step with a clear message; the right code continues', async () => {
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

  it('an already-signed-in admin at aal1 (the ?stepup=1 bounce) gets the challenge, then the deep link', async () => {
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

  it('a hostile redirect target falls back to the admin console', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    renderPage(`/admin/login?redirect=${encodeURIComponent('//evil.com')}`);

    fillAndSubmit();
    await completeChallenge();

    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
  });

  it('a redirect back to the login page itself falls back instead of looping', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    renderPage(`/admin/login?redirect=${encodeURIComponent('/admin/login')}`);

    fillAndSubmit();
    await completeChallenge();

    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
  });

  it('an admin deep link with a query string is honoured whole', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    renderPage(`/admin/login?redirect=${encodeURIComponent('/admin/orders?status=open')}`);

    fillAndSubmit();
    await completeChallenge();

    expect(await screen.findByText('ADMIN ORDERS')).toBeInTheDocument();
  });

  it('an exempt staff sign-in skips the second factor entirely and lands on the console', async () => {
    auth.signIn.mockResolvedValue(adminUser);
    mfaApi.isMfaExempt.mockResolvedValue(true);
    renderPage();

    fillAndSubmit();

    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
    expect(mfaApi.listTotpFactors).not.toHaveBeenCalled();
    expect(mfaApi.markStepUpVerified).toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('an already-signed-in exempt admin at aal1 is continued without a challenge', async () => {
    auth.user = adminUser;
    auth.aal = 'aal1';
    auth.mfaExempt = true;
    renderPage();

    expect(await screen.findByText('ADMIN HOME')).toBeInTheDocument();
    expect(mfaApi.listTotpFactors).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('a light stored preference renders the portal on light surfaces', () => {
    window.localStorage.setItem('vd_theme', 'light');
    const { container } = renderPage();

    const root = container.firstElementChild as HTMLElement;
    const tokens = root.className.split(/\s+/);
    expect(tokens).toContain('bg-slate-50');
    expect(tokens).toContain('dark:bg-slate-950');
    expect(tokens).not.toContain('bg-slate-950');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('a dark stored preference applies the dark class so dark: variants render', async () => {
    window.localStorage.setItem('vd_theme', 'dark');
    const { container } = renderPage();

    await waitFor(() =>
      expect(document.documentElement.classList.contains('dark')).toBe(true),
    );
    const root = container.firstElementChild as HTMLElement;
    const tokens = root.className.split(/\s+/);
    expect(tokens).toContain('bg-slate-50');
    expect(tokens).toContain('dark:bg-slate-950');
    expect(tokens).not.toContain('bg-slate-950');
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
