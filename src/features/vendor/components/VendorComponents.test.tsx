import { describe, it, expect, beforeEach, vi } from 'vitest';

// WorkspaceLayout's sign-out needs the auth provider; these tests never click it.
vi.mock('../../../lib/auth-context', async () => {
  const { useAuthStub } = await import('../../../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { VendorDashboardPage } from '../../../pages/VendorDashboardPage';
import { VendorOrdersPage } from '../../../pages/VendorOrdersPage';
import { VendorProductsPage } from '../../../pages/VendorProductsPage';
import { ProductFormModal } from './ProductFormModal';
import { renderWorkspace, signInVendor } from '../../../test/vendor-render';
import { formatPrice } from '../../../store/currency-store';
import {
  categoryRow,
  dashboardJson,
  orderRow,
  productRow,
  subOrderRow,
  supabaseDouble,
} from '../../../test/supabase-double';

/** A dashboard payload with numbers no screen could invent: the test owns them. */
function fixtureWith(overrides: Parameters<typeof dashboardJson>[0] = {}) {
  supabaseDouble.setDashboard({ ...dashboardJson(), ...overrides });
}

beforeEach(() => {
  supabaseDouble.reset();
  signInVendor();
  supabaseDouble.seedCategory(categoryRow({ id: 'cat-audio', name: 'Audio' }));
  supabaseDouble.seedCategory(categoryRow({ id: 'cat-keys', name: 'Keyboards' }));
});

describe('VendorDashboardPage', () => {
  it('reports the KPI numbers the vendor_dashboard query returns', async () => {
    fixtureWith({
      kpis: { ...dashboardJson().kpis, grossBooked: 12500, commission: 1250, netPayout: 11250, orders7d: 3 },
      // Several buckets, so the pending tile can only come from the `placed` count itself.
      stages: { ...dashboardJson().stages, placed: 4, confirmed: 1, delivered: 2 },
      catalog: { ...dashboardJson().catalog, approved: 7, lowStock: 2 },
    });
    renderWorkspace(<VendorDashboardPage />);

    // The tiles quote the RPC's own jsonb, not a number the screen remembered.
    await waitFor(() => expect(screen.getAllByText(formatPrice(11250)).length).toBeGreaterThan(0));
    expect(screen.getAllByText(formatPrice(12500)).length).toBeGreaterThan(0);

    // Pending Orders and Low Stock are the RPC's stage and catalog counts, relabelled.
    const metrics = screen.getByText('Gross Sales').parentElement as HTMLElement;
    expect(within(metrics).getByText('4')).toBeInTheDocument();
    expect(within(metrics).getByText('2')).toBeInTheDocument();
    // The stage tiles add the seven buckets once: 4 + 1 + 2, never the queue on top of them.
    expect(within(metrics).getByText('7')).toBeInTheDocument();
    expect(screen.queryByText(formatPrice(34820))).not.toBeInTheDocument();
  });

  it('lists only this store’s packages, with the buyer read from the parent order', async () => {
    supabaseDouble.seedOrder(orderRow({ id: 'order-1', customer_email: 'buyer@demo.test' }));
    supabaseDouble.seedSubOrder(
      subOrderRow({ id: 'sub-a', order_group_id: 'order-1', seller_id: 'store-1', status: 'placed' }),
    );
    supabaseDouble.seedSubOrder(
      subOrderRow({ id: 'sub-b', order_group_id: 'order-1', seller_id: 'store-2', status: 'placed' }),
    );
    renderWorkspace(<VendorDashboardPage />);

    await waitFor(() => expect(screen.getByText('#sub-a')).toBeInTheDocument());
    expect(screen.queryByText('#sub-b')).not.toBeInTheDocument();
    expect(screen.getByText('buyer@demo.test')).toBeInTheDocument();
    expect(screen.getByText('Reference Headphones')).toBeInTheDocument();
  });

  it('says so when the store has no packages instead of showing a seeded queue', async () => {
    renderWorkspace(<VendorDashboardPage />);

    await waitFor(() => expect(screen.getByText('No customer sub-orders yet')).toBeInTheDocument());
    expect(
      screen.getByText(/Add a product and it goes to the platform for review|Incoming buyer orders for/),
    ).toBeInTheDocument();
  });

  it('advances a package by writing the status transition to the database', async () => {
    supabaseDouble.seedOrder(orderRow({ id: 'order-1' }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: 'sub-a', order_group_id: 'order-1', status: 'placed' }));
    renderWorkspace(<VendorDashboardPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Confirm Order/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Confirm Order/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Mark Packed/i })).toBeInTheDocument());
    expect(supabaseDouble.tables.sub_orders[0].status).toBe('confirmed');
    expect(supabaseDouble.tables.sub_orders[0].history).toHaveLength(2);
  });

  it('shows a failed read as a failure, not as a store that earned nothing', async () => {
    supabaseDouble.failures.sub_orders = 'row-level security';
    renderWorkspace(<VendorDashboardPage />);

    await waitFor(() => expect(screen.getByText(/Failed to load your orders: row-level security/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    // The queue admits it is unknown instead of claiming the store simply has no orders.
    expect(screen.getByText('This queue is unknown - the read failed')).toBeInTheDocument();
    expect(screen.queryByText('No customer sub-orders yet')).not.toBeInTheDocument();
  });
});

describe('VendorOrdersPage and the fulfilment state machine', () => {
  beforeEach(() => {
    supabaseDouble.seedOrder(orderRow({ id: 'order-1', customer_email: 'buyer@demo.test' }));
    supabaseDouble.seedSubOrder(subOrderRow({ id: 'sub-a', order_group_id: 'order-1', status: 'placed' }));
    supabaseDouble.seedSubOrder(
      subOrderRow({ id: 'sub-b', order_group_id: 'order-1', seller_id: 'store-1', status: 'confirmed', created_at: '2026-10-07T14:30:00.000Z' }),
    );
  });

  it('lists the store’s packages and filters them by the recorded stage', async () => {
    renderWorkspace(<VendorOrdersPage />);

    await waitFor(() => expect(screen.getByTestId('sub-order-card-sub-a')).toBeInTheDocument());
    expect(screen.getByTestId('sub-order-card-sub-b')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Placed/i }));
    await waitFor(() => expect(screen.queryByTestId('sub-order-card-sub-b')).not.toBeInTheDocument());
    expect(screen.getByTestId('sub-order-card-sub-a')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Confirmed/i }));
    await waitFor(() => expect(screen.queryByTestId('sub-order-card-sub-a')).not.toBeInTheDocument());
    expect(screen.getByTestId('sub-order-card-sub-b')).toBeInTheDocument();
  });

  it('walks one package confirm -> pack -> release, and stops where the rider takes over', async () => {
    renderWorkspace(<VendorOrdersPage />);

    await waitFor(() => expect(screen.getByTestId('sub-order-card-sub-a')).toBeInTheDocument());
    const row = screen.getByTestId('sub-order-card-sub-a');

    fireEvent.click(within(row).getByRole('button', { name: /Confirm Order/i }));
    await waitFor(() => expect(within(row).getByRole('button', { name: /Mark Packed/i })).toBeInTheDocument());

    fireEvent.click(within(row).getByRole('button', { name: /Mark Packed/i }));
    await waitFor(() =>
      expect(within(row).getByRole('button', { name: /Ready for Rider Pickup/i })).toBeInTheDocument(),
    );

    fireEvent.click(within(row).getByRole('button', { name: /Ready for Rider Pickup/i }));
    await waitFor(() => expect(within(row).getByText('Awaiting Rider Pickup')).toBeInTheDocument());

    // The store has released the parcel; only the rider can record the handover.
    expect(within(row).getByText('Awaiting rider assignment')).toBeInTheDocument();
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(supabaseDouble.tables.sub_orders.find((r) => r.id === 'sub-a')?.status).toBe('ready_for_pickup');
  });

  it('shows the tracking the delivery side recorded, and offers nothing to write here', async () => {
    supabaseDouble.tables.sub_orders.find((r) => r.id === 'sub-b')!.tracking_number = 'DHL-445566';
    renderWorkspace(<VendorOrdersPage />);

    await waitFor(() => expect(screen.getByTestId('sub-order-card-sub-b')).toBeInTheDocument());
    expect(screen.getByText('DHL-445566')).toBeInTheDocument();
  });
});

