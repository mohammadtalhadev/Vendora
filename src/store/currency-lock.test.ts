import { describe, it, expect } from 'vitest';
import { CURRENCY_LOCKED_TO_PKR, DEFAULT_CURRENCY } from './currency-store';

/**
 * Batch 22 — PKR-only storefront lock (owner decision).
 * While the lock is on, no storefront surface mounts the CurrencySelector and
 * RootLayout settles any persisted non-PKR choice back to PKR on app start.
 * These assertions pin the contract so lifting the lock later is a deliberate,
 * visible change rather than an accident.
 */
describe('PKR-only currency lock', () => {
  it('keeps the lock engaged', () => {
    expect(CURRENCY_LOCKED_TO_PKR).toBe(true);
  });

  it('defaults the storefront currency to PKR', () => {
    expect(DEFAULT_CURRENCY).toBe('PKR');
  });
});
