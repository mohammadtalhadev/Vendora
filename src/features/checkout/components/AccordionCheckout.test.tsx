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
import { useCheckoutDraftStore } from '../store/checkout-draft';
import * as checkoutApi from '../api/checkout';
import type { CheckoutQuote, DeliveryChoice, PlacedOrder, QuoteGroup } from '../api/checkout';

// These steps render the quote the API layer returned, so the screen is tested against a
// server answer rather than against a number it could have invented itself.
vi.mock('../api/checkout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./checkout')>();
  return { ...actual, quoteCheckout: vi.fn(), placeOrder: vi.fn() };
});

const PLATFORM = 'platform';
const VENDOR = 'vendor-tech-1';
const EXPRESS_FEE = 15;

const mockPhysicalItems: CartItem[] = [
  {
    id: 'item-platform-1',
    productId: 'prod-1',
    title: 'Vendora Studio Headphones',
    price: 150.0,
    quantity: 1,
    maxStock: 10,
    image: '/headphones.jpg',
    sellerId: PLATFORM,
    sellerName: 'Vendora',
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
    sellerId: VENDOR,
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
    sellerId: PLATFORM,
    sellerName: 'Vendora',
    sellerType: 'platform',
    type: 'digital',
  },
];

/** Each seller's own rules: the platform package ships free, the vendor's charges $8.50. */
const SELLER_RULES: Record<string, { sellerName: string; sellerType: 'platform' | 'vendor'; standard: number }> = {
  [PLATFORM]: { sellerName: 'Vendora', sellerType: 'platform', standard: 0 },
  [VENDOR]: { sellerName: 'SoundWave Audio', sellerType: 'vendor', standard: 8.5 },
};

const round = (value: number) => Math.round(value * 100) / 100;

function priceQuote(deliveryOptions: Record<string, DeliveryChoice>, couponCode?: string | null): CheckoutQuote {
  const bySeller = new Map<string, CartItem[]>();
  for (const item of useCartStore.getState().items) {
    bySeller.set(item.sellerId, [...(bySeller.get(item.sellerId) ?? []), item]);
  }

  const groups: QuoteGroup[] = Array.from(bySeller.entries()).map(([sellerId, lines]) => {
    const rule =
      SELLER_RULES[sellerId] ?? { sellerName: lines[0].sellerName, sellerType: lines[0].sellerType, standard: 8.5 };
    const hasPhysical = lines.some((line) => line.type === 'physical');
    const subtotal = round(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
    const discount = couponCode === 'SAVE10' ? round(subtotal * 0.1) : 0;
    const netSubtotal = round(subtotal - discount);
    const shippingStandard = hasPhysical ? rule.standard : 0;
    const deliveryOption = deliveryOptions[sellerId] ?? 'standard';
    return {
      sellerId,
      sellerName: rule.sellerName,
      sellerType: rule.sellerType,
      hasPhysical,
      items: lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId ?? '',
        title: line.title,
        price: line.price,
        quantity: line.quantity,
        image: line.image,
        sellerId,
        sellerName: rule.sellerName,
      })),
      subtotal,
      discount,
      netSubtotal,
      deliveryOption,
      shippingStandard,
      shippingExpress: shippingStandard + EXPRESS_FEE,
      shippingFee: deliveryOption === 'express' ? shippingStandard + EXPRESS_FEE : shippingStandard,
      commissionRate: 0.1,
      commissionAmount: round(netSubtotal * 0.1),
      netPayout: netSubtotal,
      couponCode: discount > 0 && couponCode ? couponCode : null,
    };
  });

  return {
    groups,
    subtotal: round(groups.reduce((sum, group) => sum + group.subtotal, 0)),
    discountTotal: round(groups.reduce((sum, group) => sum + group.discount, 0)),
    shippingTotal: round(groups.reduce((sum, group) => sum + group.shippingFee, 0)),
    grandTotal: round(groups.reduce((sum, group) => sum + group.netSubtotal + group.shippingFee, 0)),
    couponCode: couponCode ?? null,
    expressFee: EXPRESS_FEE,
  };
}

const placedOrder: PlacedOrder = {
  orderId: 'ord-grp-test-999',
  subOrders: [],
  subtotal: 185,
  discountTotal: 0,
  shippingTotal: 8.5,
  grandTotal: 193.5,
  paymentStatus: 'succeeded',
  paymentDetails: { brand: 'Visa', last4: '4242' },
};

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

async function renderCheckout() {
  const Wrapper = createTestWrapper();
  render(<AccordionCheckout />, { wrapper: Wrapper });
  await waitFor(() => expect(screen.getByTestId('step-1-content')).toBeInTheDocument());
}

