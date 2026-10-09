import React, { useEffect, useState } from 'react';

export interface ProductTab {
  id: string;
  label: string;
}

export const PRODUCT_TABS: ProductTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'specs', label: 'Specs' },
  { id: 'faqs', label: "FAQ's" },
  { id: 'reviews', label: 'Reviews' },
];

interface ProductInfoTabsProps {
  tabs?: ProductTab[];
  /** Offset in px subtracted from scroll position (sticky navbar height). */
  offsetTop?: number;
}

/**
 * Ronin-style sticky section navigator: "Overview | Specs | FAQ's | Reviews".
 * Highlights the section currently in view (scroll-spy) and smooth-scrolls on
 * click. Renders nothing but the pill bar — sections live in the page.
 */
export const ProductInfoTabs: React.FC<ProductInfoTabsProps> = ({
  tabs = PRODUCT_TABS,
  offsetTop = 96,
}) => {
  const [activeId, setActiveId] = useState<string>(tabs[0]?.id ?? '');

  useEffect(() => {
    const sections = tabs
      .map((t) => document.getElementById(`pdp-section-${t.id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) return;

    let ticking = false;
    const updateActiveSection = () => {
      let current = sections[0].id;
      for (const el of sections) {
        if (el.getBoundingClientRect().top - offsetTop - 8 <= 0) {
          current = el.id;
        }
      }
      const targetId = current.replace('pdp-section-', '');
      setActiveId((prev) => (prev === targetId ? prev : targetId));
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateActiveSection);
      }
    };

    updateActiveSection();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [tabs, offsetTop]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`pdp-section-${id}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - offsetTop;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActiveId(id);
  };

  return (
    <div className="sticky top-16 z-30 -mx-3 mb-8 border-y border-slate-200/70 bg-white/85 px-3 py-2.5 backdrop-blur-md sm:mx-0 sm:rounded-full sm:border sm:px-2 sm:shadow-xs">
      <div
        className="no-scrollbar flex items-center gap-1.5 overflow-x-auto scroll-smooth"
      >
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollTo(tab.id)}
              aria-current={isActive ? 'true' : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-sun-orange text-white shadow-sm shadow-sun-orange/25'
                  : 'text-ink-600 hover:bg-sun-orange-50 hover:text-sun-orange-600'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
