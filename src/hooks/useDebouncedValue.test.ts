import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately on render', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('debounces rapid updates and only updates after delayMs passes', () => {
    let value = 'query 1';
    const { result, rerender } = renderHook(({ val }) => useDebouncedValue(val, 300), {
      initialProps: { val: value },
    });

    expect(result.current).toBe('query 1');

    // Update value rapidly
    value = 'query 2';
    rerender({ val: value });
    expect(result.current).toBe('query 1'); // Not updated yet

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('query 1'); // Still 100ms remaining

    // Another rapid update resets the timer
    value = 'query 3';
    rerender({ val: value });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('query 1');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('query 3'); // Updated after full 300ms
  });
});
