import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';

/**
 * The one banner call-to-action for the homepage. Every button that sits
 * on a promo banner (tech deals, beauty, appliances, ...) renders through
 * this component, so a recipe change lands on all of them at once.
 *
 * Batch 95 (owner point): the recipe is the site's primary button — solid
 * sun-orange with a white label and the orange glow at rest, deepening to
 * sun-orange-600 with a slight lift on hover, the press the same
 * active:scale-95. Solid orange reads on photo banners and plain cards
 * alike. The focus ring is white: a sun-orange ring would vanish against
 * the button's own fill, white stays visible on any banner behind it.
 * The banner hit area and label size stay banner-sized (Batch 51).
 */
export const BANNER_CTA_CLASS =
  'font-outfit inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-sun-orange px-7 py-3 text-sm font-extrabold tracking-tight text-white shadow-orange-glow transition-all duration-200 hover:-translate-y-0.5 hover:bg-sun-orange-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 sm:text-[15px]';

export interface BannerCtaProps {
  to: string;
  children: React.ReactNode;
  /** Layout extras for the call site (e.g. spacing) — never colour overrides. */
  className?: string;
}

export const BannerCta: React.FC<BannerCtaProps> = ({ to, children, className }) => (
  <Link to={to} className={cn(BANNER_CTA_CLASS, className)}>
    {children}
  </Link>
);
