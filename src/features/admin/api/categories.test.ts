import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as categories from './categories';
import {
  categoryRow,
  productRow,
  profileRow,
  storeRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const AUDIO = '00000000-0000-4000-8000-000000000001';
const HEADPHONES = '00000000-0000-4000-8000-000000000002';
const SPEAKERS = '00000000-0000-4000-8000-000000000003';
const HOME = '00000000-0000-4000-8000-000000000004';
const KITCHEN = '00000000-0000-4000-8000-000000000005';
const MICROPHONES = '00000000-0000-4000-8000-000000000006';

const HP_ONE = '00000000-0000-4000-8000-000000000101';
const HP_TWO = '00000000-0000-4000-8000-000000000102';
const AMP = '00000000-0000-4000-8000-000000000103';
const MIC = '00000000-0000-4000-8000-000000000104';
const LOOSE_OLD = '00000000-0000-4000-8000-000000000105';
const LOOSE_NEW = '00000000-0000-4000-8000-000000000106';

const STORE = 'store-1';
const SECOND = 'store-2';
const SELLER = 'user-1';

/** A listing under a category, so the tree's counts are rows the test actually seeded. */
const listing = (
  id: string,
  categoryId: string | null,
  seller: string = STORE,
  at: string = '2026-10-01T00:00:00.000Z',
) => supabaseDouble.seedProduct(productRow({ id, category_id: categoryId, seller_id: seller, created_at: at }));

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
  supabaseDouble.seedProfile(profileRow({ id: SELLER, email: 'marcus@demo.test', name: 'Marcus Seller' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: STORE, user_id: SELLER, store_name: 'Nova Tech', slug: 'nova-tech' }));

  // Two roots, one of them nested: Audio holds Headphones and Speakers, Home stands alone.
  supabaseDouble.seedCategory(categoryRow({
    id: AUDIO, name: 'Audio', slug: 'audio', icon: 'volume-2', commission_rate_override: 0.11,
  }));
  supabaseDouble.seedCategory(categoryRow({ id: HEADPHONES, name: 'Headphones', slug: 'headphones', parent_id: AUDIO }));
  supabaseDouble.seedCategory(categoryRow({
    id: SPEAKERS, name: 'Speakers', slug: 'speakers', parent_id: AUDIO, is_active: false,
  }));
  supabaseDouble.seedCategory(categoryRow({ id: HOME, name: 'Home', slug: 'home' }));
});

describe('fetchCategoryTree', () => {
  it('nests the seeded categories and counts the listings each one actually holds', async () => {
    listing(HP_ONE, HEADPHONES, STORE);
    listing(HP_TWO, HEADPHONES, SECOND);
    listing(AMP, AUDIO, STORE);

    const tree = await categories.fetchCategoryTree();

    expect(supabaseDouble.rpcCalls.at(-1)?.fn).toBe('admin_category_tree');
    expect(tree.total).toBe(4);
    expect(tree.roots.map((root) => root.name)).toEqual(['Audio', 'Home']);

    const audio = tree.roots[0];
    expect(audio).toMatchObject({
      id: AUDIO, slug: 'audio', icon: 'volume-2', image: null, isActive: true,
      commissionOverride: 0.11,
      // The shelf under a root is its own listings only; `products` is not rolled up from children.
      products: 1, sellers: 1,
    });
    expect(audio.children.map((child) => child.id)).toEqual([HEADPHONES, SPEAKERS]);
    expect(audio.children[0]).toMatchObject({ name: 'Headphones', products: 2, sellers: 2, isActive: true, commissionOverride: null });
    expect(audio.children[1]).toMatchObject({ name: 'Speakers', products: 0, sellers: 0, isActive: false });

    // A leaf the SQL returns without a children array still maps to an empty one.
    expect(tree.roots[1]).toMatchObject({ id: HOME, products: 0, sellers: 0, icon: null, image: null });
    expect(tree.roots[1].children).toEqual([]);
  });

  it('hands back the listings the taxonomy has not placed, newest first', async () => {
    listing(LOOSE_OLD, null, STORE, '2026-10-02T00:00:00.000Z');
    listing(LOOSE_NEW, null, STORE, '2026-10-06T00:00:00.000Z');
    listing(HP_ONE, HEADPHONES);

    const tree = await categories.fetchCategoryTree();

    expect(tree.unmapped.map((row) => row.id)).toEqual([LOOSE_NEW, LOOSE_OLD]);
    expect(tree.unmapped[0]).toMatchObject({
      title: 'Reference Headphones', slug: 'reference-headphones', brand: 'AudioBrand',
      price: 199.99, stock: 25, status: 'approved', storeName: 'Nova Tech',
    });
  });

  it('throws on a failed read instead of resolving to an empty taxonomy', async () => {
    supabaseDouble.failRpc('permission denied for function admin_category_tree');

    await expect(categories.fetchCategoryTree()).rejects.toThrow(
      /Failed to load the category tree: permission denied/i,
    );
  });

  it('refuses the tree to a session that is not the platform team', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: SELLER, email: 'marcus@demo.test' } };

    await expect(categories.fetchCategoryTree()).rejects.toThrow(/only the platform team/i);
  });
});

