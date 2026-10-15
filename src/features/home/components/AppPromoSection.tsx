import React from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  ShieldCheck,
  Zap,
  Smartphone,
  Search,
  Bell,
  Check,
  Truck,
  Headphones,
  Watch,
  Plus,
} from 'lucide-react';
import { BannerCta } from './BannerCta';

/**
 * Mobile-web promo. There is no native Vendora app, so this section sells
 * what is true: the storefront itself runs in a phone browser — order and
 * escrow tracking, secure checkout and re-ordering included. No download
 * badges, no QR code, no invented ratings or download counts.
 *
 * Batch 85: the copy is content, not code. The defaults below are the
 * original words; the section CMS feeds the same shape from the promo
 * section's settings (`PromoBannerSection`), so the console edits the
 * panel without a deploy and this component stays the fallback render.
 *
 * Batch 110 (owner: the old panel was "farig" — a plain text box): the
 * right side now carries a visual scene built in pure code — a phone
 * mockup showing the Vendora storefront and a live-tracking card, with
 * two floating glass notification cards around it. It is a scene, not a
 * screenshot: no product photos, prices or order numbers are invented,
 * and if the owner later prefers a real image, this scene block is the
 * one-for-one swap slot. The CMS copy shape above is unchanged.
 */
export interface AppPromoContent {
  eyebrow: string;
  headingLead: string;
  headingAccent: string;
  subtext: string;
  bullets: string[];
}

export const DEFAULT_APP_PROMO_CONTENT: AppPromoContent = {
  eyebrow: 'Vendora in Your Mobile Browser',
  headingLead: 'Shop Faster. Track Live.',
  headingAccent: 'All in Your Pocket.',
  subtext:
    "No app to install — Vendora runs right in your phone's browser. Follow your escrow release and rider tracking in real time, and check out securely wherever you are.",
  bullets: ['Instant Escrow Alerts', 'Secure Escrow Checkout', 'One-Tap Re-Order'],
};

const BULLET_ICONS = [BellRing, ShieldCheck, Zap];

export interface AppPromoSectionProps {
  content?: Partial<AppPromoContent>;
}

