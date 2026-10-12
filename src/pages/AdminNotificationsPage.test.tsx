import { beforeEach, describe, expect, it, vi } from 'vitest';

// WorkspaceLayout's sign-out needs the auth provider; these tests never click it.
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
import { auditLogRow, profileRow, supabaseDouble } from '../test/supabase-double';

/** One `notification.broadcast` audit record, which is the only thing the sender can read back. */
const BROADCAST = 'audit-broadcast-1';

const seedBroadcast = () =>
  supabaseDouble.seedAuditLog(
    auditLogRow({
      id: BROADCAST,
      actor_id: 'admin-1',
      actor_role: 'Admin',
      action: 'notification.broadcast',
      entity_type: 'broadcast',
      entity_id: null,
      before_data: null,
      after_data: {
        audience: 'vendor',
        type: 'system',
        title: 'Holiday cutoff schedule',
        message: 'Orders must ship by 14:00 UTC on the 20th.',
        href: '/seller/orders',
        recipients: 4,
      },
      created_at: '2026-10-09T09:30:00.000Z',
    }),
  );

beforeEach(() => {
  supabaseDouble.reset();
  const admin = supabaseDouble.seedAdmin();
  // Two customers and one seller: the audience a broadcast addresses decides how many rows it writes.
  supabaseDouble.seedProfile(
    profileRow({
      id: 'user-1',
      email: 'marcus@demo.test',
      name: 'Marcus Seller',
      roles: ['customer', 'vendor'],
      vendor_status: 'approved',
    }),
  );
  supabaseDouble.seedProfile(
    profileRow({ id: 'user-2', email: 'dana@demo.test', name: 'Dana Buyer', roles: ['customer'] }),
  );
  useAuthStore.getState().setUser(
    { ...DEMO_ACCOUNTS.admin, id: admin.id, email: admin.email, name: admin.name },
    'test-token',
  );
});

const render = () => renderWorkspace(<AdminNotificationsPage />, ['/admin/notifications']);

const lastRpc = (fn: string) =>
  [...supabaseDouble.rpcCalls].reverse().find((entry) => entry.fn === fn);

const fillComposer = () => {
  fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'customer' } });
  fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'promotion' } });
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: 'Autumn sale opens tonight' },
  });
  fireEvent.change(screen.getByLabelText('Message'), {
    target: { value: 'Storefront banners go live at 00:00.' },
  });
  fireEvent.change(screen.getByLabelText(/in-app link/i), {
    target: { value: '/products?sale=autumn' },
  });
};

describe('AdminNotificationsPage', () => {
  it('asks for the broadcast records only, and lists one with its sender, audience and reach', async () => {
    seedBroadcast();

    render();

    await waitFor(() => expect(screen.getByTestId(`log-row-${BROADCAST}`)).toBeInTheDocument());
    expect(lastRpc('admin_audit_queue')?.args).toMatchObject({
      p_action: 'notification.broadcast',
      p_page: 1,
      p_page_size: 10,
    });

    const row = screen.getByTestId(`log-row-${BROADCAST}`);
    expect(row).toHaveTextContent('Holiday cutoff schedule');
    expect(row).toHaveTextContent('Orders must ship by 14:00 UTC on the 20th.');
    // The actor name comes from the profile behind the audit row's actor_id, not from the session.
    expect(row).toHaveTextContent('Platform Admin');
    expect(row).toHaveTextContent('Sellers');
    expect(row).toHaveTextContent('System notice');
    expect(row).toHaveTextContent('/seller/orders');
    expect(screen.getByTestId(`log-reached-${BROADCAST}`)).toHaveTextContent('4');
    expect(screen.queryByText(/no announcements sent yet/i)).not.toBeInTheDocument();
  });

  it('sends through broadcast_notification() and writes one notice per account in the audience', async () => {
    render();
    await waitFor(() => expect(screen.getByLabelText('Audience')).toBeInTheDocument());

    fillComposer();
    fireEvent.click(screen.getByRole('button', { name: /send announcement/i }));

    await waitFor(() =>
      expect(lastRpc('broadcast_notification')?.args).toMatchObject({
        p_role_target: 'customer',
        p_type: 'promotion',
        p_title: 'Autumn sale opens tonight',
        p_message: 'Storefront banners go live at 00:00.',
        p_href: '/products?sale=autumn',
      }),
    );
    // Two of the three profiles carry `customer`, so the fan-out wrote exactly two rows.
    expect(supabaseDouble.tables.notifications).toHaveLength(2);
    expect(
      supabaseDouble.tables.notifications.every((row) => row.role_target === 'customer'),
    ).toBe(true);
  });

  it('reports the count the RPC returned and re-reads the log so the send appears in it', async () => {
    render();
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeInTheDocument());

    fillComposer();
    fireEvent.click(screen.getByRole('button', { name: /send announcement/i }));

    await waitFor(() =>
      expect(screen.getByTestId('broadcast-result')).toHaveTextContent('Reached 2 accounts'),
    );
    // The audit record the RPC wrote is the delivery log's newest row, after a real re-read.
    await waitFor(() =>
      expect(
        screen.getByText('Autumn sale opens tonight', { selector: 'div' }),
      ).toBeInTheDocument(),
    );
    const sent = supabaseDouble.tables.audit_logs.find(
      (row) => row.action === 'notification.broadcast',
    );
    expect(sent).toBeDefined();
    expect((sent?.after_data as { recipients: number }).recipients).toBe(2);
  });

  it('shows the database’s refusal as an error instead of an empty delivery log', async () => {
    seedBroadcast();
    supabaseDouble.failRpc('permission denied for function admin_audit_queue');

    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/permission denied for function admin_audit_queue/i);
    expect(screen.queryByText(/no announcements sent yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Sent by')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('says the log is empty only when the read succeeded with nothing in it', async () => {
    // An unrelated audit record exists, so "empty" here means "no broadcasts", not "no rows".
    supabaseDouble.seedAuditLog(
      auditLogRow({ id: 'audit-other', action: 'product.approve', entity_type: 'product' }),
    );

    render();

    await waitFor(() => expect(screen.getByText('No announcements sent yet')).toBeInTheDocument());
    expect(screen.getByLabelText('Audience')).toBeEnabled();
  });

  it('leaves an empty href out of the call rather than sending a path the operator never typed', async () => {
    render();
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Maintenance window' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Read-only from 02:00.' } });
    fireEvent.click(screen.getByRole('button', { name: /send announcement/i }));

    await waitFor(() => expect(lastRpc('broadcast_notification')).toBeDefined());
    expect(lastRpc('broadcast_notification')?.args.p_href).toBeNull();
    expect(lastRpc('broadcast_notification')?.args.p_role_target).toBe('all');
    // 'all' addresses every profile, including the signed-in admin.
    await waitFor(() =>
      expect(screen.getByTestId('broadcast-result')).toHaveTextContent('Reached 3 accounts'),
    );
  });
});
