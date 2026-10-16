import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import { ScrollManager } from '../ScrollManager';
import { SkipLink } from '../common/SkipLink';
import { CURRENCY_LOCKED_TO_PKR, useCurrencyStore } from '../../store/currency-store';

// All pages across the website include the global Navbar, Footer, and ambient chrome.
// (The legacy client-side store sync that used to run here is gone: every page now
// reads the real database through the typed features/** React Query layer.)
const CHROMELESS_PATHS: string[] = [];

export const RootLayout: React.FC = () => {
  const { pathname } = useLocation();
  const isChromeless = CHROMELESS_PATHS.includes(pathname);

  // PKR-only lock: no storefront UI can change the display currency while the
  // lock is on, so the only way a non-PKR value can appear is a persisted
  // choice from before the lock — settle it back to PKR once on app start.
  useEffect(() => {
    if (CURRENCY_LOCKED_TO_PKR && useCurrencyStore.getState().currency !== 'PKR') {
      useCurrencyStore.setState({ currency: 'PKR' });
    }
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-none dark:bg-[#0a0a0b] font-sans selection:bg-sun-orange/20 selection:text-sun-orange text-slate-900 dark:text-slate-100">
      <SkipLink />
      <ScrollManager />
      {/* =========================================================================
          Ethereal Luminous Ambient Orbs (Whole Website Storefront)
          Each orb is promoted to its own compositor layer (transform-gpu +
          will-change) and paint-contained: a 130–140px blur over a fixed
          full-viewport layer otherwise repaints on every scroll frame.
         ========================================================================= */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-28 w-[640px] h-[640px] rounded-full bg-gradient-to-tr from-sun-orange-200/50 via-sun-orange-100/60 to-sun-orange-200/30 blur-[130px] dark:from-sun-orange/10 dark:via-sun-orange-200/5 pointer-events-none transform-gpu will-change-transform contain-paint" />
        <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-aqua-100/60 via-[#F1F5F9]/80 to-sun-orange-100/40 blur-[140px] dark:from-aqua/10 dark:via-transparent pointer-events-none transform-gpu will-change-transform contain-paint" />
        <div className="absolute -bottom-40 left-1/4 w-[580px] h-[580px] rounded-full bg-gradient-to-tr from-sun-orange-100/60 via-aqua-100/40 to-[#F1F5F9] blur-[130px] dark:from-sun-orange/5 dark:to-transparent pointer-events-none transform-gpu will-change-transform contain-paint" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {!isChromeless && <Navbar />}
        <main id="main-content" tabIndex={-1} className={`flex-1 ${isChromeless ? '' : 'pb-16 md:pb-0'}`}>
          {/* Route entrance: the keyed wrapper replays the
              .page-enter fade/rise once per navigation. Keying by
              pathname remounts only the routed page subtree; the
              shell chrome (nav, footer, ambient layer) never moves. */}
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
        {!isChromeless && <BottomNav />}
        {!isChromeless && <Footer />}
      </div>
    </div>
  );
};
