import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, Eye, ArrowUpRight, ShoppingBag } from 'lucide-react';
import { useCurrency } from '../../../store/currency-store';
import { SectionHeading } from './SectionHeading';

export interface Hotspot {
  id: string;
  top: string;
  left: string;
  title: string;
  price: number;
  productUrl: string;
  image: string;
}

export interface LookbookCard {
  id: string;
  title: string;
  subtitle: string;
  categoryTag: string;
  image: string;
  spanClass: string;
  hotspots: Hotspot[];
}

const LOOKBOOK_ITEMS: LookbookCard[] = [
  {
    id: 'look-desk',
    title: 'The Focus Studio Setup',
    subtitle: 'Ultra-clean wireless workspace with noise isolation and ambient glow',
    categoryTag: 'TECH & WORKSPACE',
    image: '/images/bevesi/banner-08.webp',
    spanClass: 'md:col-span-8 min-h-[380px] sm:min-h-[440px]',
    hotspots: [
      {
        id: 'hs-headphones',
        top: '32%',
        left: '28%',
        title: 'Sony WH-1000XM5 Headphones',
        price: 298.0,
        productUrl: '/products/bs-sony-wh',
        image: '/images/bevesi/1-13.webp',
      },
      {
        id: 'hs-lamp',
        top: '22%',
        left: '74%',
        title: 'Aura Minimalist Ambient Lamp',
        price: 49.5,
        productUrl: '/products/rec-glow-lamp',
        image: '/images/products/prod_glow_lamp.webp',
      },
    ],
  },
  {
    id: 'look-vanity',
    title: 'The Glass Skin Ritual',
    subtitle: 'Morning hydration trio for barrier restoration',
    categoryTag: 'BEAUTY & WELLNESS',
    image: '/images/bevesi/beauty_face_full.webp',
    spanClass: 'md:col-span-4 min-h-[380px] sm:min-h-[440px]',
    hotspots: [
      {
        id: 'hs-cream',
        top: '48%',
        left: '60%',
        title: 'Coastal Glow Bio-Hydra Cream',
        price: 36.0,
        productUrl: '/products/bs-lumina-cream',
        image: '/images/products/prod_lumina_cream.webp',
      },
    ],
  },
  {
    id: 'look-street',
    title: 'Minimalist Urban Transit',
    subtitle: 'Premium full-grain leather carry and high-mileage sneakers',
    categoryTag: 'FASHION & ACCESSORIES',
    image: '/images/bevesi/banner-07.webp',
    spanClass: 'md:col-span-6 min-h-[320px] sm:min-h-[380px]',
    hotspots: [
      {
        id: 'hs-bag',
        top: '45%',
        left: '38%',
        title: 'Artisan Full-Grain Crossbody Satchel',
        price: 135.0,
        productUrl: '/products/rec-leather-bag',
        image: '/images/products/prod_leather_bag.webp',
      },
    ],
  },
  {
    id: 'look-kitchen',
    title: 'The Modern Artisan Kitchen',
    subtitle: 'Precision countertop appliances and matte ceramic serveware',
    categoryTag: 'HOME LIVING',
    image: '/images/bevesi/banner-16.webp',
    spanClass: 'md:col-span-6 min-h-[320px] sm:min-h-[380px]',
    hotspots: [
      {
        id: 'hs-vase',
        top: '38%',
        left: '65%',
        title: 'Nordic Fluted Matte Ceramic Vase',
        price: 32.0,
        productUrl: '/products/rv-pampas-vase',
        image: '/images/products/prod_pampas_vase.webp',
      },
    ],
  },
];

export interface InspirationMosaicProps {
  /** The lookbook cards; defaults to the built-in set below. The
   * section renderer feeds CMS items through this prop. */
  cards?: LookbookCard[];
  title?: string;
  subtitle?: string;
}

export const InspirationMosaic: React.FC<InspirationMosaicProps> = ({
  cards = LOOKBOOK_ITEMS,
  title = 'Inspiration Mosaic & Shop The Look',
  subtitle = 'Explore real lifestyle setups — tap any interactive pin to shop the items in the scene',
}) => {
  const { formatPrice } = useCurrency();
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);

  return (
    <section className="reveal mb-14">
      {/* Header */}
      <SectionHeading
        eyebrow={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sun-orange-700">
            <Lightbulb className="h-3.5 w-3.5 text-sun-orange" />
            Lifestyle Inspiration
          </span>
        }
        title={title}
        subtitle={subtitle}
        action={
          <Link
          to="/products"
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-sun-orange transition-colors"
        >
          <Eye className="h-4 w-4 text-sun-orange" />
          <span>Explore All Collections</span>
          </Link>
        }
      />

      {/* Bento Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        {cards.map((item) => (
          <div
            key={item.id}
            className={`group relative overflow-hidden rounded-[26px] bg-slate-900 shadow-sm transition-all duration-300 hover:shadow-xl ${item.spanClass}`}
          >
            {/* Background Image */}
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Gradient Overlay for Readable Text */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

            {/* Interactive Hotspot Pins */}
            {item.hotspots.map((hs) => {
              const isOpen = activeHotspotId === hs.id;
              return (
                <div
                  key={hs.id}
                  style={{ top: hs.top, left: hs.left }}
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
                >
                  {/* Pulsing Pin Button */}
                  <button
                    type="button"
                    onClick={() => setActiveHotspotId(isOpen ? null : hs.id)}
                    className="relative flex h-8 w-8 items-center justify-center rounded-full bg-sun-orange text-white shadow-lg shadow-orange-500/50 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    title={hs.title}
                  >
                    <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-60 pointer-events-none" />
                    <ShoppingBag className="relative h-4 w-4" />
                  </button>

                  {/* Popover Mini Card */}
                  {isOpen && (
                    <div className="absolute left-1/2 top-10 z-40 w-56 -translate-x-1/2 rounded-2xl border border-white/90 bg-white/95 p-3 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={hs.image}
                          alt={hs.title}
                          loading="lazy"
                          decoding="async"
                          className="h-10 w-10 rounded-lg object-cover bg-slate-100"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-xs font-bold text-slate-900">
                            {hs.title}
                          </p>
                          <p className="font-outfit text-xs font-black text-sun-orange">
                            {formatPrice(hs.price)}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={hs.productUrl}
                        className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-xl bg-sun-orange py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-sun-orange-600"
                      >
                        <span>Shop This Item</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Editorial Caption Bottom */}
            <div className="absolute inset-x-0 bottom-0 z-20 p-6 sm:p-7 text-white">
              <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white backdrop-blur-xs">
                {item.categoryTag}
              </span>
              <h3 className="font-outfit mt-2.5 text-xl font-extrabold tracking-tight sm:text-2xl">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm line-clamp-1 max-w-lg">
                {item.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
