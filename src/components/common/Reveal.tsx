import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Stagger position within a list of reveals: the transition delay is
   * `min(index, 8) * 60ms`, so long grids do not cascade for seconds.
   * Ignored when `delay` is given.
   */
  index?: number;
  /** Explicit transition delay in milliseconds. Overrides `index`. */
  delay?: number;
  children: React.ReactNode;
}

/**
 * Scroll reveal as a component — the reusable form of the
 * homepage's `useReveal` + `.reveal` pattern, for surfaces where a
 * page-level hook is the wrong tool (panel dashboards, shared widgets).
 * The element starts lifted/faded per the `.reveal` styles in base.css
 * and gains `.reveal-visible` the first time it enters the viewport,
 * then is unobserved — the reveal happens exactly once. Staggering is
 * a transition delay, so every element still animates with the shared
 * 0.6s curve.
 *
 * Reduced-motion users and environments without IntersectionObserver
 * get the element revealed immediately in an effect — content is never
 * left hidden, and the `.reveal` reduced-motion CSS rule makes the end
 * state identical either way.
 */
export const Reveal: React.FC<RevealProps> = ({
  index = 0,
  delay,
  className,
  style,
  children,
  ...props
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      el.classList.add('reveal-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const transitionDelay = delay ?? Math.min(Math.max(index, 0), 8) * 60;

  return (
    <div
      ref={ref}
      className={cn('reveal', className)}
      style={{ transitionDelay: `${transitionDelay}ms`, ...style }}
      {...props}
    >
      {children}
    </div>
  );
};

Reveal.displayName = 'Reveal';
