import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CartItem } from '../../../types/domain';
import { useCartStore } from '../../../store/cart-store';
import { useAuthStore, DEMO_ACCOUNTS } from '../../../store/auth-store';
import { AccordionCheckout } from './AccordionCheckout';
import { CheckoutPage } from '../../../pages/CheckoutPage';
import * as ordersApi from '../../orders/api/orders';

// Test items
const mockPhysicalItems: CartItem[] = [
  {
    id: 'item-platform-1',
    productId: 'prod-1',
    title: 'Vendora Studio Headphones',
    price: 150.0,
    quantity: 1,
    maxStock: 10,
    image: '/headphones.jpg',
    sellerId: 'platform',
    sellerName: 'Vendora Direct',
    sellerType: 'platform',
    type: 'physical',
  },
  {
    id: 'item-vendor-1',
    productId: 'prod-2',
    title: 'Audiophile Cable',
    price: 35.0,
    quantity: 1,
    maxStock: 5,
    image: '/cable.jpg',
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Audio',
    sellerType: 'vendor',
    type: 'physical',
  },
];

const mockDigitalItems: CartItem[] = [
  {
    id: 'item-digital-1',
    productId: 'prod-dig-1',
    title: 'Acoustic Impulse Response Pack',
    price: 29.0,
    quantity: 1,
    maxStock: 99,
    image: '/ir-pack.jpg',
    sellerId: 'platform',
    sellerName: 'Vendora Direct',
    sellerType: 'platform',
    type: 'digital',
  },
];

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AccordionCheckout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset stores
    useAuthStore.setState({
      user: DEMO_ACCOUNTS.customer,
      token: 'mock-token',
      isAuthenticated: true,
    });

    useCartStore.setState({
      items: mockPhysicalItems,
      appliedCoupon: null,
    });

    // Mock createOrder
    vi.spyOn(ordersApi, 'createOrder').mockResolvedValue({
      orderGroup: {
        id: 'ord-grp-test-999',
        customerId: 'usr-customer-1',
        customerEmail: 'customer@demo.test',
        paymentMethod: 'card',
        paymentDetails: { brand: 'Visa', last4: '4242' },
        subOrderIds: ['sub-ord-1', 'sub-ord-2'],
        createdAt: new Date().toISOString(),
      },
      subOrders: [],
    });
  });

  describe('Step 1: Shipping Address & Saved Addresses', () => {
    it('renders step 1 with saved address options and initial address populated', () => {
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      expect(screen.getByTestId('step-1-content')).toBeInTheDocument();
      expect(screen.getByTestId('saved-address-addr-home')).toBeInTheDocument();
      expect(screen.getByTestId('saved-address-addr-office')).toBeInTheDocument();
      expect(screen.getByTestId('saved-address-new')).toBeInTheDocument();

      const nameInput = screen.getByTestId('input-fullName') as HTMLInputElement;
      expect(nameInput.value).toBe('Sarah Customer');
      const streetInput = screen.getByTestId('input-street') as HTMLInputElement;
      expect(streetInput.value).toBe('742 Evergreen Terrace');
    });

    it('switches address when selecting another saved address radio', () => {
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      const officeRadio = screen.getByTestId('saved-address-addr-office').querySelector('input')!;
      fireEvent.click(officeRadio);

      const streetInput = screen.getByTestId('input-street') as HTMLInputElement;
      expect(streetInput.value).toBe('100 Silicon Vista Blvd, Suite 400');
      const cityInput = screen.getByTestId('input-city') as HTMLInputElement;
      expect(cityInput.value).toBe('San Jose');
    });

    it('enforces Zod validation when attempting to submit blank required address fields', () => {
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      // Select new address
      const newAddressRadio = screen.getByTestId('saved-address-new').querySelector('input')!;
      fireEvent.click(newAddressRadio);

      // Clear full name
      const nameInput = screen.getByTestId('input-fullName');
      fireEvent.change(nameInput, { target: { value: '' } });

      // Click continue
      const continueBtn = screen.getByTestId('btn-continue-delivery');
      fireEvent.click(continueBtn);

      // Should show Zod error
      expect(screen.getByTestId('error-fullName')).toBeInTheDocument();
      expect(screen.getByTestId('error-fullName')).toHaveTextContent(/Full name is required/i);
    });

    it('advances to Step 2 when shipping address is valid', () => {
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      const continueBtn = screen.getByTestId('btn-continue-delivery');
      fireEvent.click(continueBtn);

      // Should advance to step 2
      expect(screen.getByTestId('step-2-content')).toBeInTheDocument();
    });
  });

  describe('Step 2: Delivery Option per Seller', () => {
    it('displays separate packages per seller with free standard shipping for over $100 and $8.50 otherwise', () => {
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      // Advance past Step 1
      fireEvent.click(screen.getByTestId('btn-continue-delivery'));

      // Platform package subtotal is $150 (>= $100 -> Free standard)
      const platformPackage = screen.getByTestId('seller-package-platform');
      expect(platformPackage).toHaveTextContent(/Vendora Direct/i);
      expect(platformPackage).toHaveTextContent(/FREE/i);

      // Vendor package subtotal is $35 (< $100 -> $8.50 standard)
      const vendorPackage = screen.getByTestId('seller-package-vendor-tech-1');
      expect(vendorPackage).toHaveTextContent(/SoundWave Audio/i);
      expect(vendorPackage).toHaveTextContent(/\$8\.50/i);
    });

    it('allows selecting Express shipping for a seller group', () => {
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      // Advance to Step 2
      fireEvent.click(screen.getByTestId('btn-continue-delivery'));

      // Select Express for vendor-tech-1
      const expressOption = screen.getByTestId('option-express-vendor-tech-1').querySelector('input')!;
      fireEvent.click(expressOption);
      expect(expressOption).toBeChecked();

      // Proceed to Step 3
      const continueToPaymentBtn = screen.getByTestId('btn-continue-payment');
      fireEvent.click(continueToPaymentBtn);

      expect(screen.getByTestId('step-3-content')).toBeInTheDocument();
    });
  });

  describe('Step 3: Payment, Simulated Luhn Validation & Test Card Presets', () => {
    it('autofills card details when clicking a test card pill and detects card brand', () => {
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      // Advance to Step 3
      fireEvent.click(screen.getByTestId('btn-continue-delivery'));
      fireEvent.click(screen.getByTestId('btn-continue-payment'));

      // Click "Valid Mastercard" pill
      const mastercardPill = screen.getByTestId('test-card-pill-valid-mastercard');
      fireEvent.click(mastercardPill);

      const cardInput = screen.getByTestId('input-cardNumber') as HTMLInputElement;
      expect(cardInput.value).toBe('5555 5555 5555 4444');
      expect(screen.getByText(/Detected: Mastercard/i)).toBeInTheDocument();

      const nameInput = screen.getByTestId('input-cardholderName') as HTMLInputElement;
      expect(nameInput.value).toBe('Alex Smith');
    });

    it('validates card with Luhn algorithm and fails on invalid checksum card', () => {
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      // Advance to Step 3
      fireEvent.click(screen.getByTestId('btn-continue-delivery'));
      fireEvent.click(screen.getByTestId('btn-continue-payment'));

      // Click "Invalid Card" pill (fails Luhn)
      const invalidCardPill = screen.getByTestId('test-card-pill-invalid-card');
      fireEvent.click(invalidCardPill);

      // Attempt to proceed
      const continueReviewBtn = screen.getByTestId('btn-continue-review');
      fireEvent.click(continueReviewBtn);

      // Luhn error message should appear
      expect(screen.getByTestId('error-cardNumber')).toBeInTheDocument();
      expect(screen.getByTestId('error-cardNumber')).toHaveTextContent(/Luhn checksum validation/i);
    });

    it('supports Cash on Delivery (COD) and bypasses card validation', () => {
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      // Advance to Step 3
      fireEvent.click(screen.getByTestId('btn-continue-delivery'));
      fireEvent.click(screen.getByTestId('btn-continue-payment'));

      // Switch to COD
      const codRadio = screen.getByTestId('payment-method-cod').querySelector('input')!;
      fireEvent.click(codRadio);

      // Continue to review
      fireEvent.click(screen.getByTestId('btn-continue-review'));

      // Step 4 content should appear without card errors
      expect(screen.getByTestId('step-4-content')).toBeInTheDocument();
      expect(screen.getAllByText(/Cash on Delivery/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Step 4: Review, Re-validation, and Order Placement', () => {
    it('displays summary of packages, re-validates totals, and places order', async () => {
      const onSuccessMock = vi.fn();
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout onSuccess={onSuccessMock} />, { wrapper: Wrapper });

      // Advance through Steps 1, 2, 3
      fireEvent.click(screen.getByTestId('btn-continue-delivery'));
      fireEvent.click(screen.getByTestId('btn-continue-payment'));
      fireEvent.click(screen.getByTestId('btn-continue-review'));

      // Review step
      expect(screen.getByTestId('step-4-content')).toBeInTheDocument();
      expect(screen.getByText(/Price Re-Validation/i)).toBeInTheDocument();

      // Click Place Order
      const placeOrderBtn = screen.getByTestId('btn-place-order');
      fireEvent.click(placeOrderBtn);

      await waitFor(() => {
        expect(ordersApi.createOrder).toHaveBeenCalledTimes(1);
      });

      // Verify cart was cleared
      expect(useCartStore.getState().items).toHaveLength(0);
      expect(onSuccessMock).toHaveBeenCalledWith('ord-grp-test-999');
    });

    it('handles simulated insufficient funds failure on test card', async () => {
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      // Step 1 & 2
      fireEvent.click(screen.getByTestId('btn-continue-delivery'));
      fireEvent.click(screen.getByTestId('btn-continue-payment'));

      // Step 3: Choose Low Balance Card
      const lowBalancePill = screen.getByTestId('test-card-pill-low-balance');
      fireEvent.click(lowBalancePill);
      fireEvent.click(screen.getByTestId('btn-continue-review'));

      // Step 4: Click Place Order
      const placeOrderBtn = screen.getByTestId('btn-place-order');
      fireEvent.click(placeOrderBtn);

      // Should show simulated failure banner and NOT call createOrder
      await waitFor(() => {
        expect(screen.getByTestId('order-error-banner')).toBeInTheDocument();
      });
      expect(screen.getByTestId('order-error-banner')).toHaveTextContent(/Insufficient funds/i);
      expect(ordersApi.createOrder).not.toHaveBeenCalled();
      expect(useCartStore.getState().items.length).toBeGreaterThan(0);
    });
  });

  describe('Digital-Only Cart Flow', () => {
    it('skips Step 1 and Step 2 directly to Step 3 for digital-only carts', () => {
      useCartStore.setState({
        items: mockDigitalItems,
      });

      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      // Step 1 should show skipped badge
      expect(screen.getByTestId('step-1-header')).toHaveTextContent(/Skipped · Digital Only/i);
      expect(screen.getByTestId('step-2-header')).toHaveTextContent(/Skipped · Digital Only/i);

      // Active step should directly be Step 3
      expect(screen.getByTestId('step-3-content')).toBeInTheDocument();
    });
  });

  describe('CheckoutPage Integration', () => {
    it('renders empty cart message when no items in cart', () => {
      useCartStore.setState({ items: [] });
      const Wrapper = createTestWrapper();
      render(<CheckoutPage />, { wrapper: Wrapper });

      expect(screen.getByText(/Your Cart is Empty/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Explore Products/i })).toBeInTheDocument();
    });

    it('renders distraction-free header and sidebar with cart items when items exist', () => {
      useCartStore.setState({ items: mockPhysicalItems });
      const Wrapper = createTestWrapper();
      render(<CheckoutPage />, { wrapper: Wrapper });

      expect(screen.getByText(/256-Bit SSL Encrypted Checkout/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Return to Cart/i })).toBeInTheDocument();
      expect(screen.getByText(/Order Summary \(2 items\)/i)).toBeInTheDocument();
      expect(screen.getByTestId('step-1-header')).toBeInTheDocument();
    });
  });
});
