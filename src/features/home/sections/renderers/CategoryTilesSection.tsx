import React, { useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SiteSection } from '../../api/sections';
import { SectionHeading } from '../../components/SectionHeading';
import { ViewAllLink } from '../../../../components/common/ViewAllLink';

const LEGACY_TILE_IMAGE = /^\/images\/categories\/(cat_[a-z0-9_]+)_2k\.png$/;

/**
 * Batch 117: section items stored in the database still carry the legacy
 * full-size tile paths (`/images/categories/cat_*_2k.png`, ~450 KB each)
 * until the owner's VENDORA_B113_IMAGE_URLS.sql repoints them — the
 * built-in fallback list was fixed in Batch 109, but the CMS section is
 * the one that actually renders, so live tiles kept decoding the giant
 * PNGs at a 112px display size and scroll stayed heavy. The renderer
 * therefore swaps any legacy local tile path for the right-sized WebP
 * thumbnail that ships in the repo (same artwork, 256px). External or
 * already-optimised URLs pass through untouched.
 */
export const resolveCategoryTileImageUrl = (url: string): string => {
  const match = LEGACY_TILE_IMAGE.exec(url);
  return match ? `/images/categories/${match[1]}_thumb.webp` : url;
};

/**
 * The "Explore Popular Categories" tiles row as a section renderer
 * (Batch 85). The markup is the homepage's original block, unchanged; the
 * tiles themselves are the section's items (image, name, catalogue link).
 * HomePage also renders this component with a synthetic section built
 * from its built-in category list, which is the fallback when the
 * sections read is unavailable - one implementation, two data sources.
 */
export const CategoryTilesSection: React.FC<{ section: SiteSection }> = ({ section }) => {
  const categoriesRef = useRef<HTMLDivElement>(null);

  const scrollContainer = useCallback(
    (ref: React.RefObject<HTMLDivElement | null>, offset: number) => {
      const el = ref.current;
      if (!el) return;
      // Viewport-aware paging: move ~85% of the visible width per press,
      // in the direction requested (sign of offset).
      const step = Math.max(Math.round(el.clientWidth * 0.85), 160) * Math.sign(offset);
      el.scrollBy({ left: step, behavior: 'smooth' });
    },
    [],
  );

  const tiles = section.items.filter((item) => item.imageUrl);
  if (tiles.length === 0) return null;

  return (
    <section className="reveal mb-14">
      <SectionHeading
        title={section.title || 'Explore Popular Categories'}
        action={
          <ViewAllLink to="/products" />
        }
      />

      <div className="relative flex items-center justify-between">
        {/* Left arrow scroll button */}
        <button
          type="button"
          onClick={() => scrollContainer(categoriesRef, -240)}
          className="flex mr-2 h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-sun-orange hover:border-sun-orange hover:scale-105 transition-all cursor-pointer"
          title="Previous categories"
          aria-label="Previous categories"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div
          ref={categoriesRef}
          className="flex items-center gap-4 sm:gap-6 md:gap-7 overflow-x-auto scroll-smooth no-scrollbar py-3 px-2 justify-start w-full"
        >
          {tiles.map((item) => (
            <Link
              key={item.id}
              to={item.ctaLink || '/products'}
              className="group flex flex-col items-center shrink-0 transition-transform hover:-translate-y-1"
            >
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 items-center justify-center rounded-full bg-[#F4F6F8] p-3 overflow-hidden shadow-2xs border border-slate-100 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:bg-[#FFF4EC] group-hover:border-sun-orange/60 group-hover:ring-4 group-hover:ring-orange-500/15">
                <img
                  src={resolveCategoryTileImageUrl(item.imageUrl)}
                  alt={item.heading}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-xs"
                />
              </div>
              <span className="mt-3 text-xs font-bold text-slate-800 text-center tracking-tight group-hover:text-sun-orange transition-colors max-w-[100px] leading-tight">
                {item.heading}
              </span>
            </Link>
          ))}
        </div>

        {/* Right arrow scroll button */}
        <button
          type="button"
          onClick={() => scrollContainer(categoriesRef, 240)}
          className="flex ml-2 h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-sun-orange hover:border-sun-orange hover:scale-105 transition-all cursor-pointer"
          title="Next categories"
          aria-label="Next categories"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
};
