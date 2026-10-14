import { beforeEach, describe, expect, it, vi } from 'vitest';

// The settings page talks to Supabase through the auth session API; this stub
// stands in for the client so the delete flow can be driven end to end,
// including the Edge Function's own error body.
const stub = vi.hoisted(() => ({
  invoke: vi.fn(),
  signOut: vi.fn(async () => ({ error: null })),
  updateUser: vi.fn(async () => ({ data: {}, error: null })),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { signOut: stub.signOut, updateUser: stub.updateUser },
    functions: { invoke: stub.invoke },
  },
  isSupabaseConfigured: true,
  TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
}));

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AccountSettingsPage } from './AccountSettingsPage';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';

beforeEach(() => {
  vi.clearAllMocks();
  stub.invoke.mockResolvedValue({ data: { ok: true }, error: null });
  useAuthStore.getState().setUser(DEMO_ACCOUNTS.customer, 'test-token');
});

const render = () => renderWorkspace(<AccountSettingsPage />, ['/account/settings']);

const armDelete = () => {
  fireEvent.change(screen.getByLabelText(/type DELETE to enable/i), {
    target: { value: 'DELETE' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
};

describe('AccountSettingsPage account deletion', () => {
  it('keeps the delete button disabled until DELETE is typed exactly', async () => {
    render();
    const button = await screen.findByRole('button', { name: 'Delete my account' });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/type DELETE to enable/i), {
      target: { value: 'delete' },
    });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/type DELETE to enable/i), {
      target: { value: 'DELETE' },
    });
    expect(button).toBeEnabled();
  });

  it('asks for a final confirmation, then invokes delete-account with the exact body', async () => {
    render();
    armDelete();

    // Nothing has been sent yet: the final confirmation comes first.
    expect(stub.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));

    await waitFor(() =>
      expect(stub.invoke).toHaveBeenCalledWith('delete-account', {
        body: { confirm: 'DELETE' },
      }),
    );
    await waitFor(() => expect(stub.signOut).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it("shows the function's own error verbatim, with the support fallback line", async () => {
    stub.invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(
          JSON.stringify({ error: 'Confirmation missing: send { "confirm": "DELETE" }' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      },
    });

    render();
    armDelete();
    fireEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Confirmation missing: send { "confirm": "DELETE" }');
    expect(alert).toHaveTextContent('If this keeps failing, contact support.');
    expect(stub.signOut).not.toHaveBeenCalled();
  });
});
