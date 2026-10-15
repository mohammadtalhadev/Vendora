import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it('honours same-origin absolute paths, including query strings', () => {
    expect(safeRedirect('/orders')).toBe('/orders');
    expect(safeRedirect('/orders/123?tab=tracking')).toBe('/orders/123?tab=tracking');
    expect(safeRedirect('/')).toBe('/');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeRedirect('https://evil.example/phish')).toBe('/');
    expect(safeRedirect('//evil.example/phish')).toBe('/');
    expect(safeRedirect('/\\evil.example')).toBe('/');
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
