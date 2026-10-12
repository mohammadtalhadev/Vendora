import { beforeEach, describe, expect, it, vi } from 'vitest';

// WorkspaceLayout's sign-out needs the auth provider; these tests never click it.
vi.mock('../lib/auth-context', async () => {
  const { useAuthStub } = await import('../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RiderDashboardPage } from './RiderDashboardPage';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import {
  deliveryRow,
  orderRow,
  profileRow,
  riderRow,
  storeRow,
  subOrderRow,
  supabaseDouble,
} from '../test/supabase-double';

const RIDER = DEMO_ACCOUNTS.rider;
const PROFILE = '00000000-0000-4000-8000-000000001601';
const PACKAGE = '00000000-0000-4000-8000-000000000501';
const DROP = '00000000-0000-4000-8000-000000001701';
const CODE = '4821';

const seedDrop = (overrides: Record<string, unknown> = {}) => {
  supabaseDouble.seedOrder(orderRow({
    id: 'order-1',
    customer_email: 'alex@demo.test',
    shipping_address: {
      fullName: 'Alex Buyer', street: '18 Harbour Road', city: 'Boston', state: 'MA', zipCode: '02110',
    },
  }));
  supabaseDouble.seedSubOrder(subOrderRow({
    id: PACKAGE, order_group_id: 'order-1', seller_id: 'store-1', subtotal: 30, shipping_fee: 4,
    status: 'ready_for_pickup', customer_notes: 'Leave with the concierge.',
    ...overrides,
  }));
  supabaseDouble.seedDelivery(deliveryRow({
    id: DROP, sub_order_id: PACKAGE, rider_id: PROFILE, status: 'assigned', handover_code_hash: CODE,
  }));
};

/** A parcel that has reached the door: the only place a handover code is asked for. */
const seedAtTheDoor = () => {
  seedDrop({ status: 'out_for_delivery' });
  supabaseDouble.tables.deliveries[0] = deliveryRow({
    id: DROP, sub_order_id: PACKAGE, rider_id: PROFILE, status: 'out_for_delivery', handover_code_hash: CODE,
    picked_up_at: '2026-10-12T09:00:00.000Z',
  });
};

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: RIDER.id, email: RIDER.email, roles: ['rider'] }));
  supabaseDouble.authState.session = { access_token: 't', user: { id: RIDER.id, email: RIDER.email } };
  useAuthStore.getState().setUser(RIDER, 'test-token');
  supabaseDouble.seedRider(riderRow({ id: PROFILE, user_id: RIDER.id, full_name: 'Nadia Rider', status: 'available' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech' }));
});

const render = () => renderWorkspace(<RiderDashboardPage />, ['/rider']);

const lastCall = (fn: string) => [...supabaseDouble.rpcCalls].reverse().find((entry) => entry.fn === fn);

describe('RiderDashboardPage', () => {
  it('shows the parcels this rider was assigned, with the address on the row', async () => {
    seedDrop();

    render();

    await waitFor(() => expect(screen.getAllByTestId('drop-card')).toHaveLength(1));
    const card = screen.getAllByTestId('drop-card')[0];
    expect(within(card).getByText('Nova Tech')).toBeInTheDocument();
    expect(within(card).getByText('18 Harbour Road')).toBeInTheDocument();
    expect(within(card).getByText('Leave with the concierge.')).toBeInTheDocument();
    expect(within(card).getByText('$34.00')).toBeInTheDocument();
  });

  it('quotes the board counts as parcels, and shows no invented pay or rating', async () => {
    seedDrop();

    render();
    await waitFor(() => expect(screen.getByTestId('rider-count-assigned')).toHaveTextContent('1'));

    expect(screen.getByTestId('rider-count-in-flight')).toHaveTextContent('0');
    expect(screen.getByTestId('rider-active-deliveries')).toHaveTextContent('1');
    // The mock screen printed a $64.00 shift wage, an on-time rate and a rider tier - nothing
    // in the schema records pay, ratings or distances, so none of it may reappear.
    expect(screen.queryByText('$64.00')).not.toBeInTheDocument();
    expect(screen.queryByText(/98\.5%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/top tier/i)).not.toBeInTheDocument();
  });

  it('refuses an account with no rider profile instead of showing an empty route', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'shopper', email: 's@demo.test' } };
    supabaseDouble.seedProfile(profileRow({ id: 'shopper', roles: ['customer'] }));

    render();

    await waitFor(() => expect(screen.getByTestId('board-error')).toBeInTheDocument());
    expect(screen.getByText(/not a rider/i)).toBeInTheDocument();
    expect(screen.queryAllByTestId('drop-card')).toHaveLength(0);
  });

  it('renders the empty board as empty, not as a demo parcel', async () => {
    supabaseDouble.seedOrder(orderRow({ id: 'order-1', customer_email: 'alex@demo.test' }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: PACKAGE, order_group_id: 'order-1', seller_id: 'store-1' }));
    supabaseDouble.seedDelivery(deliveryRow({ id: DROP, sub_order_id: PACKAGE, rider_id: 'other-rider' }));

    render();

    await waitFor(() => expect(screen.getByTestId('board-empty')).toBeInTheDocument());
    expect(screen.queryAllByTestId('drop-card')).toHaveLength(0);
  });

  it('collects a parcel through the state machine, not through local state', async () => {
    seedDrop();

    render();
    await waitFor(() => expect(screen.getAllByTestId('drop-card')).toHaveLength(1));

    fireEvent.click(screen.getByTestId('btn-collect'));

    await waitFor(() => expect(lastCall('advance_sub_order_status')?.args).toMatchObject({
      p_sub_order_id: PACKAGE,
      p_next: 'shipped',
    }));
  });

  it('puts a collected parcel on the route', async () => {
    seedDrop({ status: 'shipped' });
    supabaseDouble.seedDelivery(deliveryRow({
      id: DROP, sub_order_id: PACKAGE, rider_id: PROFILE, status: 'picked_up', handover_code_hash: CODE,
      picked_up_at: '2026-10-12T09:00:00.000Z',
    }));

    render();
    await waitFor(() => expect(screen.getByTestId('btn-on-the-way')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-on-the-way'));

    await waitFor(() => expect(lastCall('advance_sub_order_status')?.args.p_next).toBe('out_for_delivery'));
  });

  it('reports an issue as a delivery failure carrying the rider’s own words', async () => {
    seedDrop();

    render();
    await waitFor(() => expect(screen.getByTestId('btn-report-issue')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-report-issue'));
    fireEvent.click(screen.getByRole('radio', { name: /customer unavailable/i }));
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Waited twenty minutes at the gate.' } });
    fireEvent.click(screen.getByRole('button', { name: /submit issue/i }));

    await waitFor(() => expect(lastCall('advance_sub_order_status')?.args).toMatchObject({
      p_next: 'delivery_failed',
    }));
    const note = String(lastCall('advance_sub_order_status')?.args.p_note ?? '');
    expect(note).toMatch(/Customer Unavailable/);
    expect(note).toMatch(/Waited twenty minutes at the gate\./);
  });

  it('never shows the handover code it is checking against', async () => {
    seedAtTheDoor();

    render();
    await waitFor(() => expect(screen.getByTestId('btn-deliver')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-deliver'));
    const dialog = await screen.findByRole('dialog');

    // The code is a sha256 hash in Postgres: a browser that knew it would print it.
    expect(dialog).not.toHaveTextContent(CODE);
    expect(screen.queryByTestId('demo-pin-hint')).not.toBeInTheDocument();
  });

  it('closes the parcel only when the buyer’s code matches in Postgres', async () => {
    seedAtTheDoor();

    render();
    await waitFor(() => expect(screen.getByTestId('btn-deliver')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('btn-deliver'));
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByTestId('pin-digit-0'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('pin-digit-1'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('pin-digit-2'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('pin-digit-3'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm handover/i }));

    await waitFor(() => expect(screen.getByTestId('verification-error')).toHaveTextContent(/invalid handover code/i));
    expect(supabaseDouble.tables.deliveries[0].status).toBe('out_for_delivery');

    fireEvent.change(screen.getByTestId('pin-digit-0'), { target: { value: '4' } });
    fireEvent.change(screen.getByTestId('pin-digit-1'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('pin-digit-2'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('pin-digit-3'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm handover/i }));

    await waitFor(() => expect(lastCall('verify_delivery')?.args).toMatchObject({
      p_delivery_id: DROP, p_code: CODE,
    }));
    await waitFor(() => expect(screen.getByTestId('rider-count-delivered-today')).toHaveTextContent('1'));
    expect(supabaseDouble.tables.deliveries[0].status).toBe('delivered');
    expect(supabaseDouble.tables.sub_orders[0].status).toBe('delivered');
  });

  it('sets the rider’s own availability on their profile row', async () => {
    seedDrop();

    render();
    await waitFor(() => expect(screen.getByTestId('rider-header')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('rider-status-busy'));

    await waitFor(() => expect(supabaseDouble.tables.rider_profiles[0].status).toBe('busy'));
  });

  it('shows the database’s refusal when a move is not allowed', async () => {
    seedDrop();

    render();
    await waitFor(() => expect(screen.getByTestId('btn-collect')).toBeInTheDocument());

    supabaseDouble.failRpc('Role rider is not authorized for transition shipped -> out_for_delivery');
    fireEvent.click(screen.getByTestId('btn-collect'));

    await waitFor(() => expect(screen.getByTestId('move-error')).toHaveTextContent(/not authorized/i));
  });
});
