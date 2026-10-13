import { useEffect, useRef } from 'react';

/**
 * Scroll reveal for elements carrying the `.reveal` class (styles live in
 * src/styles/base.css). Call once in a page/section component: the hook
 * observes every `.reveal` element in the document and adds
 * `.reveal-visible` the first time one enters the viewport, then
 * unobserves it — the reveal happens exactly once per element.
 *
 * The scan re-runs after every render of the host component, so elements
 * that mount late (e.g. sections that render only once their catalogue
 * query resolves) are picked up without any registration bookkeeping.
 *
 * Reduced-motion users and environments without IntersectionObserver get
 * every element revealed immediately — content is never left hidden.
 */
export function useReveal(): void {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const revealAll = () => {
      document
        .querySelectorAll('.reveal:not(.reveal-visible)')
        .forEach((el) => el.classList.add('reveal-visible'));
    };

    if (
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      revealAll();
      return;
    }

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('reveal-visible');
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
      );
    }

    const observer = observerRef.current;
    document
      .querySelectorAll('.reveal:not(.reveal-visible)')
      .forEach((el) => observer.observe(el));
  });

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);
}
