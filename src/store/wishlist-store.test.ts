import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { useWishlistStore } from './wishlist-store';
import { productRow, storeRow, supabaseDouble, wishlistRow } from '../test/supabase-double';
import type { Product } from '../types/domain';

const USER = 'user-1';
const HEADPHONES = '00000000-0000-4000-8000-000000000101';
const EARBUDS = '00000000-0000-4000-8000-000000000102';
const GUEST_KEY = 'vd:v1:wishlist:guest';
const LEGACY_KEY = 'vd:v1:wishlist';

function toProduct(id: string, title: string): Product {
  return {
    id,
    title,
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    description: 'A demo product.',
    category: 'Audio',
    brand: 'AudioBrand',
    images: ['https://example.test/product.png'],
    price: 199.99,
    type: 'physical',
    sellerId: 'store-1',
    sellerName: 'Nova Tech',
    sellerType: 'vendor',
    variants: [],
    stock: 25,
    rating: 4.7,
    reviewCount: 320,
    status: 'approved',
    createdAt: '2026-10-01T00:00:00.000Z',
  };
}

const headphones = toProduct(HEADPHONES, 'Reference Headphones');
const earbuds = toProduct(EARBUDS, 'Budget Earbuds');

function seedCatalog() {
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech', slug: 'nova-tech' }));
  supabaseDouble.seedProduct(productRow({ id: HEADPHONES, title: 'Reference Headphones', price: 199.99 }));
  supabaseDouble.seedProduct(productRow({ id: EARBUDS, title: 'Budget Earbuds', slug: 'budget-earbuds', price: 49.5 }));
}

beforeEach(() => {
  localStorage.clear();
  supabaseDouble.reset();
  seedCatalog();
  useWishlistStore.getState().initializeForGuest();
});

describe('as a guest', () => {
  it('keeps saves on the device and never writes to the server', async () => {
    await useWishlistStore.getState().toggleWishlist(headphones);

    expect(useWishlistStore.getState().items.map((item) => item.id)).toEqual([HEADPHONES]);
    expect(localStorage.getItem(GUEST_KEY)).toContain(HEADPHONES);
    expect(supabaseDouble.tables.wishlist_items).toHaveLength(0);
  });

  it('un-saves an item with the same toggle', async () => {
    await useWishlistStore.getState().toggleWishlist(headphones);
    await useWishlistStore.getState().toggleWishlist(headphones);

    expect(useWishlistStore.getState().isInWishlist(HEADPHONES)).toBe(false);
    expect(useWishlistStore.getState().items).toEqual([]);
  });

  it('ignores shelf content from the mock catalogue that no row can match', () => {
    localStorage.setItem(GUEST_KEY, JSON.stringify([{ id: 'prod-pulse-headphones' }, headphones]));
    useWishlistStore.getState().initializeForGuest();

    expect(useWishlistStore.getState().items.map((item) => item.id)).toEqual([HEADPHONES]);
  });

  it('moves saves stored under the old key onto the guest key once', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([headphones]));
    useWishlistStore.getState().initializeForGuest();

    expect(useWishlistStore.getState().items.map((item) => item.id)).toEqual([HEADPHONES]);
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });
});