export const AppPromoSection: React.FC<AppPromoSectionProps> = ({ content }) => {
  const merged: AppPromoContent = {
    ...DEFAULT_APP_PROMO_CONTENT,
    ...content,
    bullets:
      content?.bullets && content.bullets.length > 0
        ? content.bullets
        : DEFAULT_APP_PROMO_CONTENT.bullets,
  };

  return (
    <section className="reveal mb-14" aria-label="Vendora on mobile">
      <div className="relative overflow-hidden rounded-[32px] border border-orange-200/80 bg-gradient-to-br from-[#0C1046] via-[#111A5A] to-[#1E1B4B] p-7 text-white shadow-2xl dark:bg-none sm:p-10 lg:p-12">
        {/* Ambient Glow Orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        {/* Dotted grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-white/15 backdrop-blur-xs">
              <Smartphone className="h-3.5 w-3.5" />
              <span>{merged.eyebrow}</span>
            </div>

            <h2 className="font-outfit mt-4 text-3xl font-black tracking-tight leading-[1.08] sm:text-4xl lg:text-[44px]">
              {merged.headingLead}
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-amber-200 bg-clip-text text-transparent">
                {merged.headingAccent}
              </span>
            </h2>

            <p className="mt-3.5 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              {merged.subtext}
            </p>

            {/* Feature Bullets — glass rows with an icon tile */}
            <div className="mt-6 flex max-w-md flex-col gap-2.5">
              {merged.bullets.map((bullet, index) => {
                const Icon = BULLET_ICONS[index % BULLET_ICONS.length];
                const iconClass =
                  index % 3 === 0
                    ? 'text-amber-400'
                    : index % 3 === 1
                      ? 'text-emerald-400'
                      : 'text-cyan-400';
                return (
                  <div
                    key={`${bullet}-${index}`}
                    className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-3.5 py-2.5 ring-1 ring-white/10 backdrop-blur-xs transition-colors duration-200 hover:bg-white/[0.12]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                      <Icon className={`h-4 w-4 ${iconClass}`} />
                    </span>
                    <span className="text-xs font-semibold sm:text-[13px]">{bullet}</span>
                  </div>
                );
              })}
            </div>

            {/* CTAs — the shared banner recipe + a glass secondary */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <BannerCta to="/products">Start Shopping</BannerCta>
              <Link
                to="/track-order"
                className="font-outfit inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/[0.08] px-7 py-3 text-sm font-extrabold tracking-tight text-white backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.16] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 sm:text-[15px]"
              >
                Track Your Order
              </Link>
            </div>

            <p className="mt-4 text-[11px] font-medium tracking-wide text-slate-400">
              Works on any phone · No install needed
            </p>
          </div>

          {/* Visual scene — phone mockup + floating notification cards.
              Pure code art (Batch 110); swap this whole block for an
              <img> if a real app image is ever supplied. */}
          <div className="relative mx-auto w-full max-w-[380px] py-4 lg:max-w-[400px]">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/25 blur-3xl" />

            {/* Phone */}
            <div className="relative mx-auto w-[248px] -rotate-[4deg] rounded-[44px] bg-slate-950 p-2.5 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/20 transition-transform duration-300 hover:rotate-0 sm:w-[264px]">
              <div className="overflow-hidden rounded-[34px] bg-slate-50 text-slate-900">
                {/* Notch */}
                <div className="relative flex justify-center bg-white pt-2">
                  <div className="h-4 w-16 rounded-full bg-slate-950" />
                </div>

                {/* Mini storefront header */}
                <div className="flex items-center justify-between bg-white px-4 pb-2 pt-1.5">
                  <span className="font-outfit text-[13px] font-black tracking-tight text-[#0C1046]">
                    VENDORA<span className="text-orange-500">.</span>
                  </span>
                  <span className="relative text-slate-500">
                    <Bell className="h-3.5 w-3.5" />
                    <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
                  </span>
                </div>

                {/* Search */}
                <div className="bg-white px-4 pb-3">
                  <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-medium text-slate-400">
                    <Search className="h-3 w-3" />
                    Search products, stores…
                  </div>
                </div>

                <div className="space-y-3 px-4 pb-5 pt-3">
                  {/* Live tracking card */}
                  <div className="rounded-2xl bg-[#0C1046] p-3 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wide text-slate-300">
                        YOUR ORDER
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                        <Truck className="h-2.5 w-2.5" /> On the way
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                      <span className="h-0.5 flex-1 bg-orange-500" />
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                      <span className="h-0.5 flex-1 bg-white/25" />
                      <span className="h-4 w-4 rounded-full border-2 border-white/40" />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[8.5px] font-semibold text-slate-300">
                      <span>Ordered</span>
                      <span>Shipped</span>
                      <span>Delivered</span>
                    </div>
                  </div>

                  {/* Product tiles — icon art only, no invented listings */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100">
                      <div className="flex h-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-amber-50">
                        <Headphones className="h-6 w-6 text-orange-500" />
                      </div>
                      <div className="mt-2 h-1.5 w-4/5 rounded-full bg-slate-200" />
                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="h-1.5 w-2/5 rounded-full bg-slate-300" />
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500">
                          <Plus className="h-2.5 w-2.5 text-white" />
                        </span>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100">
                      <div className="flex h-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100 to-sky-50">
                        <Watch className="h-6 w-6 text-cyan-600" />
                      </div>
                      <div className="mt-2 h-1.5 w-4/5 rounded-full bg-slate-200" />
                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="h-1.5 w-2/5 rounded-full bg-slate-300" />
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500">
                          <Plus className="h-2.5 w-2.5 text-white" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating notification cards */}
            <div className="app-promo-float absolute -left-1 top-8 flex items-center gap-2.5 rounded-2xl bg-white/10 px-3.5 py-2.5 shadow-xl ring-1 ring-white/20 backdrop-blur-md sm:left-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/20">
                <BellRing className="h-4 w-4 text-amber-300" />
              </span>
              <span>
                <span className="block text-[11px] font-bold leading-tight">Escrow Released</span>
                <span className="block text-[10px] leading-tight text-slate-300">
                  Seller paid securely
                </span>
              </span>
            </div>

            <div className="app-promo-float app-promo-float-delayed absolute -right-1 bottom-10 flex items-center gap-2.5 rounded-2xl bg-white/10 px-3.5 py-2.5 shadow-xl ring-1 ring-white/20 backdrop-blur-md sm:right-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20">
                <Truck className="h-4 w-4 text-emerald-300" />
              </span>
              <span>
                <span className="block text-[11px] font-bold leading-tight">Out for Delivery</span>
                <span className="block text-[10px] leading-tight text-slate-300">
                  Rider is on the way
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
