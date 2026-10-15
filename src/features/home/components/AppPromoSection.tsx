import React from 'react';
import { BellRing, ShieldCheck, Zap, Smartphone } from 'lucide-react';

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
    <section className="reveal mb-14">
      <div className="relative overflow-hidden rounded-[32px] border border-orange-200/80 bg-gradient-to-br from-[#0C1046] via-[#111A5A] to-[#1E1B4B] p-7 sm:p-10 text-white shadow-2xl">
        {/* Ambient Glow Orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-white/15 backdrop-blur-xs">
            <Smartphone className="h-3.5 w-3.5" />
            <span>{merged.eyebrow}</span>
          </div>

          <h2 className="font-outfit mt-4 text-2xl font-black tracking-tight sm:text-4xl lg:text-[42px] leading-[1.08]">
            {merged.headingLead}
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-amber-200 bg-clip-text text-transparent">
              {merged.headingAccent}
            </span>
          </h2>

          <p className="mt-3.5 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            {merged.subtext}
          </p>

          {/* Feature Bullets */}
          <div className="mt-6 flex flex-wrap gap-3">
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
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-xs"
                >
                  <Icon className={`h-4 w-4 ${iconClass}`} />
                  <span>{bullet}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
