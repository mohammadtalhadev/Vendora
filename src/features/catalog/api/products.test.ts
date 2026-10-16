import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as catalog from './products';
import { categoryRow, productRow, storeRow, supabaseDouble } from '../../../test/supabase-double';

const AUDIO = '00000000-0000-4000-8000-000000000001';
const LAPTOPS = '00000000-0000-4000-8000-000000000002';
const PLATFORM = 'store-platform';
const VENDOR = 'store-vendor';

/** The rows the storefront is allowed to see, plus two that must stay hidden. */
function seedCatalog() {
  supabaseDouble.seedCategory(categoryRow({ id: AUDIO, name: 'Audio', slug: 'audio' }));
  supabaseDouble.seedCategory(categoryRow({ id: LAPTOPS, name: 'Laptops', slug: 'laptops' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: PLATFORM, store_name: 'Vendora', slug: 'vendora', seller_type: 'platform' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: VENDOR, store_name: 'Nova Tech', slug: 'nova-tech', seller_type: 'vendor' }));
  supabaseDouble.seedProduct(
    productRow({
      id: '00000000-0000-4000-8000-000000000101',
      title: 'Reference Headphones',
      slug: 'reference-headphones',
      price: 199.99,
      compare_at_price: 249.99,
      seller_id: PLATFORM,
      category_id: AUDIO,
      rating: 4.7,
      review_count: 320,
      created_at: '2026-10-01T00:00:00.000Z',
    }),
  );
  supabaseDouble.seedProduct(
    productRow({
      id: '00000000-0000-4000-8000-000000000102',
      title: 'Budget Earbuds',
      slug: 'budget-earbuds',
      description: 'Wireless earbuds with a charging case.',
      price: 49.5,
      seller_id: VENDOR,
      category_id: AUDIO,
      rating: 4.1,
      review_count: 90,
      created_at: '2026-10-05T00:00:00.000Z',
    }),
  );
  supabaseDouble.seedProduct(
    productRow({
      id: '00000000-0000-4000-8000-000000000103',
      title: 'Studio Laptop 14',
      slug: 'studio-laptop-14',
      price: 1499,
      seller_id: VENDOR,
      category_id: LAPTOPS,
      rating: 4.9,
      review_count: 51,
      created_at: '2026-10-09T00:00:00.000Z',
    }),
  );
  supabaseDouble.seedProduct(productRow({ id: '00000000-0000-4000-8000-000000000104', title: 'Rejected Widget', slug: 'rejected-widget', status: 'rejected' }));
  supabaseDouble.seedProduct(productRow({ id: '00000000-0000-4000-8000-000000000105', title: 'Pending Widget', slug: 'pending-widget', status: 'pending' }));
}

