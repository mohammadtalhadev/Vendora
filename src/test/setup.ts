import '@testing-library/jest-dom';
import { FALLBACK_RATES, useCurrencyStore } from '../store/currency-store';

// Money assertions quote the stored amount directly, so tests pin the display currency
// and the rates instead of inheriting the storefront default or a live FX fetch.
useCurrencyStore.setState({ currency: 'USD', rates: FALLBACK_RATES, isLoading: false, lastUpdated: null });
