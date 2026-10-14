import { describe, expect, it } from 'vitest';
import { normalizeSearchQuery, SEARCH_TERM_MAP } from './search-terms';

describe('normalizeSearchQuery', () => {
  it('corrects common misspellings', () => {
    expect(normalizeSearchQuery('iphne')).toBe('iphone');
    expect(normalizeSearchQuery('samsng galaxy')).toBe('samsung galaxy');
    expect(normalizeSearchQuery('hedphones')).toBe('headphones');
    expect(normalizeSearchQuery('leptop')).toBe('laptop');
  });

  it('expands synonyms to catalogue words', () => {
    expect(normalizeSearchQuery('mobile')).toBe('phone');
    expect(normalizeSearchQuery('cellphone')).toBe('phone');
    expect(normalizeSearchQuery('tv')).toBe('television');
    expect(normalizeSearchQuery('fridge')).toBe('refrigerator');
  });

  it('expands a token that maps to two words', () => {
    expect(normalizeSearchQuery('ac')).toBe('air conditioner');
  });

  it('leaves unknown tokens untouched and normalises case and spacing', () => {
    expect(normalizeSearchQuery('  Sony   Headphones ')).toBe('sony headphones');
    expect(normalizeSearchQuery('wireless earbuds')).toBe('wireless earbuds');
  });

  it('returns an empty string for blank input', () => {
    expect(normalizeSearchQuery('')).toBe('');
    expect(normalizeSearchQuery('   ')).toBe('');
  });

  it('carries at least twenty mappings', () => {
    expect(Object.keys(SEARCH_TERM_MAP).length).toBeGreaterThanOrEqual(20);
  });
});
