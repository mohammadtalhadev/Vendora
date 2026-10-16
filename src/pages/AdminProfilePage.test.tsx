import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: {
    id: 'admin-1',
    email: 'admin@vendora.market',
    name: 'Ayesha Admin',
    roles: ['admin'] as string[],
    vendorStatus: 'none' as const,
  },
  signOut: vi.fn(async () => undefined),
  refreshUser: vi.fn(async () => undefined),
  updateProfileIdentity: vi.fn(async () => undefined),
  updatePassword: vi.fn(async () => undefined),
  signOutEverywhere: vi.fn(async () => undefined),
  uploadAvatar: vi.fn(async () => 'https://example.test/avatar.png'),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: mocks.user,
    signOut: mocks.signOut,
    refreshUser: mocks.refreshUser,
  }),
}));
vi.mock('../features/auth/api/session', () => ({
  updateProfileIdentity: mocks.updateProfileIdentity,
  updatePassword: mocks.updatePassword,
  signOutEverywhere: mocks.signOutEverywhere,
}));
vi.mock('../features/account/api/avatar', () => ({
  uploadAvatar: mocks.uploadAvatar,
}));
vi.mock('../features/workspaces/WorkspaceLayout', () => ({
  WorkspaceLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../features/admin/components/AdminNav', () => ({
  AdminNav: () => null,
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminProfilePage } from './AdminProfilePage';

/**
 * the admin profile is the real account or nothing — the old
 * page's invented phone number, job title, sessions and audit entries are
 * gone, and every control writes through the real session helpers.
 */
const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminProfilePage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminProfilePage', () => {
  it('shows the signed-in admin’s real identity and none of the mock data', () => {
    renderPage();
    expect(screen.getByDisplayValue('Ayesha Admin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('admin@vendora.market')).toBeInTheDocument();
    expect(screen.getByText('admin-1')).toBeInTheDocument();
    expect(screen.queryByText(/555/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Head of Marketplace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mac Studio/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/San Francisco/i)).not.toBeInTheDocument();
  });

  it('saves a name change through the real profile helper and re-reads the profile', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/Display name/i), { target: { value: 'Ayesha K.' } });
    fireEvent.click(screen.getByRole('button', { name: /Save profile/i }));
    await waitFor(() => expect(mocks.updateProfileIdentity).toHaveBeenCalledWith({ name: 'Ayesha K.' }));
    expect(mocks.refreshUser).toHaveBeenCalled();
    expect(await screen.findByText(/name is saved/i)).toBeInTheDocument();
  });

  it('changes the password through the real auth helper', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Password & Sessions/i }));
    fireEvent.change(screen.getByLabelText(/^New password/i), { target: { value: 'NewSecret123' } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: 'NewSecret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Update password/i }));
    await waitFor(() => expect(mocks.updatePassword).toHaveBeenCalledWith('NewSecret123'));
  });

  it('lists the account’s actual roles on the access tab', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Your Access/i }));
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText(/Full platform administration/i)).toBeInTheDocument();
  });
});
