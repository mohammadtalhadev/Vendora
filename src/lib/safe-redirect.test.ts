import { describe, expect, it } from 'vitest';
import { isSafeRedirect, safeRedirect } from './safe-redirect';

/**
 * The shared redirect judge: only plain in-app paths survive.
 * Everything else — the classic open-redirect shapes included — falls back.
 */
describe('safeRedirect', () => {
  it.each([
    ['/vendor', '/vendor'],
    ['/vendor/orders?status=packed#row-5', '/vendor/orders?status=packed#row-5'],
    ['/account/orders', '/account/orders'],
    ['/', '/'],
  ])('keeps in-app path %s', (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
    expect(isSafeRedirect(input)).toBe(true);
  });

  it.each([
    ['//evil.com', 'protocol-relative URL'],
    ['/\\evil.com', 'backslash protocol-relative variant'],
    ['https://evil.com', 'absolute URL'],
    ['http://evil.com/phish', 'absolute URL with path'],
    ['javascript:alert(1)', 'javascript scheme'],
    ['evil.com', 'bare host'],
    ['', 'empty string'],
    ['   ', 'whitespace only'],
  ])('rejects %s (%s)', (input) => {
    expect(safeRedirect(input)).toBe('/');
    expect(safeRedirect(input, '/login')).toBe('/login');
    expect(isSafeRedirect(input)).toBe(false);
  });

  it.each([[null], [undefined]])('rejects %s', (input) => {
    expect(safeRedirect(input)).toBe('/');
    expect(isSafeRedirect(input)).toBe(false);
  });
});

/**
 * Parallel-line pins (main line) — kept verbatim so both lines'
 * assertions guard the merged implementation.
 */
describe('safeRedirect (parallel-line pins)', () => {
  it('honours same-origin absolute paths, including query strings', () => {
    expect(safeRedirect('/orders')).toBe('/orders');
    expect(safeRedirect('/orders/123?tab=tracking')).toBe('/orders/123?tab=tracking');
    expect(safeRedirect('/')).toBe('/');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeRedirect('https://evil.example/phish')).toBe('/');
    expect(safeRedirect('//evil.example/phish')).toBe('/');
    expect(safeRedirect('/\\\\evil.example')).toBe('/');
  });

  it('rejects non-paths and empty values, honouring a custom fallback', () => {
    expect(safeRedirect('orders')).toBe('/');
    expect(safeRedirect('javascript:alert(1)')).toBe('/');
    expect(safeRedirect('')).toBe('/');
    expect(safeRedirect(null)).toBe('/');
    expect(safeRedirect(undefined)).toBe('/');
    expect(safeRedirect(null, '/admin')).toBe('/admin');
    expect(safeRedirect('//evil.example', '/admin')).toBe('/admin');
  });
});
