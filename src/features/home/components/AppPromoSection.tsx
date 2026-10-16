import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Mobile-web promo banner. There is no native Vendora app, so the
 * artwork sells what is true: the storefront runs in a phone browser.
 * No download badges, QR codes, or invented ratings/download counts.
 *
 * The panel shows the supplied artwork (2048x768 WebP at
 * /banners/app-promo.webp) at full container width. Its baked
 * "Start Shopping" button carries a real link to /app-coming-soon,
 * positioned over the artwork (left 4.88%, top 65.76%, width 18.65%,
 * height 11.2%; the label scales with the panel in container-query
 * units). The rest of the image is a plain, non-clickable <img>.
 * The AppPromoContent shape below is kept so the CMS renderer still
 * type-checks; while the image is in place, its copy fields have no
 * visual effect.
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
    "No app to install \u2014 Vendora runs right in your phone's browser. Follow your escrow release and rider tracking in real time, and check out securely wherever you are.",
  bullets: ['Instant Escrow Alerts', 'Secure Escrow Checkout', 'One-Tap Re-Order'],
};

export interface AppPromoSectionProps {
  content?: Partial<AppPromoContent>;
}

export const AppPromoSection: React.FC<AppPromoSectionProps> = () => {
  return (
    <section className="reveal mb-14" aria-label="Vendora on mobile">
      <div className="relative overflow-hidden rounded-[32px] shadow-xl ring-1 ring-black/5 [container-type:inline-size]">
        <img
          src="/banners/app-promo.webp"
          alt="Shop Faster. Track Live. All in Your Pocket. Vendora in your mobile browser \u2014 no app to install."
          width={2048}
          height={768}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
          draggable={false}
        />
        <Link
          to="/app-coming-soon"
          aria-label="Start Shopping — the Vendora app is coming soon"
          className="font-outfit absolute flex items-center justify-center whitespace-nowrap rounded-full font-bold text-white transition duration-300 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F1601E] active:scale-[0.98]"
          style={{
            left: '4.88%',
            top: '65.76%',
            width: '18.65%',
            height: '11.2%',
            background: 'linear-gradient(180deg, #FF8A2A 0%, #F1601E 100%)',
            fontSize: 'clamp(9px, 1.95cqw, 32px)',
            letterSpacing: '0.01em',
          }}
        >
          Start Shopping
        </Link>
      </div>
    </section>
  );
};
