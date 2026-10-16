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
import { Route, Routes } from 'react-router-dom';
import { AdminOrderDetailPage } from './AdminOrderDetailPage';
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
// implement; stub them here so the selects can be driven like a user's clicks.
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
const PLACED_SHORT = PKG_PLACED.slice(0, 8);

beforeEach(() => {
  vi.clearAllMocks();
  supabaseDouble.reset();
  const admin = supabaseDouble.seedAdmin();
  useAuthStore.getState().setUser(
    { ...DEMO_ACCOUNTS.admin, id: admin.id, email: admin.email, name: admin.name },
    'test-token',
  );
  supabaseDouble.seedVendorProfile(storeRow({ id: STORE, store_name: 'Nova Tech', slug: 'nova-tech' }));
  // A COD order still reading `pending`: the state the payment correction exists for.
  supabaseDouble.seedOrder(
    orderRow({ id: GROUP, payment_method: 'cod', payment_details: { method: 'cod' }, payment_status: 'pending' }),
  );
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
});

const renderPage = () =>
  renderWorkspace(
    <Routes>
      <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
    </Routes>,
    [`/admin/orders/${GROUP}`],
  );

const rpcCallsFor = (fn: string) => supabaseDouble.rpcCalls.filter((entry) => entry.fn === fn);

const loadPage = async () => {
  renderPage();
  await screen.findByText(`Master Order #${GROUP}`);
};

