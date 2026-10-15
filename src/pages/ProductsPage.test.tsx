import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The catalog hooks are stubbed so the test can observe the exact query params
 * the page commits. QA C-3 regressions pinned here:
 *  (a) typing in the price inputs must not be eaten by URL-driven re-renders;
 *  (b) inputs are denominated in the shopper's DISPLAY currency while the
 *      query (and URL) always carries canonical PKR — in PKR the two are the
 *      same number, and the old USD-base formatter that rendered 10,000 as
 *      "₨ 2,769,191" must never come back;
 *  (c) with a foreign display currency, typed amounts convert to PKR at the
 *      store's rate on commit and the empty state quotes the typed display
 *      values back — the live-verified residual from Batch 3, where a USD
 *      shopper's "10000" was silently treated as ₨10,000.
 */
const catalog = vi.hoisted(() => ({
  calls: [] as Array<Record<string, unknown>>,
  categories: [] as Array<Record<string, unknown>>,
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
  useCategories: () => ({ data: { categories: catalog.categories } }),
  useProductBrands: () => ({ data: { brands: [] } }),
}));

vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { ProductsPage } from './ProductsPage';
import { FALLBACK_RATES, useCurrencyStore } from '../store/currency-store';

function renderPage(route = '/products') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ProductsPage />
    </MemoryRouter>,
  );
}

const lastParams = () => catalog.calls[catalog.calls.length - 1];

beforeEach(() => {
  catalog.calls.length = 0;
  catalog.categories = [];
  localStorage.clear();
  useCurrencyStore.setState({ currency: 'PKR', rates: FALLBACK_RATES, isLoading: false, lastUpdated: null });
});

describe('ProductsPage price filter', () => {
  it('keeps every typed digit in the input and does not touch the query mid-typing', () => {
    const { container } = renderPage();
    const minInput = container.querySelector('#min-price') as HTMLInputElement;
    expect(minInput).not.toBeNull();

    for (const value of ['1', '10', '100', '1000', '10000', '100000']) {
      fireEvent.change(minInput, { target: { value } });
    }

    expect(minInput.value).toBe('100000');
    // Nothing was committed while typing: the result set is still unfiltered.
    expect(lastParams().minPrice).toBeUndefined();
  });

  it('commits the typed values to the query exactly as typed (canonical PKR) on blur', () => {
    const { container } = renderPage();
    const minInput = container.querySelector('#min-price') as HTMLInputElement;
    const maxInput = container.querySelector('#max-price') as HTMLInputElement;

    fireEvent.change(minInput, { target: { value: '10000' } });
    fireEvent.change(maxInput, { target: { value: '40000' } });
    fireEvent.blur(maxInput);

    expect(lastParams().minPrice).toBe(10000);
    expect(lastParams().maxPrice).toBe(40000);
  });

  it('quotes the committed range as typed in the empty state, not FX-multiplied', () => {
    renderPage('/products?min=10000&max=40000');

    expect(screen.getByText(/between ₨ 10,000 and ₨ 40,000/)).toBeInTheDocument();
    expect(screen.queryByText(/2,769,191|11,076,764/)).not.toBeInTheDocument();
  });

  it('converts the quoted range consistently when the display currency is USD', () => {
    useCurrencyStore.setState({ currency: 'USD' });
    renderPage('/products?min=27720&max=55440');

    // ₨27,720 = $100 and ₨55,440 = $200 at the fallback cross-rate.
    expect(screen.getByText(/between \$100\.00 and \$200\.00/)).toBeInTheDocument();
    // …while the query itself still carries the PKR values untouched.
    expect(lastParams().minPrice).toBe(27720);
    expect(lastParams().maxPrice).toBe(55440);
  });

  it('shows PKR bounds as display-currency values in the inputs when currency is USD', () => {
    useCurrencyStore.setState({ currency: 'USD' });
    const { container } = renderPage('/products?min=27720&max=55440');
    const minInput = container.querySelector('#min-price') as HTMLInputElement;
    const maxInput = container.querySelector('#max-price') as HTMLInputElement;

    // The URL still stores canonical PKR; the fields show what the shopper
    // reads in their currency: ₨27,720 = $100, ₨55,440 = $200.
    expect(minInput.value).toBe('100');
    expect(maxInput.value).toBe('200');
    expect(lastParams().minPrice).toBe(27720);
    expect(lastParams().maxPrice).toBe(55440);
  });

  it('commits display-currency input converted to canonical PKR when currency is USD', () => {
    useCurrencyStore.setState({ currency: 'USD' });
    const { container } = renderPage();
    const minInput = container.querySelector('#min-price') as HTMLInputElement;
    const maxInput = container.querySelector('#max-price') as HTMLInputElement;

    fireEvent.change(minInput, { target: { value: '40' } });
    fireEvent.change(maxInput, { target: { value: '100' } });
    fireEvent.blur(maxInput);

    // $40 / $100 at the fallback rate (units of USD per 1 PKR) land on whole
    // rupees — asserted through the same conversion the page uses, against
    // the exact fallback cross-rate ($1 = ₨277.20).
    const rate = FALLBACK_RATES.USD;
    expect(lastParams().minPrice).toBe(Math.round(40 / rate));
    expect(lastParams().maxPrice).toBe(Math.round(100 / rate));
    expect(lastParams().minPrice).toBe(11088);
    expect(lastParams().maxPrice).toBe(27720);
  });

  it('quotes the typed display values in the empty state after a USD commit', () => {
    useCurrencyStore.setState({ currency: 'USD' });
    const { container } = renderPage();
    const minInput = container.querySelector('#min-price') as HTMLInputElement;

    fireEvent.change(minInput, { target: { value: '40' } });
    fireEvent.blur(minInput);

    // The summary quotes the $40 the shopper typed (converted back from the
    // stored PKR bound), never the raw rupee figure or a multiplied one.
    expect(screen.getByText(/above \$40\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/11,088|3,068,544/)).not.toBeInTheDocument();
  });
});

