import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Mobile-web promo. There is no native Vendora app, so this section sells
 * what is true: the storefront itself runs in a phone browser \u2014 order and
 * escrow tracking, secure checkout and re-ordering included. No download
 * badges, no QR code, no invented ratings or download counts.
 *
 * Batch 85: the copy was content, not code \u2014 the section CMS fed the
 * shape below (`PromoBannerSection`) and this component rendered it.
 *
 * Batch 122: panel narrowed to max-w-5xl and centered \u2014 at full container width the 21:9 artwork stood ~550px tall; the owner asked for it a touch smaller (\u201cthoda chota\u201D), so it now renders ~440px tall on desktop with the same art, no crop.
 *
 * Batch 123 (owner's call): the owner regenerated the artwork at 2:1
 * (1774x887) — the 21:9 strip read too wide — and the panel now renders
 * it at max-w-[960px] (~480px tall). He also reversed the Batch 119
 * no-click call for the button only: a real "Start Shopping" link sits
 * exactly over the artwork's baked button (same pill, same orange
 * gradient, position measured off the artwork: left 4.96%, top 59.75%,
 * width 19.62%, height 9.36% of the panel; font scales with the panel
 * via container-query units) and leads to /app-coming-soon. The rest of
 * the image stays a plain, non-clickable <img>.
 *
 * Batch 124 (owner's call): back to FULL container width — the 960px
 * narrowing lasted one look. The overlay button needed no repositioning:
 * its geometry is percentage-based and its font scales in container-query
 * units, so both track the panel at any width (font clamp cap raised to
 * 34px so the overlay text still matches the baked text at full width).
 *
 * Batch 128 (owner's call): the owner supplied new artwork (2048x768,
 * 8:3 — a wider, shorter strip than the 2:1 Batch 123 art) and ordered
 * it converted to WebP and placed in this slot, replacing the previous
 * artwork at the same path. The real "Start Shopping" overlay follows
 * the new art: its baked button was re-measured off the artwork (left
 * 4.88%, top 65.76%, width 18.65%, height 11.2% of the panel) and the
 * destination is unchanged (/app-coming-soon); the rest of the image
 * stays a plain, non-clickable <img>.
 *
 * Batch 119 (owner's call): the owner supplied a finished banner image
 * (light site palette, copy baked in) and ordered it placed in this
 * section's slot INSTEAD of the rendered copy, converted to WebP, and
 * NOT clickable for now \u2014 so the section is a plain <img> in the same
 * rounded panel, no link wrapper, even though the artwork contains a
 * "Start Shopping" button graphic. The AppPromoContent shape and
 * defaults are kept intact below so the CMS renderer still type-checks
 * and reverting to the coded panel (Batch 110 scene) is a one-commit
 * restore; while the image is in place the CMS copy fields for this
 * section have no visual effect.
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
