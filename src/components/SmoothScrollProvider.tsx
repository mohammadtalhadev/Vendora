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
      lerp: 0.1, // True responsive linear damping: silky smooth, zero floaty input lag
      smoothWheel: true,
      syncTouch: true, // Touch gets the same smoothed feel as wheel/trackpad
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
