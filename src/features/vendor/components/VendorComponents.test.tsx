import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VendorDashboardPage } from '../../../pages/VendorDashboardPage';
import { VendorOrdersPage } from '../../../pages/VendorOrdersPage';
import { VendorProductsPage } from '../../../pages/VendorProductsPage';
import { ProductFormModal } from './ProductFormModal';
import { useAuthStore, DEMO_ACCOUNTS } from '../../../store/auth-store';
import { mockDb } from '../../../mocks/db';

describe('Vendor Workspace Views & Components', () => {
  beforeEach(() => {
    // Reset auth store to demo vendor account
    useAuthStore.setState({
      user: DEMO_ACCOUNTS.vendor,
      token: 'mock-vendor-token',
      isAuthenticated: true,
    });
    // Reset mock database to clean seed
    mockDb.resetToSeed();
  });

  describe('1. VendorDashboardPage', () => {
    it('renders all 5 required KPI cards with exact values', () => {
      render(
        <MemoryRouter>
          <VendorDashboardPage />
        </MemoryRouter>,
      );

      // 1. Gross Sales ($34,820)
      expect(screen.getByText('Gross Sales')).toBeInTheDocument();
      expect(screen.getByText('$34,820')).toBeInTheDocument();

      // 2. Platform Commission Deducted ($3,482)
      expect(screen.getByText('Platform Commission Deducted')).toBeInTheDocument();
      expect(screen.getByText('$3,482')).toBeInTheDocument();

      // 3. Net Payout ($31,338)
      expect(screen.getByText('Net Payout')).toBeInTheDocument();
      expect(screen.getByText('$31,338')).toBeInTheDocument();

      // 4. Pending Orders (14)
      expect(screen.getByText('Pending Orders')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();

      // 5. Low Stock (3)
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    });

    it('renders quick action buttons and recent orders list', () => {
      render(
        <MemoryRouter>
          <VendorDashboardPage />
        </MemoryRouter>,
      );

      // Verify Quick Action buttons
      expect(
        screen.getByRole('button', { name: /\+ Add New Product/i }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /Manage Orders/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('link', { name: /Inventory/i }).length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByRole('link', { name: /Public Storefront/i }).length,
      ).toBeGreaterThanOrEqual(1);

      // Verify Recent orders table header
      expect(screen.getByText('Recent Customer Sub-Orders')).toBeInTheDocument();
      expect(screen.getByText('Sub-Order ID')).toBeInTheDocument();

      // Verify presence of recent order entries
      expect(screen.getByText('#sub-ord-2001')).toBeInTheDocument();
      expect(
        screen.getAllByText('Aura Precision Studio Reference In-Ear Monitors').length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('allows advancing order status directly from dashboard quick action', () => {
      render(
        <MemoryRouter>
          <VendorDashboardPage />
        </MemoryRouter>,
      );

      // Initially, order 2001 has 'Confirm Order'
      const confirmButton = screen.getByRole('button', { name: /Confirm Order/i });
      expect(confirmButton).toBeInTheDocument();

      fireEvent.click(confirmButton);

      // Order 2001 transitions to confirmed, so Mark Packed buttons are present
      const markPackedButtons = screen.getAllByRole('button', { name: /Mark Packed/i });
      expect(markPackedButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. VendorOrdersPage & Order Lifecycle State Machine', () => {
    it('renders vendor sub-orders with status filters', () => {
      render(
        <MemoryRouter>
          <VendorOrdersPage />
        </MemoryRouter>,
      );

      // Verify Filter Buttons (using exact starts-with regex so filters don't collide with actions)
      expect(screen.getByRole('button', { name: /^All/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Placed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Confirmed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Packed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Ready for Pickup/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Delivered/i })).toBeInTheDocument();

      // Verify orders listed
      expect(screen.getByText('sub-ord-2001')).toBeInTheDocument();
      expect(screen.getByText('sub-ord-2002')).toBeInTheDocument();
    });

    it('advances order status sequentially through Confirm Order -> Mark Packed -> Ready for Rider Pickup', () => {
      render(
        <MemoryRouter>
          <VendorOrdersPage />
        </MemoryRouter>,
      );

      const card = screen.getByTestId('sub-order-card-sub-ord-2001');

      // Step 1: Find order in 'placed' status and click "Confirm Order"
      const confirmBtn = within(card).getByRole('button', { name: /Confirm Order/i });
      expect(confirmBtn).toBeInTheDocument();
      fireEvent.click(confirmBtn);

      // Step 2: Order moves to 'confirmed', button becomes "Mark Packed"
      const markPackedBtn = within(card).getByRole('button', { name: /Mark Packed/i });
      expect(markPackedBtn).toBeInTheDocument();
      fireEvent.click(markPackedBtn);

      // Step 3: Order moves to 'packed', button becomes "Ready for Rider Pickup"
      const readyForRiderBtn = within(card).getByRole('button', {
        name: /Ready for Rider Pickup/i,
      });
      expect(readyForRiderBtn).toBeInTheDocument();
      fireEvent.click(readyForRiderBtn);

      // Step 4: Order moves to 'ready_for_pickup', showing awaiting rider status
      expect(within(card).getByText(/Awaiting Rider Pickup/i)).toBeInTheDocument();
    });

    it('filters orders by status correctly', () => {
      render(
        <MemoryRouter>
          <VendorOrdersPage />
        </MemoryRouter>,
      );

      // Filter by 'Placed'
      const placedFilter = screen.getByRole('button', { name: /^Placed/i });
      fireEvent.click(placedFilter);

      expect(screen.getByText('sub-ord-2001')).toBeInTheDocument();
      // sub-ord-2002 is confirmed, so it should be filtered out
      expect(screen.queryByText('sub-ord-2002')).not.toBeInTheDocument();

      // Switch to 'All'
      const allFilter = screen.getByRole('button', { name: /^All/i });
      fireEvent.click(allFilter);
      expect(screen.getByText('sub-ord-2001')).toBeInTheDocument();
      expect(screen.getByText('sub-ord-2002')).toBeInTheDocument();
    });
  });

  describe('3. VendorProductsPage & ProductFormModal Integration', () => {
    it('renders vendor product inventory table with required columns', () => {
      render(
        <MemoryRouter>
          <VendorProductsPage />
        </MemoryRouter>,
      );

      // Headers
      expect(screen.getByText('Product Details')).toBeInTheDocument();
      expect(screen.getByText('Fulfillment Type')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Stock Level')).toBeInTheDocument();
      expect(screen.getByText('Moderation Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();

      // Product rows
      expect(
        screen.getByText('Aura Precision Studio Reference In-Ear Monitors'),
      ).toBeInTheDocument();
      expect(screen.getByText('+ Add New Product')).toBeInTheDocument();
    });

    it('opens ProductFormModal when "+ Add New Product" is clicked', () => {
      render(
        <MemoryRouter>
          <VendorProductsPage />
        </MemoryRouter>,
      );

      const addBtn = screen.getByRole('button', { name: /\+ Add New Product/i });
      fireEvent.click(addBtn);

      // Verify dialog is opened
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add New Product')).toBeInTheDocument();
      expect(screen.getByText('1. Listing Details')).toBeInTheDocument();
      expect(screen.getByText('2. Pricing & Delivery')).toBeInTheDocument();
      expect(screen.getByText(/3. Variant Generator/i)).toBeInTheDocument();
    });

    it(
      'creates and saves a new product with variants to mockDb',
      () => {
        render(
          <MemoryRouter>
            <VendorProductsPage />
          </MemoryRouter>,
        );

        // Open Modal
        fireEvent.click(screen.getByRole('button', { name: /\+ Add New Product/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        // Fill in Step 1: Listing Details
        const titleInput = screen.getByPlaceholderText(
          /e.g. Aura Precision Studio Reference In-Ear Monitors/i,
        );
        fireEvent.change(titleInput, { target: { value: 'HyperSonic Pro ANC Wireless IEM' } });

        // Navigate to Step 3: Variant Generator
        fireEvent.click(screen.getByRole('button', { name: /3. Variant Generator/i }));

        // Use variant generator
        const optionValuesInput = screen.getByPlaceholderText(
          /e.g. Matte Black, Lunar Silver, Gold/i,
        );
        fireEvent.change(optionValuesInput, { target: { value: 'Midnight, Platinum' } });

        const generateBtn = screen.getByRole('button', { name: /Generate Variants/i });
        fireEvent.click(generateBtn);

        // Verify generated variants appear
        expect(screen.getByText('Color: Midnight')).toBeInTheDocument();
        expect(screen.getByText('Color: Platinum')).toBeInTheDocument();

        // Save Product
        const saveBtn = screen.getByRole('button', { name: /Save Product/i });
        fireEvent.click(saveBtn);

        // Verify new product appears in the table
        expect(screen.getByText('HyperSonic Pro ANC Wireless IEM')).toBeInTheDocument();
      },
      15000,
    );
  });

  describe('4. ProductFormModal Unit Tests', () => {
    it('supports toggling between Physical and Digital fulfillment', () => {
      const onSave = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ProductFormModal
          open={true}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />,
      );

      // Go to Step 2
      fireEvent.click(screen.getByRole('button', { name: /2. Pricing & Delivery/i }));

      const physicalBtn = screen.getByRole('button', { name: /Physical Good/i });
      const digitalBtn = screen.getByRole('button', { name: /Digital Asset/i });

      expect(physicalBtn).toBeInTheDocument();
      expect(digitalBtn).toBeInTheDocument();

      // Toggle to Digital
      fireEvent.click(digitalBtn);
      expect(screen.getByText('License Type')).toBeInTheDocument();
      expect(screen.getByText('Asset Download URL')).toBeInTheDocument();

      // Toggle back to Physical
      fireEvent.click(physicalBtn);
      expect(screen.getByText(/Standard Shipping Fee/i)).toBeInTheDocument();
    });

    it('validates required product title before submission', () => {
      const onSave = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ProductFormModal
          open={true}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />,
      );

      // Clear title
      const titleInput = screen.getByPlaceholderText(
        /e.g. Aura Precision Studio Reference In-Ear Monitors/i,
      );
      fireEvent.change(titleInput, { target: { value: '' } });

      // Click save
      const saveBtn = screen.getByRole('button', { name: /Save Product/i });
      fireEvent.click(saveBtn);

      // Expect validation error
      expect(screen.getByText(/Product title is required/i)).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
