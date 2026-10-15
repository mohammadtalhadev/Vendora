import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

interface SmoothScrollContextType {
  lenis: Lenis | null;
  pauseScroll: () => void;
  resumeScroll: () => void;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  pauseScroll: () => {},
  resumeScroll: () => {},
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export const SmoothScrollProvider: React.FC<SmoothScrollProviderProps> = ({ children }) => {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Reduced motion is gated HERE, once, deliberately: when the user prefers
    // reduced motion no Lenis instance exists at all and the page scrolls
    // natively. Lenis 1.3.26's own `respectReducedMotion` option (see
    // node_modules/lenis/dist/lenis.d.ts) is NOT a second gate worth keeping:
    // in this version it only forces *programmatic* scrollTo calls to land
    // immediately (dist lenis.js, `prefersReducedMotion` in scrollTo) — it
    // never disables wheel/touch smoothing — so it is switched off in the
    // options below to leave this provider as the single authority on the
    // preference.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    const lenis = new Lenis({
      autoRaf: true,
      // Batch 117: duration/easing mode, the exact recipe the owner's
      // trip-planner site runs ({ lerp: 0.08, duration: 1.2 }) and the
      // feel he asked to match. When `duration` is set, Lenis's Animate
      // runs a TIMED animation (advance() prefers duration+easing over
      // lerp): every wheel impulse glides along the same 1.2s curve no
      // matter how busy the main thread is, so a dropped frame samples
      // the curve later instead of stretching the motion — the previous
      // pure-lerp damping (0.1) is frame-rate dependent, which is why it
      // read as "laggy" stutter on this heavy page while the same library
      // feels buttery on the light one. lerp stays as the fallback the
      // library uses for programmatic scrolls without a duration.
      duration: 1.2,
      lerp: 0.08,
      smoothWheel: true,
      // Touch is deliberately NOT synced (Lenis's own recommendation): with
      // syncTouch on, Lenis intercepts native touch scrolling and replays it
      // through the lerp loop, which fights the platform's momentum and
      // rubber-banding — the classic "mobile scroll feels broken" defect.
      // Touch keeps the native scroller; only wheel/trackpad is smoothed.
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 1,
      overscroll: true,
      respectReducedMotion: false, // gated once by this provider — see note above
    });

    lenisRef.current = lenis;
    setLenisInstance(lenis);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
      setLenisInstance(null);
    };
  }, []);

  const pauseScroll = useCallback(() => {
    lenisRef.current?.stop();
  }, []);

  const resumeScroll = useCallback(() => {
    lenisRef.current?.start();
  }, []);

  const value = useMemo<SmoothScrollContextType>(
    () => ({ lenis: lenisInstance, pauseScroll, resumeScroll }),
    [lenisInstance, pauseScroll, resumeScroll],
  );

  return <SmoothScrollContext.Provider value={value}>{children}</SmoothScrollContext.Provider>;
};
