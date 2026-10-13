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

export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 0.8926,
  GBP: 0.7556,
  PKR: 277.20,
  AED: 3.6725,
  INR: 84.05,
  CAD: 1.38,
  SAR: 3.75,
};

export interface FormatPriceOptions {
  currency?: CurrencyCode;
  showCode?: boolean;
  decimals?: number;
}

export function formatCurrencyValue(
  amountInUSD: number | undefined | null,
  currency: CurrencyCode = 'USD',
  rates: Record<CurrencyCode, number> = FALLBACK_RATES,
  options?: FormatPriceOptions,
): string {
  if (amountInUSD === undefined || amountInUSD === null || Number.isNaN(amountInUSD)) {
    return '—';
  }

  const rate = rates[currency] || FALLBACK_RATES[currency] || 1.0;
  const converted = amountInUSD * rate;
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
  const decimals = options?.decimals !== undefined ? options.decimals : config.decimals;

  const formattedNum = converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const space = config.space ? ' ' : '';
  let formatted = '';

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
  amountInUSD: number | undefined | null,
  currency: CurrencyCode = 'USD',
  rates: Record<CurrencyCode, number> = FALLBACK_RATES,
): number {
  if (amountInUSD === undefined || amountInUSD === null || Number.isNaN(amountInUSD)) {
    return 0;
  }
  const rate = rates[currency] || FALLBACK_RATES[currency] || 1.0;
  return amountInUSD * rate;
}

interface CurrencyState {
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  isLoading: boolean;
  lastUpdated: string | null;
  setCurrency: (currency: CurrencyCode) => void;
  fetchRates: (force?: boolean) => Promise<void>;
  formatPrice: (amountInUSD: number | undefined | null, options?: FormatPriceOptions | CurrencyCode) => string;
  convertPrice: (amountInUSD: number | undefined | null, targetCurrency?: CurrencyCode) => number;
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
          // Open exchange rates API with USD base
          const res = await fetch('https://open.er-api.com/v6/latest/USD');
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          if (data && data.rates) {
            const nextRates = { ...FALLBACK_RATES };
            for (const code of Object.keys(FALLBACK_RATES) as CurrencyCode[]) {
              if (typeof data.rates[code] === 'number') {
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

      formatPrice: (amountInUSD, options) => {
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

        return formatCurrencyValue(amountInUSD, currencyCode, state.rates, opt);
      },

      convertPrice: (amountInUSD, targetCurrency) => {
        const state = get();
        const code = targetCurrency || state.currency;
        return convertCurrencyValue(amountInUSD, code, state.rates);
      },
    }),
    {
      name: 'vd:v1:currency',
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

  return {
    currency,
    setCurrency,
    rates,
    isLoading,
    lastUpdated,
    fetchRates,
    formatPrice,
    convertPrice,
    config: SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD,
    currencies: Object.values(SUPPORTED_CURRENCIES),
    popularCurrencies: Object.values(SUPPORTED_CURRENCIES).filter((c) => c.popular),
  };
}

// Standalone formatPrice function for non-React or helper contexts
export function formatPrice(
  amountInUSD: number | undefined | null,
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

  return formatCurrencyValue(amountInUSD, currencyCode, store.rates, opt);
}
