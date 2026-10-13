import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPasswordPage } from './ResetPasswordPage';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      updateUser: mocks.updateUser,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
  isSupabaseConfigured: true,
  TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResetPasswordPage />
    </MemoryRouter>,
  );

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A live recovery session, as the Supabase client exposes after the
    // emailed link is followed.
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mocks.updateUser.mockResolvedValue({ data: {}, error: null });
  });

  it('renders the set-new-password form when a recovery session exists', async () => {
    renderPage();

    expect(await screen.findByText('Set a New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Password/i })).toBeInTheDocument();
  });

  it('rejects mismatched passwords without calling updateUser', async () => {
    renderPage();

    const password = await screen.findByLabelText('New Password');
    const confirm = screen.getByLabelText('Confirm New Password');
    fireEvent.change(password, { target: { value: 'NewSecret123!' } });
    fireEvent.change(confirm, { target: { value: 'Different123!' } });

    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('rejects passwords shorter than 8 characters', async () => {
    renderPage();

    const password = await screen.findByLabelText('New Password');
    const confirm = screen.getByLabelText('Confirm New Password');
    fireEvent.change(password, { target: { value: 'short1' } });
    fireEvent.change(confirm, { target: { value: 'short1' } });

    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('updates the password via supabase.auth.updateUser and confirms success', async () => {
    renderPage();

    const password = await screen.findByLabelText('New Password');
    const confirm = screen.getByLabelText('Confirm New Password');
    fireEvent.change(password, { target: { value: 'NewSecret123!' } });
    fireEvent.change(confirm, { target: { value: 'NewSecret123!' } });

    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    await waitFor(() =>
      expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'NewSecret123!' }),
    );
    expect(await screen.findByText('Password Updated')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue to Sign In/i })).toHaveAttribute('href', '/login');
  });

  it('shows the invalid-link state when there is no recovery session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.onAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));

    renderPage();

    expect(
      await screen.findByText('Link Invalid or Expired', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
  });
});
