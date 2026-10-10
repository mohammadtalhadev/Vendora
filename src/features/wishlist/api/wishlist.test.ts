import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as wishlist from './wishlist';
import { productRow, storeRow, supabaseDouble, wishlistRow } from '../../../test/supabase-double';

const USER = 'user-1';
const OTHER = 'user-2';
const HEADPHONES = '00000000-0000-4000-8000-000000000101';
const EARBUDS = '00000000-0000-4000-8000-000000000102';
const RETIRED = '00000000-0000-4000-8000-000000000103';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.authState.session = { access_token: 't', user: { id: USER, email: 'buyer@demo.test' } };
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-1', store_name: 'Nova Tech', slug: 'nova-tech' }));
  supabaseDouble.seedProduct(productRow({ id: HEADPHONES, title: 'Reference Headphones', price: 199.99 }));
  supabaseDouble.seedProduct(productRow({ id: EARBUDS, title: 'Budget Earbuds', slug: 'budget-earbuds', price: 49.5 }));
  supabaseDouble.seedProduct(productRow({ id: RETIRED, title: 'Retired Speaker', status: 'rejected' }));
});

describe('fetchWishlist', () => {
  it('reads the signed-in customer’s saves as live product rows', async () => {
    supabaseDouble.seedWishlistItem(wishlistRow({ user_id: USER, product_id: HEADPHONES }));

    const items = await wishlist.fetchWishlist();

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: HEADPHONES, title: 'Reference Headphones', sellerName: 'Nova Tech' });
  });

  it('drops a save whose product left the marketplace', async () => {
    supabaseDouble.seedWishlistItem(wishlistRow({ user_id: USER, product_id: RETIRED }));
    supabaseDouble.seedWishlistItem(wishlistRow({ id: 'w2', user_id: USER, product_id: EARBUDS }));

    const items = await wishlist.fetchWishlist();

    expect(items.map((item) => item.id)).toEqual([EARBUDS]);
  });

  it('refuses to read a wishlist without a session', async () => {
    supabaseDouble.authState.session = null;

    await expect(wishlist.fetchWishlist()).rejects.toThrow('Sign in to save items.');
  });

  it('surfaces a failed read instead of an empty shelf', async () => {
    supabaseDouble.failures.wishlist_items = 'relation does not exist';

    await expect(wishlist.fetchWishlist()).rejects.toThrow('Failed to load your wishlist: relation does not exist');
  });
});

describe('addWishlistItem', () => {
  it('stores one row per product however often it is saved', async () => {
    await wishlist.addWishlistItem(HEADPHONES);
    await wishlist.addWishlistItem(HEADPHONES);

    expect(supabaseDouble.tables.wishlist_items).toHaveLength(1);
    expect(supabaseDouble.tables.wishlist_items[0]).toMatchObject({ user_id: USER, product_id: HEADPHONES });
  });

  it('requires a session before writing', async () => {
    supabaseDouble.authState.session = null;

    await expect(wishlist.addWishlistItem(HEADPHONES)).rejects.toThrow('Sign in to save items.');
    expect(supabaseDouble.tables.wishlist_items).toHaveLength(0);
  });
});

describe('removeWishlistItem', () => {
  it('removes only the caller’s save of that product', async () => {
    supabaseDouble.seedWishlistItem(wishlistRow({ id: 'mine', user_id: USER, product_id: HEADPHONES }));
    supabaseDouble.seedWishlistItem(wishlistRow({ id: 'theirs', user_id: OTHER, product_id: HEADPHONES }));

    await wishlist.removeWishlistItem(HEADPHONES);

    expect(supabaseDouble.tables.wishlist_items.map((row) => row.id)).toEqual(['theirs']);
  });
});

describe('clearServerWishlist', () => {
  it('empties the caller’s shelf only', async () => {
    supabaseDouble.seedWishlistItem(wishlistRow({ id: 'mine', user_id: USER }));
    supabaseDouble.seedWishlistItem(wishlistRow({ id: 'theirs', user_id: OTHER }));

    await wishlist.clearServerWishlist();

    expect(supabaseDouble.tables.wishlist_items.map((row) => row.id)).toEqual(['theirs']);
  });
});

describe('pushGuestWishlist', () => {
  it('replays deduplicated guest saves and drops ids the database cannot hold', async () => {
    const synced = await wishlist.pushGuestWishlist([EARBUDS, EARBUDS, HEADPHONES, 'cat-legacy-1']);

    expect(synced.sort()).toEqual([EARBUDS, HEADPHONES].sort());
    expect(supabaseDouble.tables.wishlist_items).toHaveLength(2);
  });

  it('leaves an already-saved product as a single row', async () => {
    supabaseDouble.seedWishlistItem(wishlistRow({ user_id: USER, product_id: HEADPHONES }));

    await wishlist.pushGuestWishlist([HEADPHONES]);

    expect(supabaseDouble.tables.wishlist_items).toHaveLength(1);
  });

  it('writes nothing when every guest id is stale', async () => {
    const synced = await wishlist.pushGuestWishlist(['prod-1631234567890']);

    expect(synced).toEqual([]);
    expect(supabaseDouble.tables.wishlist_items).toHaveLength(0);
  });
});
