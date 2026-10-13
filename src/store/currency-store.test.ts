import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_CURRENCY,
  useCurrencyStore,
  formatPrice,
  formatCurrencyValue,
  convertCurrencyValue,
  FALLBACK_RATES,
} from './currency-store';

describe('currencyStore', () => {
  beforeEach(() => {
    useCurrencyStore.setState({
      currency: 'USD',
      rates: FALLBACK_RATES,
      isLoading: false,
      lastUpdated: null,
    });
  });

  it('ships the storefront in rupees', () => {
    expect(DEFAULT_CURRENCY).toBe('PKR');
    expect(FALLBACK_RATES.USD).toBe(1.0);
    expect(FALLBACK_RATES.PKR).toBeGreaterThan(200);
    expect(formatCurrencyValue(249, DEFAULT_CURRENCY, FALLBACK_RATES)).toBe('₨ 69,023');
  });

  it('updates currency on setCurrency', () => {
    useCurrencyStore.getState().setCurrency('PKR');
    expect(useCurrencyStore.getState().currency).toBe('PKR');

    useCurrencyStore.getState().setCurrency('EUR');
    expect(useCurrencyStore.getState().currency).toBe('EUR');
  });

  it('formats USD correctly with 2 decimal places', () => {
    useCurrencyStore.getState().setCurrency('USD');
    expect(formatPrice(100)).toBe('$100.00');
    expect(formatPrice(1199)).toBe('$1,199.00');
  });

  it('formats EUR correctly with Euro symbol', () => {
    useCurrencyStore.getState().setCurrency('EUR');
    const formatted = formatPrice(100);
    expect(formatted.startsWith('€')).toBe(true);
  });

  it('formats GBP correctly with Pound symbol', () => {
    useCurrencyStore.getState().setCurrency('GBP');
    const formatted = formatPrice(100);
    expect(formatted.startsWith('£')).toBe(true);
  });

  it('formats PKR correctly with ₨ symbol and whole rounded value', () => {
    useCurrencyStore.getState().setCurrency('PKR');
    const formatted = formatPrice(100);
    expect(formatted.startsWith('₨ ')).toBe(true);
    // 100 * 277.20 = 27,720
    expect(formatted).toContain('27,720');
  });

  it('formats AED correctly with AED prefix', () => {
    useCurrencyStore.getState().setCurrency('AED');
    const formatted = formatPrice(100);
    expect(formatted.startsWith('AED ')).toBe(true);
    // 100 * 3.6725 = 367.25
    expect(formatted).toContain('367.25');
  });

  it('handles null, undefined, and NaN gracefully', () => {
    expect(formatPrice(undefined)).toBe('—');
    expect(formatPrice(null)).toBe('—');
    expect(formatPrice(NaN)).toBe('—');
  });

  it('converts numeric prices accurately with convertPrice', () => {
    useCurrencyStore.getState().setCurrency('USD');
    expect(useCurrencyStore.getState().convertPrice(50)).toBe(50);

    const pkrPrice = useCurrencyStore.getState().convertPrice(10, 'PKR');
    expect(pkrPrice).toBeCloseTo(10 * FALLBACK_RATES.PKR, 1);
  });

  it('fetches real-time rates successfully and updates rates', async () => {
    const mockRates = {
      USD: 1,
      EUR: 0.95,
      GBP: 0.80,
      PKR: 280.0,
      AED: 3.67,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: mockRates }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await useCurrencyStore.getState().fetchRates(true);

    const state = useCurrencyStore.getState();
    expect(state.rates.EUR).toBe(0.95);
    expect(state.rates.PKR).toBe(280.0);
    expect(state.lastUpdated).not.toBeNull();

    vi.unstubAllGlobals();
  });
});
