import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/auth-context', async () => {
  const { useAuthStub } = await import('../../../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { screen, waitFor } from '@testing-library/react';
import { RiderNav } from './RiderNav';
import { renderWorkspace } from '../../../test/vendor-render';
import { useAuthStore } from '../../../store/auth-store';
import { DEMO_ACCOUNTS } from '../../../lib/demo-accounts';
import {
  deliveryRow,
  profileRow,
  riderRow,
  storeRow,
  subOrderRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const RIDER = DEMO_ACCOUNTS.rider;
const PROFILE = '00000000-0000-4000-8000-000000001601';
const PACKAGE = '00000000-0000-4000-8000-000000000501';
const DROP = '00000000-0000-4000-8000-000000001701';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedProfile(profileRow({ id: RIDER.id, email: RIDER.email, roles: ['rider'] }));
  supabaseDouble.authState.session = { access_token: 't', user: { id: RIDER.id, email: RIDER.email } };
  useAuthStore.getState().setUser(RIDER, 'test-token');
  supabaseDouble.seedRider(riderRow({ id: PROFILE, user_id: RIDER.id, full_name: 'Nadia Rider', status: 'available' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech' }));
});

describe('RiderNav', () => {
  it('links each rider screen to the route the router actually serves', () => {
    renderWorkspace(<RiderNav />, ['/rider']);

    const routes: [RegExp, string][] = [
      [/dashboard/i, '/rider'],
      [/my deliveries/i, '/rider/deliveries'],
      [/history/i, '/rider/history'],
      [/earnings/i, '/rider/earnings'],
      [/profile/i, '/rider/profile'],
    ];
    for (const [name, href] of routes) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('shows no storefront link to a rider who owns no store', () => {
    renderWorkspace(<RiderNav />, ['/rider']);

    expect(screen.queryByRole('link', { name: /view storefront/i })).toBeNull();
  });

  it('links a rider who also owns a store to that storefront', () => {
    useAuthStore.getState().setUser({ ...RIDER, vendorId: 'store-1' }, 'test-token');
    renderWorkspace(<RiderNav />, ['/rider']);

    expect(screen.getByRole('link', { name: /view storefront/i })).toHaveAttribute('href', '/vendors/store-1');
  });

  it('badges My Deliveries with the open queue the board reports', async () => {
    supabaseDouble.seedSubOrder(subOrderRow({ id: PACKAGE, seller_id: 'store-1' }));
    supabaseDouble.seedDelivery(deliveryRow({ id: DROP, sub_order_id: PACKAGE, rider_id: PROFILE, status: 'assigned' }));

    renderWorkspace(<RiderNav />, ['/rider']);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /my deliveries/i })).toHaveTextContent('1'),
    );
    expect(screen.getByText('Nadia Rider')).toBeInTheDocument();
  });

  it('highlights only the active route', () => {
    renderWorkspace(<RiderNav />, ['/rider/earnings']);

    expect(screen.getByRole('link', { name: /earnings/i }).className).toContain('text-sun-orange-600');
    expect(screen.getByRole('link', { name: /dashboard/i }).className).not.toContain('text-sun-orange-600');
  });
});
