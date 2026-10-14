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
vi.mock('../lib/export-csv', () => ({ exportToCsv: vi.fn() }));

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AdminOrdersPage } from './AdminOrdersPage';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import { formatPrice } from '../store/currency-store';
import {
  adminLogisticsJson,
  orderRow,
  riderRow,
  storeRow,
  subOrderRow,
  supabaseDouble,
} from '../test/supabase-double';

// Radix Select reaches for layout APIs when its listbox opens that jsdom does not
// implement; stub them here so the dialog selects can be driven like a user's clicks.
Element.prototype.scrollIntoView =
  Element.prototype.scrollIntoView ?? (() => undefined);
HTMLElement.prototype.hasPointerCapture =
  HTMLElement.prototype.hasPointerCapture ?? (() => false);
HTMLElement.prototype.setPointerCapture =
  HTMLElement.prototype.setPointerCapture ?? (() => undefined);
HTMLElement.prototype.releasePointerCapture =
  HTMLElement.prototype.releasePointerCapture ?? (() => undefined);

const GROUP = '11111111-1111-4111-8111-111111111111';
const PKG_PLACED = '22222222-2222-4222-8222-222222222222';
const PKG_REFUNDED = '33333333-3333-4333-8333-333333333333';
const RIDER = '44444444-4444-4444-8444-444444444444';
const STORE = 'store-1';

beforeEach(() => {
  vi.clearAllMocks();
  supabaseDouble.reset();
  const admin = supabaseDouble.seedAdmin();
  useAuthStore.getState().setUser(
    { ...DEMO_ACCOUNTS.admin, id: admin.id, email: admin.email, name: admin.name },
    'test-token',
  );
  supabaseDouble.seedVendorProfile(storeRow({ id: STORE, store_name: 'Nova Tech', slug: 'nova-tech' }));
  supabaseDouble.seedOrder(orderRow({ id: GROUP }));
  supabaseDouble.seedSubOrder(
    subOrderRow({
      id: PKG_PLACED,
      order_group_id: GROUP,
      seller_id: STORE,
      status: 'placed',
      subtotal: 100,
      shipping_fee: 10,
    }),
  );
  supabaseDouble.seedSubOrder(
    subOrderRow({
      id: PKG_REFUNDED,
      order_group_id: GROUP,
      seller_id: STORE,
      status: 'refunded',
      subtotal: 50,
      shipping_fee: 5,
    }),
  );
  supabaseDouble.setAdminOrders({
    [GROUP]: { gross: 165, commission: 16.5, paidToSellers: 55, leadStatus: 'placed' },
  });
  supabaseDouble.setAdminQueue('admin_order_queue', { booked: 165, total: 1 });
});

const render = () => renderWorkspace(<AdminOrdersPage />, ['/admin/orders']);

const openMenu = async () => {
  const trigger = await screen.findByRole('button', { name: /actions for order/i });
  fireEvent.click(trigger);
  return screen.findByRole('menu');
};

const rpcCallsFor = (fn: string) => supabaseDouble.rpcCalls.filter((entry) => entry.fn === fn);

describe('AdminOrdersPage row actions', () => {
  it('opens a menu with view, refund, advance and rider actions for the row', async () => {
    render();
    const menu = await openMenu();

    const view = within(menu).getByRole('menuitem', { name: 'View details' });
    expect(view).toHaveAttribute('href', `/admin/orders/${GROUP}`);
    expect(within(menu).getByRole('menuitem', { name: 'Refund packages' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Advance status' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Assign rider' })).toBeInTheDocument();
  });

  it('refunds a package in full through the shared refund call, and leaves a refunded package alone', async () => {
    render();
    const menu = await openMenu();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Refund packages' }));

    const dialog = await screen.findByRole('dialog');
    // The already-refunded package is listed but offers no second refund.
    expect(within(dialog).getByText('Already refunded.')).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: `Refund ${formatPrice(55)}` }),
    ).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: `Refund ${formatPrice(110)}` }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm refund' }));

    await waitFor(() => {
      expect(rpcCallsFor('admin_refund_sub_order')).toHaveLength(1);
    });
    expect(rpcCallsFor('admin_refund_sub_order')[0]?.args).toMatchObject({
      p_sub_order_id: PKG_PLACED,
      p_amount: 110,
      p_reason: 'Platform administrative refund',
    });
    expect(await within(dialog).findByText(/refunded —/i)).toBeInTheDocument();
  });

  it('advances a package along the state machine and offers no move for a refunded one', async () => {
    render();
    const menu = await openMenu();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Advance status' }));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('No further transitions from this status.'),
    ).toBeInTheDocument();

    const select = within(dialog).getByLabelText(/next status for package/i);
    fireEvent.click(select);
    fireEvent.click(await screen.findByRole('option', { name: 'Confirmed' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(rpcCallsFor('advance_sub_order_status')).toHaveLength(1);
    });
    expect(rpcCallsFor('advance_sub_order_status')[0]?.args).toMatchObject({
      p_sub_order_id: PKG_PLACED,
      p_next: 'confirmed',
    });
  });

  it('assigns a rider from the fleet to a package waiting for pickup', async () => {
    // The board's fleet is a fixture, but `assign_rider` validates against the
    // rider_profiles table — both halves of the double need the rider.
    supabaseDouble.seedRider(riderRow({ id: RIDER, full_name: 'Ravi Rider' }));
    supabaseDouble.setAdminLogistics(
      adminLogisticsJson({
        fleet: [
          {
            id: RIDER,
            name: 'Ravi Rider',
            phone: '0300-555-0100',
            vehicle: 'Motorbike',
            status: 'active',
            active: 0,
            completed: 3,
          },
        ],
      }),
    );
    render();
    const menu = await openMenu();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Assign rider' }));

    const dialog = await screen.findByRole('dialog');
    // The refunded package is closed to assignment.
    expect(await within(dialog).findByText('This package is closed.')).toBeInTheDocument();

    const select = within(dialog).getByLabelText(/rider for package/i);
    fireEvent.click(select);
    fireEvent.click(await screen.findByRole('option', { name: /Ravi Rider/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Assign' }));

    await waitFor(() => {
      expect(rpcCallsFor('assign_rider')).toHaveLength(1);
    });
    expect(rpcCallsFor('assign_rider')[0]?.args).toMatchObject({
      p_sub_order_id: PKG_PLACED,
      p_rider_id: RIDER,
    });
    // Anchored: the dialog's success notice also names the rider mid-sentence.
    expect(await within(dialog).findByText(/^Assigned to Ravi Rider\.$/)).toBeInTheDocument();
  });
});
