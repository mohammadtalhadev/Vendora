import React from 'react';

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
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] shadow-xl ring-1 ring-black/5">
        <img
          src="/banners/app-promo.webp"
          alt="Shop Faster. Track Live. All in Your Pocket. Vendora in your mobile browser \u2014 no app to install."
          width={1916}
          height={821}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
          draggable={false}
        />
      </div>
    </section>
  );
};
