import React from 'react';
import { BellRing, ShieldCheck, Zap, Sparkles } from 'lucide-react';

/**
 * Mobile-web promo. There is no native Vendora app, so this section sells
 * what is true: the storefront itself runs in a phone browser — order and
 * escrow tracking, secure checkout and re-ordering included. No download
 * badges, no QR code, no invented ratings or download counts.
 */
export const AppPromoSection: React.FC = () => {
  return (
    <section className="reveal mb-14">
      <div className="relative overflow-hidden rounded-[32px] border border-orange-200/80 bg-gradient-to-br from-[#0C1046] via-[#111A5A] to-[#1E1B4B] p-7 sm:p-10 text-white shadow-2xl">
        {/* Ambient Glow Orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-white/15 backdrop-blur-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Vendora in Your Mobile Browser</span>
          </div>

          <h2 className="font-outfit mt-4 text-2xl font-black tracking-tight sm:text-4xl lg:text-[42px] leading-[1.08]">
            Shop Faster. Track Live.<br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-amber-200 bg-clip-text text-transparent">
              All in Your Pocket.
            </span>
          </h2>

          <p className="mt-3.5 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            No app to install — Vendora runs right in your phone&apos;s browser. Follow your
            escrow release and rider tracking in real time, and check out securely wherever you are.
          </p>

          {/* Feature Bullets */}
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-xs">
              <BellRing className="h-4 w-4 text-amber-400" />
              <span>Instant Escrow Alerts</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Secure Escrow Checkout</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-xs">
              <Zap className="h-4 w-4 text-cyan-400" />
              <span>One-Tap Re-Order</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