describe('AdminOrderDetailPage package actions', () => {
  it('advances a package through the shared advance wrapper', async () => {
    await loadPage();

    const select = await screen.findByLabelText(`Next status for package ${PLACED_SHORT}`);
    fireEvent.click(select);
    fireEvent.click(await screen.findByRole('option', { name: 'Confirmed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(rpcCallsFor('advance_sub_order_status')).toHaveLength(1);
    });
    expect(rpcCallsFor('advance_sub_order_status')[0]?.args).toMatchObject({
      p_sub_order_id: PKG_PLACED,
      p_next: 'confirmed',
    });

    // The refunded package sits at a terminal status: no move is offered for it.
    expect(screen.getByText('No further transitions from this status.')).toBeInTheDocument();
  });

  it('assigns a rider from the fleet, and keeps a closed package closed', async () => {
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
    await loadPage();

    expect(await screen.findByText('This package is closed.')).toBeInTheDocument();

    const select = screen.getByLabelText(`Rider for package ${PLACED_SHORT}`);
    fireEvent.click(select);
    fireEvent.click(await screen.findByRole('option', { name: /Ravi Rider/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));

    await waitFor(() => {
      expect(rpcCallsFor('assign_rider')).toHaveLength(1);
    });
    expect(rpcCallsFor('assign_rider')[0]?.args).toMatchObject({
      p_sub_order_id: PKG_PLACED,
      p_rider_id: RIDER,
    });
    expect(await screen.findByText(/^Assigned to Ravi Rider\.$/)).toBeInTheDocument();
  });

  it('saves carrier and tracking through the tracking RPC', async () => {
    await loadPage();

    const form = screen
      .getByLabelText(`Tracking number for package ${PLACED_SHORT}`)
      .closest('form') as HTMLElement;
    fireEvent.change(screen.getByLabelText(`Carrier for package ${PLACED_SHORT}`), {
      target: { value: 'TCS' },
    });
    fireEvent.change(within(form).getByLabelText(`Tracking number for package ${PLACED_SHORT}`), {
      target: { value: 'TCS-9911' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Save tracking' }));

    await waitFor(() => {
      expect(rpcCallsFor('update_sub_order_tracking')).toHaveLength(1);
    });
    expect(rpcCallsFor('update_sub_order_tracking')[0]?.args).toMatchObject({
      p_sub_order_id: PKG_PLACED,
      p_carrier_name: 'TCS',
      p_tracking_number: 'TCS-9911',
    });
    const row = supabaseDouble.tables.sub_orders.find((entry) => entry.id === PKG_PLACED);
    expect(row).toMatchObject({ carrier_name: 'TCS', tracking_number: 'TCS-9911' });
  });

  it('renders the package history the dossier already carried', async () => {
    await loadPage();

    expect((await screen.findAllByText('Package history')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Order placed via checkout/).length).toBeGreaterThan(0);
  });

  it('renders items and prices as read-only record, with no edit affordances', async () => {
    await loadPage();

    expect(screen.getAllByText('Reference Headphones').length).toBeGreaterThan(0);
    const unitPrice = formatPrice(199.99).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(screen.getAllByText(new RegExp(`× ${unitPrice} each`)).length).toBeGreaterThan(0);
    // The figures are text, never form values, and nothing offers to edit them.
    expect(screen.queryByDisplayValue('Reference Headphones')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /edit (item|price|quantity)/i }),
    ).not.toBeInTheDocument();
    // The header's whole-order actions are still there (regression).
    expect(screen.getByRole('button', { name: /Force Full Refund/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Administrative Cancel/i })).toBeInTheDocument();
  });
});

describe('AdminOrderDetailPage order corrections', () => {
  it('edits the delivery address through the audited RPC, behind a confirm step', async () => {
    await loadPage();

    fireEvent.click(screen.getByRole('button', { name: /Edit address/i }));
    // The form opens pre-filled from the order's snapshot.
    expect(screen.getByLabelText('Street')).toHaveValue('1 Elm Street');
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Lahore' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '0300-1112233' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

    // Nothing is written until the confirm step is taken.
    expect(rpcCallsFor('admin_update_order_address')).toHaveLength(0);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm save' }));

    await waitFor(() => {
      expect(rpcCallsFor('admin_update_order_address')).toHaveLength(1);
    });
    expect(rpcCallsFor('admin_update_order_address')[0]?.args).toMatchObject({
      p_order_group_id: GROUP,
      p_address: { street: '1 Elm Street', city: 'Lahore', phone: '0300-1112233' },
    });
    const order = supabaseDouble.tables.orders.find((entry) => entry.id === GROUP);
    expect((order?.shipping_address as { city?: string } | undefined)?.city).toBe('Lahore');
    expect(await screen.findByText(/Delivery address updated/)).toBeInTheDocument();
  });

  it('refuses a blank street in the address form before any RPC is called', async () => {
    await loadPage();

    fireEvent.click(screen.getByRole('button', { name: /Edit address/i }));
    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

    expect(
      await screen.findByText('A delivery address needs a street, a city and a phone number.'),
    ).toBeInTheDocument();
    expect(rpcCallsFor('admin_update_order_address')).toHaveLength(0);
  });

  it('marks a pending COD payment as received — and never offers refunded', async () => {
    await loadPage();

    const select = screen.getByLabelText('Corrected payment status');
    fireEvent.click(select);
    expect(await screen.findByRole('option', { name: 'Paid — money received' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /refunded/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Paid — money received' }));

    fireEvent.change(screen.getByLabelText('Reason for the payment status correction'), {
      target: { value: 'Cash received at the desk' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply correction' }));

    // Behind the confirm step, like the address save.
    expect(rpcCallsFor('admin_set_payment_status')).toHaveLength(0);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm correction' }));

    await waitFor(() => {
      expect(rpcCallsFor('admin_set_payment_status')).toHaveLength(1);
    });
    expect(rpcCallsFor('admin_set_payment_status')[0]?.args).toMatchObject({
      p_order_group_id: GROUP,
      p_status: 'succeeded',
      p_reason: 'Cash received at the desk',
    });
    const order = supabaseDouble.tables.orders.find((entry) => entry.id === GROUP);
    expect(order?.payment_status).toBe('succeeded');
    expect(await screen.findByText(/Payment marked as received/)).toBeInTheDocument();
  });
});
