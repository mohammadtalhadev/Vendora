import React, { useEffect, useState } from 'react';
import { ListFilter, ShoppingCart, Sparkles, Star, type LucideIcon } from 'lucide-react';

/**
 * Batch 121 — Ronin-style PDP sticky bars.
 *
 * Two floating aids modelled on the Ronin product page, built only from
 * what this page already knows (real section ids, the real selected
 * variant and price — nothing fabricated):
 *
 * 1. `ProductSectionNav` — a pill that sticks under the navbar and
 *    smooth-scrolls to the PDP's own sections, with scroll-spy
 *    highlighting via IntersectionObserver. There is deliberately no
 *    FAQs entry: this PDP has no FAQ section and no unverified FAQ
 *    claims are introduced to fill one.
 * 2. `ProductQuickAddPill` — a desktop-only quick-add bar that appears
 *    once the buy box has scrolled away, reusing the page's existing
 *    add-to-cart handler. On mobile the PDP's own sticky buy bar
 *    already covers this, so the pill is `lg:flex` only.
 */

export interface PdpSectionLink {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const PDP_SECTION_LINKS: PdpSectionLink[] = [
  { id: 'pdp-overview', label: 'Overview', icon: Sparkles },
  { id: 'pdp-specs', label: 'Specs', icon: ListFilter },
  { id: 'reviews-section', label: 'Reviews', icon: Star },
];

export const ProductSectionNav: React.FC = () => {
  const [activeId, setActiveId] = useState<string>(PDP_SECTION_LINKS[0].id);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const targets = PDP_SECTION_LINKS.map((link) => document.getElementById(link.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleClick = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="sticky top-[84px] sm:top-[92px] z-30 mt-8 flex justify-center pointer-events-none">
      <nav
        data-testid="pdp-section-nav"
        aria-label="Product sections"
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 p-1.5 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90"
      >
        {PDP_SECTION_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = activeId === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => handleClick(link.id)}
              aria-current={isActive ? 'true' : undefined}
              className={`rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-sun-orange text-white shadow-md shadow-orange-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

/**
 * The Ronin-style checkmark burst played in the "added" state of every
 * PDP add button (buy box, quick-add pill, mobile sticky bar). A circle
 * draws itself, the check draws in, and eight rays burst outward with a
 * staggered fade — ~650ms total, keyframes in styles/base.css
 * (vendora-burst-*). Monochrome currentColor so it sits on the emerald
 * added-state buttons; under prefers-reduced-motion the rays stay
 * hidden and the check sits static (base.css opt-out + the Batch 82
 * global kill-switch).
 */
const BURST_RAYS: Array<{ x1: number; y1: number; x2: number; y2: number }> = [
  { x1: 12, y1: 2.2, x2: 12, y2: 0.4 },
  { x1: 18.93, y1: 5.07, x2: 20.2, y2: 3.8 },
  { x1: 21.8, y1: 12, x2: 23.6, y2: 12 },
  { x1: 18.93, y1: 18.93, x2: 20.2, y2: 20.2 },
  { x1: 12, y1: 21.8, x2: 12, y2: 23.6 },
  { x1: 5.07, y1: 18.93, x2: 3.8, y2: 20.2 },
  { x1: 2.2, y1: 12, x2: 0.4, y2: 12 },
  { x1: 5.07, y1: 5.07, x2: 3.8, y2: 3.8 },
];

export interface AddedBurstIconProps {
  className?: string;
}

export const AddedBurstIcon: React.FC<AddedBurstIconProps> = ({ className = 'h-4 w-4' }) => {
  return (
    <svg
      data-testid="added-burst-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" strokeWidth="1.8" className="burst-circle" />
      <path
        d="M8.2 12.4l2.5 2.5 5-5.4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="burst-check"
      />
      {BURST_RAYS.map((ray, i) => (
        <line
          key={i}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          strokeWidth="1.8"
          strokeLinecap="round"
          className="burst-ray"
          style={{ animationDelay: `${i * 30}ms` }}
        />
      ))}
    </svg>
  );
};

export interface ProductQuickAddPillProps {
  image: string;
  title: string;
  variantName?: string;
  priceLabel: string;
  compareAtLabel?: string;
  inStock: boolean;
  added: boolean;
  onAdd: () => void;
}

export const ProductQuickAddPill: React.FC<ProductQuickAddPillProps> = ({
  image,
  title,
  variantName,
  priceLabel,
  compareAtLabel,
  inStock,
  added,
  onAdd,
}) => {
  return (
    <div
      data-testid="pdp-quick-add-pill"
      className="fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200/80 bg-white/95 p-2 shadow-2xl shadow-slate-900/15 backdrop-blur-xl animate-fade-in dark:border-white/10 dark:bg-slate-900/95 lg:flex"
    >
      <img
        src={image}
        alt=""
        className="h-11 w-11 shrink-0 rounded-full object-cover border border-slate-200/70"
      />

      <div className="min-w-0">
        <p className="max-w-[240px] truncate text-sm font-bold text-slate-900 dark:text-white">
          {title}
        </p>
        {variantName && (
          <p className="truncate text-[11px] text-slate-500">{variantName}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <span className="font-outfit text-base font-black text-slate-900 dark:text-white">
          {priceLabel}
        </span>
        {compareAtLabel && (
          <span className="block text-[11px] text-slate-400 line-through">{compareAtLabel}</span>
        )}
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={!inStock}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer ${
          added
            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
            : 'bg-sun-orange hover:bg-sun-orange-600 shadow-orange-500/25'
        } ${!inStock ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        {added ? (
          <>
            <AddedBurstIcon className="h-5 w-5" />
            <span>Added!</span>
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            <span>{inStock ? 'Add to Cart' : 'Out of Stock'}</span>
          </>
        )}
      </button>
    </div>
  );
};
