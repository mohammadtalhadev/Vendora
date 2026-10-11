import { describe, it, expect, beforeEach, vi } from 'vitest';

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
import { VendorOrderDetailPage } from './VendorOrderDetailPage';
import { VendorInventoryPage } from './VendorInventoryPage';
import { renderWorkspace, signInVendor } from '../test/vendor-render';
import {
  categoryRow,
  orderRow,
  productRow,
  subOrderRow,
  supabaseDouble,
} from '../test/supabase-double';

function renderOrderDetail(id: string) {
  return renderWorkspace(
    <Routes>
      <Route path="/vendor/orders/:id" element={<VendorOrderDetailPage />} />
    </Routes>,
    [`/vendor/orders/${id}`],
  );
}

const physicalPackage = (overrides: Record<string, unknown> = {}) =>
  subOrderRow({
    id: 'sub-a',
    order_group_id: 'order-1',
    seller_id: 'store-1',
    type: 'physical',
    status: 'placed',
    ...overrides,
  });

beforeEach(() => {
  supabaseDouble.reset();
  signInVendor();
  supabaseDouble.seedCategory(categoryRow({ id: 'cat-audio', name: 'Audio' }));
  supabaseDouble.seedOrder(orderRow({ id: 'order-1', customer_email: 'buyer@demo.test' }));
});

