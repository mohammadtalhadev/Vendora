import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { TrackOrderPage } from './TrackOrderPage';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { orderRow, storeRow, subOrderRow, supabaseDouble } from '../test/supabase-double';

/**
 * tracking is the customer's real orders or an honest state —
 * the hard-coded preset parcels, invented rider and synthesised OTP of the
 * old page must never come back.
 */
const USER = 'user-1';
const ORDER = '00000000-0000-4000-8000-000000000401';
const SUB = '00000000-0000-4000-8000-000000000501';

function signIn() {
  supabaseDouble.authState.session = {
    access_token: 'test-token',
    user: { id: USER, email: 'buyer@demo.test' },
  };
  useAuthStore.getState().setUser(
    { id: USER, email: 'buyer@demo.test', name: 'Alex Buyer', roles: ['customer'], vendorStatus: 'none' },
    'test-token',
  );
}

function seedShippedOrder() {
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech', seller_type: 'vendor' }));
  supabaseDouble.seedOrder(orderRow({ id: ORDER, customer_id: USER }));
  supabaseDouble.seedSubOrder(
    subOrderRow({
      id: SUB,
      order_group_id: ORDER,
      status: 'shipped',
      carrier_name: 'TCS',
      tracking_number: 'TCS-771203',
      rider_id: 'rider-9',
      history: [
        { status: 'placed', timestamp: '2026-10-06T14:30:00.000Z', actor: 'Customer', note: 'Order placed via checkout' },
        { status: 'shipped', timestamp: '2026-10-07T09:00:00.000Z', actor: 'Vendor', note: 'Handed to TCS' },
      ],
    }),
  );
}

beforeEach(() => {
  supabaseDouble.reset();
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
});

describe('TrackOrderPage', () => {
  it('asks a guest to sign in instead of inventing a parcel', () => {
    renderWorkspace(<TrackOrderPage />, ['/track-order']);
    expect(screen.getByTestId('track-guest')).toBeInTheDocument();
    expect(screen.getByText(/Sign in to track your order/i)).toBeInTheDocument();
    expect(screen.queryByText(/Arslan/i)).not.toBeInTheDocument();
  });

  it('finds the signed-in customer’s real order by ID and shows its recorded status', async () => {
    signIn();
    seedShippedOrder();
    renderWorkspace(<TrackOrderPage />, ['/track-order']);

    const input = await screen.findByLabelText(/Order ID or tracking number/i);
    fireEvent.change(input, { target: { value: ORDER } });
    fireEvent.click(screen.getByRole('button', { name: /Track package/i }));

    expect(await screen.findByTestId('tracked-package')).toBeInTheDocument();
    expect(screen.getByText(/Package from Nova Tech/i)).toBeInTheDocument();
    expect(screen.getByText('TCS-771203')).toBeInTheDocument();
    expect(screen.getByText(/Handed to TCS/i)).toBeInTheDocument();
    expect(screen.getByText(/A courier has been assigned/i)).toBeInTheDocument();
    // Nothing from the fabricated version survives.
    expect(screen.queryByText(/Arslan Khan/i)).not.toBeInTheDocument();
    expect(screen.queryByText('4721')).not.toBeInTheDocument();
    expect(screen.queryByText(/telemetry/i)).not.toBeInTheDocument();
  });

  it('also finds the package by the seller-recorded tracking number', async () => {
    signIn();
    seedShippedOrder();
    renderWorkspace(<TrackOrderPage />, ['/track-order']);

    const input = await screen.findByLabelText(/Order ID or tracking number/i);
    fireEvent.change(input, { target: { value: 'TCS-771203' } });
    fireEvent.click(screen.getByRole('button', { name: /Track package/i }));

    expect(await screen.findByTestId('tracked-package')).toBeInTheDocument();
  });

  it('shows a designed not-found state for an unknown ID — never a synthesised parcel', async () => {
    signIn();
    seedShippedOrder();
    renderWorkspace(<TrackOrderPage />, ['/track-order']);

    const input = await screen.findByLabelText(/Order ID or tracking number/i);
    fireEvent.change(input, { target: { value: 'VEN-999999' } });
    fireEvent.click(screen.getByRole('button', { name: /Track package/i }));

    expect(await screen.findByTestId('track-not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('tracked-package')).not.toBeInTheDocument();
  });

  it('does not show another customer’s order', async () => {
    signIn();
    supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech' }));
    supabaseDouble.seedOrder(orderRow({ id: ORDER, customer_id: 'someone-else' }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: SUB, order_group_id: ORDER, status: 'shipped' }));
    renderWorkspace(<TrackOrderPage />, ['/track-order']);

    const input = await screen.findByLabelText(/Order ID or tracking number/i);
    fireEvent.change(input, { target: { value: ORDER } });
    fireEvent.click(screen.getByRole('button', { name: /Track package/i }));

    await waitFor(() => expect(screen.getByTestId('track-not-found')).toBeInTheDocument());
    expect(screen.queryByTestId('tracked-package')).not.toBeInTheDocument();
  });
});