describe('fetchProducts', () => {
  beforeEach(() => {
    supabaseDouble.reset();
    seedCatalog();
  });

  it('returns approved products with category and seller names resolved from the embeds', async () => {
    const result = await catalog.fetchProducts();

    expect(result.items.map((item) => item.title)).toEqual([
      'Studio Laptop 14',
      'Budget Earbuds',
      'Reference Headphones',
    ]);
    expect(result.items[2]).toMatchObject({
      id: '00000000-0000-4000-8000-000000000101',
      category: 'Audio',
      sellerId: PLATFORM,
      sellerName: 'Vendora',
      sellerType: 'platform',
      price: 199.99,
      compareAtPrice: 249.99,
      type: 'physical',
      status: 'approved',
      reviewCount: 320,
    });
  });

  it('leaves compareAtPrice unset when the database has no strike-through price', async () => {
    const result = await catalog.fetchProducts();

    expect(result.items[1].compareAtPrice).toBeUndefined();
  });

  it('pages with an exact total from the database', async () => {
    const first = await catalog.fetchProducts({ page: 1, limit: 2, sort: 'price_asc' });
    const second = await catalog.fetchProducts({ page: 2, limit: 2, sort: 'price_asc' });

    expect(first.total).toBe(3);
    expect(first.totalPages).toBe(2);
    expect(first.hasMore).toBe(true);
    expect(first.items.map((item) => item.price)).toEqual([49.5, 199.99]);
    expect(second.items.map((item) => item.title)).toEqual(['Studio Laptop 14']);
    expect(second.hasMore).toBe(false);
  });

  it('filters by category slug without leaking rejected or pending rows', async () => {
    const result = await catalog.fetchProducts({ category: 'audio' });

    expect(result.items.map((item) => item.slug)).toEqual(['budget-earbuds', 'reference-headphones']);
  });

  it('filters by category id, including products filed under its subcategories', async () => {
    const ULTRABOOKS = '00000000-0000-4000-8000-000000000009';
    supabaseDouble.seedCategory(categoryRow({ id: ULTRABOOKS, name: 'Ultrabooks', slug: 'ultrabooks', parent_id: LAPTOPS }));
    supabaseDouble.seedProduct(
      productRow({
        id: '00000000-0000-4000-8000-000000000106',
        title: 'Feather Ultrabook 13',
        slug: 'feather-ultrabook-13',
        price: 999,
        seller_id: VENDOR,
        category_id: ULTRABOOKS,
        created_at: '2026-10-11T00:00:00.000Z',
      }),
    );

    const result = await catalog.fetchProducts({ category: LAPTOPS });

    expect(result.items.map((item) => item.slug)).toEqual(['feather-ultrabook-13', 'studio-laptop-14']);
  });

  it('filters by a parent category slug, including subcategory products', async () => {
    const ULTRABOOKS = '00000000-0000-4000-8000-000000000009';
    supabaseDouble.seedCategory(categoryRow({ id: ULTRABOOKS, name: 'Ultrabooks', slug: 'ultrabooks', parent_id: LAPTOPS }));
    supabaseDouble.seedProduct(
      productRow({
        id: '00000000-0000-4000-8000-000000000106',
        title: 'Feather Ultrabook 13',
        slug: 'feather-ultrabook-13',
        price: 999,
        seller_id: VENDOR,
        category_id: ULTRABOOKS,
        created_at: '2026-10-11T00:00:00.000Z',
      }),
    );

    const byParent = await catalog.fetchProducts({ category: 'laptops' });
    expect(byParent.items.map((item) => item.slug)).toEqual(['feather-ultrabook-13', 'studio-laptop-14']);

    // A subcategory slug still resolves to just its own shelf.
    const byChild = await catalog.fetchProducts({ category: 'ultrabooks' });
    expect(byChild.items.map((item) => item.slug)).toEqual(['feather-ultrabook-13']);
  });

  it('returns an empty page for an unknown category slug instead of the whole catalogue', async () => {
    const result = await catalog.fetchProducts({ category: 'no-such-category' });

    expect(result).toMatchObject({ items: [], total: 0, page: 1, hasMore: false });
  });

  it('splits platform from third-party sellers', async () => {
    const platform = await catalog.fetchProducts({ seller: 'platform' });
    const vendor = await catalog.fetchProducts({ seller: 'vendor' });

    expect(platform.items.map((item) => item.sellerName)).toEqual(['Vendora']);
    expect(vendor.items.map((item) => item.sellerName)).toEqual(['Nova Tech', 'Nova Tech']);
  });

  it('narrows by full-text search term', async () => {
    const result = await catalog.fetchProducts({ q: 'headphones' });

    expect(result.items.map((item) => item.slug)).toEqual(['reference-headphones']);
    expect(result.total).toBe(1);
  });

  it('narrows by price range and product type', async () => {
    const priced = await catalog.fetchProducts({ minPrice: 100, maxPrice: 1000 });
    const digital = await catalog.fetchProducts({ type: 'digital' });

    expect(priced.items.map((item) => item.slug)).toEqual(['reference-headphones']);
    expect(digital.items).toEqual([]);
  });

  it('narrows by brand, minimum rating, stock and sale (facets)', async () => {
    supabaseDouble.seedProduct(
      productRow({
        id: '00000000-0000-4000-8000-000000000110',
        title: 'Sony Speaker',
        slug: 'sony-speaker',
        brand: 'Sony',
        rating: 4.6,
        stock: 5,
        compare_at_price: 999,
        seller_id: VENDOR,
        category_id: AUDIO,
        created_at: '2026-10-10T00:00:00.000Z',
      }),
    );
    supabaseDouble.seedProduct(
      productRow({
        id: '00000000-0000-4000-8000-000000000111',
        title: 'Sony Legacy',
        slug: 'sony-legacy',
        brand: 'Sony',
        rating: 3.2,
        stock: 0,
        seller_id: VENDOR,
        category_id: AUDIO,
        created_at: '2026-10-11T00:00:00.000Z',
      }),
    );

    const byBrand = await catalog.fetchProducts({ brand: 'Sony' });
    expect(byBrand.items.map((item) => item.slug).sort()).toEqual(['sony-legacy', 'sony-speaker']);
    expect(byBrand.total).toBe(2);

    const rated = await catalog.fetchProducts({ brand: 'Sony', minRating: 4 });
    expect(rated.items.map((item) => item.slug)).toEqual(['sony-speaker']);

    const stocked = await catalog.fetchProducts({ brand: 'Sony', inStock: true });
    expect(stocked.items.map((item) => item.slug)).toEqual(['sony-speaker']);

    // On sale = a recorded compare-at price (a was/now offer); rows without
    // one — including the NULL compare-at on the earbuds — are never on sale.
    const onSale = await catalog.fetchProducts({ onSale: true });
    expect(onSale.items.map((item) => item.slug).sort()).toEqual([
      'reference-headphones',
      'sony-speaker',
    ]);
  });

  it('sorts by rating and review count', async () => {
    const byRating = await catalog.fetchProducts({ sort: 'rating' });
    const bySales = await catalog.fetchProducts({ sort: 'best_selling' });
    const byPriceDesc = await catalog.fetchProducts({ sort: 'price_desc' });

    expect(byRating.items.map((item) => item.slug)).toEqual([
      'studio-laptop-14',
      'reference-headphones',
      'budget-earbuds',
    ]);
    expect(bySales.items.map((item) => item.reviewCount)).toEqual([320, 90, 51]);
    expect(byPriceDesc.items.map((item) => item.price)).toEqual([1499, 199.99, 49.5]);
  });

  it('surfaces a read failure rather than showing an empty shelf', async () => {
    supabaseDouble.failures.products = 'permission denied for table products';

    await expect(catalog.fetchProducts()).rejects.toThrow(/Failed to load products: permission denied/);
  });

  it('surfaces a category resolution failure', async () => {
    supabaseDouble.failures.categories = 'could not read categories';

    await expect(catalog.fetchProducts({ category: 'audio' })).rejects.toThrow(/Could not resolve category "audio"/);
  });

  it('reports the aborted query as an error', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(catalog.fetchProducts({}, controller.signal)).rejects.toThrow('Failed to load products');
  });
});

