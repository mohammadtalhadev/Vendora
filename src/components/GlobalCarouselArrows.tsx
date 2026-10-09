import { useEffect } from 'react';

/**
 * Finds the nearest horizontally scrollable ancestor (a carousel / strip).
 */
function findScrollableX(el: Element | null): HTMLElement | null {
  let node = el;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const ox = getComputedStyle(node).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 4) {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * GlobalCarouselArrows — app-wide left/right arrow-key navigation for EVERY
 * horizontally scrollable carousel/strip (no per-page wiring needed).
 *
 * Behavior:
 *  - ArrowLeft / ArrowRight scroll the carousel that the pointer is hovering
 *    OR that contains the focused element.
 *  - Pages ~85% of the carousel's visible width per press (never a fixed
 *    tiny jump), with smooth animation.
 *  - Never hijacks arrows while typing in inputs/textareas/selects or
 *    contentEditable fields.
 *  - Renders nothing.
 */
export function GlobalCarouselArrows() {
  useEffect(() => {
    let hovered: HTMLElement | null = null;
    let activeDragEl: HTMLElement | null = null;
    let startX = 0;
    let scrollStart = 0;
    let hasDragged = false;
    let prevSnapType = '';
    let prevBehavior = '';
    let lastPageX = 0;
    let lastTime = 0;
    let velocity = 0;

    const onMouseOver = (e: MouseEvent) => {
      hovered = findScrollableX(e.target as Element | null);
    };

    const onMouseOut = (e: MouseEvent) => {
      const next = e.relatedTarget as Element | null;
      if (hovered && next && hovered.contains(next)) return;
      hovered = findScrollableX(next);
    };

    // 1. Mouse Drag-to-Scroll (click & drag to scroll horizontally)
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // left click only
      const target = e.target as HTMLElement | null;
      // Ignore interactive controls so buttons/inputs work as expected
      if (target?.closest('button, input, select, textarea, [role="button"]')) return;

      const scrollEl = findScrollableX(target);
      if (!scrollEl) return;

      activeDragEl = scrollEl;
      startX = e.pageX;
      lastPageX = e.pageX;
      lastTime = performance.now();
      velocity = 0;
      scrollStart = scrollEl.scrollLeft;
      hasDragged = false;
      prevSnapType = scrollEl.style.scrollSnapType;
      prevBehavior = scrollEl.style.scrollBehavior;
    };

    // Prevent browser native HTML5 drag on <img> and <a> tags during drag-to-scroll
    const onDragStart = (e: DragEvent) => {
      if (activeDragEl) {
        e.preventDefault();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!activeDragEl) return;
      const delta = e.pageX - startX;
      if (!hasDragged && Math.abs(delta) > 4) {
        hasDragged = true;
        // Temporarily disable scroll-snap and smooth behavior to prevent jitter/glitches during drag
        activeDragEl.style.scrollSnapType = 'none';
        activeDragEl.style.scrollBehavior = 'auto';
        activeDragEl.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      }

      if (hasDragged) {
        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0) {
          velocity = (e.pageX - lastPageX) / dt;
        }
        lastPageX = e.pageX;
        lastTime = now;
        activeDragEl.scrollLeft = scrollStart - delta;
      }
    };

    const onMouseUp = () => {
      if (activeDragEl) {
        const el = activeDragEl;
        el.style.cursor = '';
        el.style.scrollBehavior = prevBehavior;
        document.body.style.removeProperty('user-select');

        // Apply smooth momentum if user flicked the carousel
        if (hasDragged && Math.abs(velocity) > 0.15) {
          const momentum = -velocity * 160;
          el.scrollBy({ left: momentum, behavior: 'smooth' });
          setTimeout(() => {
            el.style.scrollSnapType = prevSnapType;
          }, 250);
        } else {
          el.style.scrollSnapType = prevSnapType;
        }

        activeDragEl = null;
      }
    };

    // Prevent accidental link clicking if user was dragging
    const onClickCapture = (e: MouseEvent) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        setTimeout(() => {
          hasDragged = false;
        }, 0);
      }
    };

    // 2. Arrow keyboard navigation
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      const active = document.activeElement;
      if (active) {
        const tag = active.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          (active as HTMLElement).isContentEditable
        ) {
          return; // don't interfere with typing / text caret movement
        }
      }

      const target = findScrollableX(active) || hovered;
      if (!target) return;

      e.preventDefault();
      const step = Math.max(Math.round(target.clientWidth * 0.85), 160);
      target.scrollBy({ left: e.key === 'ArrowLeft' ? -step : step, behavior: 'smooth' });
    };

    document.addEventListener('mouseover', onMouseOver, { passive: true });
    document.addEventListener('mouseout', onMouseOut, { passive: true });
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('click', onClickCapture, true);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}
