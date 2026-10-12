import { beforeEach, describe, expect, it, vi } from 'vitest';

// The bell needs no auth shell, but its reads go through the same double the rest of the
// migrated screens use.
vi.mock('../../lib/auth-context', async () => {
  const { useAuthStub } = await import('../../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuthStore } from '../../store/auth-store';
import { DEMO_ACCOUNTS } from '../../lib/demo-accounts';
import { notificationRow, profileRow, supabaseDouble } from '../../test/supabase-double';

type NotificationSeed = NonNullable<Parameters<typeof notificationRow>[0]>;

const CUSTOMER = DEMO_ACCOUNTS.customer;
/** A second account with a notice of its own: the tray must neither show it nor mark it read. */
const STRANGER = 'usr-customer-2';

const SHIPPED = '00000000-0000-4000-8000-000000001801';
const DISPUTE = '00000000-0000-4000-8000-000000001802';
const PAYOUT = '00000000-0000-4000-8000-000000001803';
const ALREADY_READ = '00000000-0000-4000-8000-000000001804';
const STRANGER_NOTICE = '00000000-0000-4000-8000-000000001805';

/** One row as the fan-out trigger writes it: addressed to the signed-in customer. */
function seedNotice(overrides: NotificationSeed = {}) {
  supabaseDouble.seedNotification(notificationRow({ user_id: CUSTOMER.id, ...overrides }));
}

function renderBell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <NotificationDropdown />
        <Routes>
          <Route path="/" element={<p>Storefront</p>} />
          <Route path="/orders" element={<p>Order centre</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const openTray = () => fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
const storedRow = (id: string) => supabaseDouble.tables.notifications.find((row) => row.id === id);

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: CUSTOMER.id, email: CUSTOMER.email, roles: ['customer'] }));
  supabaseDouble.seedProfile(profileRow({ id: STRANGER, email: 'stranger@demo.test' }));
  supabaseDouble.authState.session = { access_token: 't', user: { id: CUSTOMER.id, email: CUSTOMER.email } };
  useAuthStore.getState().setUser(CUSTOMER, 'test-token');
});

