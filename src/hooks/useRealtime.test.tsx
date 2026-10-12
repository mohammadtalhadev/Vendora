import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { screen, waitFor } from '@testing-library/react';
import { useRealtimeWatch } from './useRealtime';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import { notificationRow, supabaseDouble } from '../test/supabase-double';

const ME = DEMO_ACCOUNTS.customer.id;

/** Every read of the tray: the page query and the unread head count together. */
const trayReads = () =>
  supabaseDouble.from.mock.calls.filter(([table]) => table === 'notifications').length;

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.authState.session = { access_token: 't', user: { id: ME, email: DEMO_ACCOUNTS.customer.email } };
  useAuthStore.getState().setUser(DEMO_ACCOUNTS.customer, 'test-token');
});

describe('useRealtimeWatch', () => {
  function Probe({ onEvent }: { onEvent: (change: unknown) => void }) {
    useRealtimeWatch({ table: 'notifications', filter: `user_id=eq.${ME}`, onChange: onEvent });
    return <div>probing</div>;
  }

  it('subscribes to the table and the account it names, and leaves again on unmount', async () => {
    const seen: unknown[] = [];
    const { unmount } = renderWorkspace(<Probe onEvent={(change) => seen.push(change)} />, ['/notifications']);

    const channel = supabaseDouble.realtimeChannels.at(-1);
    expect(channel?.bindings[0]).toMatchObject({ table: 'notifications', filter: `user_id=eq.${ME}` });

    supabaseDouble.emitRealtime('notifications', { eventType: 'INSERT', new: { user_id: ME, title: 'Shipped' } });
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).toMatchObject({ eventType: 'INSERT', record: { user_id: ME } });

    unmount();
    expect(supabaseDouble.realtimeChannels).toHaveLength(0);
  });

  it('keeps a change that belongs to another account out of this subscription', () => {
    const seen: unknown[] = [];
    renderWorkspace(<Probe onEvent={(change) => seen.push(change)} />, ['/notifications']);

    supabaseDouble.emitRealtime('notifications', { eventType: 'INSERT', new: { user_id: 'someone-else' } });
    supabaseDouble.emitRealtime('orders', { eventType: 'INSERT', new: { id: 'order-1' } });

    expect(seen).toEqual([]);
  });
});

describe('useNotifications with realtime', () => {
  function Tray() {
    const list = useNotifications({ pageSize: 3 });
    return <div data-testid="tray">{list.data?.total ?? '-'}</div>;
  }

  it('re-reads the tray from Postgres when a notice lands, rather than trusting the event', async () => {
    supabaseDouble.seedNotification(notificationRow({ id: 'n-1', user_id: ME, title: 'Package shipped' }));
    renderWorkspace(<Tray />, ['/notifications']);

    await waitFor(() => expect(screen.getByTestId('tray')).toHaveTextContent('1'));
    const before = trayReads();

    supabaseDouble.seedNotification(notificationRow({ id: 'n-2', user_id: ME, title: 'Payout settled' }));
    supabaseDouble.emitRealtime('notifications', { eventType: 'INSERT', new: { id: 'n-2', user_id: ME } });

    await waitFor(() => expect(trayReads()).toBeGreaterThan(before));
    await waitFor(() => expect(screen.getByTestId('tray')).toHaveTextContent('2'));
  });
});
