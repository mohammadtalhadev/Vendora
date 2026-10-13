import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The catalog hooks are stubbed so the test can observe the exact query params
 * the page commits. QA C-3 regressions pinned here:
 *  (a) typing in the price inputs must not be eaten by URL-driven re-renders;
 *  (b) the values must reach the query exactly as typed (canonical PKR) and
 *      the empty-state text must quote them as typed — the old USD-base
 *      formatter rendered 10,000 as "₨ 2,769,191".
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
  useCategories: () => ({ data: { categories: [] } }),
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
});
