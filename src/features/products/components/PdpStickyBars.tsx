import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardList,
  FileText,
  MessageCircleQuestionMark,
  Plus,
  ShoppingBag,
  Star,
  type LucideIcon,
} from 'lucide-react';

/**
 * Ronin-style PDP sticky bars (rebuilt).
 *
 * Two floating aids modelled on the Ronin product page, built only from
 * what this page already knows (real section ids, the real selected
 * variant and price — nothing fabricated):
 *
 * 1. `ProductSectionNav` — a white pill with grey tab chips, laid out in
 *    the page flow under the hero like Ronin's tab row. Once that row
 *    scrolls to the top of the viewport it switches to a fixed pill at
 *    top:16px and rides along; it follows Ronin's scroll-direction rule
 *    (scrolling down shows it, scrolling up hides it with a 0.3s
 *    opacity/translate fade — which also hands the top slot back to
 *    Vendora's smart header, which returns on scroll-up). Clicks
 *    smooth-scroll to the section; a scroll-spy highlights the tab of
 *    the section in view. The FAQ's tab is included because the PDP
 *    now has a real FAQ section — it was left out while no FAQ
 *    section existed, rather than filled with unverified claims.
 *    An earlier version used `position: sticky`, which never
 *    engaged: the PDP root carries `overflow-hidden`, and an
 *    overflow-hidden ancestor silently disables sticky descendants.
 *
 * 2. `ProductQuickAddPill` — a desktop-only glass quick-add bar
 *    (translucent white + backdrop blur, Ronin's frosted look) that
 *    slides/fades in once the buy box has scrolled away and out again
 *    when the footer approaches, reusing the page's existing
 *    add-to-cart handler. On mobile the PDP's own sticky buy bar
 *    already covers this, so the pill is `lg:flex` only.
 */

