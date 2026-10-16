import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';
import { useSmoothScroll } from '../../../components/SmoothScrollProvider';

const RING_CIRCUMFERENCE = 125.6;

/**
 * Back-to-top floating button with a scroll-progress ring.
 *
 * Performance contract: Lenis animates the window scroll on
 * every animation frame, so a scroll listener that calls setState per
 * event re-renders React for the whole glide and reads
 * `documentElement.scrollHeight` (a layout read) per event — the main
 * thread saturates and the smooth scroll stutters. This component
 * therefore:
 *  - throttles scroll handling to one rAF callback per frame,
 *  - writes the progress ring + tooltip text straight to the DOM via
 *    refs (no React re-render while scrolling),
 *  - only flips `isVisible` state when the 350px threshold is crossed,
 *  - caches the document height and refreshes it on resize / when the
 *    page grows past it, instead of reading layout every frame,
 *  - scrolls back through Lenis when it is running, so two competing
 *    smooth-scroll animations never fight over the same scroll offset.
 */
export const BackToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { lenis } = useSmoothScroll();
  const ringRef = useRef<SVGCircleElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const progressRef = useRef(0);
  const docHeightRef = useRef(0);

  useEffect(() => {
    const measureDocHeight = () => {
      docHeightRef.current =
        document.documentElement.scrollHeight - window.innerHeight;
    };
    measureDocHeight();

    let rafId = 0;
    const applyProgress = () => {
      rafId = 0;
      const scrollY = window.scrollY;
      // The homepage grows as rails stream in; if the cached height is
      // stale the percentage would clamp early, so refresh it then.
      if (scrollY > docHeightRef.current) measureDocHeight();
      const docHeight = docHeightRef.current;
      const progress =
        docHeight > 0
          ? Math.min(100, Math.round((scrollY / docHeight) * 100))
          : 0;
      progressRef.current = progress;
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(
          RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * progress) / 100,
        );
      }
      if (labelRef.current) {
        labelRef.current.textContent = `Top (${progress}%)`;
      }
      setIsVisible((prev) => {
        const next = scrollY > 350;
        return prev === next ? prev : next;
      });
    };
    const handleScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(applyProgress);
    };

    applyProgress();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', measureDocHeight);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', measureDocHeight);
    };
  }, []);

  const scrollToTop = () => {
    if (lenis) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!isVisible) return null;

  // rendered through a portal to <body> on purpose. The button
  // is mounted deep inside the routed page subtree (under the keyed
  // .page-enter entrance-animation wrapper in RootLayout); a transform
  // animation on an ancestor makes that ancestor the containing block for
  // position:fixed descendants, so `fixed bottom-7 right-7` was resolving
  // against the full-height page wrapper instead of the viewport — the
  // button ended up planted at the bottom of the page content, visible
  // only once the footer scrolled into view. As a direct child of <body>
  // no page-level wrapper can capture it, and it stays pinned to the
  // viewport corner at any scroll depth.
  return createPortal(
    <div className="fixed bottom-7 right-7 z-40 animate-in fade-in zoom-in-75 duration-300">
      <button
        type="button"
        onClick={scrollToTop}
        className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 p-0 text-slate-700 shadow-xl shadow-slate-900/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:bg-white hover:text-sun-orange hover:shadow-2xl hover:shadow-orange-500/20 active:scale-95 cursor-pointer"
        aria-label="Scroll back to top"
      >
        {/* Circular Progress Stroke (Subtle) */}
        <svg className="absolute inset-0 h-full w-full -rotate-90 p-0.5" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-slate-100 dark:text-slate-800"
          />
          <circle
            ref={ringRef}
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={
              RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * progressRef.current) / 100
            }
            strokeLinecap="round"
            className="text-sun-orange"
          />
        </svg>

        <ArrowUp className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />

        {/* Hover Tooltip Pill */}
        <span
          ref={labelRef}
          className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
        >
          Top ({progressRef.current}%)
        </span>
      </button>
    </div>,
    document.body,
  );
};
