import { beforeEach, describe, expect, it, vi } from 'vitest';

// The cart's shipping figure comes from the server quote hook; mock it so
// both branches (quote present / no quote) render deterministically.
const quoteState = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock('../features/checkout/hooks/useCheckout', () => ({
  useCartServerQuote: () => ({ data: quoteState.current }),
}));

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CartPage } from './CartPage';
import { useCartStore } from '../store/cart-store';
import { formatPrice } from '../store/currency-store';
import type { CartItem } from '../types/domain';
import type { CheckoutQuote } from '../features/checkout/api/checkout';

const ITEM: CartItem = {
  id: 'prod-achar',
  productId: 'prod-achar',
  title: 'National Achar',
  price: 850,
  quantity: 1,
  maxStock: 10,
  image: '/achar.png',
  sellerId: 'vendor-foods',
  sellerName: 'National Foods',
  sellerType: 'vendor',
  type: 'physical',
};

const QUOTE: CheckoutQuote = {
  groups: [
    {
      sellerId: 'vendor-foods',
      sellerName: 'National Foods',
      sellerType: 'vendor',
      hasPhysical: true,
      items: [],
      subtotal: 850,
      discount: 0,
      netSubtotal: 850,
      deliveryOption: 'standard',
      shippingStandard: 250,
      shippingExpress: 500,
      shippingFee: 250,
      commissionRate: 0.1,
      commissionAmount: 85,
      netPayout: 765,
      couponCode: null,
    },
  ],
  subtotal: 850,
  discountTotal: 0,
  shippingTotal: 250,
  grandTotal: 1100,
  couponCode: null,
  expressFee: 250,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>,
  );

describe('CartPage shipping quote (Batch 57)', () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ items: [ITEM], appliedCoupon: null, error: null });
  });

  it('shows the server quote shipping and grand total when a quote exists', () => {
    quoteState.current = QUOTE;
    renderPage();

    // The exact failure this fixes: the cart used to announce FREE shipping
    // from a legacy client rule while checkout charged the real fee.
    expect(screen.queryByText('FREE')).not.toBeInTheDocument();
    expect(screen.getByText(formatPrice(250))).toBeInTheDocument();
    expect(screen.getByText(formatPrice(1100))).toBeInTheDocument();
    expect(screen.getByText(/\+ .* shipping/)).toBeInTheDocument();
  });

  it('falls back to an honest "calculated at checkout" state without a quote', () => {
    quoteState.current = undefined;
    renderPage();

    expect(screen.getAllByText(/calculated at checkout/i).length).toBeGreaterThan(0);
    // The before-shipping total is the items subtotal (unit price + total
    // both show it), and nothing on the page claims the shipping is free.
    expect(screen.queryByText('FREE')).not.toBeInTheDocument();
    expect(screen.getByText(/Total \(before shipping\)/)).toBeInTheDocument();
    expect(screen.getAllByText(formatPrice(850)).length).toBeGreaterThan(0);
  });
});