export interface PdpSectionLink {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const PDP_SECTION_LINKS: PdpSectionLink[] = [
  { id: 'pdp-overview', label: 'Overview', icon: FileText },
  { id: 'pdp-specs', label: 'Specs', icon: ClipboardList },
  { id: 'pdp-faqs', label: "FAQ's", icon: MessageCircleQuestionMark },
  { id: 'reviews-section', label: 'Reviews', icon: Star },
];

/** Ronin's stuck pill sits at top:16px once the in-flow row reaches it. */
const STUCK_TOP_PX = 16;

export const ProductSectionNav: React.FC = () => {
  const [activeId, setActiveId] = useState<string>(PDP_SECTION_LINKS[0].id);
  const [stuck, setStuck] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const anchorRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Scroll-spy: highlight the tab whose section crosses mid-viewport.
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

  // Ronin behaviour: the tab row lives in flow; when its placeholder
  // reaches the top offset the pill goes fixed, then shows on scroll
  // down and hides on scroll up (0.3s opacity/transform transition).
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    setNavHeight(navRef.current?.offsetHeight ?? 0);

    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        const isStuck = anchor.getBoundingClientRect().top <= STUCK_TOP_PX;
        setStuck(isStuck);
        if (isStuck) {
          if (y > lastY + 4) setHidden(false);
          else if (y < lastY - 4) setHidden(true);
        } else {
          setHidden(false);
        }
        lastY = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = (id: string) => {
    setActiveId(id);
    setHidden(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navElement = (
    <nav
      ref={navRef}
      data-testid="pdp-section-nav"
      data-stuck={stuck ? 'true' : 'false'}
      aria-label="Product sections"
      className={`flex items-center gap-2 rounded-full border border-slate-900/5 bg-white p-2 shadow-[0_10px_36px_rgba(15,23,42,0.10)] transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-slate-900 ${
        stuck && hidden
          ? '-translate-y-[160%] opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100 pointer-events-auto'
      }`}
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
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:px-5 sm:text-sm transition-all duration-300 active:scale-95 cursor-pointer ${
              isActive
                ? 'bg-sun-orange font-bold text-white shadow-md shadow-orange-500/25 hover:bg-sun-orange hover:text-white'
                : 'bg-[#f0f0f0] font-medium text-[#464646]/75 hover:bg-[#e4e4e4] hover:text-[#464646] dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            <span>{link.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div
      ref={anchorRef}
      className="relative z-30 mt-8 flex justify-center"
      style={stuck && navHeight ? { height: navHeight } : undefined}
    >
      {/* The stuck state renders through a portal to document.body: an
          ancestor containing block captures fixed positioning inside
          the page subtree (the same failure the portaled back-to-top
          button and PDP overlays hit), which left the fixed pill
          painted against the page box instead of the viewport. The
          in-flow state stays in place; the anchor holds its height. */}
      {stuck
        ? createPortal(
            <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4 pointer-events-none">
              {navElement}
            </div>,
            document.body,
          )
        : navElement}
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
 * hidden and the check sits static (base.css opt-out + the
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

/** Ronin's sticky-bar button icon: a shopping bag with a plus badge. */
const BagPlusIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <span className={`relative inline-flex shrink-0 ${className}`} aria-hidden="true">
    <ShoppingBag className="h-full w-full" />
    <Plus className="absolute -bottom-[3px] -right-[5px] h-3 w-3 stroke-[3.5]" />
  </span>
);

export interface ProductQuickAddPillProps {
  image: string;
  title: string;
  variantName?: string;
  priceLabel: string;
  compareAtLabel?: string;
  inStock: boolean;
  added: boolean;
  onAdd: () => void;
  /**
   * the pill stays mounted and animates between shown and
   * hidden (Ronin's slide/fade), instead of popping in and out of the
   * DOM. The page drives this from the buy-box and footer observers.
   */
  visible?: boolean;
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
  visible = true,
}) => {
  // Portaled to document.body for the same reason as the stuck
  // section nav above: inside the page subtree an ancestor containing
  // block captures the fixed positioning, so the pill painted against
  // the page box (only entering view near the page end) instead of
  // riding the viewport's bottom edge.
  return createPortal(
    <div
      data-testid="pdp-quick-add-pill"
      data-visible={visible ? 'true' : 'false'}
      aria-hidden={!visible}
      className={`fixed bottom-[30px] left-1/2 z-40 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-white/60 bg-white/60 p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.20)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-out dark:border-white/15 dark:bg-slate-900/60 lg:flex ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-8 opacity-0'
      }`}
    >
      <img
        src={image}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-cover border border-white/70 shadow-sm"
      />

      <div className="min-w-0 pr-1">
        <p className="max-w-[240px] truncate text-sm font-bold text-slate-900 dark:text-white">
          {title}
          {variantName && (
            <span className="font-medium text-slate-500 dark:text-slate-300"> — {variantName}</span>
          )}
        </p>
        <p className="flex items-baseline gap-1.5">
          <span className="font-outfit text-sm font-black text-slate-900 dark:text-white">
            {priceLabel}
          </span>
          {compareAtLabel && (
            <span className="text-xs text-slate-500 line-through opacity-60 dark:text-slate-300">
              {compareAtLabel}
            </span>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={!inStock}
        tabIndex={visible ? 0 : -1}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-300 active:scale-95 cursor-pointer ${
          added
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-700'
            : 'border border-slate-900/5 bg-white text-[#464646] shadow-[0_6px_20px_rgba(15,23,42,0.12)] hover:bg-[#f0f0f0]'
        } ${!inStock ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        {added ? (
          <>
            <AddedBurstIcon className="h-5 w-5" />
            <span>Added!</span>
          </>
        ) : (
          <>
            <BagPlusIcon className="h-4 w-4" />
            <span>{inStock ? 'Add to Cart' : 'Out of Stock'}</span>
          </>
        )}
      </button>
    </div>,
    document.body,
  );
};
