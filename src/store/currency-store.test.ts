import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_CURRENCY,
  useCurrencyStore,
  formatPrice,
  formatCurrencyValue,
  convertCurrencyValue,
  FALLBACK_RATES,
} from './currency-store';

/**
 * PKR is the canonical base (QA C-3/M-3): amounts handed to the formatter ARE
 * rupees, rates are units per 1 PKR, and conversion runs FROM PKR into the
 * display currency only. These tests pin that direction — the previous suite
 * asserted the USD-base model that inflated rupee prices ~277×.
 */
describe('currencyStore', () => {
  beforeEach(() => {
    useCurrencyStore.setState({
      currency: 'USD',
      rates: FALLBACK_RATES,
      isLoading: false,
      lastUpdated: null,
    });
  });

  it('ships the storefront in rupees, with PKR as the rate base', () => {
    expect(DEFAULT_CURRENCY).toBe('PKR');
    expect(FALLBACK_RATES.PKR).toBe(1);
    expect(FALLBACK_RATES.USD).toBeLessThan(0.01);
    // A rupee amount renders as itself in the default display currency.
    expect(formatCurrencyValue(69023, DEFAULT_CURRENCY, FALLBACK_RATES)).toBe('₨ 69,023');
  });

  it('updates currency on setCurrency', () => {
    useCurrencyStore.getState().setCurrency('PKR');
    expect(useCurrencyStore.getState().currency).toBe('PKR');

    useCurrencyStore.getState().setCurrency('EUR');
    expect(useCurrencyStore.getState().currency).toBe('EUR');
  });

  it('converts FROM PKR when formatting USD', () => {
    useCurrencyStore.getState().setCurrency('USD');
    // ₨27,720 at the fallback cross-rate (277.20 PKR per USD) is exactly $100.
    expect(formatPrice(27720)).toBe('$100.00');
    expect(formatPrice(277200)).toBe('$1,000.00');
  });

  it('formats EUR correctly with Euro symbol', () => {
    useCurrencyStore.getState().setCurrency('EUR');
    const formatted = formatPrice(27720);
    expect(formatted.startsWith('€')).toBe(true);
    expect(formatted).toContain('89.26');
  });

  it('formats GBP correctly with Pound symbol', () => {
    useCurrencyStore.getState().setCurrency('GBP');
    const formatted = formatPrice(27720);
    expect(formatted.startsWith('£')).toBe(true);
    expect(formatted).toContain('75.56');
  });

  it('formats PKR as the amount itself, whole rupees', () => {
    useCurrencyStore.getState().setCurrency('PKR');
    const formatted = formatPrice(100);
    expect(formatted).toBe('₨ 100');
  });

  it('formats AED correctly with AED prefix', () => {
    useCurrencyStore.getState().setCurrency('AED');
    const formatted = formatPrice(27720);
    expect(formatted.startsWith('AED ')).toBe(true);
    // 27,720 PKR × (3.6725 / 277.20) = 367.25 AED at the fallback cross-rate.
    expect(formatted).toContain('367.25');
  });

  it('handles null, undefined, and NaN gracefully', () => {
    expect(formatPrice(undefined)).toBe('—');
    expect(formatPrice(null)).toBe('—');
    expect(formatPrice(NaN)).toBe('—');
  });

  it('converts numeric prices FROM PKR with convertPrice', () => {
    useCurrencyStore.getState().setCurrency('USD');
    expect(useCurrencyStore.getState().convertPrice(27720)).toBeCloseTo(100, 6);

    // PKR is the base: converting into PKR is the identity.
    expect(useCurrencyStore.getState().convertPrice(10, 'PKR')).toBe(10);
    expect(convertCurrencyValue(82522, 'PKR', FALLBACK_RATES)).toBe(82522);
  });

  it('fetches PKR-based rates and adopts them', async () => {
    // open.er-api.com/v6/latest/PKR returns units of each currency per 1 PKR.
    const mockRates = {
      PKR: 1,
      USD: 0.003571,
      EUR: 0.003289,
      GBP: 0.002813,
      AED: 0.013111,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: mockRates }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await useCurrencyStore.getState().fetchRates(true);

    expect(fetchMock).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/PKR');
    const state = useCurrencyStore.getState();
    expect(state.rates.USD).toBe(0.003571);
    expect(state.rates.EUR).toBe(0.003289);
    expect(state.rates.PKR).toBe(1);
    expect(state.lastUpdated).not.toBeNull();

    vi.unstubAllGlobals();
  });
});
