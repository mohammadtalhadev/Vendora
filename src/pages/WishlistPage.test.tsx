import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WishlistPage } from './WishlistPage';
import { useWishlistStore } from '../store/wishlist-store';
import { useCartStore } from '../store/cart-store';
import type { Product } from '../types/domain';

const mockProduct: Product = {
  id: 'prod-headphones-test',
  title: 'Vendora Pulse Pro ANC Headphones',
  slug: 'vendora-pulse-pro-anc-headphones',
  description: 'Flagship studio headphones',
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
  stock: 25,
  rating: 4.8,
  reviewCount: 42,
  status: 'approved',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('WishlistPage component', { timeout: 15000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    useWishlistStore.getState().clearWishlist();
    useCartStore.getState().clearCart();
  });

  it('renders empty wishlist state with link to browse catalog when empty', () => {
    render(
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Your wishlist is empty')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Browse Catalog/i }),
    ).toHaveAttribute('href', '/products');
  });

  it('renders saved wishlist items in responsive grid', () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);

    render(
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Saved Wishlist')).toBeInTheDocument();
    expect(screen.getByText('Vendora Pulse Pro ANC Headphones')).toBeInTheDocument();
    expect(screen.getByText('$249.99')).toBeInTheDocument();
    expect(screen.getByText('Vendora Direct')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Move to Cart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
  });

  it('moves item to cart and removes from wishlist on Move to Cart click', () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);

    render(
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>,
    );

    const moveToCartBtn = screen.getByRole('button', { name: /Move to Cart/i });
    fireEvent.click(moveToCartBtn);

    // Cart store should have the item
    const cartItems = useCartStore.getState().items;
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].productId).toBe(mockProduct.id);

    // Wishlist should now be empty
    expect(useWishlistStore.getState().items).toHaveLength(0);
    expect(screen.getByText('Your wishlist is empty')).toBeInTheDocument();
  });

  it('removes item from wishlist on Remove click', () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);

    render(
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>,
    );

    const removeBtn = screen.getByRole('button', { name: /Remove/i });
    fireEvent.click(removeBtn);

    expect(useWishlistStore.getState().items).toHaveLength(0);
    expect(screen.getByText('Your wishlist is empty')).toBeInTheDocument();
  });

  it('clears all items on Clear All click', () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);

    render(
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>,
    );

    const clearAllBtn = screen.getByRole('button', { name: /Clear All/i });
    fireEvent.click(clearAllBtn);

    expect(useWishlistStore.getState().items).toHaveLength(0);
    expect(screen.getByText('Your wishlist is empty')).toBeInTheDocument();
  });
});
