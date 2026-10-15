import { describe, it, expect } from 'vitest';
import { domainProductToCardItem } from './mappers';
import type { Product } from '../../types/domain';

/**
 * Batch 102: the card item carries GENUINE stock values only. The old
 * mapper invented both the numerator (`stock ?? 20`) and the cart cap /
 * progress-bar denominator (`Math.max(stock, 50)`).
 */

const productWithStock = (stock: number | null | undefined): Product => ({
  id: 'prod-1',
  title: 'Test Headphones',
  slug: 'test-headphones',
  description: 'Test',
  category: 'audio',
  brand: 'TestBrand',
  images: ['/images/test.jpg'],
  price: 1000,
  type: 'physical',
  sellerId: 'seller-1',
  sellerName: 'Test Store',
  sellerType: 'vendor',
  variants: [],
  stock: stock as number,
  rating: 4.5,
  reviewCount: 12,
  status: 'approved',
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('domainProductToCardItem stock values (Batch 102)', () => {
  it('carries the real stock, and the cart cap is that same stock — not a floor of 50', () => {
    const item = domainProductToCardItem(productWithStock(18));
    expect(item.stock).toBe(18);
    expect(item.maxStock).toBe(18);
  });

  it('a low-stock product caps the cart at its real stock', () => {
    const item = domainProductToCardItem(productWithStock(3));
    expect(item.stock).toBe(3);
    expect(item.maxStock).toBe(3);
  });

  it('untracked (null) stock reads as 0 — never an invented 20', () => {
    const item = domainProductToCardItem(productWithStock(null));
    expect(item.stock).toBe(0);
    expect(item.maxStock).toBe(0);
  });
});
