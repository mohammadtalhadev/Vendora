import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isChunkLoadError,
  reloadOnceForNewVersion,
  clearChunkReloadGuard,
} from './chunk-recovery';

describe('isChunkLoadError', () => {
  it('matches the browser dynamic-import failure messages', () => {
    expect(
      isChunkLoadError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://vendora-plum.vercel.app/assets/AdminDashboardPage-BZibbZhz.js',
        ),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true);
    expect(isChunkLoadError('error loading dynamically imported module')).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(isChunkLoadError(new Error('Failed to load products: permission denied'))).toBe(false);
    expect(isChunkLoadError(new Error('Network request failed'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('reloadOnceForNewVersion', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('reloads the first time and reports it', () => {
    const reload = vi.fn();
    expect(reloadOnceForNewVersion(1_000_000, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('refuses a second reload inside the guard window', () => {
    const reload = vi.fn();
    expect(reloadOnceForNewVersion(1_000_000, reload)).toBe(true);
    expect(reloadOnceForNewVersion(1_005_000, reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads again after the guard window passes', () => {
    const reload = vi.fn();
    expect(reloadOnceForNewVersion(1_000_000, reload)).toBe(true);
    expect(reloadOnceForNewVersion(1_000_000 + 16_000, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('clearChunkReloadGuard allows an immediate manual reload', () => {
    const reload = vi.fn();
    expect(reloadOnceForNewVersion(1_000_000, reload)).toBe(true);
    clearChunkReloadGuard();
    expect(reloadOnceForNewVersion(1_001_000, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
