import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';

/**
 * The one banner call-to-action for the homepage. Every button that sits
 * on a promo banner (tech deals, beauty, appliances, ...) renders through
 * this component, so a recipe change lands on all of them at once.
 *
 * Batch 89 (owner point): the recipe is the product card's Add to Cart
 * style — a light sun-orange tint with an orange border and label at
 * rest, and on hover the button fills solid sun-orange, the label turns
 * white and the orange glow lands; the press is the same active:scale-95.
 * The banner hit area and label size stay banner-sized (Batch 51).
 */
export const BANNER_CTA_CLASS =
  'font-outfit inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-sun-orange/30 bg-sun-orange/[0.08] px-7 py-3 text-sm font-extrabold tracking-tight text-[#EA580C] backdrop-blur-md transition-all duration-200 hover:border-transparent hover:bg-sun-orange hover:text-white hover:shadow-orange-glow active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange focus-visible:ring-offset-2 sm:text-[15px]';

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
