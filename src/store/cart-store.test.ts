import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { useCartStore } from './cart-store';
import { cartRow, productRow, storeRow, supabaseDouble } from '../test/supabase-double';
import type { CartItem } from '../types/domain';

const USER = 'user-1';
const HEADPHONES = '00000000-0000-4000-8000-000000000101';
const EARBUDS = '00000000-0000-4000-8000-000000000102';
const GUEST_KEY = 'vd:v1:cart:guest';

function line(overrides: Partial<CartItem> = {}): Omit<CartItem, 'quantity'> {
  return {
    id: 'ignored-by-the-store',
    productId: HEADPHONES,
    variantId: undefined,
    title: 'Reference Headphones',
    price: 199.99,
    image: 'https://example.test/headphones.png',
    sellerId: 'store-1',
    sellerName: 'Nova Tech',
    sellerType: 'vendor',
    type: 'physical',
    maxStock: 5,
    ...overrides,
  };
}

function seedCatalog() {
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech', slug: 'nova-tech' }));
  supabaseDouble.seedProduct(productRow({ id: HEADPHONES, title: 'Reference Headphones', price: 199.99, stock: 5 }));
  supabaseDouble.seedProduct(
    productRow({
      id: EARBUDS,
      title: 'Budget Earbuds',
      slug: 'budget-earbuds',
      price: 49.5,
      variants: [{ id: 'v-white', price: 55, label: 'White' }],
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
  supabaseDouble.reset();
  seedCatalog();
  useCartStore.setState({ items: [], activeUserId: null, appliedCoupon: null, hydrating: false, error: null });
});

describe('as a guest', () => {
  it('addresses a line by product and variant, ignoring the id the caller passed', async () => {
    await useCartStore.getState().addItem(line({ productId: EARBUDS, variantId: 'v-white' }));

    expect(useCartStore.getState().items.map((item) => item.id)).toEqual([`${EARBUDS}-v-white`]);
    expect(supabaseDouble.tables.cart_items).toHaveLength(0);
  });

  it('stacks quantity onto the same line and never beyond stock', async () => {
    await useCartStore.getState().addItem(line(), 2);
    await useCartStore.getState().addItem(line(), 4);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it('keeps the cart on the device and drops lines from the mock catalogue', async () => {
    localStorage.setItem(GUEST_KEY, JSON.stringify([{ ...line(), productId: 'prod-legacy', id: 'prod-legacy' }, line()]));
    await useCartStore.getState().initializeForUser(null);

    expect(useCartStore.getState().items.map((item) => item.productId)).toEqual([HEADPHONES]);
  });
});

describe('as a signed-in customer', () => {
  beforeEach(() => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: USER, email: 'buyer@demo.test' } };
  });

  it('reads the server cart and caches it locally', async () => {
    supabaseDouble.seedCartItem(cartRow({ user_id: USER, product_id: HEADPHONES, quantity: 3 }));

    await useCartStore.getState().initializeForUser(USER);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ id: HEADPHONES, quantity: 3, price: 199.99, maxStock: 5 });
    expect(state.hydrating).toBe(false);
    expect(JSON.parse(localStorage.getItem(`vd:v1:cart:${USER}`)!).map((item: CartItem) => item.quantity)).toEqual([3]);
  });

  it('writes added, changed and removed lines to the server', async () => {
    await useCartStore.getState().initializeForUser(USER);

    await useCartStore.getState().addItem(line(), 2);
    expect(supabaseDouble.tables.cart_items[0]).toMatchObject({ variant_id: '', quantity: 2 });

    await useCartStore.getState().updateQuantity(HEADPHONES, 4);
    expect(supabaseDouble.tables.cart_items).toHaveLength(1);
    expect(supabaseDouble.tables.cart_items[0].quantity).toBe(4);

    await useCartStore.getState().removeItem(HEADPHONES);
    expect(supabaseDouble.tables.cart_items).toHaveLength(0);
  });

  it('removes the line when the quantity drops to zero', async () => {
    supabaseDouble.seedCartItem(cartRow({ user_id: USER, product_id: HEADPHONES, quantity: 2 }));
    await useCartStore.getState().initializeForUser(USER);

    await useCartStore.getState().updateQuantity(HEADPHONES, 0);

    expect(useCartStore.getState().items).toEqual([]);
    expect(supabaseDouble.tables.cart_items).toHaveLength(0);
  });

  it('empties the server cart on clear', async () => {
    supabaseDouble.seedCartItem(cartRow({ user_id: USER, product_id: HEADPHONES }));
    await useCartStore.getState().initializeForUser(USER);

    await useCartStore.getState().clearCart();

    expect(useCartStore.getState().items).toEqual([]);
    expect(supabaseDouble.tables.cart_items).toHaveLength(0);
  });

  it('replays a guest cart onto the account, merging the quantities of shared lines', async () => {
    supabaseDouble.seedCartItem(cartRow({ user_id: USER, product_id: HEADPHONES, quantity: 2 }));
    localStorage.setItem(
      GUEST_KEY,
      JSON.stringify([
        { ...line(), id: HEADPHONES, quantity: 2 },
        { ...line(), id: `${EARBUDS}-v-white`, productId: EARBUDS, variantId: 'v-white', quantity: 1 },
      ]),
    );

    await useCartStore.getState().mergeGuestCartIntoUser(USER);

    const items = useCartStore.getState().items;
    expect(items.map((item) => item.id).sort()).toEqual([`${EARBUDS}-v-white`, HEADPHONES].sort());
    expect(items.find((item) => item.id === HEADPHONES)!.quantity).toBe(4);
    expect(localStorage.getItem(GUEST_KEY)).toEqual('[]');
    expect(supabaseDouble.tables.cart_items.filter((row) => row.product_id === EARBUDS)).toHaveLength(1);
  });

  it('reports a rejected write and re-reads the server cart', async () => {
    supabaseDouble.seedCartItem(cartRow({ user_id: USER, product_id: HEADPHONES, quantity: 1 }));
    await useCartStore.getState().initializeForUser(USER);

    supabaseDouble.failures.cart_items = 'row-level security violated';
    await useCartStore.getState().addItem(line({ productId: EARBUDS }), 1);

    // The write and the follow-up read both fail while the table is unavailable, but the
    // customer is told rather than shown a cart the server has never accepted.
    expect(useCartStore.getState().error).toContain('row-level security violated');

    supabaseDouble.failures.cart_items = null;
    await useCartStore.getState().refresh();

    const state = useCartStore.getState();
    expect(state.error).toBeNull();
    expect(state.items.map((item) => item.productId)).toEqual([HEADPHONES]);
  });

  it('refuses to load a cart for a signed-out session', async () => {
    supabaseDouble.authState.session = null;

    await useCartStore.getState().initializeForUser(USER);

    expect(useCartStore.getState().error).toBe('Sign in to use your cart.');
    expect(useCartStore.getState().hydrating).toBe(false);
  });
});
