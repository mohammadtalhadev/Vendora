import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * The one View All link (owner points).
 *
 * Section headers used to grow two recipes side by side: the product
 * carousels and the mega menu filled solid sun-orange on hover, while the
 * Limited Campaign, Recently Viewed and category-tiles headers sat on a
 * pale tint that never filled — so two "View All" buttons on one page read
 * as two design systems. Every View All now renders through this
 * component with the carousel recipe verbatim: pale orange tint, orange
 * label, and on hover the fill turns solid sun-orange with a white label.
 * Call sites pass layout extras via `className` only (spacing, responsive
 * visibility) — never colour overrides.
 */
export const VIEW_ALL_LINK_CLASS =
  'group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-sun-orange hover:text-white bg-orange-50/80 hover:bg-sun-orange border border-orange-200/70 hover:border-sun-orange shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95';

export interface ViewAllLinkProps {
  to: string;
  /** Link label. Defaults to "View All". */
  children?: React.ReactNode;
  /** Layout extras for the call site (e.g. spacing, visibility) — never colour overrides. */
  className?: string;
  onClick?: () => void;
}

export const ViewAllLink: React.FC<ViewAllLinkProps> = ({ to, children, className, onClick }) => (
  <Link to={to} onClick={onClick} className={cn(VIEW_ALL_LINK_CLASS, className)}>
    <span>{children ?? 'View All'}</span>
    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
  </Link>
);
