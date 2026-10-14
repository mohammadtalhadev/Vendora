import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';

/**
 * The one banner call-to-action for the homepage. Every button that sits
 * on a promo banner (tech deals, beauty, appliances, ...) renders through
 * this component, so a recipe change lands on all of them at once: solid
 * sun-orange, white label, and an unmissable hover (deepen + lift + glow).
 */
export const BANNER_CTA_CLASS =
  'font-outfit inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-sun-orange px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all duration-200 hover:bg-sun-orange-600 hover:shadow-lg hover:shadow-orange-500/35 hover:scale-[1.04] active:scale-95 sm:text-sm';

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
