import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import {
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  Store,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

interface BrandItem {
  id: string;
  name: string;
  category: string;
  categorySlug: string;
  tagline: string;
  logo: string;
  banner: string;
  storeUrl: string;
  catalogQuery: string;
  description: string;
}

const BRANDS_DATA: BrandItem[] = [
  {
    id: 'ronin',
    name: 'Ronin',
    category: 'Audio & Mobile Gear',
    categorySlug: 'electronics',
    tagline: 'Earbuds, neckbands & mobile accessories',
    logo: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
    storeUrl: '/vendors/ronin-pk',
    catalogQuery: 'ronin',
    description: 'Specializing in hybrid-ANC wireless earbuds, heavy bass neckbands, and ultra-durable braided cables.',
  },
  {
    id: 'faster',
    name: 'Faster Pakistan',
    category: 'Power & Fast Charging',
    categorySlug: 'electronics',
    tagline: 'GaN fast chargers & power banks',
    logo: 'https://images.unsplash.com/photo-1609592807664-42b781df577a?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
    storeUrl: '/vendors/faster-pk',
    catalogQuery: 'faster',
    description: 'High-wattage 65W PD chargers, MagSafe batteries, and high-efficiency multi-device charging hubs.',
  },
  {
    id: 'anker',
    name: 'Anker Soundcore',
    category: 'Audio & High-Tech',
    categorySlug: 'electronics',
    tagline: 'Charging gear & Soundcore audio',
    logo: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    storeUrl: '/products?q=Anker',
    catalogQuery: 'anker',
    description: 'Soundcore Liberty 4 earbuds, AeroFit open-ear clips, and portable IPX7 Bluetooth party speakers.',
  },
  {
    id: 'sony',
    name: 'Sony Pro Audio',
    category: 'Studio Acoustics & ANC',
    categorySlug: 'electronics',
    tagline: 'Headphones, earbuds & studio gear',
    logo: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    storeUrl: '/products?q=Sony',
    catalogQuery: 'sony',
    description: 'WH-1000XM5 noise cancelling headphones, MDR studio monitors, and precision acoustic gear.',
  },
  {
    id: 'sennheiser',
    name: 'Sennheiser Lab',
    category: 'Audiophile Grade Sound',
    categorySlug: 'electronics',
    tagline: 'Headphones & audiophile gear',
    logo: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
    storeUrl: '/products?q=Sennheiser',
    catalogQuery: 'sennheiser',
    description: 'Momentum True Wireless 4, HD series reference open-backs, and low-latency broadcast microphones.',
  },
  {
    id: 'studiocraft',
    name: 'StudioCraft Nordique',
    category: 'Minimalist Workspace & Tech',
    categorySlug: 'home',
    tagline: 'Desk accessories & workspace gear',
    logo: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
    storeUrl: '/products?category=home',
    catalogQuery: 'studiocraft',
    description: 'Solid walnut monitor risers, felt wool desk pads, aluminum MagSafe stands, and modular cable management.',
  },
  {
    id: 'apple',
    name: 'Apple',
    category: 'Smartphones & Wearables',
    categorySlug: 'electronics',
    tagline: 'iPhone, AirPods & Apple accessories',
    logo: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80',
    storeUrl: '/products?q=Apple',
    catalogQuery: 'apple',
    description: 'iPhone 15 & 16 series, AirPods Pro Gen 2 with USB-C, Apple Watch Ultra 2, and accessories.',
  },
  {
    id: 'samsung',
    name: 'Samsung',
    category: 'Displays & Galaxy Ecosystem',
    categorySlug: 'electronics',
    tagline: 'Galaxy phones, tablets & wearables',
    logo: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    storeUrl: '/products?q=Samsung',
    catalogQuery: 'samsung',
    description: 'Galaxy S24 Ultra, Galaxy Buds3 Pro, Smart View cases, and 120Hz high-refresh OLED mobile displays.',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Brand Stores' },
  { id: 'electronics', label: 'Electronics & Audio' },
  { id: 'home', label: 'Home & Workspace' },
];

export const BrandsPage: React.FC = () => {
  useReveal();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredBrands = useMemo(() => {
    return BRANDS_DATA.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        selectedCategory === 'all' || b.categorySlug === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="relative min-h-screen font-sans selection:bg-sun-orange/20 selection:text-sun-orange pb-24">
      {/* Radiant ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-28 w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-sun-orange-200/60 via-sun-orange-100/65 to-sun-orange-200/35 blur-[130px] dark:from-sun-orange/10 pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-aqua-100/70 via-[#F1F5F9]/80 to-sun-orange-100/50 blur-[140px] dark:from-aqua/10 pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-[620px] h-[620px] rounded-full bg-gradient-to-tr from-sun-orange-100/70 via-aqua-100/50 to-[#F1F5F9] blur-[130px] dark:from-sun-orange/5 pointer-events-none" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-12 pt-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-sun-orange transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">Brand Stores</span>
        </nav>

        {/* Hero Header */}
        <div className="reveal rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 sm:p-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-400/10 via-cyan-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/80 dark:border-orange-900/40 dark:bg-orange-950/30 px-3.5 py-1 text-xs font-bold text-sun-orange">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Brand stores run by independent sellers</span>
            </div>

            <h1 className="font-outfit text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Brand Stores on Vendora
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Browse products from well-known brands, sold by independent stores on Vendora. Every order is covered by Vendora buyer protection, with payment held in escrow until your order is delivered.
            </p>

            {/* Quick stats strip */}
            <div className="flex flex-wrap items-center gap-6 pt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                <span>Escrow-held payments</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                <span>Buyer protection on every order</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                <span>Independent brand sellers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="reveal flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 shadow-sm">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              id="brands-search"
              type="text"
              aria-label="Search brands"
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-10 pr-4 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sun-orange transition-colors"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                aria-pressed={selectedCategory === cat.id}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-sun-orange text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Brand Grid */}
        <div className="reveal grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredBrands.map((brand) => (
            <div
              key={brand.id}
              className="group rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-sm hover:shadow-xl hover:border-sun-orange/40 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Banner Header */}
                <div className="relative h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={brand.banner}
                    alt={brand.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
                  
                  {/* Category Pill */}
                  <span className="absolute top-3 right-3 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/20">
                    {brand.category}
                  </span>
                </div>

                {/* Brand Identity */}
                <div className="px-5 pt-0 pb-4 relative">
                  {/* Floating Logo */}
                  <div className="-mt-9 mb-3 h-16 w-16 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-800 shadow-md">
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="font-outfit text-base font-extrabold text-slate-900 dark:text-white line-clamp-1">
                      {brand.name}
                    </h3>
                  </div>

                  <p className="text-xs font-semibold text-sun-orange line-clamp-1 mb-2">
                    {brand.tagline}
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {brand.description}
                  </p>

                  {/* Trust Specs */}
                  <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Buyer Protection</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Escrow on every order
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Warranty</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        Set by the seller
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 pt-0 flex gap-2">
                <Link
                  to={`/products?q=${encodeURIComponent(brand.catalogQuery)}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sun-orange hover:text-white text-slate-800 dark:text-white px-3 py-2 text-xs font-bold transition-all"
                >
                  <span>Catalog</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link
                  to={brand.storeUrl}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sun-orange px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
                  title="Visit store"
                >
                  <Store className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Store</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Brand Partnership Banner */}
        <div className="reveal rounded-3xl border border-orange-200/80 bg-gradient-to-r from-orange-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2">
            <h3 className="font-outfit text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Sell on Vendora
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
              Open your own store on Vendora and reach shoppers across Pakistan, with escrow-protected payments and 0% listing fees.
            </p>
          </div>
          <Link
            to="/become-a-seller"
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-sun-orange hover:bg-sun-orange-600 active:scale-95 text-white px-6 py-3.5 text-xs font-outfit font-black tracking-wider uppercase shadow-lg shadow-orange-500/25 transition-all"
          >
            <span>Become a Seller</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
};
