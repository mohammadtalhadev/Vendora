import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CartItem } from '../types/domain';

/**
 * Regression tests for the live cart race (QA C-2): a server read that started
 * BEFORE a local mutation must never overwrite that mutation when it lands.
 * The cart API is replaced with an in-memory "server" whose reads can be held
 * open, so each test controls the exact interleaving the QA run hit — add →
 * cart shows the item → the in-flight read resolves with the older snapshot →
 * the item vanished and the cart reverted to the older server state.
 */
const api = vi.hoisted(() => ({
  fetchCart: vi.fn(),
  saveCartItem: vi.fn(),
  deleteCartItem: vi.fn(),
  clearServerCart: vi.fn(),
  pushMergedCart: vi.fn(),
}));

vi.mock('../features/cart/api/cart', () => ({
  cartLineId: ({ productId, variantId }: { productId: string; variantId?: string | null }) =>
    variantId ? `${productId}-${variantId}` : productId,
  fetchCart: api.fetchCart,
  saveCartItem: api.saveCartItem,
  deleteCartItem: api.deleteCartItem,
  clearServerCart: api.clearServerCart,
  pushMergedCart: api.pushMergedCart,
}));

vi.mock('../features/catalog/api/product-row', () => ({
  isProductId: (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
}));

import { useCartStore } from './cart-store';

const USER = 'user-1';
const SEED_A = '00000000-0000-4000-8000-000000000201';
const SEED_B = '00000000-0000-4000-8000-000000000202';
const NEW_ITEM = '00000000-0000-4000-8000-000000000203';
const RAPID_A = '00000000-0000-4000-8000-000000000204';
const RAPID_B = '00000000-0000-4000-8000-000000000205';

type LineDraft = Omit<CartItem, 'quantity'>;

const draft = (productId: string, price: number): LineDraft => ({
  id: productId,
  productId,
  title: `Product ${productId.slice(-3)}`,
  price,
  maxStock: 10,
  image: '',
  sellerId: 'store-1',
  sellerName: 'Nova Tech',
  sellerType: 'vendor',
  type: 'physical',
});

const line = (productId: string, price: number, quantity = 1): CartItem => ({
  ...draft(productId, price),
  quantity,
});

/** The server's rows, one per (product, variant), mirroring cart_items. */
let server: CartItem[];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  server = [line(SEED_A, 45692), line(SEED_B, 6923)];
  useCartStore.setState({
    items: [],
    activeUserId: null,
    appliedCoupon: null,
    hydrating: false,
    error: null,
  });

  api.fetchCart.mockImplementation(async () => [...server]);
  api.saveCartItem.mockImplementation(async (item: LineDraft, quantity: number) => {
    const id = item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
    const existing = server.find((entry) => entry.id === id);
    if (existing) existing.quantity = quantity;
    else server.push({ ...item, id, quantity });
  });
  api.deleteCartItem.mockImplementation(
    async (key: { productId: string; variantId?: string | null }) => {
      const id = key.variantId ? `${key.productId}-${key.variantId}` : key.productId;
      server = server.filter((entry) => entry.id !== id);
    },
  );
  api.clearServerCart.mockImplementation(async () => {
    server = [];
  });
  api.pushMergedCart.mockImplementation(async (items: CartItem[]) => items);
});

describe('cart store persistence (race regressions)', () => {
  it('keeps an added item across a store re-read (drawer close + reopen)', async () => {
    await useCartStore.getState().initializeForUser(USER);
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual([SEED_A, SEED_B]);

    await useCartStore.getState().addItem(draft(NEW_ITEM, 82522));
    expect(useCartStore.getState().items.map((i) => i.productId)).toContain(NEW_ITEM);

    // Reopening the drawer re-reads the store; a refresh re-reads the server.
    // Neither may drop the line the customer just added.
    await useCartStore.getState().refresh();
    const items = useCartStore.getState().items;
    expect(items.map((i) => i.productId)).toEqual([SEED_A, SEED_B, NEW_ITEM]);

    // The local cache agrees, so a remount shows the same cart.
    const cached = JSON.parse(localStorage.getItem(`vd:v1:cart:${USER}`) ?? '[]') as CartItem[];
    expect(cached.map((i) => i.productId)).toContain(NEW_ITEM);
  });

  it('does not let a server read started before an add overwrite the add when it lands', async () => {
    localStorage.setItem(`vd:v1:cart:${USER}`, JSON.stringify(server));
    const staleRead = deferred<CartItem[]>();
    api.fetchCart.mockImplementationOnce(() => staleRead.promise);

    const init = useCartStore.getState().initializeForUser(USER);
    // The cached cart renders immediately while the server read is in flight.
    expect(useCartStore.getState().items).toHaveLength(2);

    await useCartStore.getState().addItem(draft(NEW_ITEM, 82522));
    expect(useCartStore.getState().items.map((i) => i.productId)).toContain(NEW_ITEM);

    // The read resolves with the snapshot from before the add existed.
    staleRead.resolve([line(SEED_A, 45692), line(SEED_B, 6923)]);
    await init;
    await flush();

    const items = useCartStore.getState().items;
    expect(items.map((i) => i.productId)).toContain(NEW_ITEM);
    expect(items).toHaveLength(3);
  });

  it('keeps two rapid adds made while the first server read is still in flight', async () => {
    localStorage.setItem(`vd:v1:cart:${USER}`, JSON.stringify(server));
    const staleRead = deferred<CartItem[]>();
    api.fetchCart.mockImplementationOnce(() => staleRead.promise);

    const init = useCartStore.getState().initializeForUser(USER);
    const addA = useCartStore.getState().addItem(draft(RAPID_A, 1000));
    const addB = useCartStore.getState().addItem(draft(RAPID_B, 2000));

    staleRead.resolve([line(SEED_A, 45692), line(SEED_B, 6923)]);
    await Promise.all([init, addA, addB]);
    await flush();

    const ids = useCartStore.getState().items.map((i) => i.productId);
    expect(ids).toContain(RAPID_A);
    expect(ids).toContain(RAPID_B);
    expect(ids).toContain(SEED_A);
    expect(ids).toContain(SEED_B);
  });

  it('does not resurrect a cleared cart when a stale read lands afterwards', async () => {
    localStorage.setItem(`vd:v1:cart:${USER}`, JSON.stringify(server));
    const staleRead = deferred<CartItem[]>();
    api.fetchCart.mockImplementationOnce(() => staleRead.promise);

    const init = useCartStore.getState().initializeForUser(USER);
    await useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);

    staleRead.resolve([line(SEED_A, 45692), line(SEED_B, 6923)]);
    await init;
    await flush();

    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
