import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Award, ChevronRight, ChevronLeft, Store, ArrowUpRight } from 'lucide-react';

interface BrandStore {
  id: string;
  name: string;
  category: string;
  warranty: string;
  link: string;
  badge: string;
}

const BRAND_STORES: BrandStore[] = [
  {
    id: 'store-apple',
    name: 'Apple Flagship Partner',
    category: 'iPhones, Mac & Wearables',
    warranty: 'Official AppleCare Support',
    link: '/products?q=Apple',
    badge: 'Authorized Partner',
  },
  {
    id: 'store-samsung',
    name: 'Samsung Official Store',
    category: 'Galaxy AI & Displays',
    warranty: 'Samsung Pakistan Warranty',
    link: '/products?q=Samsung',
    badge: 'Official Flagship',
  },
  {
    id: 'store-sony',
    name: 'Sony Authorized Store',
    category: 'Alpha & Hi-Res Audio',
    warranty: 'Sony Pakistan Official',
    link: '/products?q=Sony',
    badge: 'Official Partner',
  },
  {
    id: 'store-dyson',
    name: 'Dyson Technologies',
    category: 'Hair Care & Smart Home',
    warranty: '2-Year Direct Warranty',
    link: '/products?q=Dyson',
    badge: 'Official Store',
  },
  {
    id: 'store-ronin',
    name: 'Ronin Official PK',
    category: 'Power Banks & Audio',
    warranty: '12 Months Hassle-Free',
    link: '/vendors/ronin-pk',
    badge: 'Direct Partner',
  },
  {
    id: 'store-faster',
    name: 'Faster Pakistan',
    category: 'GaN Chargers & Cables',
    warranty: '1-Year Instant Replacement',
    link: '/vendors/faster-pk',
    badge: 'Official Flagship',
  },
  {
    id: 'store-anker',
    name: 'Anker Soundcore Lab',
    category: 'Wireless Audio & Hubs',
    warranty: '18 Months Global Warranty',
    link: '/products?q=Anker',
    badge: 'Official Partner',
  },
  {
    id: 'store-loreal',
    name: "L'Oréal Paris Flagship",
    category: 'Skincare & Cosmetics',
    warranty: '100% Authentic Guaranteed',
    link: '/products?category=beauty',
    badge: 'Authorized Flagship',
  },
];

export const BrandSpotlight: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="mb-14">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700">
              <Award className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">
              Verified Partnerships
            </span>
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl font-outfit">
            Official Stores
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Shop directly from authorized flagship partners with manufacturer warranty and guaranteed authenticity
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll navigation arrows */}
          <button
            type="button"
            onClick={() => scroll('left')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            aria-label="Scroll brand stores left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            aria-label="Scroll brand stores right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Link
            to="/brands"
            className="group ml-2 hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#FF7A1A] hover:text-[#EA6C13] transition-colors"
          >
            <span>All Brand Stores</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Single-Row Scrollable Rail of Brand Store Cards */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory"
      >
        {BRAND_STORES.map((brand) => (
          <Link
            key={brand.id}
            to={brand.link}
            className="group relative flex w-[260px] sm:w-[280px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[24px] border border-white/80 bg-white/75 p-5 backdrop-blur-md shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:bg-white/95 hover:shadow-xl hover:shadow-orange-500/5"
          >
            {/* Top row: Store Icon & Flagship Badge */}
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0C1046] to-[#1E1B4B] text-white shadow-xs group-hover:scale-105 transition-transform">
                <Store className="h-6 w-6 text-amber-300" />
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200/70">
                <ShieldCheck className="h-3 w-3 text-emerald-600" /> {brand.badge}
              </span>
            </div>

            {/* Middle: Store Info */}
            <div className="mt-4">
              <h3 className="font-outfit text-sm font-extrabold text-slate-900 group-hover:text-[#FF7A1A] transition-colors line-clamp-1">
                {brand.name}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 line-clamp-1 mt-0.5">
                {brand.category}
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-100/70 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {brand.warranty}
              </div>
            </div>

            {/* Bottom: Visit Store */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
              <span className="text-[10px] font-semibold text-slate-400">
                SBP Escrow Protected
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-[#FF7A1A] group-hover:underline">
                Visit Store <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
