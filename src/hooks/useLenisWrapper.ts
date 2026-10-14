import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

/**
 * useLenisWrapper — Lenis in "wrapper mode" for inner scroll containers.
 *
 * The window-level Lenis (SmoothScrollProvider) can only smooth the window.
 * Shells whose content scrolls inside an element — the workspace shell's
 * <main> is `overflow-y-auto` inside an `h-screen` frame — need their own
 * instance bound to that element: `wrapper` is the scroller, `content` is
 * its `[data-lenis-content]` child (Lenis measures the content to know the
 * scroll limit; without it, it would measure documentElement).
 *
 * Instances are registered in a module-level map keyed by their wrapper
 * element so ScrollManager — which lives in the same tree but cannot know
 * which containers opted in — can reset them through Lenis itself on
 * route changes (`lenis.scrollTo(0, { immediate: true })` keeps Lenis's
 * internal target in agreement, where a bare `el.scrollTop = 0` would be
 * fought by the next animation frame).
 *
 * Gates mirror SmoothScrollProvider exactly:
 *  - prefers-reduced-motion → no instance at all, native scrolling;
 *  - no ResizeObserver (jsdom test environments) → no instance, native
 *    scrolling. Real browsers always take the Lenis path.
 * A constructor failure likewise falls back to native scrolling rather
 * than breaking the shell.
 */
const wrapperInstances = new Map<HTMLElement, Lenis>();

/** The wrapper-mode Lenis bound to exactly this element, if one is live. */
export function getWrapperLenis(wrapper: HTMLElement): Lenis | null {
  return wrapperInstances.get(wrapper) ?? null;
}

/** The wrapper-mode Lenis whose container holds `target`, if any. */
export function getWrapperLenisFor(target: Element): Lenis | null {
  for (const [wrapper, lenis] of wrapperInstances) {
    if (wrapper.contains(target)) return lenis;
  }
  return null;
}

export function useLenisWrapper<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return;

    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    if (typeof window.ResizeObserver !== 'function') return;

    const content = wrapper.querySelector<HTMLElement>('[data-lenis-content]');
    if (!content) return;

    let lenis: Lenis;
    try {
      lenis = new Lenis({
        wrapper,
        content,
        autoRaf: true,
        lerp: 0.1, // same damping as the window instance
        smoothWheel: true,
        // Same deliberate choice as SmoothScrollProvider: touch stays native
        // (syncTouch replays touch through the lerp loop and fights native
        // momentum on mobile); only wheel/trackpad input is smoothed.
        syncTouch: false,
        touchMultiplier: 1,
        wheelMultiplier: 1,
        overscroll: true,
        // Inner scrollers inside a page (dropdown lists, table panes)
        // keep their native scroll instead of being hijacked.
        allowNestedScroll: true,
        respectReducedMotion: false, // gated once above — see SmoothScrollProvider
      });
    } catch {
      return;
    }

    wrapperInstances.set(wrapper, lenis);
    return () => {
      wrapperInstances.delete(wrapper);
      lenis.destroy();
    };
  }, []);

  return ref;
}
