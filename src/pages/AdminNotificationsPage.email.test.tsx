import { beforeEach, describe, expect, it, vi } from 'vitest';

// Same harness as AdminNotificationsPage.test.tsx: the workspace layout's
// sign-out needs the auth provider, and the data comes from the supabase double.
vi.mock('../lib/auth-context', async () => {
  const { useAuthStub } = await import('../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return {
    supabase: supabaseDouble,
    isSupabaseConfigured: true,
    TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
  };
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AdminNotificationsPage } from './AdminNotificationsPage';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import { profileRow, supabaseDouble } from '../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
  const admin = supabaseDouble.seedAdmin();
  supabaseDouble.seedProfile(
    profileRow({ id: 'user-2', email: 'dana@demo.test', name: 'Dana Buyer', roles: ['customer'] }),
  );
  useAuthStore.getState().setUser(
    { ...DEMO_ACCOUNTS.admin, id: admin.id, email: admin.email, name: admin.name },
    'test-token',
  );
});

const lastRpc = (fn: string) =>
  [...supabaseDouble.rpcCalls].reverse().find((entry) => entry.fn === fn);

describe('AdminNotificationsPage email copy', () => {
  it('does not touch broadcast_email while the checkbox is off', async () => {
    renderWorkspace(<AdminNotificationsPage />, ['/admin/notifications']);
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Maintenance window' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Read-only from 02:00.' } });
    fireEvent.click(screen.getByRole('button', { name: /send announcement/i }));

    await waitFor(() =>
      expect(screen.getByTestId('broadcast-result')).toHaveTextContent('Reached'),
    );
    expect(lastRpc('broadcast_email')).toBeUndefined();
  });

  it('queues the email copy through broadcast_email with the same audience, title and message', async () => {
    renderWorkspace(<AdminNotificationsPage />, ['/admin/notifications']);
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'customer' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Autumn sale opens tonight' } });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Storefront banners go live at 00:00.' },
    });
    fireEvent.click(screen.getByLabelText(/also send as email/i));
    fireEvent.click(screen.getByRole('button', { name: /send announcement/i }));

    // The in-app broadcast lands first, exactly as before.
    await waitFor(() =>
      expect(screen.getByTestId('broadcast-result')).toHaveTextContent('Reached 1 account'),
    );
    await waitFor(() =>
      expect(lastRpc('broadcast_email')?.args).toMatchObject({
        p_role_target: 'customer',
        p_title: 'Autumn sale opens tonight',
        p_message: 'Storefront banners go live at 00:00.',
      }),
    );
    // The double does not implement broadcast_email, so it refuses loudly - and the page
    // reports that refusal as an email failure instead of folding it into the in-app success.
    await waitFor(() => expect(screen.getByTestId('broadcast-email-error')).toBeInTheDocument());
  });
});
