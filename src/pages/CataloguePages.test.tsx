import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * /new-arrivals and /deals are the shared CatalogBrowser, not
 * hand-rolled pages. These tests pin the identities each page lends the
 * browser — New Arrivals is newest-first WITH the facets the owner found
 * missing, Deals is locked to the sale shelf — and the admin-editable
 * category banner (categories.image) rendering on the category landing.
 */
const catalog = vi.hoisted(() => ({
  calls: [] as Array<Record<string, unknown>>,
}));

vi.mock('../features/catalog/hooks/useProducts', () => ({
  useProducts: (params: Record<string, unknown>) => {
    catalog.calls.push(params);
    return {
      data: { items: [], total: 0, totalPages: 1 },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
  },
  useCategories: () => ({
    data: {
      categories: [
        {
          id: 'c1',
          name: 'Electronics',
          slug: 'electronics',
          image: 'https://example.com/electronics-banner.jpg',
        },
        { id: 'c2', name: 'Fashion', slug: 'fashion' },
      ],
    },
  }),
  useProductBrands: () => ({ data: { brands: [] } }),
}));

vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { ProductsPage } from './ProductsPage';
import { NewArrivalsPage } from './NewArrivalsPage';
import { DealsPage } from './DealsPage';
import { FALLBACK_RATES, useCurrencyStore } from '../store/currency-store';

const lastParams = () => catalog.calls[catalog.calls.length - 1];

beforeEach(() => {
  catalog.calls.length = 0;
  localStorage.clear();
  useCurrencyStore.setState({ currency: 'PKR', rates: FALLBACK_RATES, isLoading: false, lastUpdated: null });
});

describe('Catalogue pages on the shared browser', () => {
  it('New Arrivals renders the shared filter rail and queries newest-first', () => {
    render(
      <MemoryRouter initialEntries={['/new-arrivals']}>
        <NewArrivalsPage />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Filters').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 1, name: 'New Arrivals' })).toBeTruthy();
    expect(lastParams().sort).toBe('newest');
  });

  it('Deals renders the shared filter rail, locks the query to the sale shelf, and makes no escrow claim', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/deals']}>
        <DealsPage />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Filters').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 1, name: 'Deals & Discounts' })).toBeTruthy();
    expect(lastParams().onSale).toBe(true);
    expect(container.textContent ?? '').not.toMatch(/escrow/i);
  });

  it('a category with an admin-set image renders it as the banner on its landing page', () => {
    render(
      <MemoryRouter initialEntries={['/products?category=electronics']}>
        <ProductsPage />
      </MemoryRouter>,
    );
    const banner = screen.getByAltText('Electronics');
    expect(banner.getAttribute('src')).toBe('https://example.com/electronics-banner.jpg');
  });

  it('a category without an image renders no banner figure', () => {
    render(
      <MemoryRouter initialEntries={['/products?category=fashion']}>
        <ProductsPage />
      </MemoryRouter>,
    );
    expect(screen.queryByAltText('Fashion')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Fashion' })).toBeTruthy();
  });
});
