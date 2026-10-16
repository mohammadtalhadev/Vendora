import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { NotificationsPage } from './NotificationsPage';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import { notificationRow, profileRow, supabaseDouble } from '../test/supabase-double';

const ME = DEMO_ACCOUNTS.customer;
const COLLEAGUE = 'usr-recipient-2';
/** How many rows the page asks Postgres for at a time; a paging test has to outgrow it. */
const PAGE_SIZE = 6;

/**
 * A tab is only honest if the read it issues carries the predicate the tab names, so the test asks
 * that chain instead of trusting the rows left on screen: `from(table)` hands back the builder the
 * data layer chained onto, and its `filters` are that read's own WHERE clauses. The unread count is
 * a head read over `id` alone, so the notice read is the chain that names `created_at`.
 */
interface ReadChain {
  selected: string;
  filters: Array<(row: Record<string, unknown>) => boolean>;
  window: [number, number] | null;
}

const listReads = (): ReadChain[] =>
  supabaseDouble.from.mock.results
    .map((entry) => entry.value as unknown as ReadChain | null)
    .filter((chain): chain is ReadChain => chain?.selected?.includes('created_at') === true);

const lastListRead = (): ReadChain => listReads()[listReads().length - 1];

/** Would the newest notice read keep this row? That is exactly the filter the tab asked for. */
const kept = (row: Record<string, unknown>) => lastListRead().filters.every((keep) => keep(row));

const noticeReads = () =>
  supabaseDouble.from.mock.calls.filter(([table]) => table === 'notifications').length;

const notice = (id: string, overrides: Partial<Record<string, unknown>> = {}) =>
  supabaseDouble.seedNotification(
    notificationRow({
      id,
      user_id: ME.id,
      type: 'order_status',
      title: 'Your package is on the way',
      message: 'Order ORD-1004 left the warehouse.',
      href: '/orders/ORD-1004',
      read_at: null,
      created_at: '2026-10-12T08:00:00.000Z',
      ...overrides,
    }),
  );

const renderPage = () => renderWorkspace(<NotificationsPage />, ['/notifications']);

const rows = () => supabaseDouble.tables.notifications;
const rowById = (id: string) => rows().find((row) => row.id === id);

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: ME.id, email: ME.email, roles: ['customer'] }));
  supabaseDouble.seedProfile(
    profileRow({ id: COLLEAGUE, email: 'other@demo.test', roles: ['customer'], name: 'Other Person' }),
  );
  supabaseDouble.authState.session = { access_token: 't', user: { id: ME.id, email: ME.email } };
  // The query key is the auth store's account and the read is the session's, so a test sets both.
  useAuthStore.getState().setUser(ME, 'test-token');
});

