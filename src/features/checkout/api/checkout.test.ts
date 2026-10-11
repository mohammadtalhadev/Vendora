import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as checkout from './checkout';
import { supabaseDouble } from '../../../test/supabase-double';
import type { CartItem } from '../../../types/domain';

const USER = 'user-1';
const STORE = '00000000-0000-4000-8000-00000000000a';

const ADDRESS = {
  fullName: 'Alex Buyer',
  street: '1 Elm Street',
  city: 'Columbus',
  state: 'OH',
  zipCode: '43004',
  country: 'USA',
  phone: '614-555-0100',
};

function signIn() {
  supabaseDouble.authState.session = { access_token: 't', user: { id: USER, email: 'buyer@demo.test' } };
}

/** The jsonb `checkout_pricing` builds: one vendor package, standard delivery. */
function quoteFixture(overrides: Record<string, unknown> = {}) {
  return {
    groups: [
      {
        sellerId: STORE,
        sellerName: 'Nova Tech',
        sellerType: 'vendor',
        hasPhysical: true,
        items: [
          { productId: 'p-1', variantId: 'v-black', title: 'Reference Headphones', price: 199.99, quantity: 2, image: 'a.png', sellerId: STORE, sellerName: 'Nova Tech' },
        ],
        subtotal: 399.98,
        discount: 39.99,
        netSubtotal: 359.99,
        deliveryOption: 'standard',
        shippingStandard: 0,
        shippingExpress: 15,
        shippingFee: 0,
        commissionRate: 0.1,
        commissionAmount: 36,
        netPayout: 323.99,
        couponCode: 'SAVE10',
      },
    ],
    subtotal: 399.98,
    discountTotal: 39.99,
    shippingTotal: 0,
    grandTotal: 359.99,
    couponCode: 'SAVE10',
    expressFee: 15,
    ...overrides,
  };
}

beforeEach(() => {
  supabaseDouble.reset();
  signIn();
});

describe('cartSignature', () => {
  const line = (overrides: Partial<CartItem> = {}): CartItem => ({
    id: 'l-1',
    productId: 'p-1',
    title: 'Reference Headphones',
    price: 199.99,
    quantity: 1,
    maxStock: 5,
    image: '',
    sellerId: STORE,
    sellerName: 'Nova Tech',
    sellerType: 'vendor',
    type: 'physical',
    ...overrides,
  });

  it('separates variants and counts quantity, so a re-priced cart cannot reuse a stale quote', () => {
    expect(checkout.cartSignature([line()])).toBe('p-1::1');
    expect(checkout.cartSignature([line({ variantId: 'v-black', quantity: 2 })])).toBe('p-1:v-black:2');
    expect(checkout.cartSignature([line(), line({ id: 'l-2', productId: 'p-2' })])).toBe('p-1::1;p-2::1');
  });
});

describe('quoteCheckout', () => {
  it('passes the delivery map and an omitted coupon, never a null', async () => {
    supabaseDouble.setQuote(quoteFixture());

    await checkout.quoteCheckout({ [STORE]: 'express' });

    expect(supabaseDouble.rpcCalls.at(-1)).toEqual({
      fn: 'checkout_quote',
      args: { p_delivery_options: { [STORE]: 'express' }, p_coupon_code: undefined },
    });
  });

  it('uppercases and trims the coupon code on the way to the server', async () => {
    supabaseDouble.setQuote(quoteFixture());

    await checkout.quoteCheckout({}, '  save10 ');

    expect(supabaseDouble.rpcCalls.at(-1)?.args.p_coupon_code).toBe('SAVE10');
  });

  it('maps the priced groups and the money the screen shows', async () => {
    supabaseDouble.setQuote(quoteFixture());

    const quote = await checkout.quoteCheckout({});

    expect(quote.expressFee).toBe(15);
    expect(quote.grandTotal).toBe(359.99);
    expect(quote.groups[0]).toMatchObject({
      sellerId: STORE,
      sellerName: 'Nova Tech',
      deliveryOption: 'standard',
      shippingStandard: 0,
      shippingExpress: 15,
      netSubtotal: 359.99,
      discount: 39.99,
      couponCode: 'SAVE10',
    });
    expect(quote.groups[0].items[0]).toMatchObject({ variantId: 'v-black', price: 199.99, quantity: 2 });
  });

  it('throws when the server refuses to price the cart', async () => {
    supabaseDouble.failRpc('cart is empty');

    await expect(checkout.quoteCheckout({})).rejects.toThrow(/cart is empty/);
  });

  it('throws rather than showing a zero total for an unusable reply', async () => {
    supabaseDouble.setQuote(null);
    supabaseDouble.rpc.mockImplementationOnce(async () => ({ data: null, error: null }));

    await expect(checkout.quoteCheckout({})).rejects.toThrow(/could not price your cart/i);
  });
});

