import { describe, it, expect, beforeEach } from 'vitest';
import { useWishlistStore } from './wishlist-store';
import type { Product } from '../types/domain';

const mockProduct: Product = {
  id: 'prod-pulse-headphones',
  title: 'Vendora Pulse Pro ANC Headphones',
  slug: 'vendora-pulse-pro-anc-headphones',
  description: 'Flagship studio-grade noise-cancelling headphones',
  category: 'Electronics',
  brand: 'Vendora Sound',
  images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'],
  price: 249.99,
  compareAtPrice: 299.99,
  type: 'physical',
  sellerId: 'platform',
  sellerName: 'Vendora Direct',
  sellerType: 'platform',
  variants: [],
  stock: 45,
  rating: 4.8,
  reviewCount: 128,
  status: 'approved',
  createdAt: '2026-01-15T12:00:00Z',
};

const mockProduct2: Product = {
  id: 'prod-artisan-keyboard',
  title: 'Vendora Obsidian Mechanical Keyboard',
  slug: 'vendora-obsidian-mechanical-keyboard',
  description: 'Custom mechanical keyboard with pre-lubed switches',
  category: 'Electronics',
  brand: 'Vendora Tech',
  images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'],
  price: 169.5,
  type: 'physical',
  sellerId: 'vendor-keys',
  sellerName: 'KeyLab Artisans',
  sellerType: 'vendor',
  variants: [],
  stock: 15,
  rating: 4.9,
  reviewCount: 76,
  status: 'approved',
  createdAt: '2026-02-10T09:30:00Z',
};

describe('Wishlist Store (useWishlistStore)', () => {
  beforeEach(() => {
    localStorage.clear();
    useWishlistStore.getState().clearWishlist();
  });

  it('initializes with an empty item list', () => {
    const { items } = useWishlistStore.getState();
    expect(items).toEqual([]);
    expect(useWishlistStore.getState().isInWishlist('any-id')).toBe(false);
  });

  it('adds a product to the wishlist when toggleWishlist is called on an absent item', () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);

    const { items } = useWishlistStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(mockProduct.id);
    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(true);
  });

  it('removes a product from the wishlist when toggleWishlist is called on an existing item', () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);
    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(true);

    useWishlistStore.getState().toggleWishlist(mockProduct);
    const { items } = useWishlistStore.getState();
    expect(items).toHaveLength(0);
    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(false);
  });

  it('can manage multiple independent products in the wishlist', () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);
    useWishlistStore.getState().toggleWishlist(mockProduct2);

    const { items } = useWishlistStore.getState();
    expect(items).toHaveLength(2);
    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(true);
    expect(useWishlistStore.getState().isInWishlist(mockProduct2.id)).toBe(true);

    // Remove first product
    useWishlistStore.getState().toggleWishlist(mockProduct);
    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(false);
    expect(useWishlistStore.getState().isInWishlist(mockProduct2.id)).toBe(true);
    expect(useWishlistStore.getState().items).toHaveLength(1);
  });

  it('clears all items from the wishlist on clearWishlist', () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);
    useWishlistStore.getState().toggleWishlist(mockProduct2);
    expect(useWishlistStore.getState().items).toHaveLength(2);

    useWishlistStore.getState().clearWishlist();
    expect(useWishlistStore.getState().items).toEqual([]);
    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(false);
  });

  it('removes a specific item via removeItem', () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);
    useWishlistStore.getState().toggleWishlist(mockProduct2);

    useWishlistStore.getState().removeItem(mockProduct.id);
    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(false);
    expect(useWishlistStore.getState().isInWishlist(mockProduct2.id)).toBe(true);
  });

  it('supports optimistic toggle with automatic rollback on syncFn error', async () => {
    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(false);

    const failingSync = async () => {
      throw new Error('Network failure during sync');
    };

    await expect(
      useWishlistStore.getState().toggleWishlist(mockProduct, failingSync),
    ).rejects.toThrow('Network failure during sync');

    // Should have rolled back to not in wishlist
    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(false);
    expect(useWishlistStore.getState().items).toHaveLength(0);
  });

  it('persists optimistic state when syncFn succeeds', async () => {
    const successfulSync = async () => {
      return { success: true };
    };

    await useWishlistStore.getState().toggleWishlist(mockProduct, successfulSync);

    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(true);
    expect(useWishlistStore.getState().items).toHaveLength(1);
  });

  it('supports manual rollback of the last optimistic toggle', () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);
    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(true);

    // Call rollback
    useWishlistStore.getState().rollback();
    expect(useWishlistStore.getState().isInWishlist(mockProduct.id)).toBe(false);
    expect(useWishlistStore.getState().items).toHaveLength(0);
  });

  it('persists state to localStorage using key vd:v1:wishlist', () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);

    const rawStorage = localStorage.getItem('vd:v1:wishlist');
    expect(rawStorage).toBeTruthy();

    const parsed = JSON.parse(rawStorage!);
    expect(parsed.state).toBeDefined();
    expect(parsed.state.items).toHaveLength(1);
    expect(parsed.state.items[0].id).toBe(mockProduct.id);
  });
});
