import React, { useState } from 'react';
import { QrCode, Copy, Check, BellRing, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export const AppPromoSection: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText('VENDORAMOBILE');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="mb-14">
      <div className="relative overflow-hidden rounded-[32px] border border-orange-200/80 bg-gradient-to-br from-[#0C1046] via-[#111A5A] to-[#1E1B4B] p-7 sm:p-10 text-white shadow-2xl">
        {/* Ambient Glow Orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left Column: Copy, App Badges, Features */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-white/15 backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Vendora Mobile iOS &amp; Android App</span>
            </div>

            <h2 className="font-outfit mt-4 text-2xl font-black tracking-tight sm:text-4xl lg:text-[42px] leading-[1.08]">
              Shop Faster. Track Live.<br />
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-amber-200 bg-clip-text text-transparent">
                All in Your Pocket.
              </span>
            </h2>

            <p className="mt-3.5 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              Get instant push notifications for your State Bank Escrow release, real-time rider tracking, and exclusive app-only flash vouchers.
            </p>

            {/* Feature Bullets */}
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-xs">
                <BellRing className="h-4 w-4 text-amber-400" />
                <span>Instant Escrow Alerts</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Biometric FaceID Checkout</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-xs">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span>One-Tap Re-Order</span>
              </div>
            </div>

            {/* Promo Code Box */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5">
                <span className="text-xs font-bold text-amber-300">
                  🎁 App Voucher: <span className="font-mono font-black text-white">VENDORAMOBILE</span>
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="cursor-pointer ml-1 inline-flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 text-[11px] font-bold text-white transition-colors hover:bg-white/30"
                  title="Copy promo code"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-300" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy Code
                    </>
                  )}
                </button>
              </div>
              <span className="text-xs text-slate-400">10% OFF your first mobile order</span>
            </div>

            {/* Store Download Buttons */}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <a
                href="#app-store"
                className="transition-transform hover:scale-105 active:scale-95"
                title="Download on Apple App Store"
              >
                <img
                  src="/images/bevesi/apple-store-button-dark.png"
                  alt="Download on the App Store"
                  className="h-10 sm:h-11 w-auto rounded-lg shadow-md"
                />
              </a>
              <a
                href="#google-play"
                className="transition-transform hover:scale-105 active:scale-95"
                title="Get it on Google Play"
              >
                <img
                  src="/images/bevesi/google-play-button-dark.png"
                  alt="Get it on Google Play"
                  className="h-10 sm:h-11 w-auto rounded-lg shadow-md"
                />
              </a>
            </div>
          </div>

          {/* Right Column: QR Scan Card + Phone Graphic Preview */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 lg:col-span-5">
            {/* QR Card */}
            <div className="flex flex-col items-center rounded-2xl border border-white/20 bg-white/10 p-5 text-center backdrop-blur-md shadow-lg">
              <div className="flex h-36 w-36 items-center justify-center rounded-2xl bg-white p-3 shadow-inner">
                {/* Clean SVG QR Code Representation */}
                <svg
                  viewBox="0 0 100 100"
                  className="h-full w-full fill-slate-950"
                  aria-label="Scan to download Vendora app"
                >
                  <rect x="0" y="0" width="30" height="30" rx="4" />
                  <rect x="5" y="5" width="20" height="20" fill="white" rx="2" />
                  <rect x="10" y="10" width="10" height="10" rx="1" />

                  <rect x="70" y="0" width="30" height="30" rx="4" />
                  <rect x="75" y="5" width="20" height="20" fill="white" rx="2" />
                  <rect x="80" y="10" width="10" height="10" rx="1" />

                  <rect x="0" y="70" width="30" height="30" rx="4" />
                  <rect x="5" y="75" width="20" height="20" fill="white" rx="2" />
                  <rect x="10" y="80" width="10" height="10" rx="1" />

                  <rect x="40" y="10" width="10" height="20" />
                  <rect x="55" y="5" width="10" height="10" />
                  <rect x="40" y="40" width="20" height="20" />
                  <rect x="10" y="40" width="15" height="15" />
                  <rect x="70" y="45" width="15" height="15" />
                  <rect x="45" y="75" width="15" height="20" />
                  <rect x="70" y="75" width="25" height="10" />
                  <rect x="85" y="90" width="10" height="10" />
                </svg>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-white">
                <QrCode className="h-4 w-4 text-[#FF7A1A]" />
                <span>Scan with Camera</span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-300">
                Direct iOS &amp; Android Download
              </p>
            </div>

            {/* Micro Rating Callout Card */}
            <div className="flex flex-col gap-2.5">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="font-outfit text-2xl font-black text-amber-300">4.9 ★</p>
                <p className="text-xs font-bold text-white">Top Rated Shopping App</p>
                <p className="text-[10px] text-slate-300">Over 500,000+ Downloads</p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="font-outfit text-2xl font-black text-emerald-300">99.8%</p>
                <p className="text-xs font-bold text-white">On-Time Escrow Delivery</p>
                <p className="text-[10px] text-slate-300">Powered by TCS &amp; Leopards</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
