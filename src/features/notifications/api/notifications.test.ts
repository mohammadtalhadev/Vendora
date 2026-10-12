import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import {
  broadcastNotification,
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications';
import { notificationRow, profileRow, supabaseDouble } from '../../../test/supabase-double';

const ME = '00000000-0000-4000-8000-000000001801';
const OTHER = '00000000-0000-4000-8000-000000001802';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: ME, email: 'me@demo.test', roles: ['customer'] }));
  supabaseDouble.seedProfile(profileRow({ id: OTHER, email: 'other@demo.test', name: 'Other Buyer' }));
  supabaseDouble.authState.session = { access_token: 't', user: { id: ME, email: 'me@demo.test' } };
});

describe('fetchNotifications', () => {
  it('reads the recipient’s own notices, newest first', async () => {
    supabaseDouble.seedNotification(notificationRow({ id: 'n-old', user_id: ME, title: 'Older', created_at: '2026-10-08T00:00:00.000Z' }));
    supabaseDouble.seedNotification(notificationRow({ id: 'n-new', user_id: ME, title: 'Newer', created_at: '2026-10-10T00:00:00.000Z' }));
    supabaseDouble.seedNotification(notificationRow({ id: 'n-theirs', user_id: OTHER, title: 'Not mine' }));

    const list = await fetchNotifications();

    expect(list.rows.map((row) => row.id)).toEqual(['n-new', 'n-old']);
    expect(list.total).toBe(2);
  });

  it('maps the row into the shape the bell renders, and keeps a bare statement linkless', async () => {
    supabaseDouble.seedNotification(notificationRow({
      id: 'n-1', user_id: ME, type: 'payout', title: 'Payout settled', message: '€412.00 left the reserve.',
      href: null, read_at: null, created_at: '2026-10-10T09:00:00.000Z',
    }));

    const { rows } = await fetchNotifications();

    expect(rows[0]).toEqual({
      id: 'n-1',
      type: 'payout',
      title: 'Payout settled',
      message: '€412.00 left the reserve.',
      href: null,
      readAt: null,
      createdAt: '2026-10-10T09:00:00.000Z',
    });
  });

  it('falls back to a system notice rather than inventing a category the enum does not hold', async () => {
    supabaseDouble.seedNotification(notificationRow({ id: 'n-2', user_id: ME, type: 'price_alert' }));

    const { rows } = await fetchNotifications();

    expect(rows[0]?.type).toBe('system');
  });

  it('counts every unread notice, not only the page on screen', async () => {
    for (let index = 0; index < 4; index += 1) {
      supabaseDouble.seedNotification(notificationRow({
        id: `n-read-${index}`, user_id: ME, read_at: '2026-10-09T00:00:00.000Z',
        created_at: `2026-10-0${index}T00:00:00.000Z`,
      }));
    }
    supabaseDouble.seedNotification(notificationRow({ id: 'n-live', user_id: ME, created_at: '2026-10-11T00:00:00.000Z' }));

    const first = await fetchNotifications({ pageSize: 2, page: 1 });

    expect(first.rows).toHaveLength(2);
    expect(first.total).toBe(5);
    expect(first.unread).toBe(1);
  });

  it('lets the server do the filtering a category tab asks for', async () => {
    supabaseDouble.seedNotification(notificationRow({ id: 'n-order', user_id: ME, type: 'order_status' }));
    supabaseDouble.seedNotification(notificationRow({ id: 'n-payout', user_id: ME, type: 'payout' }));

    const payouts = await fetchNotifications({ type: 'payout' });

    expect(payouts.rows.map((row) => row.id)).toEqual(['n-payout']);
    expect(payouts.total).toBe(1);
  });

  it('unreads-only means unread rows, and the read ones stay where they are', async () => {
    supabaseDouble.seedNotification(notificationRow({ id: 'n-seen', user_id: ME, read_at: '2026-10-10T00:00:00.000Z' }));
    supabaseDouble.seedNotification(notificationRow({ id: 'n-unseen', user_id: ME }));

    const unread = await fetchNotifications({ unreadOnly: true });

    expect(unread.rows.map((row) => row.id)).toEqual(['n-unseen']);
  });

  it('throws rather than reporting an empty tray when the read failed', async () => {
    supabaseDouble.failures.notifications = 'relation does not exist';

    // The tray and its unread count are two reads; either one failing is a failed read.
    await expect(fetchNotifications()).rejects.toThrow(/could not (load your notifications|count your unread notices)/i);
  });

  it('says so when there is no session to read a tray for', async () => {
    supabaseDouble.authState.session = null;

    await expect(fetchNotifications()).rejects.toThrow(/not signed in/i);
  });
});