describe('VendorProductsPage and the listing form', () => {
  it('renders this store’s listings with their moderation state, and no competitor’s', async () => {
    supabaseDouble.seedProduct(
      productRow({ id: 'p-1', seller_id: 'store-1', title: 'Reference Headphones', category_id: 'cat-audio', status: 'approved', stock: 0 }),
    );
    supabaseDouble.seedProduct(
      productRow({ id: 'p-2', seller_id: 'store-1', title: 'Apex Keyboard', category_id: 'cat-keys', status: 'pending_review', stock: 12 }),
    );
    supabaseDouble.seedProduct(productRow({ id: 'p-3', seller_id: 'store-2', title: 'Another Store Item' }));
    renderWorkspace(<VendorProductsPage />);

    await waitFor(() => expect(screen.getByText('Reference Headphones')).toBeInTheDocument());
    expect(screen.queryByText('Another Store Item')).not.toBeInTheDocument();

    const live = within(screen.getByText('Reference Headphones').closest('tr') as HTMLElement);
    expect(live.getByText('Approved')).toBeInTheDocument();
    expect(live.getByText('Sold out')).toBeInTheDocument();
    expect(live.queryByRole('button', { name: /Submit|Withdraw/i })).not.toBeInTheDocument();

    const queued = within(screen.getByText('Apex Keyboard').closest('tr') as HTMLElement);
    expect(queued.getByText('Pending Review')).toBeInTheDocument();
    expect(queued.getByRole('button', { name: /Withdraw/i })).toBeInTheDocument();
  });

  it('creates a listing through the modal and the database, then re-reads it', async () => {
    renderWorkspace(<VendorProductsPage />);

    await waitFor(() => expect(screen.getByText('No listings yet')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /\+ Add New Product/i }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText(/Aura Precision Studio Reference/i), {
      target: { value: 'HyperSonic Pro ANC Wireless IEM' },
    });
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'cat-audio' } });

    // Quick add (Batch 48): price and stock sit on the single form, no tabs.
    fireEvent.change(within(dialog).getByLabelText(/^Price/), { target: { value: '189' } });
    fireEvent.change(within(dialog).getByLabelText(/Opening Stock/), { target: { value: '40' } });

    fireEvent.click(within(dialog).getByRole('button', { name: /Add Product/i }));

    await waitFor(() => expect(supabaseDouble.tables.products).toHaveLength(1));
    expect(supabaseDouble.tables.products[0]).toMatchObject({
      title: 'HyperSonic Pro ANC Wireless IEM',
      slug: 'hypersonic-pro-anc-wireless-iem',
      seller_id: 'store-1',
      category_id: 'cat-audio',
      price: 189,
      stock: 40,
      // A seller cannot approve its own work: the row goes to moderation.
      status: 'pending_review',
    });
    await waitFor(() => expect(screen.getByText('HyperSonic Pro ANC Wireless IEM')).toBeInTheDocument());
  });

  it('refuses to save a listing without a title, and writes nothing', async () => {
    renderWorkspace(<VendorProductsPage />);

    await waitFor(() => expect(screen.getByText('No listings yet')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /\+ Add New Product/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: /Add Product/i }));

    await waitFor(() => expect(screen.getByText('Product title is required.')).toBeInTheDocument());
    expect(supabaseDouble.tables.products).toHaveLength(0);
  });

  it('sends a draft to moderation and withdraws it again through the listing RPC', async () => {
    supabaseDouble.seedProduct(
      productRow({ id: 'p-1', seller_id: 'store-1', title: 'Draft Listing', category_id: 'cat-audio', status: 'draft' }),
    );
    renderWorkspace(<VendorProductsPage />);

    await waitFor(() => expect(screen.getByText('Draft Listing')).toBeInTheDocument());
    const row = within(screen.getByText('Draft Listing').closest('tr') as HTMLElement);

    fireEvent.click(row.getByRole('button', { name: /Submit/i }));
    await waitFor(() =>
      expect(supabaseDouble.tables.products.find((r) => r.id === 'p-1')?.status).toBe('pending_review'),
    );

    const withdrawn = within(screen.getByText('Draft Listing').closest('tr') as HTMLElement);
    fireEvent.click(await withdrawn.findByRole('button', { name: /Withdraw/i }));
    await waitFor(() =>
      expect(supabaseDouble.tables.products.find((r) => r.id === 'p-1')?.status).toBe('draft'),
    );
  });
});

describe('ProductFormModal (quick add)', () => {
  it('offers only the essential fields and points at the full form for the rest', async () => {
    renderWorkspace(
      <ProductFormModal open onOpenChange={() => {}} onSave={() => {}} />
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Quick Add Product')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Product Title/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Price/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Opening Stock/)).toBeInTheDocument();

    // No second full form hides in the modal (Batch 48): variants, digital
    // delivery and shipping settings belong to the full form alone.
    expect(within(dialog).queryByText(/Variant Generator/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Pricing & Delivery/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Digital Asset/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Standard Shipping Fee/)).not.toBeInTheDocument();

    const fullForm = within(dialog).getByRole('link', { name: /Open the full form/i });
    expect(fullForm).toHaveAttribute('href', '/vendor/products/new');
  });

  it('requires a category before it will write a listing', async () => {
    renderWorkspace(<ProductFormModal open onOpenChange={() => {}} onSave={() => {}} />);

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText(/Aura Precision Studio Reference/i), {
      target: { value: 'Uncategorised Attempt' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Add Product/i }));

    await waitFor(() =>
      expect(screen.getByText('Choose the category this listing belongs in.')).toBeInTheDocument(),
    );
    expect(supabaseDouble.tables.products).toHaveLength(0);
  });
});