describe('NotificationsPage', () => {
  it('lists the notices addressed to this account and marks the unread ones', async () => {
    notice('mine-1');
    notice('mine-2', {
      type: 'payout',
      title: 'A payout reached your bank',
      message: 'Payout PAY-77 cleared.',
      href: '/vendor/payouts',
      read_at: '2026-10-11T10:00:00.000Z',
      created_at: '2026-10-11T10:00:00.000Z',
    });
    notice('not-mine', {
      user_id: COLLEAGUE,
      type: 'dispute',
      title: 'A dispute opened against your store',
      message: 'Someone else’s row, on someone else’s tray.',
    });

    renderPage();

    await waitFor(() => expect(screen.getByTestId('notice-mine-1')).toBeInTheDocument());
    expect(screen.getByTestId('notice-mine-1')).toHaveTextContent('Unread');
    expect(screen.getByTestId('notice-mine-1')).toHaveTextContent('Your package is on the way');
    expect(screen.getByTestId('notice-mine-2')).not.toHaveTextContent('Unread');
    expect(screen.queryByTestId('notice-not-mine')).not.toBeInTheDocument();
    expect(screen.queryByText('A dispute opened against your store')).not.toBeInTheDocument();

    // The read is scoped to the session's account, the same way RLS scopes it.
    expect(kept({ user_id: ME.id, type: 'order_status', read_at: null })).toBe(true);
    expect(kept({ user_id: COLLEAGUE, type: 'order_status', read_at: null })).toBe(false);
  });

  it('renders the notice action as a light button with a readable label, never a dark pill', async () => {
    notice('mine-1');
    renderPage();
    const action = await screen.findByRole('link', { name: /View Order/ });
    expect(action.className).toContain('bg-white');
    expect(action.className).not.toContain('bg-slate-900');
    expect(action.className).not.toContain('text-white');
  });

  it('asks the database for a kind instead of slicing the page it already has', async () => {
    notice('order-1');
    notice('dispute-1', {
      type: 'dispute',
      title: 'Support replied to your dispute',
      message: 'The desk asked for a photo of the label.',
      href: '/disputes',
      created_at: '2026-10-12T09:00:00.000Z',
    });
    notice('payout-1', {
      type: 'payout',
      title: 'A payout reached your bank',
      message: 'Payout PAY-77 cleared.',
      read_at: '2026-10-10T10:00:00.000Z',
      created_at: '2026-10-10T10:00:00.000Z',
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Support replied to your dispute')).toBeInTheDocument());
    const readsBeforeTab = noticeReads();

    // The category bar is a genuine tablist: mutually exclusive views of one panel, so the
    // accessible query is by tab role, not button.
    fireEvent.click(screen.getByRole('tab', { name: /^Orders/ }));

    // A tab is a fresh question for Postgres, not a filter over what is already on screen.
    await waitFor(() => expect(noticeReads()).toBeGreaterThan(readsBeforeTab));
    expect(lastListRead().filters.length).toBeGreaterThan(1);
    expect(kept({ user_id: ME.id, type: 'order_status', read_at: null })).toBe(true);
    expect(kept({ user_id: ME.id, type: 'dispute', read_at: null })).toBe(false);
    await waitFor(() => expect(screen.queryByText('Support replied to your dispute')).not.toBeInTheDocument());
    expect(screen.getByText('Your package is on the way')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^Payouts/ }));

    await waitFor(() => expect(kept({ user_id: ME.id, type: 'payout', read_at: null })).toBe(true));
    expect(kept({ user_id: ME.id, type: 'order_status', read_at: null })).toBe(false);
    await waitFor(() => expect(screen.getByText('A payout reached your bank')).toBeInTheDocument());
    expect(screen.queryByText('Your package is on the way')).not.toBeInTheDocument();
  });

  it('counts and filters unread from read_at', async () => {
    notice('mine-1');
    notice('mine-2', { type: 'dispute', title: 'Support replied to your dispute' });
    notice('mine-3', {
      type: 'payout',
      title: 'A payout reached your bank',
      read_at: '2026-10-11T10:00:00.000Z',
      created_at: '2026-10-11T10:00:00.000Z',
    });

    renderPage();

    // Two rows carry a null `read_at`, so the tray says two - however the list is filtered.
    await waitFor(() => expect(screen.getByText('2 Unread')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: /^Unread/ })).toHaveTextContent('2');
    expect(screen.getByTestId('notice-mine-3')).not.toHaveTextContent('Unread');

    fireEvent.click(screen.getByRole('tab', { name: /^Unread/ }));

    await waitFor(() => expect(kept({ user_id: ME.id, type: 'payout', read_at: null })).toBe(true));
    expect(kept({ user_id: ME.id, type: 'payout', read_at: '2026-10-11T10:00:00.000Z' })).toBe(false);
    await waitFor(() => expect(screen.queryByText('A payout reached your bank')).not.toBeInTheDocument());
    expect(screen.getByText('Your package is on the way')).toBeInTheDocument();
    expect(screen.getByText('Support replied to your dispute')).toBeInTheDocument();
  });

  it('pages through Postgres and quotes the server total, not the rows on screen', async () => {
    Array.from({ length: PAGE_SIZE }, (_, index) => `page-1-${index + 1}`).forEach((id, index) =>
      notice(id, { created_at: `2026-10-12T09:0${index}:00.000Z`, title: `Order ${index + 1} was packed` }),
    );
    notice('page-2-1', {
      type: 'security',
      title: 'A security check finished',
      message: 'The review of the signed-in device is complete.',
      href: null,
      created_at: '2026-10-01T09:00:00.000Z',
    });

    renderPage();

    await waitFor(() => expect(screen.getByTestId('pager-summary')).toBeInTheDocument());
    expect(screen.getByTestId('pager-summary')).toHaveTextContent(`Showing ${PAGE_SIZE} of 7 notices`);
    expect(screen.getByTestId('notice-page-1-1')).toBeInTheDocument();
    expect(screen.queryByTestId('notice-page-2-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('pager-previous')).toBeDisabled();

    fireEvent.click(screen.getByTestId('pager-next'));

    await waitFor(() => expect(screen.getByText('A security check finished')).toBeInTheDocument());
    // Page two is a second `range()` over the server's pool, not page one cut down locally.
    expect(lastListRead().window).toEqual([PAGE_SIZE, PAGE_SIZE * 2 - 1]);
    expect(screen.getByTestId('pager-summary')).toHaveTextContent('Showing 1 of 7 notices');
    expect(screen.getByTestId('pager-summary')).toHaveTextContent('page 2 of 2');
    expect(screen.getByTestId('pager-next')).toBeDisabled();
    expect(screen.queryByTestId('notice-page-1-1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('pager-previous'));

    await waitFor(() => expect(screen.getByTestId('notice-page-1-1')).toBeInTheDocument());
    expect(lastListRead().window).toEqual([0, PAGE_SIZE - 1]);
  });

  it('marks a notice read when the notice is opened, in Postgres', async () => {
    // `href: null` keeps the click on this screen, so the read receipt is what is observed.
    notice('mine-1', { href: null });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('notice-mine-1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('notice-open-mine-1'));

    await waitFor(() => expect(rowById('mine-1')?.read_at).not.toBeNull());
    // The row is not dropped for being read: Postgres keeps it, and so does the tray.
    expect(screen.getByTestId('notice-mine-1')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('notice-mine-1')).not.toHaveTextContent('Unread'));
    expect(screen.queryByText('1 Unread')).not.toBeInTheDocument();
  });

  it('deletes a dismissed notice from Postgres and leaves every other row alone', async () => {
    notice('mine-1');
    notice('mine-2', { type: 'dispute', title: 'Support replied to your dispute' });
    notice('not-mine', { user_id: COLLEAGUE, title: 'A dispute opened against your store' });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('notice-mine-1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('notice-dismiss-mine-1'));

    await waitFor(() => expect(rowById('mine-1')).toBeUndefined());
    expect(rowById('mine-2')).toBeDefined();
    expect(rowById('not-mine')).toBeDefined();
    await waitFor(() => expect(screen.queryByTestId('notice-mine-1')).not.toBeInTheDocument());
  });

  it('shows the database’s refusal when a notice is not the caller’s to delete', async () => {
    notice('mine-1');
    renderPage();
    await waitFor(() => expect(screen.getByTestId('notice-mine-1')).toBeInTheDocument());

    // The row changes hands after the tray was read, so the delete matches nothing.
    const row = rowById('mine-1');
    if (row) row.user_id = COLLEAGUE;

    fireEvent.click(screen.getByTestId('notice-dismiss-mine-1'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not dismiss that notice/i);
    expect(alert).toHaveTextContent(/it is not one of yours/i);
    // Nothing was deleted, and the page does not pretend otherwise by hiding the row locally.
    expect(rowById('mine-1')).toBeDefined();
    expect(screen.getByTestId('notice-mine-1')).toBeInTheDocument();
  });

  it('marks this account’s whole tray read and no one else’s', async () => {
    notice('mine-1');
    notice('mine-2', { type: 'dispute', title: 'Support replied to your dispute' });
    notice('not-mine', { user_id: COLLEAGUE, title: 'A dispute opened against your store' });

    renderPage();
    await waitFor(() => expect(screen.getByText('2 Unread')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }));

    await waitFor(() => {
      expect(rowById('mine-1')?.read_at).not.toBeNull();
      expect(rowById('mine-2')?.read_at).not.toBeNull();
    });
    expect(rowById('not-mine')?.read_at).toBeNull();
    await waitFor(() => expect(screen.queryByText('2 Unread')).not.toBeInTheDocument());
  });

  it('reports a mark-all write the database refused instead of calling the tray read', async () => {
    notice('mine-1');
    renderPage();
    await waitFor(() => expect(screen.getByText('1 Unread')).toBeInTheDocument());

    supabaseDouble.failures.notifications = 'permission denied for table notifications';
    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }));

    await waitFor(() => expect(screen.getByTestId('mark-all-read-error')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(/permission denied for table notifications/i);
    expect(rowById('mine-1')?.read_at).toBeNull();
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
  });

  it('filters the loaded page by keyword and says so on its own label', async () => {
    notice('mine-1');
    notice('mine-2', {
      type: 'payout',
      title: 'A payout reached your bank',
      message: 'Payout PAY-77 cleared.',
      read_at: '2026-10-11T10:00:00.000Z',
      created_at: '2026-10-11T10:00:00.000Z',
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('A payout reached your bank')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/filters the loaded page/i), { target: { value: 'warehouse' } });

    await waitFor(() => expect(screen.queryByText('A payout reached your bank')).not.toBeInTheDocument());
    expect(screen.getByText('Your package is on the way')).toBeInTheDocument();
    expect(screen.queryByTestId('notice-mine-2')).toBeNull();

    // A keyword that misses the loaded page is reported as a miss on the page, never as an empty tray.
    fireEvent.change(screen.getByLabelText(/filters the loaded page/i), { target: { value: 'teleporter' } });

    await waitFor(() => expect(screen.getByText(/keyword box only reads the loaded page/i)).toBeInTheDocument());
    expect(screen.getByText(/nothing on this page matches that/i)).toBeInTheDocument();
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reset-page-filter'));
    await waitFor(() => expect(screen.getByText('Your package is on the way')).toBeInTheDocument());
    expect(screen.getByText('A payout reached your bank')).toBeInTheDocument();
  });

  it('shows an account with no notices as caught up, and offers no bulk delete to fake it', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText(/you're all caught up!/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /browse marketplace/i })).toBeInTheDocument();
    // `markAllNotificationsRead` is the only bulk write the backend has, so there is no clear-all.
    expect(screen.queryByRole('button', { name: /clear all|delete all|remove all/i })).not.toBeInTheDocument();
    // The deleted store's fabricated seed notices are no part of this screen either.
    expect(screen.queryByText('Seller Application Approved')).not.toBeInTheDocument();
    expect(screen.queryByText('Flash Sale Discount Active')).not.toBeInTheDocument();
  });

  it('renders a failed read as an error, not as an empty tray', async () => {
    notice('mine-1');
    supabaseDouble.failures.notifications = 'permission denied for table notifications';

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/permission denied for table notifications/i);
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Your package is on the way')).not.toBeInTheDocument();

    supabaseDouble.failures.notifications = null;
    fireEvent.click(within(alert).getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByText('Your package is on the way')).toBeInTheDocument());
    expect(screen.queryByTestId('notification-read-error')).not.toBeInTheDocument();
  });
});