/** Step 2 lists packages only once the quote lands, so each flow waits for them. */
async function toDeliveryOptions() {
  fireEvent.click(screen.getByTestId('btn-continue-delivery'));
  await waitFor(() => expect(screen.getByTestId(`seller-package-${VENDOR}`)).toBeInTheDocument());
}

async function toPaymentWithValidCard() {
  await toDeliveryOptions();
  fireEvent.click(screen.getByTestId('btn-continue-payment'));
  fireEvent.click(screen.getByTestId('test-card-pill-valid-visa'));
}

/** The button stays disabled until the server has priced the cart, so a click waits for it. */
async function clickPlaceOrder() {
  const button = screen.getByTestId('btn-place-order');
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
}

beforeEach(() => {
  vi.clearAllMocks();

  useAuthStore.setState({
    user: DEMO_ACCOUNTS.customer,
    token: 'mock-token',
    isAuthenticated: true,
  });

  useCartStore.setState({ items: mockPhysicalItems, appliedCoupon: null });
  useCheckoutDraftStore.getState().reset();

  vi.mocked(checkoutApi.quoteCheckout).mockImplementation(async (deliveryOptions, couponCode) =>
    priceQuote(deliveryOptions, couponCode),
  );
  vi.mocked(checkoutApi.placeOrder).mockResolvedValue(placedOrder);
});

