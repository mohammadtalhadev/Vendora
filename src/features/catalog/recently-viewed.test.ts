import { beforeEach, describe, expect, it } from 'vitest';
import {
  RECENTLY_VIEWED_KEY,
  clearRecentlyViewed,
  getRecentlyViewed,
  recordRecentlyViewed,
  recentlyViewedToProduct,
} from './recently-viewed';
import type { Product } from '../../types/domain';

function product(id: string, title: string): Product {
  return {
    id,
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: '',
    category: 'Electronics',
    brand: 'Acme',
    images: [`/img/${id}.jpg`],
    price: 1000,
    type: 'physical',
    sellerId: 'store-1',
    sellerName: 'Acme Store',
    sellerType: 'vendor',
    variants: [],
    stock: 5,
    rating: 4.5,
    reviewCount: 12,
    status: 'approved',
    createdAt: '2026-10-01T00:00:00.000Z',
  };
}

describe('recently viewed', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records a snapshot, newest first', () => {
    recordRecentlyViewed(product('p1', 'First Phone'));
    recordRecentlyViewed(product('p2', 'Second Phone'));

    const items = getRecentlyViewed();
    expect(items.map((i) => i.id)).toEqual(['p2', 'p1']);
    expect(items[0]).toMatchObject({
      slug: 'second-phone',
      name: 'Second Phone',
      price: 1000,
      image: '/img/p2.jpg',
      rating: 4.5,
      reviewCount: 12,
      sellerName: 'Acme Store',
    });
  });

  it('de-duplicates a re-viewed product and moves it to the front', () => {
    recordRecentlyViewed(product('p1', 'First Phone'));
    recordRecentlyViewed(product('p2', 'Second Phone'));
    recordRecentlyViewed(product('p1', 'First Phone'));

    expect(getRecentlyViewed().map((i) => i.id)).toEqual(['p1', 'p2']);
  });

  it('caps the history at 12 entries', () => {
    for (let i = 1; i <= 15; i += 1) recordRecentlyViewed(product(`p${i}`, `Phone ${i}`));
    expect(getRecentlyViewed()).toHaveLength(12);
    expect(getRecentlyViewed()[0].id).toBe('p15');
  });

  it('clear removes the stored history', () => {
    recordRecentlyViewed(product('p1', 'First Phone'));
    clearRecentlyViewed();
    expect(getRecentlyViewed()).toEqual([]);
    expect(localStorage.getItem(RECENTLY_VIEWED_KEY)).toBeNull();
  });

  it('survives corrupt stored data', () => {
    localStorage.setItem(RECENTLY_VIEWED_KEY, '{not json');
    expect(getRecentlyViewed()).toEqual([]);
  });

  it('maps a snapshot back to a card-ready product shape', () => {
    recordRecentlyViewed(product('p1', 'First Phone'));
    const mapped = recentlyViewedToProduct(getRecentlyViewed()[0]);
    expect(mapped).toMatchObject({ id: 'p1', title: 'First Phone', slug: 'first-phone', price: 1000 });
    expect(mapped.images).toEqual(['/img/p1.jpg']);
  });
});
