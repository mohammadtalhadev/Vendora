import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import { useMarketplaceStore } from '../../store/marketplace-store';

// All pages across the website include the global Navbar, Footer, and ambient chrome.
const CHROMELESS_PATHS: string[] = [];

export const RootLayout: React.FC = () => {
  const syncWithDatabase = useMarketplaceStore((state) => state.syncWithDatabase);
  const { pathname } = useLocation();
  const isChromeless = CHROMELESS_PATHS.includes(pathname);

  useEffect(() => {
    syncWithDatabase();
  }, [syncWithDatabase]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-slate-950 font-sans selection:bg-[#FF7A1A]/20 selection:text-[#FF7A1A] text-slate-900 dark:text-slate-100">
      {/* =========================================================================
          Ethereal Luminous Ambient Orbs (Whole Website Storefront)
         ========================================================================= */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-28 w-[640px] h-[640px] rounded-full bg-gradient-to-tr from-[#FED7AA]/50 via-[#FFEDD5]/60 to-[#FED7AA]/30 blur-[130px] dark:from-[#FF7A1A]/10 dark:via-[#FED7AA]/5 pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-[#CFFAFE]/60 via-[#F1F5F9]/80 to-[#FFEDD5]/40 blur-[140px] dark:from-[#00B8C8]/10 dark:via-transparent pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-[580px] h-[580px] rounded-full bg-gradient-to-tr from-[#FFEDD5]/60 via-[#CFFAFE]/40 to-[#F1F5F9] blur-[130px] dark:from-[#FF7A1A]/5 pointer-events-none" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {!isChromeless && <Navbar />}
        <main className={`flex-1 ${isChromeless ? '' : 'pb-16 md:pb-0'}`}>
          <Outlet />
        </main>
        {!isChromeless && <BottomNav />}
        {!isChromeless && <Footer />}
      </div>
    </div>
  );
};
