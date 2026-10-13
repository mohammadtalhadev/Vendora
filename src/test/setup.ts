import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { FALLBACK_RATES, useCurrencyStore } from '../store/currency-store';

// findBy*/waitFor default to a 1s async timeout, which the heaviest suites
// intermittently exceed when the full suite runs under parallel load (they pass
// in isolation). 5s gives them headroom without masking genuinely stuck UI.
configure({ asyncUtilTimeout: 5000 });

// Money assertions quote the stored amount directly, so tests pin the display currency
// and the rates instead of inheriting the storefront default or a live FX fetch.
useCurrencyStore.setState({ currency: 'USD', rates: FALLBACK_RATES, isLoading: false, lastUpdated: null });
