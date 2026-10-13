import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'PKR' | 'AED' | 'INR' | 'CAD' | 'SAR';

// The storefront quotes in Pakistani rupees; every screen renders money through
// `formatPrice`, so this is the one place the display currency is decided.
export const DEFAULT_CURRENCY: CurrencyCode = 'PKR';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  decimals: number;
  symbolPosition: 'before' | 'after';
  space: boolean;
  popular?: boolean;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    flag: '🇺🇸',
    decimals: 2,
    symbolPosition: 'before',
    space: false,
    popular: true,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    flag: '🇪🇺',
    decimals: 2,
    symbolPosition: 'before',
    space: false,
    popular: true,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    flag: '🇬🇧',
    decimals: 2,
    symbolPosition: 'before',
    space: false,
    popular: true,
  },
  PKR: {
    code: 'PKR',
    symbol: '₨',
    name: 'Pakistani Rupee',
    flag: '🇵🇰',
    decimals: 0,
    symbolPosition: 'before',
    space: true,
    popular: true,
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    name: 'UAE Dirham',
    flag: '🇦🇪',
    decimals: 2,
    symbolPosition: 'before',
    space: true,
    popular: true,
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    flag: '🇮🇳',
    decimals: 2,
    symbolPosition: 'before',
    space: false,
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    flag: '🇨🇦',
    decimals: 2,
    symbolPosition: 'before',
    space: false,
  },
  SAR: {
    code: 'SAR',
    symbol: 'SAR',
    name: 'Saudi Riyal',
    flag: '🇸🇦',
    decimals: 2,
    symbolPosition: 'before',
    space: true,
  },
};

/**
 * Rates are units of each currency per 1 PKR. PKR is the canonical base: prices
 * stored in the database ARE rupees, and conversion happens only here, at
 * display time, FROM PKR into the selected currency. (This store previously
 * treated every amount as USD and multiplied by a per-USD rate, which inflated
 * rupee amounts ~277× wherever the display currency was PKR — QA C-3/M-3.)
 * The cross-rates below preserve the previous USD relationships (USD 1,
 * EUR 0.8926, GBP 0.7556, PKR 277.20, AED 3.6725, INR 84.05, CAD 1.38,
 * SAR 3.75 per dollar), re-based onto PKR.
 */
const PKR_PER_USD = 277.2;

export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  PKR: 1,
  USD: 1 / PKR_PER_USD,
  EUR: 0.8926 / PKR_PER_USD,
  GBP: 0.7556 / PKR_PER_USD,
  AED: 3.6725 / PKR_PER_USD,
  INR: 84.05 / PKR_PER_USD,
  CAD: 1.38 / PKR_PER_USD,
  SAR: 3.75 / PKR_PER_USD,
};

export interface FormatPriceOptions {
  currency?: CurrencyCode;
  showCode?: boolean;
  decimals?: number;
}

export function formatCurrencyValue(
  amountInPKR: number | undefined | null,
  currency: CurrencyCode = 'USD',
  rates: Record<CurrencyCode, number> = FALLBACK_RATES,
  options?: FormatPriceOptions,
): string {
  if (amountInPKR === undefined || amountInPKR === null || Number.isNaN(amountInPKR)) {
    return '—';
  }

  const rate = rates[currency] || FALLBACK_RATES[currency] || 1.0;
  const converted = amountInPKR * rate;
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
  const decimals = options?.decimals !== undefined ? options.decimals : config.decimals;

  const formattedNum = converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const space = config.space ? ' ' : '';
  let formatted: string;

  if (config.symbolPosition === 'before') {
    formatted = `${config.symbol}${space}${formattedNum}`;
  } else {
    formatted = `${formattedNum}${space}${config.symbol}`;
  }

  if (options?.showCode) {
    formatted += ` ${config.code}`;
  }

  return formatted;
}

export function convertCurrencyValue(
  amountInPKR: number | undefined | null,
  currency: CurrencyCode = 'USD',
  rates: Record<CurrencyCode, number> = FALLBACK_RATES,
): number {
  if (amountInPKR === undefined || amountInPKR === null || Number.isNaN(amountInPKR)) {
    return 0;
  }
  const rate = rates[currency] || FALLBACK_RATES[currency] || 1.0;
  return amountInPKR * rate;
}

/**
 * The inverse of convertCurrencyValue: an amount typed in a display currency
 * becomes canonical PKR (rates are units per 1 PKR, so PKR = display / rate).
 * Filter inputs are entered in the shopper's display currency but the catalog
 * query — and therefore the URL — always carries PKR.
 */
export function convertToPKRValue(
  amountInDisplay: number | undefined | null,
  currency: CurrencyCode = 'USD',
  rates: Record<CurrencyCode, number> = FALLBACK_RATES,
): number {
  if (amountInDisplay === undefined || amountInDisplay === null || Number.isNaN(amountInDisplay)) {
    return 0;
  }
  const rate = rates[currency] || FALLBACK_RATES[currency] || 1.0;
  return amountInDisplay / rate;
}

