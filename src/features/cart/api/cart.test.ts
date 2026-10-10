import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as cart from './cart';
import { cartRow, productRow, storeRow, supabaseDouble } from '../../../test/supabase-double';

const USER = 'user-1';
const OTHER = 'user-2';
const HEADPHONES = '00000000-0000-4000-8000-000000000101';
const EARBUDS = '00000000-0000-4000-8000-000000000102';
const RETIRED = '00000000-0000-4000-8000-000000000103';

function signIn() {
  supabaseDouble.authState.session = { access_token: 't', user: { id: USER, email: 'buyer@demo.test' } };
}

function seedCatalog() {
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech', slug: 'nova-tech' }));
  supabaseDouble.seedProduct(
    productRow({
      id: HEADPHONES,
      title: 'Reference Headphones',
      slug: 'reference-headphones',
      price: 199.99,
      stock: 5,
      seller_id: 'store-1',
      variants: [
        { id: 'v-black', price: 219.99, label: 'Black' },
        { id: 'v-silver', price: 189.0, label: 'Silver' },
      ],
    }),
  );
  supabaseDouble.seedProduct(productRow({ id: EARBUDS, title: 'Budget Earbuds', slug: 'budget-earbuds', price: 49.5 }));
  // A product that left the shelf: RLS still lets the embed resolve it, so the client must not.
  supabaseDouble.seedProduct(
    productRow({ id: RETIRED, title: 'Retired Speaker', slug: 'retired-speaker', status: 'pending_review' }),
  );
}

beforeEach(() => {
  supabaseDouble.reset();
  seedCatalog();
  signIn();
});

describe('fetchCart', () => {
  it('maps server lines onto live product rows, pricing a matching variant', async () => {
    supabaseDouble.seedCartItem(cartRow({ id: 'c1', user_id: USER, product_id: HEADPHONES, variant_id: 'v-black', quantity: 2 }));
    supabaseDouble.seedCartItem(cartRow({ id: 'c2', user_id: USER, product_id: EARBUDS, quantity: 1 }));

    const items = await cart.fetchCart();

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: `${HEADPHONES}-v-black`,
      productId: HEADPHONES,
      variantId: 'v-black',
      title: 'Reference Headphones',
      price: 219.99,
      quantity: 2,
      maxStock: 5,
      sellerName: 'Nova Tech',
    });
    // A line with no variant uses the base price and is keyed by the product alone.
    expect(items[1]).toMatchObject({ id: EARBUDS, variantId: undefined, price: 49.5 });
  });

  it('drops a line whose product can no longer be ordered', async () => {
    supabaseDouble.seedCartItem(cartRow({ user_id: USER, product_id: RETIRED }));
    supabaseDouble.seedCartItem(cartRow({ user_id: USER, product_id: EARBUDS }));

    const items = await cart.fetchCart();

    expect(items.map((item) => item.productId)).toEqual([EARBUDS]);
  });

  it('refuses to read a cart without a session', async () => {
    supabaseDouble.authState.session = null;

    await expect(cart.fetchCart()).rejects.toThrow('Sign in to use your cart.');
  });

  it('surfaces a failed read instead of returning an empty cart', async () => {
    supabaseDouble.failures.cart_items = 'connection terminated';

    await expect(cart.fetchCart()).rejects.toThrow('Failed to load your cart: connection terminated');
  });
});

describe('saveCartItem', () => {
  it('stores a no-variant line with an empty variant id so the unique key can match it', async () => {
    await cart.saveCartItem({ productId: HEADPHONES }, 3);

    expect(supabaseDouble.tables.cart_items).toHaveLength(1);
    expect(supabaseDouble.tables.cart_items[0]).toMatchObject({
      user_id: USER,
      product_id: HEADPHONES,
      variant_id: '',
      quantity: 3,
    });
  });

  it('replaces the quantity of the matching line rather than stacking a second row', async () => {
    supabaseDouble.seedCartItem(cartRow({ user_id: USER, product_id: HEADPHONES, variant_id: '', quantity: 1 }));

    await cart.saveCartItem({ productId: HEADPHONES }, 4);

    expect(supabaseDouble.tables.cart_items).toHaveLength(1);
    expect(supabaseDouble.tables.cart_items[0].quantity).toBe(4);
  });

  it('keeps two variants of one product as two lines', async () => {
    await cart.saveCartItem({ productId: HEADPHONES, variantId: 'v-black' }, 1);
    await cart.saveCartItem({ productId: HEADPHONES, variantId: 'v-silver' }, 2);

    expect(supabaseDouble.tables.cart_items).toHaveLength(2);
  });

  it('requires a session before writing', async () => {
    supabaseDouble.authState.session = null;

    await expect(cart.saveCartItem({ productId: HEADPHONES }, 1)).rejects.toThrow('Sign in to use your cart.');
    expect(supabaseDouble.tables.cart_items).toHaveLength(0);
  });
});

describe('deleteCartItem', () => {
  it('removes only the addressed line of the signed-in customer', async () => {
    supabaseDouble.seedCartItem(cartRow({ user_id: USER, product_id: HEADPHONES, variant_id: 'v-black' }));
    supabaseDouble.seedCartItem(cartRow({ id: 'keep', user_id: USER, product_id: EARBUDS }));
    supabaseDouble.seedCartItem(cartRow({ id: 'other', user_id: OTHER, product_id: HEADPHONES, variant_id: 'v-black' }));

    await cart.deleteCartItem({ productId: HEADPHONES, variantId: 'v-black' });

    expect(supabaseDouble.tables.cart_items.map((row) => row.id)).toEqual(['keep', 'other']);
  });
});

describe('clearServerCart', () => {
  it('empties the caller’s lines and leaves every other shopper untouched', async () => {
    supabaseDouble.seedCartItem(cartRow({ user_id: USER, product_id: HEADPHONES }));
    supabaseDouble.seedCartItem(cartRow({ id: 'other', user_id: OTHER, product_id: EARBUDS }));

    await cart.clearServerCart();

    expect(supabaseDouble.tables.cart_items.map((row) => row.id)).toEqual(['other']);
  });
});

describe('pushMergedCart', () => {
  it('replays guest lines onto the account and drops ids the database cannot hold', async () => {
    const merged = await cart.pushMergedCart([
      { productId: EARBUDS, quantity: 2, variantId: undefined },
      { productId: 'cat-legacy-1', quantity: 1, variantId: undefined },
    ] as never);

    expect(merged.map((item) => item.productId)).toEqual([EARBUDS]);
    expect(supabaseDouble.tables.cart_items).toHaveLength(1);
  });

  it('merges onto an existing line instead of duplicating it', async () => {
    supabaseDouble.seedCartItem(cartRow({ user_id: USER, product_id: HEADPHONES, variant_id: 'v-black', quantity: 1 }));

    await cart.pushMergedCart([
      { productId: HEADPHONES, variantId: 'v-black', quantity: 3 },
    ] as never);

    expect(supabaseDouble.tables.cart_items).toHaveLength(1);
    expect(supabaseDouble.tables.cart_items[0].quantity).toBe(3);
  });
});