describe('fetchProductBrands', () => {
  beforeEach(() => {
    supabaseDouble.reset();
    seedCatalog();
  });

  it('returns the distinct non-empty brands of approved products, sorted', async () => {
    supabaseDouble.seedProduct(productRow({ id: '00000000-0000-4000-8000-000000000120', title: 'Brand B', slug: 'brand-b', brand: 'Sony' }));
    supabaseDouble.seedProduct(productRow({ id: '00000000-0000-4000-8000-000000000121', title: 'Brand A', slug: 'brand-a', brand: 'Anker' }));
    supabaseDouble.seedProduct(productRow({ id: '00000000-0000-4000-8000-000000000122', title: 'Hidden Brand', slug: 'hidden-brand', brand: 'Ghost', status: 'pending' }));

    const result = await catalog.fetchProductBrands();

    expect(result.brands).toEqual(['Anker', 'AudioBrand', 'Sony']);
  });

  it('surfaces a read failure', async () => {
    supabaseDouble.failures.products = 'permission denied for table products';

    await expect(catalog.fetchProductBrands()).rejects.toThrow(/Failed to load brands: permission denied/);
  });
});

describe('fetchProductDetail', () => {
  beforeEach(() => {
    supabaseDouble.reset();
    seedCatalog();
  });

  it('looks a slug up in the slug column', async () => {
    const product = await catalog.fetchProductDetail('reference-headphones');

    expect(product).toMatchObject({ slug: 'reference-headphones', sellerName: 'Vendora', stock: 25 });
  });

  it('looks an id up in the id column', async () => {
    const product = await catalog.fetchProductDetail('00000000-0000-4000-8000-000000000103');

    expect(product.slug).toBe('studio-laptop-14');
  });

  it('throws when nothing matches', async () => {
    // RLS only exposes approved products, so an unapproved slug reaches this same branch live.
    await expect(catalog.fetchProductDetail('no-such-product')).rejects.toThrow('Product not found');
  });

  it('surfaces a read failure', async () => {
    supabaseDouble.failures.products = 'relation "products" does not exist';

    await expect(catalog.fetchProductDetail('reference-headphones')).rejects.toThrow(/Failed to load product/);
  });
});

