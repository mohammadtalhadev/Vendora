import { useCallback, useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * useCarouselScroll — makes any horizontally scrollable container (carousel)
 * fully navigable:
 *
 *  - `scrollLeft()` / `scrollRight()`: smooth, viewport-aware paging (85% of
 *    the visible width per press, falling back to 320px) — wire these to
 *    arrow buttons for "effective" movement instead of fixed tiny jumps.
 *  - Keyboard support: ArrowLeft / ArrowRight scroll the carousel when the
 *    pointer is hovering it OR it (or a child) has focus. No click needed.
 *  - Touch / trackpad scrolling continues to work natively (overflow-x-auto).
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   const { scrollLeft, scrollRight } = useCarouselScroll(ref);
 *   <div ref={ref} className="overflow-x-auto no-scrollbar">...</div>
 *   <button onClick={scrollLeft}>←</button>
 *   <button onClick={scrollRight}>→</button>
 */
export function useCarouselScroll<T extends HTMLElement = HTMLDivElement>(
  ref: RefObject<T | null>,
) {
  const getStep = useCallback((): number => {
    const el = ref.current;
    if (!el) return 320;
    return Math.max(Math.round(el.clientWidth * 0.85), 160);
  }, [ref]);

  const scrollLeft = useCallback(() => {
    ref.current?.scrollBy({ left: -getStep(), behavior: 'smooth' });
  }, [ref, getStep]);

  const scrollRight = useCallback(() => {
    ref.current?.scrollBy({ left: getStep(), behavior: 'smooth' });
  }, [ref, getStep]);

  // Keyboard arrow support: active while hovering the carousel or when it
  // (or any descendant) has focus.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let hovered = false;
    const onEnter = () => {
      hovered = true;
    };
    const onLeave = () => {
      hovered = false;
    };

    const isFocusedInside = () =>
      document.activeElement === el || el.contains(document.activeElement);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!hovered && !isFocusedInside()) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        el.scrollBy({ left: -getStep(), behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        el.scrollBy({ left: getStep(), behavior: 'smooth' });
      }
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, getStep]);

  return { scrollLeft, scrollRight, getStep };
}
