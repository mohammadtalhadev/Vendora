import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSmoothScroll } from './SmoothScrollProvider';

/**
 * ScrollManager — resets scroll position on SPA navigation.
 *
 * Lenis keeps its own internal scroll target, so a client-side route change
 * that only swaps the rendered page leaves the window at the previous page's
 * offset, with Lenis still easing toward its stale target. On every pathname
 * change this component:
 *
 *  1. resets any nested scroll container marked `data-scroll-reset`
 *     (the workspace shell's <main> scrolls independently of the window, so
 *     neither Lenis nor window.scrollTo can reach it),
 *  2. honours in-page anchors: when the URL carries a hash, scrolls to the
 *     element with that id instead of the top,
 *  3. otherwise jumps straight to the top — through Lenis with
 *     `immediate: true` when an instance exists, so the reset and Lenis's
 *     internal target agree, or natively when it does not (reduced-motion
 *     users have no instance by design).
 *
 * Mounted once inside each shell (RootLayout, WorkspaceLayout), which are
 * the components that live inside the router on every route.
 */
export const ScrollManager: React.FC = () => {
  const location = useLocation();
  const { lenis } = useSmoothScroll();

  useEffect(() => {
    document.querySelectorAll<HTMLElement>('[data-scroll-reset]').forEach((el) => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    });

    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (target) {
        if (lenis) {
          lenis.scrollTo(target, { immediate: true });
        } else {
          target.scrollIntoView();
        }
        return;
      }
    }

    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else if (window.scrollY > 0) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash, lenis]);

  return null;
};
