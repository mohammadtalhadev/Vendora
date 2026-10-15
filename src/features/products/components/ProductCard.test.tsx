import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard, type ProductCardProps, type ProductItem } from './ProductCard';

/**
 * Batch 102 (owner point): the stock-urgency line ("Only X left" /
 * "Selling fast") belongs ONLY on the selling-pressure surfaces — the
 * DealsStrip Best Seller tab and the homepage Limited Campaign, which
 * pass `showStockUrgency`. Every other card stays plain. The numbers
 * are the product's real stock; "Selling fast" fires at the platform's
 * low-stock rule (<= 5, as in the vendor dashboard / admin inventory),
 * and the old fabricated progress bar (real stock divided by an
 * invented maxStock of at least 50) is gone.
 */

const baseItem: ProductItem = {
  id: 'prod-1',
  title: 'Test Headphones',
  category: 'AUDIO',
  price: 1000,
  rating: 4.5,
  reviewCount: 12,
  stock: 18,
  maxStock: 18,
  sellerId: 'seller-1',
  sellerName: 'Test Store',
  sellerType: 'vendor',
  type: 'physical',
  image: '',
};

const renderCard = (
  itemOverrides: Partial<ProductItem> = {},
  propOverrides: Partial<ProductCardProps> = {},
) =>
  render(
    <MemoryRouter>
      <ProductCard
        product={{ ...baseItem, ...itemOverrides }}
        onAddToCart={vi.fn()}
        onToggleWishlist={vi.fn()}
        isWishlisted={false}
        {...propOverrides}
      />
    </MemoryRouter>,
  );

describe('ProductCard stock line (Batch 102)', () => {
  it('plain card: no stock line at all, however low the stock', () => {
    const { container } = renderCard({ stock: 3 });
    expect(container.textContent).not.toContain('Only');
    expect(container.textContent).not.toContain('left');
    expect(screen.queryByText('Selling fast')).not.toBeInTheDocument();
  });

  it('plain card: no progress bar is rendered', () => {
    const { container } = renderCard({ stock: 18 }, { showStockUrgency: true });
    expect(container.querySelector('[style*="width:"]')).toBeNull();
  });

  it('urgency card: shows the genuine stock number', () => {
    const { container } = renderCard({ stock: 18 }, { showStockUrgency: true });
    expect(container.textContent).toContain('Only');
    expect(container.textContent).toContain('18');
    expect(container.textContent).toContain('left');
  });

  it('urgency card: 18 left is not "Selling fast" — the platform low-stock rule is <= 5', () => {
    renderCard({ stock: 18 }, { showStockUrgency: true });
    expect(screen.queryByText('Selling fast')).not.toBeInTheDocument();
  });

  it('urgency card: stock at the low-stock boundary (5) is "Selling fast", 6 is not', () => {
    const { unmount } = renderCard({ stock: 5 }, { showStockUrgency: true });
    expect(screen.getByText('Selling fast')).toBeInTheDocument();
    unmount();
    renderCard({ stock: 6 }, { showStockUrgency: true });
    expect(screen.queryByText('Selling fast')).not.toBeInTheDocument();
  });

  it('out of stock reads as out of stock on every surface, with Add to Cart disabled', () => {
    const { unmount } = renderCard({ stock: 0 });
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Add Test Headphones to cart' });
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toBeDisabled());
    unmount();

    renderCard({ stock: 0 }, { showStockUrgency: true });
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.queryByText('Selling fast')).not.toBeInTheDocument();
  });
});