describe('placeOrder', () => {
  const placedFixture = {
    orderId: 'order-1',
    subOrders: [
      {
        id: 'sub-1',
        sellerId: STORE,
        sellerName: 'Nova Tech',
        sellerType: 'vendor',
        type: 'physical',
        status: 'placed',
        subtotal: 359.99,
        discount: 39.99,
        shippingFee: 0,
        deliveryOption: 'express',
        commissionAmount: 36,
        netPayout: 323.99,
        deliveryCode: '4821',
        licenseKey: null,
      },
    ],
    subtotal: 399.98,
    discountTotal: 39.99,
    shippingTotal: 15,
    grandTotal: 374.99,
    paymentStatus: 'succeeded',
    paymentDetails: { brand: 'Visa', last4: '0000', method: 'card' },
  };

  it('refuses a card order with no card, before the RPC runs', async () => {
    await expect(
      checkout.placeOrder({ shippingAddress: ADDRESS, paymentMethod: 'card', deliveryOptions: {} }),
    ).rejects.toThrow(/card you want this order paid with/i);
    expect(supabaseDouble.rpcCalls).toHaveLength(0);
  });

  it('sends the address as a plain record and only the digits the customer typed', async () => {
    supabaseDouble.setPlacedOrder(placedFixture);

    await checkout.placeOrder({
      shippingAddress: ADDRESS,
      paymentMethod: 'card',
      deliveryOptions: { [STORE]: 'express' },
      couponCode: null,
      customerNotes: '  Leave with the concierge  ',
      card: { brand: 'Visa', last4: '0000' },
    });

    expect(supabaseDouble.rpcCalls.at(-1)).toEqual({
      fn: 'place_order',
      args: {
        p_address: ADDRESS,
        p_payment_method: 'card',
        p_coupon_code: undefined,
        p_customer_notes: 'Leave with the concierge',
        p_delivery_options: { [STORE]: 'express' },
        p_card_brand: 'Visa',
        p_card_last4: '0000',
      },
    });
  });

  it('books a digital-only order with an empty address and no card columns', async () => {
    supabaseDouble.setPlacedOrder({ ...placedFixture, subOrders: [] });

    await checkout.placeOrder({ paymentMethod: 'cod', deliveryOptions: {} });

    expect(supabaseDouble.rpcCalls.at(-1)?.args).toMatchObject({
      p_address: {},
      p_payment_method: 'cod',
      p_card_brand: undefined,
    });
  });

  it('hands back the money, the payment status and the code shown once', async () => {
    supabaseDouble.setPlacedOrder(placedFixture);

    const placed = await checkout.placeOrder({
      shippingAddress: ADDRESS,
      paymentMethod: 'card',
      deliveryOptions: {},
      card: { brand: 'Visa', last4: '0000' },
    });

    expect(placed.orderId).toBe('order-1');
    expect(placed.paymentStatus).toBe('succeeded');
    expect(placed.grandTotal).toBe(374.99);
    expect(placed.paymentDetails).toEqual({ brand: 'Visa', last4: '0000', method: 'card' });
    expect(placed.subOrders[0]).toMatchObject({
      deliveryCode: '4821',
      licenseKey: null,
      deliveryOption: 'express',
      status: 'placed',
      sellerType: 'vendor',
    });
  });

  it('surfaces a booking failure with the server wording', async () => {
    supabaseDouble.failRpc('stock dropped while you were checking out');

    await expect(
      checkout.placeOrder({ shippingAddress: ADDRESS, paymentMethod: 'cod', deliveryOptions: {} }),
    ).rejects.toThrow(/stock dropped/);
  });
});
