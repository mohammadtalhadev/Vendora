import { describe, it, expect } from 'vitest';
import { mapProduct, PRODUCT_SELECT, type ProductWithRefs } from './product-row';

/**
 * Batch 123 — the seller rollup rides the product read: vendor_profiles
 * carries real `rating` / `review_count` columns, and the PDP seller card
 * renders them as the SELLER's rating (distinct from the product's own
 * review aggregate). A seller embed that is missing — or whose rollup
 * columns are null — maps to 0/0 so the card shows "No reviews yet"
 * rather than a fabricated score.
 */

const baseRow = (seller: ProductWithRefs['seller']): ProductWithRefs => ({
  id: '00000000-0000-4000-8000-000000000101',
  title: 'Reference Headphones',
  slug: 'reference-headphones',
  description: 'A test product.',
  category_id: '00000000-0000-4000-8000-000000000001',
  brand: 'Vendora',
  images: [],
  price: 199.99,
  compare_at_price: null,
  type: 'physical',
  seller_id: 'store-vendor',
  variants: [],
  stock: 10,
  shipping_settings: null,
  digital_asset_info: null,
  rating: 4.9,
  review_count: 99,
  status: 'approved',
  rejection_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  search_vector: null,
  moderated_by: null,
  moderated_at: null,
  assigned_moderator_id: null,
  category: { id: '00000000-0000-4000-8000-000000000001', name: 'Audio', slug: 'audio' },
  seller,
});

const sellerWith = (overrides: Partial<NonNullable<ProductWithRefs['seller']>>) => ({
  id: 'store-vendor',
  store_name: 'Nova Tech',
  slug: 'nova-tech',
  seller_type: 'vendor' as const,
  logo: null,
  rating: 4.3,
  review_count: 4,
  ...overrides,
});

describe('mapProduct seller rollup (Batch 123)', () => {
  it('maps the seller rating and review count from the vendor_profiles embed', () => {
    const product = mapProduct(baseRow(sellerWith({})));
    expect(product.sellerRating).toBe(4.3);
    expect(product.sellerReviewCount).toBe(4);
    // The product's own aggregate stays on its own fields, untouched.
    expect(product.rating).toBe(4.9);
    expect(product.reviewCount).toBe(99);
  });

  it('maps null rollup columns to 0/0', () => {
    const product = mapProduct(baseRow(sellerWith({ rating: null, review_count: null })));
    expect(product.sellerRating).toBe(0);
    expect(product.sellerReviewCount).toBe(0);
  });

  it('maps a missing seller embed to 0/0', () => {
    const product = mapProduct(baseRow(null));
    expect(product.sellerRating).toBe(0);
    expect(product.sellerReviewCount).toBe(0);
    expect(product.sellerName).toBe('');
  });

  it('the storefront select asks the embed for the rollup columns', () => {
    expect(PRODUCT_SELECT).toContain('logo, rating, review_count');
  });
});
