import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VendorOrderDetailPage } from './VendorOrderDetailPage';
import { VendorInventoryPage } from './VendorInventoryPage';
import { useAuthStore, DEMO_ACCOUNTS } from '../store/auth-store';
import { mockDb } from '../mocks/db';

describe('Vendor Workspace New Pages', () => {
  beforeEach(() => {
    // Reset auth store to demo vendor account
    useAuthStore.setState({
      user: DEMO_ACCOUNTS.vendor,
      token: 'mock-vendor-token',
      isAuthenticated: true,
    });
    // Reset mock database to clean seed
    mockDb.resetToSeed();
    vi.restoreAllMocks();
  });

  describe('1. VendorOrderDetailPage (Route: /vendor/orders/:id)', () => {
    it('renders merchant order management view with customer details and line items', () => {
      render(
        <MemoryRouter initialEntries={['/vendor/orders/sub-98421-A']}>
          <Routes>
            <Route path="/vendor/orders/:id" element={<VendorOrderDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );

      // Verify Workspace Layout role badge
      expect(screen.getByTestId('role-badge')).toHaveTextContent(/VENDOR PARTNER/i);

      // Verify Sub-order header details
      expect(screen.getByText(/Sub-Order #sub-98421-A/i)).toBeInTheDocument();
      expect(screen.getByText(/Master Group: #ord-98421/i)).toBeInTheDocument();

      // Verify Customer destination
      expect(screen.getByText('Customer Destination & Notes')).toBeInTheDocument();
      expect(screen.getByText('Sarah Customer')).toBeInTheDocument();
      expect(screen.getByText(/Buyer Order Notes/i)).toBeInTheDocument();

      // Verify Line items table
      expect(screen.getByText(/Package Line Items/i)).toBeInTheDocument();
      expect(screen.getByText('Nova Pro Wireless ANC Headphones')).toBeInTheDocument();

      // Verify Financial breakdown
      expect(screen.getByText('Financial Settlement Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Platform Commission Deduction')).toBeInTheDocument();
      expect(screen.getByText('Net Seller Payout')).toBeInTheDocument();
    });

    it('advances sequential order progression (Confirm Order -> Mark Packed -> Ready for Rider Pickup / Mark Shipped)', () => {
      // Set sub-98421-A to 'placed' for sequential progression testing
      const order = mockDb.subOrders.find((so) => so.id === 'sub-98421-A');
      if (order) order.status = 'placed';

      render(
        <MemoryRouter initialEntries={['/vendor/orders/sub-98421-A']}>
          <Routes>
            <Route path="/vendor/orders/:id" element={<VendorOrderDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );

      // Stage 1: Placed -> Confirm Order
      const confirmBtn = screen.getByRole('button', { name: /Confirm Order/i });
      expect(confirmBtn).toBeInTheDocument();
      fireEvent.click(confirmBtn);

      // Stage 2: Confirmed -> Mark Packed
      const markPackedBtn = screen.getByRole('button', { name: /Mark Packed/i });
      expect(markPackedBtn).toBeInTheDocument();
      fireEvent.click(markPackedBtn);

      // Stage 3: Packed -> Ready for Rider Pickup
      const readyForRiderBtn = screen.getByRole('button', { name: /Ready for Rider Pickup/i });
      expect(readyForRiderBtn).toBeInTheDocument();
      fireEvent.click(readyForRiderBtn);

      // Stage 4: Ready for Pickup -> Mark Shipped
      const markShippedBtn = screen.getByRole('button', { name: /Mark Shipped/i });
      expect(markShippedBtn).toBeInTheDocument();
      fireEvent.click(markShippedBtn);

      // Stage 5: Shipped -> Mark Delivered
      const markDeliveredBtn = screen.getByRole('button', { name: /Mark Delivered/i });
      expect(markDeliveredBtn).toBeInTheDocument();
    });

    it('allows updating carrier tracking number with dropdown and save button', () => {
      render(
        <MemoryRouter initialEntries={['/vendor/orders/sub-98421-A']}>
          <Routes>
            <Route path="/vendor/orders/:id" element={<VendorOrderDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );

      // Carrier selection dropdown
      const carrierSelect = screen.getByDisplayValue('Vendora Express Rider');
      fireEvent.change(carrierSelect, { target: { value: 'FedEx' } });

      // Tracking input
      const trackingInput = screen.getByPlaceholderText(/e.g. TRACK-883921/i);
      fireEvent.change(trackingInput, { target: { value: 'FX-9988221' } });

      // Save tracking button
      const saveBtn = screen.getByRole('button', { name: /Save Tracking/i });
      fireEvent.click(saveBtn);

      // Verified updated carrier and tracking
      expect(screen.getAllByText('FedEx').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('FX-9988221').length).toBeGreaterThanOrEqual(1);
    });

    it('opens printable Packing Slip & Shipping Label modal with barcode simulation and window.print', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      render(
        <MemoryRouter initialEntries={['/vendor/orders/sub-98421-A']}>
          <Routes>
            <Route path="/vendor/orders/:id" element={<VendorOrderDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );

      // Open print modal
      const printModalBtn = screen.getByRole('button', { name: /Print Packing Slip & Label/i });
      fireEvent.click(printModalBtn);

      // Verify modal content
      expect(screen.getByText(/Official Packing Slip & Shipping Label/i)).toBeInTheDocument();
      expect(screen.getAllByText(/VENDORA EXPRESS/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/PRIORITY GROUND AIRWAY MANIFEST/i)).toBeInTheDocument();
      expect(screen.getByText(/SHIP FROM \(ORIGIN WAREHOUSE\):/i)).toBeInTheDocument();
      expect(screen.getByText(/SHIP TO \(DESTINATION RECIPIENT\):/i)).toBeInTheDocument();

      // Trigger print document button
      const printDocBtn = screen.getByRole('button', { name: /Print Document/i });
      fireEvent.click(printDocBtn);
      expect(printSpy).toHaveBeenCalled();
    });

    it('supports order cancellation workflow modal with reason codes', () => {
      // Ensure order is not delivered
      const order = mockDb.subOrders.find((so) => so.id === 'sub-98421-A');
      if (order) order.status = 'placed';

      render(
        <MemoryRouter initialEntries={['/vendor/orders/sub-98421-A']}>
          <Routes>
            <Route path="/vendor/orders/:id" element={<VendorOrderDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );

      // Click Cancel Order button
      const cancelBtn = screen.getByRole('button', { name: /Cancel Order/i });
      fireEvent.click(cancelBtn);

      // Dialog is open
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText(/Cancel Sub-Order #sub-98421-A/i)).toBeInTheDocument();

      // Reason dropdown
      const reasonSelect = within(dialog).getByDisplayValue('Out of stock');
      expect(reasonSelect).toBeInTheDocument();
      fireEvent.change(reasonSelect, { target: { value: 'Pricing error' } });

      // Confirm cancellation
      const confirmCancelBtn = within(dialog).getByRole('button', { name: /Confirm Cancellation/i });
      fireEvent.click(confirmCancelBtn);

      // Order status transitions to Cancelled
      expect(screen.getByText(/Order Cancelled/i)).toBeInTheDocument();
    });

    it('opens shortcut modal to message customer', () => {
      render(
        <MemoryRouter initialEntries={['/vendor/orders/sub-98421-A']}>
          <Routes>
            <Route path="/vendor/orders/:id" element={<VendorOrderDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );

      const msgBtn = screen.getByRole('button', { name: /Message Customer/i });
      fireEvent.click(msgBtn);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText(/Message Customer: Sarah Customer/i)).toBeInTheDocument();

      const sendBtn = within(dialog).getByRole('button', { name: /Send Message to Customer/i });
      fireEvent.click(sendBtn);

      // Dialog closes and toast appears
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('2. VendorInventoryPage (Route: /vendor/inventory)', () => {
    it('renders quick stock editor table, metrics, and low-stock alert banner', () => {
      render(
        <MemoryRouter>
          <VendorInventoryPage />
        </MemoryRouter>,
      );

      // Header and metrics
      expect(screen.getByText('Inventory & Stock Management')).toBeInTheDocument();
      expect(screen.getByText('Active SKUs')).toBeInTheDocument();
      expect(screen.getByText('Low-Stock Alerts')).toBeInTheDocument();
      expect(screen.getByText('Digital Key Reserve')).toBeInTheDocument();

      // Low-stock threshold alert banner
      expect(screen.getByText(/Low-Stock Threshold Alert/i)).toBeInTheDocument();

      // Table columns
      expect(screen.getByText('Product & Variant')).toBeInTheDocument();
      expect(screen.getByText('SKU Code')).toBeInTheDocument();
      expect(screen.getByText('Quick Stock Stepper')).toBeInTheDocument();
      expect(screen.getByText('Restock Backlog & ETA')).toBeInTheDocument();
    });

    it('allows adjusting stock with steppers and saving changes inline', () => {
      render(
        <MemoryRouter>
          <VendorInventoryPage />
        </MemoryRouter>,
      );

      // Find stock stepper inputs
      const stockInputs = screen.getAllByRole('spinbutton');
      expect(stockInputs.length).toBeGreaterThan(0);

      const firstInput = stockInputs[0];
      const initialVal = parseInt((firstInput as HTMLInputElement).value, 10);

      // Click increment button (+)
      const plusButtons = screen.getAllByTitle('Increment stock');
      fireEvent.click(plusButtons[0]);

      // Stock is incremented
      expect((firstInput as HTMLInputElement).value).toBe((initialVal + 1).toString());

      // Row update button becomes active
      const updateButtons = screen.getAllByRole('button', { name: /Update/i });
      expect(updateButtons.length).toBeGreaterThan(0);
      fireEvent.click(updateButtons[0]);

      // Feedback toast appears
      expect(screen.getByText(/Updated stock for/i)).toBeInTheDocument();
    });

    it('switches to Digital License Vault tab and displays license keys with upload workflow', () => {
      render(
        <MemoryRouter>
          <VendorInventoryPage />
        </MemoryRouter>,
      );

      // Switch to Digital License Vault tab
      const vaultTab = screen.getByRole('button', { name: /Digital License Vault/i });
      fireEvent.click(vaultTab);

      // Verify digital products and vault items
      expect(screen.getByText(/ACTIVE VAULT:/i)).toBeInTheDocument();
      expect(screen.getByText(/Available Reserve/i)).toBeInTheDocument();
      expect(screen.getByText(/ACTIVATION KEY \/ LICENSE TOKEN/i)).toBeInTheDocument();

      // Verify presence of copy button
      const copyButtons = screen.getAllByTitle('Copy key');
      expect(copyButtons.length).toBeGreaterThan(0);

      // Open Bulk Upload modal
      const uploadBtn = screen.getByRole('button', { name: /Upload License Keys/i });
      fireEvent.click(uploadBtn);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText(/Bulk Upload Activation Keys/i)).toBeInTheDocument();

      // Type new keys
      const textarea = within(dialog).getByPlaceholderText(/VEN-LIC-FIGMA/i);
      fireEvent.change(textarea, {
        target: { value: 'VEN-LIC-NEW-001\nVEN-LIC-NEW-002\nVEN-LIC-NEW-003' },
      });

      // Submit upload
      const depositBtn = within(dialog).getByRole('button', { name: /Deposit Keys to Vault/i });
      fireEvent.click(depositBtn);

      // Keys are deposited
      expect(screen.getByText(/Added 3 new activation keys/i)).toBeInTheDocument();
    });
  });
});