interface CurrencyState {
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  isLoading: boolean;
  lastUpdated: string | null;
  setCurrency: (currency: CurrencyCode) => void;
  fetchRates: (force?: boolean) => Promise<void>;
  formatPrice: (amountInPKR: number | undefined | null, options?: FormatPriceOptions | CurrencyCode) => string;
  convertPrice: (amountInPKR: number | undefined | null, targetCurrency?: CurrencyCode) => number;
  convertToPKR: (amountInDisplay: number | undefined | null, sourceCurrency?: CurrencyCode) => number;
}

// 1 hour cache duration
const REVALIDATE_INTERVAL_MS = 60 * 60 * 1000;

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: DEFAULT_CURRENCY,
      rates: FALLBACK_RATES,
      isLoading: false,
      lastUpdated: null,

      setCurrency: (currency) => {
        if (SUPPORTED_CURRENCIES[currency]) {
          set({ currency });
        }
      },

      fetchRates: async (force = false) => {
        const { lastUpdated, isLoading } = get();
        if (isLoading) return;

        // Check if recently fetched (within 1 hour) unless forced
        if (!force && lastUpdated) {
          const lastTime = new Date(lastUpdated).getTime();
          if (Date.now() - lastTime < REVALIDATE_INTERVAL_MS) {
            return;
          }
        }

        set({ isLoading: true });

        try {
          // Open exchange rates API with PKR base, matching the canonical model:
          // each returned rate is units of that currency per 1 PKR.
          const res = await fetch('https://open.er-api.com/v6/latest/PKR');
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          if (data && data.rates) {
            const nextRates = { ...FALLBACK_RATES };
            for (const code of Object.keys(FALLBACK_RATES) as CurrencyCode[]) {
              if (typeof data.rates[code] === 'number' && data.rates[code] > 0) {
                nextRates[code] = data.rates[code];
              }
            }

            set({
              rates: nextRates,
              isLoading: false,
              lastUpdated: new Date().toISOString(),
            });
            return;
          }
        } catch {
          // Secondary fallback or silent catch to retain existing/fallback rates
        }

        set({
          isLoading: false,
          // If no previous update, set fallback timestamp
          lastUpdated: get().lastUpdated || new Date().toISOString(),
        });
      },

      formatPrice: (amountInPKR, options) => {
        const state = get();
        let currencyCode = state.currency;
        let opt: FormatPriceOptions | undefined;

        if (typeof options === 'string') {
          currencyCode = options;
        } else if (options) {
          opt = options;
          if (options.currency) {
            currencyCode = options.currency;
          }
        }

        return formatCurrencyValue(amountInPKR, currencyCode, state.rates, opt);
      },

      convertPrice: (amountInPKR, targetCurrency) => {
        const state = get();
        const code = targetCurrency || state.currency;
        return convertCurrencyValue(amountInPKR, code, state.rates);
      },

      convertToPKR: (amountInDisplay, sourceCurrency) => {
        const state = get();
        const code = sourceCurrency || state.currency;
        return convertToPKRValue(amountInDisplay, code, state.rates);
      },
    }),
    {
      name: 'vd:v1:currency',
      // Version 1 is the PKR-canonical model. Persisted v0 state holds USD-based
      // rates, which would silently resurrect the old conversion direction for
      // returning visitors, so migration keeps only the currency choice and
      // re-seeds the rates.
      version: 1,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<CurrencyState>;
        return {
          currency: state.currency ?? DEFAULT_CURRENCY,
          rates: FALLBACK_RATES,
          lastUpdated: null,
        } as CurrencyState;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currency: state.currency,
        rates: state.rates,
        lastUpdated: state.lastUpdated,
      }),
    },
  ),
);

// Convenient React hook with all helpers
export function useCurrency() {
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const rates = useCurrencyStore((s) => s.rates);
  const isLoading = useCurrencyStore((s) => s.isLoading);
  const lastUpdated = useCurrencyStore((s) => s.lastUpdated);
  const fetchRates = useCurrencyStore((s) => s.fetchRates);
  const formatPrice = useCurrencyStore((s) => s.formatPrice);
  const convertPrice = useCurrencyStore((s) => s.convertPrice);
  const convertToPKR = useCurrencyStore((s) => s.convertToPKR);

  return {
    currency,
    setCurrency,
    rates,
    isLoading,
    lastUpdated,
    fetchRates,
    formatPrice,
    convertPrice,
    convertToPKR,
    config: SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD,
    currencies: Object.values(SUPPORTED_CURRENCIES),
    popularCurrencies: Object.values(SUPPORTED_CURRENCIES).filter((c) => c.popular),
  };
}

// Standalone formatPrice function for non-React or helper contexts.
// The amount is always PKR (the canonical stored currency); conversion into
// the selected display currency happens inside formatCurrencyValue.
export function formatPrice(
  amountInPKR: number | undefined | null,
  options?: FormatPriceOptions | CurrencyCode,
): string {
  const store = useCurrencyStore.getState();
  let currencyCode = store.currency;
  let opt: FormatPriceOptions | undefined;

  if (typeof options === 'string') {
    currencyCode = options;
  } else if (options) {
    opt = options;
    if (options.currency) {
      currencyCode = options.currency;
    }
  }

  return formatCurrencyValue(amountInPKR, currencyCode, store.rates, opt);
}
