import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';

/**
 * The one banner call-to-action for the homepage. Every button that sits
 * on a promo banner (tech deals, beauty, appliances, ...) renders through
 * this component, so a recipe change lands on all of them at once: solid
 * sun-orange, white label, and an unmissable hover (deepen + lift + glow).
 *
 * Batch 51 (owner points): the label read weak against the orange at the
 * old size/weight, so the shared recipe now carries a taller hit area, a
 * larger extra-bold white label and a proper focus ring — one change here
 * lifts every banner button on the page together.
 */
export const BANNER_CTA_CLASS =
  'font-outfit inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-sun-orange px-7 py-3 text-sm font-extrabold tracking-tight text-white shadow-md shadow-orange-500/30 ring-1 ring-orange-600/20 transition-all duration-200 hover:bg-sun-orange-600 hover:shadow-lg hover:shadow-orange-500/40 hover:scale-[1.04] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange focus-visible:ring-offset-2 sm:text-[15px]';

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