describe('AccordionCheckout Component', () => {
  describe('Guest gate', () => {
    it('asks a guest to sign in rather than price a cart the server cannot see', () => {
      useAuthStore.setState({ isAuthenticated: false, user: null });

      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      expect(screen.getByTestId('checkout-signin-gate')).toBeInTheDocument();
      expect(checkoutApi.quoteCheckout).not.toHaveBeenCalled();
    });
  });

  describe('Step 1: Shipping Address & Saved Addresses', () => {
    it('renders step 1 with saved address options and initial address populated', async () => {
      await renderCheckout();

      expect(screen.getByTestId('step-1-content')).toBeInTheDocument();
      expect(screen.getByTestId('saved-address-addr-home')).toBeInTheDocument();
      expect(screen.getByTestId('saved-address-addr-office')).toBeInTheDocument();
      expect(screen.getByTestId('saved-address-new')).toBeInTheDocument();

      const nameInput = screen.getByTestId('input-fullName') as HTMLInputElement;
      expect(nameInput.value).toBe('Sarah Customer');
      const streetInput = screen.getByTestId('input-street') as HTMLInputElement;
      expect(streetInput.value).toBe('742 Evergreen Terrace');
    });

    it('switches address when selecting another saved address radio', async () => {
      await renderCheckout();

      const officeRadio = screen.getByTestId('saved-address-addr-office').querySelector('input')!;
      fireEvent.click(officeRadio);

      const streetInput = screen.getByTestId('input-street') as HTMLInputElement;
      expect(streetInput.value).toBe('100 Silicon Vista Blvd, Suite 400');
      const cityInput = screen.getByTestId('input-city') as HTMLInputElement;
      expect(cityInput.value).toBe('San Jose');
    });

    it('enforces Zod validation when attempting to submit blank required address fields', async () => {
      await renderCheckout();

      const newAddressRadio = screen.getByTestId('saved-address-new').querySelector('input')!;
      fireEvent.click(newAddressRadio);

      fireEvent.change(screen.getByTestId('input-fullName'), { target: { value: '' } });
      fireEvent.click(screen.getByTestId('btn-continue-delivery'));

      expect(screen.getByTestId('error-fullName')).toBeInTheDocument();
      expect(screen.getByTestId('error-fullName')).toHaveTextContent(/Full name is required/i);
    });

    it('advances to Step 2 when shipping address is valid', async () => {
      await renderCheckout();

      fireEvent.click(screen.getByTestId('btn-continue-delivery'));

      expect(screen.getByTestId('step-2-content')).toBeInTheDocument();
    });
  });

  describe('Step 2: Delivery Option per Seller', () => {
    it('displays separate packages per seller with free standard shipping for over $100 and $8.50 otherwise', async () => {
      await renderCheckout();
      await toDeliveryOptions();

      const platformPackage = screen.getByTestId(`seller-package-${PLATFORM}`);
      expect(platformPackage).toHaveTextContent(/Vendora/i);
      expect(platformPackage).toHaveTextContent(/FREE/i);

      const vendorPackage = screen.getByTestId(`seller-package-${VENDOR}`);
      expect(vendorPackage).toHaveTextContent(/SoundWave Audio/i);
      expect(vendorPackage).toHaveTextContent(/\$8\.50/i);
    });

    it('prices the cart through the server instead of estimating on the client', async () => {
      await renderCheckout();
      await toDeliveryOptions();

      expect(checkoutApi.quoteCheckout).toHaveBeenCalled();
      expect(screen.queryByTestId('quote-pending')).not.toBeInTheDocument();
    });

    it('allows selecting Express shipping for a seller group', async () => {
      await renderCheckout();
      await toDeliveryOptions();

      fireEvent.click(screen.getByTestId(`option-express-${VENDOR}`).querySelector('input')!);

      // A new choice re-prices from scratch, so the checked state must come back on the quote.
      await waitFor(() =>
        expect(screen.getByTestId(`seller-package-${VENDOR}`)).toHaveTextContent(/\$23\.50/i),
      );
      expect(vi.mocked(checkoutApi.quoteCheckout).mock.calls.at(-1)?.[0]).toEqual({ [VENDOR]: 'express' });
      expect(screen.getByTestId(`option-express-${VENDOR}`).querySelector('input')!.checked).toBe(true);

      fireEvent.click(screen.getByTestId('btn-continue-payment'));
      expect(screen.getByTestId('step-3-content')).toBeInTheDocument();
    });

    it('waits for the quote instead of showing an invented total', async () => {
      let release: ((quote: CheckoutQuote) => void) | null = null;
      vi.mocked(checkoutApi.quoteCheckout).mockImplementation(
        () =>
          new Promise<CheckoutQuote>((resolve) => {
            release = resolve;
          }),
      );

      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });
      fireEvent.click(screen.getByTestId('btn-continue-delivery'));

      expect(screen.getByTestId('quote-pending')).toBeInTheDocument();

      release!(priceQuote({}));
      await waitFor(() => expect(screen.getByTestId(`seller-package-${PLATFORM}`)).toBeInTheDocument());
    });
  });

  describe('Step 3: Payment, Simulated Luhn Validation & Test Card Presets', () => {
    it('autofills card details when clicking a test card pill and detects card brand', async () => {
      await renderCheckout();
      await toDeliveryOptions();
      fireEvent.click(screen.getByTestId('btn-continue-payment'));

      fireEvent.click(screen.getByTestId('test-card-pill-valid-mastercard'));

      const cardInput = screen.getByTestId('input-cardNumber') as HTMLInputElement;
      expect(cardInput.value).toBe('5555 5555 5555 4444');
      expect(screen.getByText(/Detected: Mastercard/i)).toBeInTheDocument();

      const nameInput = screen.getByTestId('input-cardholderName') as HTMLInputElement;
      expect(nameInput.value).toBe('Alex Smith');
    });

    it('validates card with Luhn algorithm and fails on invalid checksum card', async () => {
      await renderCheckout();
      await toDeliveryOptions();
      fireEvent.click(screen.getByTestId('btn-continue-payment'));

      fireEvent.click(screen.getByTestId('test-card-pill-invalid-card'));
      fireEvent.click(screen.getByTestId('btn-continue-review'));

      expect(screen.getByTestId('error-cardNumber')).toBeInTheDocument();
      expect(screen.getByTestId('error-cardNumber')).toHaveTextContent(/Luhn checksum validation/i);
    });

    it('supports Cash on Delivery (COD) and bypasses card validation', async () => {
      await renderCheckout();
      await toDeliveryOptions();
      fireEvent.click(screen.getByTestId('btn-continue-payment'));

      fireEvent.click(screen.getByTestId('payment-method-cod').querySelector('input')!);
      fireEvent.click(screen.getByTestId('btn-continue-review'));

      expect(screen.getByTestId('step-4-content')).toBeInTheDocument();
      expect(screen.getAllByText(/Cash on Delivery/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Step 4: Review, Re-validation, and Order Placement', () => {
    it('displays summary of packages, re-validates totals, and places order', async () => {
      const onSuccessMock = vi.fn();
      const Wrapper = createTestWrapper();
      render(<AccordionCheckout onSuccess={onSuccessMock} />, { wrapper: Wrapper });
      await waitFor(() => expect(screen.getByTestId('step-1-content')).toBeInTheDocument());

      await toDeliveryOptions();
      // Express on the vendor package only, so the booking must carry that split.
      fireEvent.click(screen.getByTestId(`option-express-${VENDOR}`).querySelector('input')!);
      await waitFor(() =>
        expect(screen.getByTestId(`seller-package-${VENDOR}`)).toHaveTextContent(/\$23\.50/i),
      );

      fireEvent.click(screen.getByTestId('btn-continue-payment'));
      fireEvent.click(screen.getByTestId('test-card-pill-valid-visa'));
      fireEvent.click(screen.getByTestId('btn-continue-review'));

      expect(screen.getByTestId('step-4-content')).toBeInTheDocument();
      expect(screen.getByText(/Price Re-Validation/i)).toBeInTheDocument();

      await clickPlaceOrder();

      await waitFor(() => expect(checkoutApi.placeOrder).toHaveBeenCalledTimes(1));
      expect(checkoutApi.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'card',
          deliveryOptions: { [VENDOR]: 'express' },
          couponCode: null,
          card: { brand: 'Visa', last4: '4242' },
        }),
      );
      expect(useCartStore.getState().items).toHaveLength(0);
      expect(onSuccessMock).toHaveBeenCalledWith('ord-grp-test-999');
    });

    it('books the coupon code the server priced rather than a client total', async () => {
      useCartStore.getState().applyCoupon({ code: 'SAVE10', type: 'percentage', value: 10 });

      await renderCheckout();
      await toDeliveryOptions();
      expect(vi.mocked(checkoutApi.quoteCheckout).mock.calls.at(-1)?.[1]).toBe('SAVE10');

      fireEvent.click(screen.getByTestId('btn-continue-payment'));
      fireEvent.click(screen.getByTestId('payment-method-cod').querySelector('input')!);
      fireEvent.click(screen.getByTestId('btn-continue-review'));
      await clickPlaceOrder();

      await waitFor(() => expect(checkoutApi.placeOrder).toHaveBeenCalledTimes(1));
      expect(checkoutApi.placeOrder.mock.calls[0][0]).toMatchObject({ couponCode: 'SAVE10' });
    });

    it('handles simulated insufficient funds failure on test card', async () => {
      await renderCheckout();
      await toDeliveryOptions();
      fireEvent.click(screen.getByTestId('btn-continue-payment'));

      fireEvent.click(screen.getByTestId('test-card-pill-low-balance'));
      fireEvent.click(screen.getByTestId('btn-continue-review'));

      await clickPlaceOrder();

      await waitFor(() => expect(screen.getByTestId('order-error-banner')).toBeInTheDocument());
      expect(screen.getByTestId('order-error-banner')).toHaveTextContent(/Insufficient funds/i);
      expect(checkoutApi.placeOrder).not.toHaveBeenCalled();
      expect(useCartStore.getState().items.length).toBeGreaterThan(0);
    });

    it('surfaces an order the server refused and keeps the cart', async () => {
      vi.mocked(checkoutApi.placeOrder).mockRejectedValue(new Error('Stock dropped while you were checking out'));

      await renderCheckout();
      await toPaymentWithValidCard();
      fireEvent.click(screen.getByTestId('btn-continue-review'));
      await clickPlaceOrder();

      await waitFor(() => expect(screen.getByTestId('order-error-banner')).toBeInTheDocument());
      expect(screen.getByTestId('order-error-banner')).toHaveTextContent(/Stock dropped/);
      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  describe('Digital-Only Cart Flow', () => {
    it('skips Step 1 and Step 2 directly to Step 3 for digital-only carts', () => {
      useCartStore.setState({ items: mockDigitalItems });

      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      expect(screen.getByTestId('step-1-header')).toHaveTextContent(/Skipped · Digital Only/i);
      expect(screen.getByTestId('step-2-header')).toHaveTextContent(/Skipped · Digital Only/i);
      expect(screen.getByTestId('step-3-content')).toBeInTheDocument();
    });

    it('books a digital order with no shipping address', async () => {
      useCartStore.setState({ items: mockDigitalItems });

      const Wrapper = createTestWrapper();
      render(<AccordionCheckout />, { wrapper: Wrapper });

      fireEvent.click(screen.getByTestId('payment-method-cod').querySelector('input')!);
      fireEvent.click(screen.getByTestId('btn-continue-review'));
      await clickPlaceOrder();

      await waitFor(() => expect(checkoutApi.placeOrder).toHaveBeenCalledTimes(1));
      expect(checkoutApi.placeOrder.mock.calls[0][0].shippingAddress).toBeUndefined();
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

    it('renders distraction-free header and sidebar with cart items when items exist', async () => {
      const Wrapper = createTestWrapper();
      render(<CheckoutPage />, { wrapper: Wrapper });

      expect(screen.getByText(/256-Bit SSL Encrypted Checkout/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Return to Cart/i })).toBeInTheDocument();
      expect(screen.getByText(/Order Summary \(2 items\)/i)).toBeInTheDocument();
      expect(screen.getByTestId('step-1-header')).toBeInTheDocument();

      // $150 + $35 + $8.50 shipping, all of it quoted by the server.
      await waitFor(() => expect(screen.getByText(/Total to pay/i)).toBeInTheDocument());
      expect(screen.getByText(/\$193\.50/)).toBeInTheDocument();
    });
  });
});