describe('createCategory', () => {
  it('sends the five arguments the RPC declares and reports the category it made', async () => {
    const created = await categories.createCategory({ name: 'Wearables', slug: 'Wearables', icon: 'watch' });

    expect(supabaseDouble.rpcCalls.at(-1)?.fn).toBe('admin_create_category');
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({
      p_name: 'Wearables', p_slug: 'Wearables', p_parent_id: null, p_icon: 'watch', p_image: null,
    });
    // The function echoes what it was handed; the row is what the column normalised it to.
    expect(created.name).toBe('Wearables');
    expect(created.slug).toBe('Wearables');
    expect(supabaseDouble.tables.categories.at(-1)).toMatchObject({
      id: created.id, name: 'Wearables', slug: 'wearables', parent_id: null, is_active: true,
      commission_rate_override: null,
    });
    expect((await categories.fetchCategoryTree()).roots.map((root) => root.id)).toContain(created.id);
  });

  it('surfaces the database’s own refusals', async () => {
    await expect(categories.createCategory({ name: '   ', slug: 'blank' })).rejects.toThrow(
      /Could not create the category: A category needs a name/,
    );
    await expect(categories.createCategory({ name: 'Kids', slug: 'kids', parentId: 'missing-parent' })).rejects.toThrow(
      /The parent category does not exist/,
    );
    expect(supabaseDouble.tables.categories.map((row) => row.slug)).toEqual(['audio', 'headphones', 'speakers', 'home']);
  });
});

describe('updateCategory', () => {
  it('touches only the columns it was given, so a partial form cannot wipe a category', async () => {
    const result = await categories.updateCategory({ categoryId: AUDIO, isActive: false });

    expect(supabaseDouble.rpcCalls.at(-1)?.fn).toBe('admin_update_category');
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({
      p_category_id: AUDIO, p_name: null, p_slug: null, p_parent_id: null,
      p_is_active: false, p_icon: null, p_image: null,
    });
    expect(result).toEqual({ id: AUDIO });

    const row = supabaseDouble.tables.categories.find((category) => category.id === AUDIO);
    expect(row).toMatchObject({ name: 'Audio', slug: 'audio', icon: 'volume-2', is_active: false });
    expect((await categories.fetchCategoryTree()).roots.find((root) => root.id === AUDIO)?.isActive).toBe(false);
  });

  it('refuses a category as its own parent, and leaves the row where it was', async () => {
    await expect(categories.updateCategory({ categoryId: AUDIO, parentId: AUDIO })).rejects.toThrow(
      /Could not update the category: A category cannot be its own parent/,
    );
    expect(supabaseDouble.tables.categories.find((row) => row.id === AUDIO)?.parent_id).toBeNull();

    await expect(categories.updateCategory({ categoryId: 'gone' })).rejects.toThrow(
      /Could not update the category: Category not found/,
    );
  });
});

