import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as brands from './brands';
import {
  brandRow,
  productRow,
  profileRow,
  storeRow,
  supabaseDouble,
} from '../../../test/supabase-double';

const REG_SONY = '00000000-0000-4000-8000-000000000301';
const REG_EMPTY = '00000000-0000-4000-8000-000000000302';

const P_ONE = '00000000-0000-4000-8000-000000000101';
const P_TWO = '00000000-0000-4000-8000-000000000102';
const P_DRAFT = '00000000-0000-4000-8000-000000000103';

const STORE = 'store-1';
const SECOND = 'store-2';
const SELLER = 'user-1';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
  supabaseDouble.seedProfile(profileRow({ id: SELLER, email: 'marcus@demo.test', name: 'Marcus Seller' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: STORE, user_id: SELLER, store_name: 'Nova Tech', slug: 'nova-tech' }));

  // One registered brand with listings, one registered brand with none.
  supabaseDouble.seedBrand(brandRow({ id: REG_SONY, name: 'Sony', slug: 'sony', description: 'Consumer electronics.' }));
  supabaseDouble.seedBrand(brandRow({ id: REG_EMPTY, name: 'EmptyBrand', slug: 'emptybrand', is_active: false }));
});

const listing = (id: string, brand: string, seller: string = STORE, price = 100, status = 'approved') =>
  supabaseDouble.seedProduct(productRow({ id, brand, seller_id: seller, price, status }));

describe('fetchBrandDirectory', () => {
  it('merges the registry with the catalog: registered brands show even with zero listings', async () => {
    listing(P_ONE, 'Sony', STORE, 300);
    listing(P_TWO, 'Sony', SECOND, 150);
    listing(P_DRAFT, 'Sony', STORE, 50, 'pending_review');

    const rows = await brands.fetchBrandDirectory();

    const sony = rows.find((row) => row.brand === 'Sony');
    expect(sony).toMatchObject({
      id: REG_SONY, registered: true, isActive: true, slug: 'sony',
      description: 'Consumer electronics.',
      // Approved only: the pending listing counts toward the delete guard, not the shelf.
      listings: 2, sellers: 2, lowestPrice: 150, totalListings: 3,
    });

    const empty = rows.find((row) => row.brand === 'EmptyBrand');
    expect(empty).toMatchObject({
      id: REG_EMPTY, registered: true, isActive: false, listings: 0, totalListings: 0, sellers: 0, lowestPrice: 0,
    });
  });

  it('flags a brand that only exists on products as unregistered', async () => {
    listing(P_ONE, 'TypedBySeller', STORE, 80);

    const rows = await brands.fetchBrandDirectory();
    const typed = rows.find((row) => row.brand === 'TypedBySeller');
    expect(typed).toMatchObject({
      id: null, registered: false, listings: 1, totalListings: 1, sellers: 1, lowestPrice: 80,
    });
  });

  it('matches registry rows to products case-insensitively, the way the RPCs compare', async () => {
    listing(P_ONE, 'SONY', STORE, 120);

    const rows = await brands.fetchBrandDirectory();
    expect(rows.filter((row) => row.brand.toLowerCase() === 'sony')).toHaveLength(1);
    expect(rows.find((row) => row.brand === 'Sony')).toMatchObject({ listings: 1, totalListings: 1 });
  });

  it('throws on a failed read instead of resolving to an empty directory', async () => {
    supabaseDouble.failures.brands = 'permission denied for table brands';

    await expect(brands.fetchBrandDirectory()).rejects.toThrow(/Failed to load the brand directory/i);
  });
});

describe('createBrand', () => {
  it('sends the three arguments the RPC declares and reports the row it made', async () => {
    const created = await brands.createBrand({ name: 'Anker', logoUrl: 'https://example.test/anker.png', description: 'Charging gear.' });

    expect(supabaseDouble.rpcCalls.at(-1)?.fn).toBe('admin_create_brand');
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({
      p_name: 'Anker', p_logo_url: 'https://example.test/anker.png', p_description: 'Charging gear.',
    });
    expect(created).toMatchObject({ name: 'Anker', slug: 'anker', logoUrl: 'https://example.test/anker.png', isActive: true });

    const rows = await brands.fetchBrandDirectory();
    expect(rows.find((row) => row.brand === 'Anker')).toMatchObject({ registered: true, listings: 0 });
  });

  it('surfaces the database refusals: blank and duplicate names', async () => {
    await expect(brands.createBrand({ name: '   ' })).rejects.toThrow(
      /Could not create the brand: A brand needs a name/,
    );
    await expect(brands.createBrand({ name: 'sony' })).rejects.toThrow(
      /Could not create the brand: A brand named "sony" already exists/,
    );
    expect(supabaseDouble.tables.brands).toHaveLength(2);
  });
});