describe('VendorOrderDetailPage', () => {
  it('shows the package the route names, with the money and buyer the order recorded', async () => {
    supabaseDouble.seedSubOrder(physicalPackage());
    renderOrderDetail('sub-a');

    await waitFor(() => expect(screen.getByText(/Sub-Order #sub-a/)).toBeInTheDocument());
    expect(screen.getByText(/Master Group: #order-1/)).toBeInTheDocument();
    expect(screen.getByText('Package Line Items (1)')).toBeInTheDocument();
    expect(screen.getByText('Reference Headphones')).toBeInTheDocument();
    expect(screen.getByText('Financial Settlement Breakdown')).toBeInTheDocument();
    expect(screen.getAllByText(/\$199\.99/).length).toBeGreaterThan(0);
    expect(screen.getByText('Customer Destination & Notes')).toBeInTheDocument();
    expect(screen.getByText('Alex Buyer')).toBeInTheDocument();
  });

  it('refuses to open another store’s package, and says where it went', async () => {
    supabaseDouble.seedSubOrder(physicalPackage({ id: 'sub-b', seller_id: 'store-2' }));
    renderOrderDetail('sub-b');

    await waitFor(() =>
      expect(
        screen.getByText(/This package could not be loaded: Package not found\. It may belong to another store\./),
      ).toBeInTheDocument(),
    );
  });

  it('walks confirm -> pack -> release, then stops because the rider records the handover', async () => {
    supabaseDouble.seedSubOrder(physicalPackage());
    renderOrderDetail('sub-a');

    await waitFor(() => expect(screen.getByRole('button', { name: /Confirm Order/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Confirm Order/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Mark Packed/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Mark Packed/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Ready for Rider Pickup/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Ready for Rider Pickup/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/Waiting for the courier to scan this package in/),
      ).toBeInTheDocument(),
    );

    const row = supabaseDouble.tables.sub_orders.find((r) => r.id === 'sub-a');
    expect(row?.status).toBe('ready_for_pickup');
    expect(row?.history).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /Mark Shipped|Mark Delivered/i })).not.toBeInTheDocument();
  });

  it('records the carrier and tracking number through the RPC, the only write a store has here', async () => {
    supabaseDouble.seedSubOrder(physicalPackage({ status: 'ready_for_pickup' }));
    renderOrderDetail('sub-a');

    await waitFor(() => expect(screen.getByText('Shipping & Carrier Details')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Courier you are handing this package to'), {
      target: { value: 'DHL' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. TRACK-883921/i), {
      target: { value: 'DHL-445566' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Tracking/i }));

    await waitFor(() => expect(screen.getByText('Tracking Saved!')).toBeInTheDocument());
    const row = supabaseDouble.tables.sub_orders.find((r) => r.id === 'sub-a');
    expect(row).toMatchObject({ carrier_name: 'DHL', tracking_number: 'DHL-445566' });
  });

  it('will not send a blank tracking number, so nothing is written', async () => {
    supabaseDouble.seedSubOrder(physicalPackage({ status: 'ready_for_pickup' }));
    renderOrderDetail('sub-a');

    await waitFor(() => expect(screen.getByRole('button', { name: /Save Tracking/i })).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Courier you are handing this package to'), {
      target: { value: 'DHL' },
    });
    const tracking = screen.getByPlaceholderText(/e\.g\. TRACK-883921/i) as HTMLInputElement;
    expect(tracking).toBeRequired();

    fireEvent.click(screen.getByRole('button', { name: /Save Tracking/i }));

    // The form stops it before the RPC, and the RPC would too: either way the row is untouched.
    expect(
      supabaseDouble.rpcCalls.filter((call) => call.fn === 'update_sub_order_tracking'),
    ).toHaveLength(0);
    expect(supabaseDouble.tables.sub_orders.find((r) => r.id === 'sub-a')?.tracking_number).toBeNull();
  });

  it('gives a digital package no shipping form and no packed step', async () => {
    supabaseDouble.seedSubOrder(physicalPackage({ type: 'digital', license_key: null, items: [] }));
    renderOrderDetail('sub-a');

    await waitFor(() => expect(screen.getByText('Digital Delivery')).toBeInTheDocument());
    expect(
      screen.getByText(/Nothing to pack or ship - this is a digital package, and the platform issues the key\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm Order|Mark Packed/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/e\.g\. TRACK-883921/i)).not.toBeInTheDocument();
  });

  it('prints a packing slip from the recorded data, and admits when no origin is on file', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    supabaseDouble.seedSubOrder(physicalPackage({ carrier_name: 'DHL', tracking_number: 'DHL-445566' }));
    renderOrderDetail('sub-a');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Print Packing Slip & Label/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Print Packing Slip & Label/i }));

    const slip = await screen.findByText('Official Packing Slip & Shipping Label');
    expect(slip).toBeInTheDocument();
    expect(screen.getByText(/DHL • standard manifest/)).toBeInTheDocument();
    expect(screen.getByText(/No pickup address on file - add one under Shipping & Logistics/)).toBeInTheDocument();
    expect(screen.getAllByText('DHL-445566').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Print Document/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('cancels through the state machine, with the reason kept in the history the database holds', async () => {
    supabaseDouble.seedSubOrder(physicalPackage());
    renderOrderDetail('sub-a');

    await waitFor(() => expect(screen.getByRole('button', { name: /^Cancel Order/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^Cancel Order/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Cancel Sub-Order #sub-a/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'Pricing error' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirm Cancellation/i }));

    await waitFor(() => expect(screen.getByText('Order Cancelled')).toBeInTheDocument());
    const row = supabaseDouble.tables.sub_orders.find((r) => r.id === 'sub-a');
    expect(row?.status).toBe('cancelled');
    expect(JSON.stringify(row?.history)).toContain('Merchant cancelled: Pricing error');
  });

  it('will not open a conversation the buyer never started', async () => {
    supabaseDouble.seedSubOrder(physicalPackage());
    renderOrderDetail('sub-a');

    await waitFor(() => expect(screen.getByRole('button', { name: /Message Customer/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Message Customer/i }));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/This buyer has not opened a conversation about the order/),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Send Message to Customer/i })).toBeDisabled();
  });
});

describe('VendorInventoryPage', () => {
  beforeEach(() => {
    supabaseDouble.seedProduct(
      productRow({ id: 'p-1', seller_id: 'store-1', title: 'Reference Headphones', category_id: 'cat-audio', stock: 3 }),
    );
    supabaseDouble.seedProduct(
      productRow({ id: 'p-2', seller_id: 'store-1', title: 'Apex Keyboard', category_id: 'cat-audio', stock: 0 }),
    );
    supabaseDouble.seedProduct(productRow({ id: 'p-3', seller_id: 'store-2', title: 'Another Store Item', stock: 40 }));
  });

  it('counts only this store’s listings, and flags the rows the threshold covers', async () => {
    renderWorkspace(<VendorInventoryPage />);

    await waitFor(() => expect(screen.getByText('Reference Headphones')).toBeInTheDocument());
    expect(screen.queryByText('Another Store Item')).not.toBeInTheDocument();
    expect(screen.getByText('Sold Out')).toBeInTheDocument();
    expect(screen.getByText(/Low-Stock Alerts/)).toBeInTheDocument();
    expect(
      screen.getByText(/listings are at 5 units or fewer, including sold-out ones/),
    ).toBeInTheDocument();
  });

  it('writes one row’s stock back to the catalog when the seller saves it', async () => {
    renderWorkspace(<VendorInventoryPage />);

    await waitFor(() => expect(screen.getAllByTitle('Increment stock').length).toBe(2));
    fireEvent.click(screen.getAllByTitle('Increment stock')[0]);

    const update = screen.getAllByRole('button', { name: /^Update$/ });
    expect(update[0]).toBeEnabled();
    fireEvent.click(update[0]);

    await waitFor(() => expect(supabaseDouble.tables.products.find((r) => r.id === 'p-1')?.stock).toBe(4));
    expect(screen.getByText(/units\.$/)).toBeInTheDocument();
  });

  it('saves every edited row in one pass, and keeps failures visible', async () => {
    renderWorkspace(<VendorInventoryPage />);

    await waitFor(() => expect(screen.getAllByTitle('Increment stock').length).toBe(2));
    fireEvent.click(screen.getAllByTitle('Increment stock')[0]);
    fireEvent.click(screen.getAllByTitle('Increment stock')[1]);
    expect(screen.getAllByText(/unsaved/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Save All Changes/i }));

    await waitFor(() => expect(screen.getByText(/stock levels to your catalog\./)).toBeInTheDocument());
    expect(supabaseDouble.tables.products.find((r) => r.id === 'p-1')?.stock).toBe(4);
    expect(supabaseDouble.tables.products.find((r) => r.id === 'p-2')?.stock).toBe(1);
  });

  it('shows the database’s refusal instead of a saved stock level', async () => {
    renderWorkspace(<VendorInventoryPage />);

    await waitFor(() => expect(screen.getAllByTitle('Increment stock').length).toBe(2));
    fireEvent.click(screen.getAllByTitle('Increment stock')[0]);

    // The read already happened; from here the write is the thing that fails.
    supabaseDouble.failures.products = 'row-level security';
    fireEvent.click(screen.getAllByRole('button', { name: /^Update$/ })[0]);

    await waitFor(() => expect(screen.getByText('The database refused these writes:')).toBeInTheDocument());
    expect(supabaseDouble.tables.products.find((r) => r.id === 'p-1')?.stock).toBe(3);
  });

  it('lists the keys the platform already issued, and says there is no vault to deposit into', async () => {
    supabaseDouble.seedSubOrder(
      physicalPackage({ id: 'sub-digital', type: 'digital', status: 'delivered', license_key: 'VEN-LIC-77' }),
    );
    renderWorkspace(<VendorInventoryPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Digital Licenses \(1 issued\)/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Digital Licenses \(1 issued\)/i }));

    expect(screen.getByText('VEN-LIC-77')).toBeInTheDocument();
    expect(screen.getAllByTitle('Copy key')).toHaveLength(1);
    expect(screen.getByText(/There is no seller-side key vault to deposit into/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upload License Keys/i })).not.toBeInTheDocument();
  });
});