describe('ProductsPage facets (Batch 46)', () => {
  it('forwards brand, rating, stock and sale URL params to the catalog query', async () => {
    renderPage('/products?brand=Sony&rating=4.5&stock=1&sale=1');

    await screen.findByText('No products match your filters');
    expect(lastParams()).toMatchObject({
      brand: 'Sony',
      minRating: 4.5,
      inStock: true,
      onSale: true,
    });
  });
});

describe('ProductsPage category facet (Batch 132)', () => {
  const TAXONOMY = [
    { id: 'cat-audio', name: 'Audio & Wearables', slug: 'audio-wearables', parentId: null },
    { id: 'cat-elec', name: 'Electronics', slug: 'electronics', parentId: null },
    { id: 'cat-headphones', name: 'Headphones', slug: 'headphones', parentId: 'cat-audio' },
    { id: 'cat-earbuds', name: 'Earbuds', slug: 'earbuds', parentId: 'cat-audio' },
    { id: 'cat-tv', name: 'Televisions & Video', slug: 'televisions-video', parentId: 'cat-elec' },
  ];

  it('with no category selected, the rail lists root categories only — no subcategories', async () => {
    catalog.categories = TAXONOMY;
    renderPage('/products');

    expect(await screen.findByRole('button', { name: 'Audio & Wearables' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Electronics' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Headphones' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Earbuds' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Televisions & Video' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All Audio & Wearables' })).not.toBeInTheDocument();
  });

  it('on a category page, the rail lists only that category’s subcategories', async () => {
    catalog.categories = TAXONOMY;
    renderPage('/products?category=audio-wearables');

    expect(await screen.findByRole('button', { name: 'All Audio & Wearables' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Headphones' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Earbuds' })).toBeInTheDocument();
    // Unrelated roots and other families' subcategories leave the rail.
    expect(screen.queryByRole('button', { name: 'Electronics' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Televisions & Video' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Earbuds' }));
    await waitFor(() => {
      expect(lastParams()).toMatchObject({ category: 'earbuds' });
    });
  });

  it('on a subcategory page, the rail keeps the family: parent “All” row plus siblings', async () => {
    catalog.categories = TAXONOMY;
    renderPage('/products?category=headphones');

    expect(await screen.findByRole('button', { name: 'All Audio & Wearables' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Headphones' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Earbuds' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Electronics' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Televisions & Video' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All Audio & Wearables' }));
    await waitFor(() => {
      expect(lastParams()).toMatchObject({ category: 'audio-wearables' });
    });
  });
});

describe('ProductsPage facets (Batch 46)', () => {
  it('reset clears every facet, including a category that arrived via the URL', async () => {
    renderPage('/products?category=audio&brand=Sony&min=100&max=900');

    await screen.findByText('No products match your filters');
    fireEvent.click(screen.getAllByRole('button', { name: /reset/i })[0]);

    await waitFor(() => {
      expect(lastParams()).toMatchObject({
        category: undefined,
        brand: undefined,
        minPrice: undefined,
        maxPrice: undefined,
      });
    });
  });
});