describe('updateBrand', () => {
  it('touches only the columns it was given, so a partial form cannot wipe a brand', async () => {
    const result = await brands.updateBrand({ id: REG_SONY, isActive: false });

    expect(supabaseDouble.rpcCalls.at(-1)?.fn).toBe('admin_update_brand');
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({
      p_id: REG_SONY, p_name: null, p_logo_url: null, p_description: null, p_is_active: false,
    });
    expect(result).toMatchObject({ id: REG_SONY, name: 'Sony', description: 'Consumer electronics.', isActive: false });
  });

  it('refuses a name another brand already holds, and a brand that is not there', async () => {
    await expect(brands.updateBrand({ id: REG_SONY, name: 'EmptyBrand' })).rejects.toThrow(
      /Could not update the brand: A brand named "EmptyBrand" already exists/,
    );
    await expect(brands.updateBrand({ id: 'gone', name: 'New' })).rejects.toThrow(
      /Could not update the brand: Brand not found/,
    );
    expect(supabaseDouble.tables.brands.find((row) => row.id === REG_SONY)?.name).toBe('Sony');
  });
});

describe('renameBrand', () => {
  it('re-letters every product carrying the old name, in any status, and moves the registry row', async () => {
    listing(P_ONE, 'Sony', STORE, 300);
    listing(P_TWO, 'sony', SECOND, 150);
    listing(P_DRAFT, 'Sony', STORE, 50, 'pending_review');

    const moved = await brands.renameBrand('Sony', 'Sony Group');

    expect(supabaseDouble.rpcCalls.at(-1)?.fn).toBe('admin_rename_brand');
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_old_name: 'Sony', p_new_name: 'Sony Group' });
    expect(moved).toBe(3);
    expect(supabaseDouble.tables.products.map((row) => row.brand)).toEqual(['Sony Group', 'Sony Group', 'Sony Group']);
    expect(supabaseDouble.tables.brands.find((row) => row.id === REG_SONY)).toMatchObject({
      name: 'Sony Group', slug: 'sony-group',
    });

    const rows = await brands.fetchBrandDirectory();
    expect(rows.find((row) => row.brand === 'Sony Group')).toMatchObject({ listings: 2, totalListings: 3 });
  });

  it('refuses to merge onto a different existing brand', async () => {
    listing(P_ONE, 'Sony');

    await expect(brands.renameBrand('Sony', 'EmptyBrand')).rejects.toThrow(
      /Could not rename the brand: A brand named "EmptyBrand" already exists/,
    );
    expect(supabaseDouble.tables.products[0].brand).toBe('Sony');
  });
});

describe('deleteBrand', () => {
  it('refuses while any product still carries the name, whatever its status', async () => {
    listing(P_DRAFT, 'Sony', STORE, 50, 'pending_review');

    await expect(brands.deleteBrand(REG_SONY)).rejects.toThrow(
      /Could not delete the brand: This brand still has 1 product\(s\) carrying the name "Sony"/,
    );
    expect(supabaseDouble.tables.brands.some((row) => row.id === REG_SONY)).toBe(true);
  });

  it('deletes a registered brand with no products carrying it', async () => {
    const deleted = await brands.deleteBrand(REG_EMPTY);

    expect(supabaseDouble.rpcCalls.at(-1)?.fn).toBe('admin_delete_brand');
    expect(supabaseDouble.rpcCalls.at(-1)?.args).toEqual({ p_id: REG_EMPTY });
    expect(deleted).toMatchObject({ id: REG_EMPTY, name: 'EmptyBrand' });
    expect(supabaseDouble.tables.brands.some((row) => row.id === REG_EMPTY)).toBe(false);
  });

  it('refuses the writes to a session that is not the platform team', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: SELLER, email: 'marcus@demo.test' } };

    await expect(brands.createBrand({ name: 'Anker' })).rejects.toThrow(/only the platform team/i);
    await expect(brands.updateBrand({ id: REG_SONY, isActive: false })).rejects.toThrow(/only the platform team/i);
    await expect(brands.renameBrand('Sony', 'Sony Group')).rejects.toThrow(/only the platform team/i);
    await expect(brands.deleteBrand(REG_EMPTY)).rejects.toThrow(/only the platform team/i);

    expect(supabaseDouble.tables.brands).toHaveLength(2);
    expect(supabaseDouble.tables.brands.find((row) => row.id === REG_SONY)?.is_active).toBe(true);
  });
});
