import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WishlistPage } from './WishlistPage';
import { useWishlistStore } from '../store/wishlist-store';
import { useCartStore } from '../store/cart-store';
import { formatPrice } from '../store/currency-store';
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
  sellerName: 'Vendora',
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
    expect(screen.getByText(formatPrice(mockProduct.price))).toBeInTheDocument();
    expect(screen.getByText('Vendora')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Move to Cart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
  });

  it('moves item to cart and removes from wishlist on Move to Cart click', async () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);

    render(
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>,
    );

    const moveToCartBtn = screen.getByRole('button', { name: /Move to Cart/i });
    fireEvent.click(moveToCartBtn);

    // Batch 57: the move AWAITS both persisted writes before it reports, so
    // the outcome settles asynchronously even for a guest's local writes.
    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useWishlistStore.getState().items).toHaveLength(0);
    });
    expect(useCartStore.getState().items[0].productId).toBe(mockProduct.id);
    expect(await screen.findByText('Your wishlist is empty')).toBeInTheDocument();
  });

  it('does not claim a move succeeded when the cart write failed', async () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);
    // The stores report a failed write through their `error` state rather
    // than throwing; seed the cart failure the handler reads back.
    useCartStore.setState({ error: 'Your cart could not be saved.' });

    render(
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Move to Cart/i }));

    // The failure is surfaced as an error toast, and the item is NOT
    // removed from the wishlist — no false "moved to cart" success.
    expect(await screen.findByText('Your cart could not be saved.')).toBeInTheDocument();
    expect(useWishlistStore.getState().items).toHaveLength(1);
  });

  it('removes item from wishlist on Remove click', async () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);

    render(
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>,
    );

    const removeBtn = screen.getByRole('button', { name: /Remove/i });
    fireEvent.click(removeBtn);

    await waitFor(() => expect(useWishlistStore.getState().items).toHaveLength(0));
    expect(await screen.findByText('Your wishlist is empty')).toBeInTheDocument();
  });

  it('clears all items on Clear All click', async () => {
    useWishlistStore.getState().toggleWishlist(mockProduct);

    render(
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>,
    );

    const clearAllBtn = screen.getByRole('button', { name: /Clear All/i });
    fireEvent.click(clearAllBtn);
    // Batch 47: clearing confirms first — the dialog's Clear Wishlist button performs it.
    fireEvent.click(screen.getByRole('button', { name: /clear wishlist/i }));

    await waitFor(() => expect(useWishlistStore.getState().items).toHaveLength(0));
    expect(await screen.findByText('Your wishlist is empty')).toBeInTheDocument();
  });
});
