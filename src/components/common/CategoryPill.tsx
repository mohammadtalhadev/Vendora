import React from 'react';
import { cn } from '../../lib/utils';

/**
 * The one category pill (Batch 51, owner points).
 *
 * The homepage used to grow a pill style per section: the Limited Campaign
 * and Best-Sellers tabs filled solid orange when selected, the product
 * carousel tabs tinted pale peach instead, and the carousel's child filters
 * ran a third, smaller recipe — so two pills side by side read as two
 * different design systems. Every category/tab pill now renders through
 * this component: one shape, one selected state (solid sun-orange, white
 * label), one resting state (white, slate label, hairline border), in two
 * sizes. Call sites pass layout extras via `className` only — never colour
 * overrides.
 */
export const CATEGORY_PILL_CLASS = {
  base: 'cursor-pointer whitespace-nowrap rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/60',
  md: 'px-4 py-1.5 text-xs sm:px-5 sm:py-2 sm:text-sm',
  sm: 'px-3 py-1 text-[11px]',
  selected: 'border border-sun-orange bg-sun-orange text-white shadow-md shadow-orange-500/25',
  unselected:
    'border border-slate-200 bg-white text-slate-700 hover:border-sun-orange/50 hover:text-sun-orange',
} as const;

export interface CategoryPillProps {
  selected?: boolean;
  size?: 'md' | 'sm';
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  /** Accessible state for tab-like usage. */
  ariaPressed?: boolean;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({
  selected = false,
  size = 'md',
  onClick,
  children,
  className,
  ariaPressed,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={ariaPressed ?? selected}
    className={cn(
      CATEGORY_PILL_CLASS.base,
      CATEGORY_PILL_CLASS[size],
      selected ? CATEGORY_PILL_CLASS.selected : CATEGORY_PILL_CLASS.unselected,
      className,
    )}
  >
    {children}
  </button>
);