describe('as a signed-in customer', () => {
  beforeEach(() => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: USER, email: 'buyer@demo.test' } };
  });

  it('loads the server shelf and caches it for the next visit', async () => {
    supabaseDouble.seedWishlistItem(wishlistRow({ user_id: USER, product_id: HEADPHONES }));

    await useWishlistStore.getState().loadWishlistForUser(USER);

    const state = useWishlistStore.getState();
    expect(state.items.map((item) => item.id)).toEqual([HEADPHONES]);
    expect(state.error).toBeNull();
    expect(JSON.parse(localStorage.getItem(`vd:v1:wishlist:${USER}`)!).map((item: Product) => item.id)).toEqual([
      HEADPHONES,
    ]);
  });

  it('replays guest saves onto the account, then clears the device copy', async () => {
    await useWishlistStore.getState().toggleWishlist(earbuds);

    await useWishlistStore.getState().loadWishlistForUser(USER);

    expect(supabaseDouble.tables.wishlist_items.map((row) => row.product_id)).toEqual([EARBUDS]);
    expect(localStorage.getItem(GUEST_KEY)).toEqual('[]');
    expect(useWishlistStore.getState().items.map((item) => item.id)).toEqual([EARBUDS]);
  });

  it('sends a save and its reversal to the server', async () => {
    await useWishlistStore.getState().loadWishlistForUser(USER);

    await useWishlistStore.getState().toggleWishlist(headphones);
    expect(supabaseDouble.tables.wishlist_items).toHaveLength(1);
    expect(useWishlistStore.getState().isInWishlist(HEADPHONES)).toBe(true);

    await useWishlistStore.getState().toggleWishlist(headphones);
    expect(supabaseDouble.tables.wishlist_items).toHaveLength(0);
    expect(useWishlistStore.getState().isInWishlist(HEADPHONES)).toBe(false);
  });

  it('deletes the server row when an item is removed', async () => {
    supabaseDouble.seedWishlistItem(wishlistRow({ user_id: USER, product_id: HEADPHONES }));
    await useWishlistStore.getState().loadWishlistForUser(USER);

    await useWishlistStore.getState().removeItem(HEADPHONES);

    expect(supabaseDouble.tables.wishlist_items).toHaveLength(0);
    expect(useWishlistStore.getState().items).toEqual([]);
  });

  it('empties the server shelf on clear', async () => {
    supabaseDouble.seedWishlistItem(wishlistRow({ id: 'w1', user_id: USER, product_id: HEADPHONES }));
    supabaseDouble.seedWishlistItem(wishlistRow({ id: 'w2', user_id: USER, product_id: EARBUDS }));
    await useWishlistStore.getState().loadWishlistForUser(USER);

    await useWishlistStore.getState().clearWishlist();

    expect(supabaseDouble.tables.wishlist_items).toHaveLength(0);
  });

  it('surfaces a rejected write and re-reads the truth from the server', async () => {
    supabaseDouble.seedWishlistItem(wishlistRow({ user_id: USER, product_id: HEADPHONES }));
    await useWishlistStore.getState().loadWishlistForUser(USER);

    supabaseDouble.failures.wishlist_items = 'row-level security violated';
    await useWishlistStore.getState().toggleWishlist(earbuds);

    // The rejected write is reported, and the shelf is re-read rather than left optimistic.
    expect(useWishlistStore.getState().error).toContain('row-level security violated');
    expect(supabaseDouble.tables.wishlist_items).toHaveLength(1);

    supabaseDouble.failures.wishlist_items = null;
    await useWishlistStore.getState().refresh();

    const state = useWishlistStore.getState();
    expect(state.error).toBeNull();
    expect(state.items.map((item) => item.id)).toEqual([HEADPHONES]);
    expect(supabaseDouble.tables.wishlist_items).toHaveLength(1);
  });

  it('reports a failed load instead of showing an empty shelf', async () => {
    supabaseDouble.failures.wishlist_items = 'connection terminated';

    await useWishlistStore.getState().loadWishlistForUser(USER);

    expect(useWishlistStore.getState().error).toBe('Failed to load your wishlist: connection terminated');
    expect(useWishlistStore.getState().hydrating).toBe(false);
  });

  it('goes back to the device shelf on sign-out', async () => {
    supabaseDouble.seedWishlistItem(wishlistRow({ user_id: USER, product_id: HEADPHONES }));
    await useWishlistStore.getState().loadWishlistForUser(USER);

    useWishlistStore.getState().initializeForGuest();

    expect(useWishlistStore.getState().activeUserId).toBeNull();
    expect(useWishlistStore.getState().items).toEqual([]);
  });
});