describe('markNotificationRead', () => {
  it('stamps the recipient’s own notice', async () => {
    supabaseDouble.seedNotification(notificationRow({ id: 'n-1', user_id: ME }));

    await markNotificationRead('n-1');

    expect(supabaseDouble.tables.notifications[0]?.read_at).toBeTruthy();
  });

  it('changes nothing on a notice that belongs to someone else', async () => {
    supabaseDouble.seedNotification(notificationRow({ id: 'n-theirs', user_id: OTHER }));

    await markNotificationRead('n-theirs');

    expect(supabaseDouble.tables.notifications[0]?.read_at).toBeNull();
  });
});

describe('markAllNotificationsRead', () => {
  it('moves every unread notice and reports how many', async () => {
    supabaseDouble.seedNotification(notificationRow({ id: 'n-1', user_id: ME }));
    supabaseDouble.seedNotification(notificationRow({ id: 'n-2', user_id: ME }));
    supabaseDouble.seedNotification(notificationRow({ id: 'n-seen', user_id: ME, read_at: '2026-10-09T00:00:00.000Z' }));
    supabaseDouble.seedNotification(notificationRow({ id: 'n-theirs', user_id: OTHER }));

    expect(await markAllNotificationsRead()).toBe(2);
    expect(supabaseDouble.tables.notifications.find((row) => row.id === 'n-theirs')?.read_at).toBeNull();
  });
});

describe('dismissNotification', () => {
  it('removes the notice the recipient owns', async () => {
    supabaseDouble.seedNotification(notificationRow({ id: 'n-1', user_id: ME }));

    await dismissNotification('n-1');

    expect(supabaseDouble.tables.notifications).toEqual([]);
  });

  it('refuses a notice that is not the caller’s, because RLS returned no rows', async () => {
    supabaseDouble.seedNotification(notificationRow({ id: 'n-theirs', user_id: OTHER }));

    await expect(dismissNotification('n-theirs')).rejects.toThrow(/it is not one of yours/i);
    expect(supabaseDouble.tables.notifications).toHaveLength(1);
  });
});

describe('broadcastNotification', () => {
  it('speaks to a role and returns how many accounts it reached', async () => {
    supabaseDouble.seedAdmin();
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'admin-1', email: 'admin@demo.test' } };
    supabaseDouble.seedProfile(profileRow({ id: 'v-1', roles: ['customer', 'vendor'] }));
    supabaseDouble.seedProfile(profileRow({ id: 'v-2', roles: ['customer', 'vendor'] }));
    supabaseDouble.seedProfile(profileRow({ id: 'c-9', roles: ['customer'] }));

    const reached = await broadcastNotification({
      audience: 'vendor', type: 'promotion', title: 'Winter sale', message: 'Open Friday.', href: '/vendor/promotions',
    });

    expect(reached).toBe(2);
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toMatchObject({
      p_role_target: 'vendor', p_type: 'promotion', p_title: 'Winter sale', p_href: '/vendor/promotions',
    });
    expect(supabaseDouble.tables.notifications.filter((row) => row.title === 'Winter sale').map((row) => row.user_id))
      .toEqual(['v-1', 'v-2']);
  });

  it('carries the database’s refusal to a screen that can show it', async () => {
    supabaseDouble.failRpc('Only staff can broadcast a notification');

    await expect(
      broadcastNotification({ audience: 'all', type: 'system', title: 'x', message: 'y' }),
    ).rejects.toThrow(/could not send that announcement/i);
  });
});