describe('fetchCategories', () => {
  beforeEach(() => {
    supabaseDouble.reset();
    seedCatalog();
  });

  it('returns categories ordered by name, with commission overrides only when set', async () => {
    supabaseDouble.seedCategory(categoryRow({ id: '00000000-0000-4000-8000-000000000003', name: 'Cameras', slug: 'cameras', commission_rate_override: 0.08 }));

    const { categories } = await catalog.fetchCategories();

    expect(categories.map((category) => category.name)).toEqual(['Audio', 'Cameras', 'Laptops']);
    expect(categories.find((category) => category.slug === 'cameras')).toMatchObject({ commissionRateOverride: 0.08 });
    expect(categories[0].commissionRateOverride).toBeUndefined();
    expect(categories[0].icon).toBeUndefined();
  });

  it('maps parent_id so callers can split roots from subcategories', async () => {
    supabaseDouble.seedCategory(categoryRow({ id: '00000000-0000-4000-8000-000000000009', name: 'Ultrabooks', slug: 'ultrabooks', parent_id: LAPTOPS }));

    const { categories } = await catalog.fetchCategories();

    expect(categories.find((category) => category.slug === 'laptops')).toMatchObject({ parentId: null });
    expect(categories.find((category) => category.slug === 'ultrabooks')).toMatchObject({ parentId: LAPTOPS });
  });

  it('surfaces a read failure', async () => {
    supabaseDouble.failures.categories = 'permission denied for table categories';

    await expect(catalog.fetchCategories()).rejects.toThrow(/Failed to load categories/);
  });
});

describe('fetchSearchSuggestions', () => {
  beforeEach(() => {
    supabaseDouble.reset();
    seedCatalog();
  });

  it('skips the network for a term too short to be useful', async () => {
    supabaseDouble.from.mockClear();

    await expect(catalog.fetchSearchSuggestions('a')).resolves.toEqual({ suggestions: [] });
    expect(supabaseDouble.from).not.toHaveBeenCalled();
  });

  it('merges product and category matches, products first', async () => {
    const { suggestions } = await catalog.fetchSearchSuggestions('lap');

    expect(suggestions.map((s) => s.type)).toEqual(['product', 'category']);
    expect(suggestions[0]).toMatchObject({ title: 'Studio Laptop 14', price: 1499 });
    expect(suggestions[1]).toMatchObject({ type: 'category', title: 'Laptops' });
  });

  it('never suggests a product the shelf cannot show', async () => {
    const { suggestions } = await catalog.fetchSearchSuggestions('widget');

    expect(suggestions).toEqual([]);
  });

  it('caps product suggestions at six, best selling first', async () => {
    for (let i = 0; i < 8; i += 1) {
      supabaseDouble.seedProduct(
        productRow({
          id: `00000000-0000-4000-8000-00000000020${i}`,
          title: `Monitor ${i}`,
          slug: `monitor-${i}`,
          review_count: i * 10,
        }),
      );
    }

    const { suggestions } = await catalog.fetchSearchSuggestions('monitor');

    expect(suggestions).toHaveLength(6);
    expect(suggestions[0].title).toBe('Monitor 7');
  });

  it('surfaces a failing suggestion query', async () => {
    supabaseDouble.failures.products = 'permission denied for table products';

    await expect(catalog.fetchSearchSuggestions('head')).rejects.toThrow(/Failed to load suggestions/);
  });
});