describe('deleteCategory', () => {
  it('refuses while listings still point at the category', async () => {
    listing(HP_ONE, HEADPHONES);
    listing(HP_TWO, HEADPHONES, SECOND);

    await expect(categories.deleteCategory(HEADPHONES)).rejects.toThrow(
      /Could not delete the category: This category still has 2 listing\(s\)\. Re-assign them first/,
    );
    expect(supabaseDouble.tables.categories.some((row) => row.id === HEADPHONES)).toBe(true);
  });

  it('refuses while subcategories hang under it', async () => {
    supabaseDouble.seedCategory(categoryRow({ id: KITCHEN, name: 'Kitchen', slug: 'kitchen', parent_id: HOME }));

    await expect(categories.deleteCategory(HOME)).rejects.toThrow(/still has 1 subcategor/);
    expect(supabaseDouble.tables.categories.some((row) => row.id === HOME)).toBe(true);
  });

  it('deletes the one that is empty once its last listing has moved out', async () => {
    supabaseDouble.seedCategory(categoryRow({ id: MICROPHONES, name: 'Microphones', slug: 'microphones' }));
    listing(MIC, MICROPHONES);

    await expect(categories.deleteCategory(MICROPHONES)).rejects.toThrow(/still has 1 listing/);

    expect(await categories.assignProductCategory(MIC, null)).toEqual({ id: MIC, categoryId: null });
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_product_id: MIC, p_category_id: null });

    expect(await categories.deleteCategory(MICROPHONES)).toEqual({ id: MICROPHONES, deleted: true });
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_category_id: MICROPHONES });
    expect(supabaseDouble.tables.categories.some((row) => row.id === MICROPHONES)).toBe(false);

    const tree = await categories.fetchCategoryTree();
    expect(tree.roots.map((root) => root.id)).not.toContain(MICROPHONES);
    expect(tree.unmapped.map((row) => row.id)).toContain(MIC);
  });

  it('refuses the writes to a session that is not the platform team', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: SELLER, email: 'marcus@demo.test' } };
    const before = supabaseDouble.tables.categories.length;

    await expect(categories.createCategory({ name: 'Wearables', slug: 'wearables' })).rejects.toThrow(/only the platform team/i);
    await expect(categories.updateCategory({ categoryId: AUDIO, isActive: false })).rejects.toThrow(/only the platform team/i);
    await expect(categories.deleteCategory(AUDIO)).rejects.toThrow(/only the platform team/i);
    await expect(categories.setCategoryCommission(AUDIO, 0.2)).rejects.toThrow(/only the platform team/i);

    expect(supabaseDouble.tables.categories).toHaveLength(before);
    expect(supabaseDouble.tables.categories.find((row) => row.id === AUDIO)).toMatchObject({
      is_active: true, commission_rate_override: 0.11,
    });
  });
});

describe('assignProductCategory', () => {
  it('names both arguments, and refuses a listing or a category that is not there', async () => {
    listing(HP_ONE, HOME);

    expect(await categories.assignProductCategory(HP_ONE, HEADPHONES)).toEqual({ id: HP_ONE, categoryId: HEADPHONES });
    expect(supabaseDouble.rpcCalls.at(-1)?.fn).toBe('admin_assign_product_category');
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_product_id: HP_ONE, p_category_id: HEADPHONES });
    expect(supabaseDouble.tables.products.find((row) => row.id === HP_ONE)?.category_id).toBe(HEADPHONES);

    const tree = await categories.fetchCategoryTree();
    expect(tree.roots.find((root) => root.id === AUDIO)?.children[0].products).toBe(1);
    expect(tree.roots.find((root) => root.id === HOME)?.products).toBe(0);

    await expect(categories.assignProductCategory('no-such-listing', HEADPHONES)).rejects.toThrow(
      /Could not move that listing: Listing not found/,
    );
    await expect(categories.assignProductCategory(HP_ONE, 'no-such-category')).rejects.toThrow(
      /Could not move that listing: Category not found/,
    );
    expect(supabaseDouble.tables.products.find((row) => row.id === HP_ONE)?.category_id).toBe(HEADPHONES);
  });
});

describe('setCategoryCommission', () => {
  it('sends the override the platform chose, by name', async () => {
    expect(await categories.setCategoryCommission(AUDIO, 0.15)).toEqual({ id: AUDIO, rate: 0.15 });
    expect(supabaseDouble.rpcCalls.at(-1)?.fn).toBe('admin_set_category_commission');
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_category_id: AUDIO, p_rate: 0.15 });
    expect(supabaseDouble.tables.categories.find((row) => row.id === AUDIO)?.commission_rate_override).toBe(0.15);
    expect((await categories.fetchCategoryTree()).roots[0].commissionOverride).toBe(0.15);
  });

  it('sends NULL - not a zero - when the override is cleared back to the platform default', async () => {
    await categories.setCategoryCommission(AUDIO, 0.15);

    expect(await categories.setCategoryCommission(AUDIO, null)).toEqual({ id: AUDIO, rate: null });
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_category_id: AUDIO, p_rate: null });
    expect(supabaseDouble.tables.categories.find((row) => row.id === AUDIO)?.commission_rate_override).toBeNull();
    expect((await categories.fetchCategoryTree()).roots[0].commissionOverride).toBeNull();
  });

  it('refuses a rate outside the band the database allows, and keeps the rate it held', async () => {
    await expect(categories.setCategoryCommission(AUDIO, 0.9)).rejects.toThrow(
      /Could not set the category rate: Commission must be between 0% and 50%/,
    );
    expect(supabaseDouble.tables.categories.find((row) => row.id === AUDIO)?.commission_rate_override).toBe(0.11);

    await expect(categories.setCategoryCommission('gone', 0.1)).rejects.toThrow(/Category not found/);
  });
});