describe('NotificationDropdown', () => {
  it('badges the bell with the unread count the database returned', async () => {
    seedNotice({ id: SHIPPED, type: 'order_status', title: 'Package out for delivery' });
    seedNotice({ id: DISPUTE, type: 'dispute', title: 'Return review started' });
    seedNotice({ id: PAYOUT, type: 'payout', title: 'Payout settled' });
    seedNotice({
      id: ALREADY_READ,
      type: 'system',
      title: 'Welcome to Vendora',
      read_at: '2026-10-11T06:00:00.000Z',
    });

    renderBell();

    await waitFor(() => expect(screen.getByTestId('unread-badge')).toHaveTextContent('3'));
  });

  it('shows neither a number nor an empty tray while the first read is still in flight', () => {
    // No account, so the tray has nothing to ask for: it must not guess a count or claim emptiness.
    useAuthStore.getState().setUser(null, null);
    supabaseDouble.authState.session = null;

    renderBell();
    openTray();

    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
    expect(screen.queryByText('No notifications')).not.toBeInTheDocument();
    expect(screen.getByText(/loading your notifications/i)).toBeInTheDocument();
  });

  it('opens the tray on the notices it read and keeps a read one out of the unread styling', async () => {
    seedNotice({ id: SHIPPED, type: 'order_status', title: 'Package out for delivery' });
    seedNotice({ id: DISPUTE, type: 'dispute', title: 'Return review started' });
    seedNotice({ id: PAYOUT, type: 'payout', title: 'Payout settled', href: null });
    seedNotice({
      id: ALREADY_READ,
      type: 'system',
      title: 'Welcome to Vendora',
      read_at: '2026-10-11T06:00:00.000Z',
    });
    seedNotice({ id: STRANGER_NOTICE, type: 'promotion', title: 'Someone else’s sale', user_id: STRANGER });

    renderBell();
    await waitFor(() => expect(screen.getByTestId('unread-badge')).toHaveTextContent('3'));

    openTray();

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText(/3 unread/i)).toBeInTheDocument();
    expect(screen.getByText('Package out for delivery')).toBeInTheDocument();
    expect(screen.getByText('Payout settled')).toBeInTheDocument();
    expect(screen.queryByText('Someone else’s sale')).not.toBeInTheDocument();

    // Read state comes from `read_at`, so the already-read notice carries no unread marker.
    const readRow = screen.getByText('Welcome to Vendora').closest('button');
    expect(readRow).not.toBeNull();
    expect(within(readRow as HTMLElement).queryByLabelText(/unread indicator/i)).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/unread indicator/i)).toHaveLength(3);

    expect(screen.getByRole('link', { name: /view all notifications/i })).toHaveAttribute(
      'href',
      '/notifications',
    );
  });

  it('asks Postgres for the tab instead of filtering the eight rows it is holding', async () => {
    // Eight newer disputes fill the page, so the older order notice cannot be in hand at all.
    for (let n = 1; n <= 8; n += 1) {
      seedNotice({
        id: `00000000-0000-4000-8000-0000000018${String(n + 9)}`,
        type: 'dispute',
        title: `Return review started ${n}`,
        created_at: `2026-10-12T0${n}:00:00.000Z`,
      });
    }
    seedNotice({
      id: SHIPPED,
      type: 'order_status',
      title: 'Package out for delivery',
      created_at: '2026-10-01T00:00:00.000Z',
    });

    renderBell();
    await waitFor(() => expect(screen.getByTestId('unread-badge')).toHaveTextContent('9'));

    openTray();
    await waitFor(() => expect(screen.getByText('Return review started 1')).toBeInTheDocument());
    // The badge is the server's count over the whole tray; the page underneath it holds eight rows.
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('9');
    expect(screen.queryByText('Package out for delivery')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
    await waitFor(() => {
      expect(screen.getByText('Package out for delivery')).toBeInTheDocument();
      expect(screen.queryAllByText(/Return review started/)).toHaveLength(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Unread' }));
    await waitFor(() => expect(screen.queryAllByText(/Return review started/)).toHaveLength(8));
  });

  it('writes the click to Postgres as read and goes to the notice’s own route', async () => {
    seedNotice({ id: SHIPPED, type: 'order_status', title: 'Package out for delivery', href: '/orders' });
    seedNotice({ id: DISPUTE, type: 'dispute', title: 'Return review started' });

    renderBell();
    await waitFor(() => expect(screen.getByTestId('unread-badge')).toHaveTextContent('2'));

    openTray();
    const clicked = screen.getByText('Package out for delivery').closest('button');
    expect(clicked).not.toBeNull();
    fireEvent.click(clicked as HTMLElement);

    expect(screen.queryByTestId('notification-popover')).not.toBeInTheDocument();
    expect(await screen.findByText('Order centre')).toBeInTheDocument();

    await waitFor(() => expect(storedRow(SHIPPED)?.read_at).toEqual(expect.any(String)));
    expect(storedRow(DISPUTE)?.read_at).toBeNull();
  });

  it('marks every one of this account’s notices read, and only them', async () => {
    seedNotice({ id: SHIPPED, type: 'order_status', title: 'Package out for delivery' });
    seedNotice({ id: DISPUTE, type: 'dispute', title: 'Return review started' });
    seedNotice({ id: STRANGER_NOTICE, type: 'promotion', title: 'Someone else’s sale', user_id: STRANGER });

    renderBell();
    await waitFor(() => expect(screen.getByTestId('unread-badge')).toHaveTextContent('2'));

    openTray();
    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }));

    await waitFor(() => expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument());
    await waitFor(() => expect(storedRow(DISPUTE)?.read_at).toEqual(expect.any(String)));
    expect(storedRow(SHIPPED)?.read_at).toEqual(expect.any(String));
    expect(storedRow(STRANGER_NOTICE)?.read_at).toBeNull();
  });

  it('throws a notice away through the server, leaving the rest of the tray alone', async () => {
    seedNotice({ id: SHIPPED, type: 'order_status', title: 'Package out for delivery' });
    seedNotice({ id: DISPUTE, type: 'dispute', title: 'Return review started' });

    renderBell();
    await waitFor(() => expect(screen.getByTestId('unread-badge')).toHaveTextContent('2'));

    openTray();
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove "Package out for delivery"' }),
    );

    await waitFor(() => expect(storedRow(SHIPPED)).toBeUndefined());
    expect(storedRow(DISPUTE)).toBeDefined();

    // The re-read that the successful write triggers drops it from the tray too.
    await waitFor(() => expect(screen.queryByText('Package out for delivery')).not.toBeInTheDocument());
    expect(screen.getByText('Return review started')).toBeInTheDocument();
  });

  it('shows a refused write as the failure instead of a silent no-op', async () => {
    seedNotice({ id: SHIPPED, type: 'order_status', title: 'Package out for delivery' });
    seedNotice({ id: DISPUTE, type: 'dispute', title: 'Return review started' });

    renderBell();
    await waitFor(() => expect(screen.getByTestId('unread-badge')).toHaveTextContent('2'));

    openTray();
    // The read already succeeded; only the write is refused, so the tray must stay filled.
    supabaseDouble.failures.notifications = 'permission denied for table notifications';
    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }));

    await waitFor(() => expect(screen.getByTestId('mark-all-error')).toBeInTheDocument());
    expect(screen.getByTestId('mark-all-error')).toHaveTextContent(/permission denied for table notifications/i);
    // Refusing the write is not emptiness: the notices are still shown.
    expect(screen.getByText('Package out for delivery')).toBeInTheDocument();
    expect(screen.queryByText('No notifications')).not.toBeInTheDocument();
  });

  it('renders a failed read as the failure, never as an empty tray', async () => {
    supabaseDouble.failures.notifications = 'permission denied for table notifications';

    renderBell();
    openTray();

    await waitFor(() => expect(screen.getByTestId('notification-error')).toBeInTheDocument());
    expect(screen.getByText(/permission denied for table notifications/i)).toBeInTheDocument();
    expect(screen.queryByText('No notifications')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();

    // Closed, the bell still says out loud that the read failed.
    openTray();
    expect(screen.queryByTestId('notification-popover')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/permission denied for table notifications/i);
  });
});
