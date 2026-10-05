import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Star,
  CheckCircle2,
  ShoppingCart,
  Heart,
} from 'lucide-react';
import { useProducts } from '../features/catalog/hooks/useProducts';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';
import { QueryState } from '../components/common/QueryState';
import { Badge } from '../components/ui/badge';

// Reusable live countdown timer hook
function useCountdown(initialSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const days = Math.floor(secondsLeft / (3600 * 24));
  const hours = Math.floor((secondsLeft % (3600 * 24)) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

// 11 Circular Categories matching Image 3
const CIRCULAR_CATEGORIES = [
  {
    id: 't-shirt',
    name: 'T-SHIRT',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=300&q=80',
    slug: 'apparel',
  },
  {
    id: 'shoes',
    name: 'SHOES',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80',
    slug: 'footwear',
  },
  {
    id: 'camera',
    name: 'CAMERA',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=300&q=80',
    slug: 'computing',
  },
  {
    id: 'valise',
    name: 'VALISE',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80',
    slug: 'travel',
  },
  {
    id: 'jewelry',
    name: 'JEWELRY',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80',
    slug: 'accessories',
  },
  {
    id: 'earphone',
    name: 'EARPHONE',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=300&q=80',
    slug: 'audio',
  },
  {
    id: 'gifts',
    name: 'GIFTS',
    image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=300&q=80',
    slug: 'home',
  },
  {
    id: 'kids',
    name: 'KIDS',
    image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=300&q=80',
    slug: 'family',
  },
  {
    id: 'sports',
    name: 'SPORTS',
    image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=300&q=80',
    slug: 'fitness',
  },
  {
    id: 'beauty',
    name: 'BEAUTY',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=300&q=80',
    slug: 'beauty',
  },
  {
    id: 'accessories',
    name: 'ACCESSORIES',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80',
    slug: 'wearables',
  },
];

// Limited Campaign Items matching Image 2
const LIMITED_CAMPAIGN_ITEMS = [
  {
    id: 'camp-airpods',
    title: 'Apple AirPods Max – Pink',
    category: 'ELECTRONICS',
    price: 449.00,
    compareAtPrice: 489.00,
    discountPercent: 9,
    rating: 3.33,
    reviewCount: 48,
    stock: 88,
    maxStock: 88,
    sellerId: 'platform',
    sellerName: 'Vendora Direct',
    sellerType: 'platform' as const,
    type: 'physical' as const,
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'camp-iphone',
    title: 'Apple iPhone 15 Pro Max 256GB Natural Titanium',
    category: 'ELECTRONICS',
    price: 190.99,
    displayPrice: '$190.99 – $71.50',
    compareAtPrice: 212.00,
    discountPercent: 10,
    rating: 4.33,
    reviewCount: 112,
    stock: 76,
    maxStock: 76,
    sellerId: 'platform',
    sellerName: 'Vendora Direct',
    sellerType: 'platform' as const,
    type: 'physical' as const,
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'camp-watch',
    title: 'Apple Watch Series 9 GPS 45mm Midnight Aluminum Case',
    category: 'ELECTRONICS',
    price: 71.15,
    compareAtPrice: 87.98,
    discountPercent: 20,
    rating: 3.50,
    reviewCount: 64,
    stock: 24,
    maxStock: 24,
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor' as const,
    type: 'physical' as const,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'camp-tv',
    title: 'SAMSUNG 75" Class QN85C Neo QLED 4K Smart TV',
    category: 'ELECTRONICS',
    price: 980.99,
    rating: 2.50,
    reviewCount: 29,
    stock: 83,
    maxStock: 83,
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor' as const,
    type: 'physical' as const,
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'camp-ideapad',
    title: 'Lenovo IdeaPad 1i 15.6", Intel Core i5-1235U, 8GB RAM',
    category: 'ELECTRONICS',
    price: 312.25,
    compareAtPrice: 396.45,
    discountPercent: 22,
    rating: 5.00,
    reviewCount: 88,
    stock: 29,
    maxStock: 29,
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor' as const,
    type: 'physical' as const,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'camp-instax',
    title: 'instax mini Evo Instant Digital Camera, Black',
    category: 'CAMERA & PHOTO',
    price: 175.45,
    compareAtPrice: 219.99,
    discountPercent: 21,
    rating: 3.50,
    reviewCount: 52,
    stock: 88,
    maxStock: 88,
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor' as const,
    type: 'physical' as const,
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80',
  },
];

export const HomePage: React.FC = () => {
  const { data: productsData, isLoading, isError, error, refetch } = useProducts({ limit: 8 });
  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  // Active filter tab for Limited Campaign (Image 2)
  const [activeCampaignTab, setActiveCampaignTab] = useState('Electronics');

  // Hero Countdown Timer (Image 1: 39d 5h 4m 57s)
  const heroTimer = useCountdown(39 * 86400 + 5 * 3600 + 4 * 60 + 57);

  // Beauty & Care Timers (Image 4)
  const beautyTimer1 = useCountdown(37 * 86400 + 17 * 3600 + 36 * 60 + 20);
  const beautyTimer2 = useCountdown(38 * 86400 + 17 * 3600 + 36 * 60 + 20);

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
      {/* =========================================================================
          1. Hero Bento Grid (Asymmetric Layout matching Image 1)
          ========================================================================= */}
      <section className="mb-12">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Main Showcase Bento Card (60% width / 7 cols) */}
          <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm border border-slate-100 sm:p-10 lg:col-span-7 flex flex-col justify-between min-h-[460px]">
            <div className="relative z-10 max-w-md">
              <span className="text-xs font-semibold text-slate-500">The Ideal Electronics.</span>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl leading-tight">
                Elevate Your Digital Lifestyle
              </h1>
              <p className="mt-4 text-xs leading-relaxed text-slate-500 sm:text-sm">
                We have prepared special discounts for you on the products you need. Don't miss these opportunities...
              </p>

              <div className="mt-6">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs font-bold text-slate-900 shadow-md border border-slate-200 transition-all hover:bg-slate-50 hover:shadow-lg active:scale-95"
                >
                  <span>Shop Now</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Remaining Time Countdown Widget */}
            <div className="relative z-10 mt-8 pt-4">
              <span className="text-[11px] font-semibold text-slate-500">Remaining Time:</span>
              <div className="mt-2 flex items-center gap-2 font-mono font-bold text-slate-900 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-xs">
                  {heroTimer.days}
                </div>
                <span className="text-slate-400">:</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-xs">
                  {heroTimer.hours}
                </div>
                <span className="text-slate-400">:</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-xs">
                  {heroTimer.minutes}
                </div>
                <span className="text-slate-400">:</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-xs text-orange-600">
                  {heroTimer.seconds}
                </div>
              </div>
            </div>

            {/* Cutout Image of Person Wearing Headphones */}
            <div className="pointer-events-none absolute right-0 bottom-0 top-0 w-1/2 overflow-hidden hidden sm:block">
              <img
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80"
                alt="Audiophile Headphones"
                className="h-full w-full object-cover object-center mix-blend-multiply opacity-90 transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>

          {/* Right Bento Column (40% width / 5 cols) */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            {/* Top 2 Pastel Cards Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Lilac Card (Matching Image 1: #EBE4F7) */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#EBE4F7] p-5 shadow-xs transition-transform hover:-translate-y-0.5">
                <div>
                  <span className="text-[11px] font-medium text-[#6D4CA0]">The Ideal Electronics.</span>
                  <h3 className="mt-1 text-base font-bold text-[#5D3A9B] leading-snug">
                    We Will Take You Anywhere
                  </h3>
                </div>
                <div className="mt-4 flex justify-end">
                  <img
                    src="https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=350&q=80"
                    alt="Smartphone"
                    className="h-28 w-28 object-contain mix-blend-multiply transition-transform hover:scale-110"
                  />
                </div>
              </div>

              {/* Peach/Rose Card (Matching Image 1: #F9ECE6) */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#F9ECE6] p-5 shadow-xs transition-transform hover:-translate-y-0.5">
                <div>
                  <span className="text-[11px] font-medium text-[#8C5A48]">Regular And Stabler</span>
                  <h3 className="mt-1 text-base font-bold text-[#754434] leading-snug">
                    Micro Electrons Are What We Do
                  </h3>
                </div>
                <div className="mt-4 flex justify-end">
                  <img
                    src="https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=350&q=80"
                    alt="Retro Radio"
                    className="h-28 w-28 object-contain mix-blend-multiply transition-transform hover:scale-110"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Mint/Sage Card (Matching Image 1: #EBF3EF) */}
            <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-3xl bg-[#EBF3EF] p-6 shadow-xs sm:flex-row sm:items-center">
              <div className="max-w-xs">
                <span className="text-[11px] font-medium text-[#386858]">Order Of The Circuits</span>
                <h3 className="mt-1 text-xl font-bold text-[#2D5D4E]">
                  Tech Trends, Unleashed
                </h3>
                <p className="mt-2 text-xs text-[#5C7A70] leading-relaxed">
                  Smart appliances and artisan audio gear curated for your modern home ecosystem.
                </p>
                <Link
                  to="/products?category=cat-computing"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#2D5D4E] hover:underline"
                >
                  <span>Explore Trends</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-4 flex justify-end sm:mt-0">
                <img
                  src="https://images.unsplash.com/photo-1517668808822-9ebb02ae2a0e?auto=format&fit=crop&w=450&q=80"
                  alt="Coffee Maker"
                  className="h-32 w-32 object-contain mix-blend-multiply transition-transform hover:scale-105"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Partner Brands Monochrome Ticker (Matching Image 1) */}
        <div className="mt-8 border-t border-slate-200/80 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-6 px-4 text-slate-400 font-bold opacity-80 sm:px-12">
            <span className="text-xl tracking-tighter hover:text-slate-700 transition-colors">oppo</span>
            <span className="text-xl tracking-wider hover:text-slate-700 transition-colors">SIEMENS</span>
            <span className="text-xl lowercase font-semibold hover:text-slate-700 transition-colors">dyson</span>
            <span className="text-xl uppercase tracking-widest hover:text-slate-700 transition-colors">SONY</span>
            <span className="text-xl uppercase tracking-tight hover:text-slate-700 transition-colors">DELL</span>
            <span className="text-xl font-normal hover:text-slate-700 transition-colors">Lenovo</span>
            <span className="text-xl lowercase italic font-bold hover:text-slate-700 transition-colors">intel.</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. Circular Category Showcase (11 Categories matching Image 3)
          ========================================================================= */}
      <section className="mb-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Featured Categories</h2>
          <Link to="/products" className="text-xs font-semibold text-blue-600 hover:underline">
            View All Categories →
          </Link>
        </div>

        <div className="flex items-center gap-6 overflow-x-auto pb-4 no-scrollbar">
          {CIRCULAR_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group flex flex-col items-center shrink-0 focus:outline-hidden"
            >
              {/* Circular Neutral Gray Disk (#F1F3F5) */}
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-[#F1F3F5] transition-all duration-200 group-hover:scale-105 group-hover:bg-[#E5E7EB] group-hover:shadow-md">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-12 w-12 sm:h-14 sm:w-14 object-contain transition-transform duration-200 group-hover:scale-110"
                />
              </div>
              {/* Uppercase Bold Geometric Label */}
              <span className="mt-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-900 group-hover:text-blue-600 transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================================
          3. Limited Campaign Product Grid (Matching Image 2)
          ========================================================================= */}
      <section className="mb-14">
        {/* Section Header with Filter Pills */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mr-2">
              Limited Campaign
            </h2>

            {/* Filter Pills */}
            <button
              onClick={() => setActiveCampaignTab('Electronics')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                activeCampaignTab === 'Electronics'
                  ? 'border border-[#60A5FA] bg-[#EFF6FF] text-[#2563EB] shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Electronics
            </button>
            <button
              onClick={() => setActiveCampaignTab('Health & Wellness')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                activeCampaignTab === 'Health & Wellness'
                  ? 'border border-[#60A5FA] bg-[#EFF6FF] text-[#2563EB] shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Health & Wellness
            </button>
            <button
              onClick={() => setActiveCampaignTab('Household & Essentials')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                activeCampaignTab === 'Household & Essentials'
                  ? 'border border-[#60A5FA] bg-[#EFF6FF] text-[#2563EB] shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Household & Essentials
            </button>
            <button
              onClick={() => setActiveCampaignTab('Toys & Video Games')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                activeCampaignTab === 'Toys & Video Games'
                  ? 'border border-[#60A5FA] bg-[#EFF6FF] text-[#2563EB] shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Toys & Video Games
            </button>
          </div>

          <Link to="/products" className="text-xs font-bold text-[#2563EB] hover:underline whitespace-nowrap">
            View All Products
          </Link>
        </div>

        {/* 6-Column Responsive Campaign Grid matching Image 2 */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {LIMITED_CAMPAIGN_ITEMS.map((item) => {
            const isWishlisted = isInWishlist(item.id);
            const isPlatform = item.sellerType === 'platform';

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-xs border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1"
              >
                <div>
                  {/* Top Wishlist Heart Icon */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {item.category}
                    </span>
                    <button
                      onClick={() =>
                        toggleWishlist({
                          id: item.id,
                          title: item.title,
                          slug: item.id,
                          description: item.title,
                          price: item.price,
                          compareAtPrice: item.compareAtPrice,
                          images: [item.image],
                          category: 'cat-audio',
                          brand: 'Vendora',
                          sellerId: item.sellerId,
                          sellerName: item.sellerName,
                          sellerType: item.sellerType,
                          type: item.type,
                          stock: item.stock,
                          rating: item.rating,
                          reviewCount: item.reviewCount,
                          variants: [],
                          status: 'approved',
                          createdAt: new Date().toISOString(),
                        })
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-rose-500 transition-colors"
                      title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart
                        className={`h-4 w-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`}
                      />
                    </button>
                  </div>

                  {/* Centered Product Image Cutout */}
                  <div className="mt-2 flex h-36 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50/50 p-2">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Store / Seller Tag (Sold by Vendora / Sold by Store) */}
                  <div className="mt-2.5">
                    {isPlatform ? (
                      <span className="inline-block rounded-md bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-800">
                        Sold by Vendora
                      </span>
                    ) : (
                      <Link
                        to={`/vendors/${item.sellerId}`}
                        className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        Sold by {item.sellerName}
                      </Link>
                    )}
                  </div>

                  {/* Title */}
                  <Link to={`/products`} className="mt-1.5 block">
                    <h4 className="line-clamp-2 text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>
                  </Link>

                  {/* Star Rating Row */}
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-500">
                    <div className="flex items-center">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </div>
                    <span className="font-bold text-slate-700">{item.rating.toFixed(2)}</span>
                  </div>

                  {/* Price Row (Emerald Green + Strikethrough + Discount Pill) */}
                  <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                    <span className="text-sm font-extrabold text-[#10B981]">
                      {item.displayPrice ? item.displayPrice : `$${item.price.toFixed(2)}`}
                    </span>
                    {item.compareAtPrice && (
                      <span className="text-[11px] text-slate-400 line-through">
                        ${item.compareAtPrice.toFixed(2)}
                      </span>
                    )}
                    {item.discountPercent && (
                      <span className="rounded bg-[#FEE2E2] px-1 py-0.5 text-[9px] font-bold text-[#EF4444]">
                        {item.discountPercent}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Scarcity Progress Bar + Add Button */}
                <div className="mt-3 border-t border-slate-100 pt-2.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-600">
                    <span>Available only: <strong className="text-slate-900">{item.stock}</strong></span>
                  </div>

                  {/* Two-tone Progress Bar: Red fill on Lavender track */}
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#E0E7FF]">
                    <div
                      className="h-full rounded-full bg-[#EF4444]"
                      style={{ width: `${Math.min(100, Math.round((item.stock / item.maxStock) * 100))}%` }}
                    />
                  </div>

                  {/* Quick Add To Cart Button */}
                  <button
                    onClick={() =>
                      addItem({
                        id: item.id,
                        productId: item.id,
                        title: item.title,
                        price: item.price,
                        maxStock: item.maxStock,
                        image: item.image,
                        sellerId: item.sellerId,
                        sellerName: item.sellerName,
                        sellerType: item.sellerType,
                        type: item.type,
                      })
                    }
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-900 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-blue-600 active:scale-95"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          4. Beauty & Care Twin Promotional Banner with Timers (Matching Image 4)
          ========================================================================= */}
      <section className="mb-14">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left Beauty Banner */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#F5F5F7] p-6 shadow-xs sm:p-8 min-h-[360px]">
            <div className="relative z-10 max-w-xs">
              <span className="text-xs font-semibold text-slate-500">Unleash Your Inner Radiance</span>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl leading-snug">
                Embody Elegance and Empowerment
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                We have prepared special discounts for you on the products you need. Don't miss these opportunities...
              </p>

              <div className="mt-5">
                <Link
                  to="/products?category=beauty"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-xs font-bold text-slate-900 shadow-sm border border-slate-200 hover:bg-slate-50 transition-transform active:scale-95"
                >
                  <span>Shop Now</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Remaining Time Countdown */}
            <div className="relative z-10 mt-6 pt-3">
              <span className="text-[11px] font-semibold text-slate-500">Remaining Time:</span>
              <div className="mt-1.5 flex items-center gap-2 font-mono font-bold text-slate-900 text-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white shadow-xs">
                  {beautyTimer1.days}
                </div>
                <span className="text-slate-400">:</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white shadow-xs">
                  {beautyTimer1.hours}
                </div>
                <span className="text-slate-400">:</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white shadow-xs">
                  {beautyTimer1.minutes}
                </div>
                <span className="text-slate-400">:</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white shadow-xs text-rose-600">
                  {beautyTimer1.seconds}
                </div>
              </div>
            </div>

            {/* Radiant Model Face Cutout */}
            <div className="pointer-events-none absolute right-0 bottom-0 top-0 w-1/2 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80"
                alt="Radiant Skincare"
                className="h-full w-full object-cover object-center mix-blend-multiply opacity-90 transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>

          {/* Right Beauty Banner */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#F5F5F7] p-6 shadow-xs sm:p-8 min-h-[360px]">
            <div className="relative z-10 max-w-xs">
              <span className="text-xs font-semibold text-slate-500">Discover Your Flawless Canvas</span>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl leading-snug">
                Unlock the Secrets of Ageless Beauty
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                We have prepared special discounts for you on the products you need. Don't miss these opportunities...
              </p>

              <div className="mt-5">
                <Link
                  to="/products?category=beauty"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-xs font-bold text-slate-900 shadow-sm border border-slate-200 hover:bg-slate-50 transition-transform active:scale-95"
                >
                  <span>Shop Now</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Remaining Time Countdown */}
            <div className="relative z-10 mt-6 pt-3">
              <span className="text-[11px] font-semibold text-slate-500">Remaining Time:</span>
              <div className="mt-1.5 flex items-center gap-2 font-mono font-bold text-slate-900 text-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white shadow-xs">
                  {beautyTimer2.days}
                </div>
                <span className="text-slate-400">:</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white shadow-xs">
                  {beautyTimer2.hours}
                </div>
                <span className="text-slate-400">:</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white shadow-xs">
                  {beautyTimer2.minutes}
                </div>
                <span className="text-slate-400">:</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white shadow-xs text-rose-600">
                  {beautyTimer2.seconds}
                </div>
              </div>
            </div>

            {/* Cosmetic Tube Primer Cutout */}
            <div className="pointer-events-none absolute right-0 bottom-0 top-0 w-1/2 overflow-hidden flex items-center justify-end pr-4">
              <img
                src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80"
                alt="Mineral Primer"
                className="h-4/5 w-4/5 object-contain mix-blend-multiply opacity-95 transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>
        </div>

        {/* Beauty Brands Monochrome Ticker (Matching Image 4) */}
        <div className="mt-8 border-t border-slate-200/80 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-6 px-4 text-slate-400 font-bold opacity-80 sm:px-8">
            <span className="text-lg lowercase font-serif italic hover:text-slate-700 transition-colors">allure</span>
            <span className="text-lg tracking-widest font-sans uppercase hover:text-slate-700 transition-colors">L'ORÉAL</span>
            <span className="text-lg font-serif hover:text-slate-700 transition-colors">Aēsop.</span>
            <span className="text-lg tracking-wider font-light uppercase hover:text-slate-700 transition-colors">Kérastase</span>
            <span className="text-lg tracking-widest uppercase hover:text-slate-700 transition-colors">BIOTHERM</span>
            <span className="text-lg font-serif italic hover:text-slate-700 transition-colors">Unilever</span>
            <span className="text-lg font-serif tracking-widest uppercase hover:text-slate-700 transition-colors">DIOR</span>
            <span className="text-lg font-mono uppercase tracking-widest hover:text-slate-700 transition-colors">AVEDA</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. Featured Catalog Listings (Live Multi-Vendor Mock Database)
          ========================================================================= */}
      <section className="mb-14">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Featured Marketplace Listings</h2>
            <p className="text-xs text-slate-500">Live multi-vendor inventory loaded from in-browser MSW engine</p>
          </div>
          <Link to="/products" className="text-xs font-bold text-blue-600 hover:underline">
            View All ({productsData?.total ?? 0}) →
          </Link>
        </div>

        <QueryState
          isLoading={isLoading}
          isError={isError}
          errorMessage={error?.message}
          onRetry={refetch}
          isEmpty={(productsData?.items?.length ?? 0) === 0}
          emptyTitle="No featured products currently available"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {productsData?.items?.map((product) => {
              const isPlatform = product.sellerType === 'platform';
              return (
                <div
                  key={product.id}
                  className="card-near-solid group flex flex-col justify-between overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div>
                    {/* Image Container with Badges */}
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Seller Tag */}
                      <div className="absolute top-3 left-3">
                        {isPlatform ? (
                          <Badge variant="vendora-platform">Sold by Vendora</Badge>
                        ) : (
                          <Link to={`/vendors/${product.sellerId}`}>
                            <Badge variant="vendor-verified">{product.sellerName}</Badge>
                          </Link>
                        )}
                      </div>

                      {/* Compare at price discount tag */}
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <div className="absolute bottom-3 left-3">
                          <Badge variant="discount-coral">
                            {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% OFF
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-center gap-1 text-xs text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-slate-700">{product.rating}</span>
                        <span className="text-slate-400">({product.reviewCount})</span>
                      </div>

                      <Link to={`/products/${product.id}`} className="mt-1 block">
                        <h4 className="line-clamp-2 text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {product.title}
                        </h4>
                      </Link>

                      {/* Stock availability indicator */}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Stock: {product.stock > 100 ? '99+' : product.stock}</span>
                        <span className="font-medium text-emerald-600">
                          {product.type === 'digital' ? 'Instant Access' : 'In Stock'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="border-t border-slate-100 p-4 pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-slate-900">${product.price.toFixed(2)}</span>
                        {product.compareAtPrice && (
                          <span className="ml-2 text-xs text-slate-400 line-through">
                            ${product.compareAtPrice.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          addItem({
                            id: product.id,
                            productId: product.id,
                            title: product.title,
                            price: product.price,
                            maxStock: product.stock,
                            image: product.images[0],
                            sellerId: product.sellerId,
                            sellerName: product.sellerName,
                            sellerType: product.sellerType,
                            type: product.type,
                          })
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition-all hover:bg-blue-600 active:scale-95"
                        title="Add to cart"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </QueryState>
      </section>

      {/* =========================================================================
          6. Verified Multi-Vendor Spotlight Strip
          ========================================================================= */}
      <section className="mb-10 rounded-3xl bg-slate-900 p-6 text-white sm:p-10">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Platform Ecosystem</span>
            <h2 className="text-2xl font-bold tracking-tight text-white">Vetted Independent Vendors</h2>
          </div>
          <Link
            to="/become-a-seller"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20"
          >
            <span>Apply as a Vendor</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Vendor 1 */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-800/80 p-5 border border-slate-700/80">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-cyan-400">
                <img
                  src="https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=120&q=80"
                  alt="SoundWave Direct"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-white">SoundWave Direct</h4>
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-amber-400">★ 4.9 (382 reviews)</span>
                  <span>·</span>
                  <span>Electronics & Audio</span>
                </div>
              </div>
            </div>

            <Link
              to="/vendors/vendor-tech-1"
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white hover:text-slate-900 transition-all"
            >
              View Store
            </Link>
          </div>

          {/* Vendor 2 */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-800/80 p-5 border border-slate-700/80">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[#FF7A1A]">
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80"
                  alt="StudioCraft Assets"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-white">StudioCraft Assets</h4>
                  <CheckCircle2 className="h-4 w-4 text-[#FF7A1A]" />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-amber-400">★ 4.95 (890 reviews)</span>
                  <span>·</span>
                  <span>Digital Software & UI</span>
                </div>
              </div>
            </div>

            <Link
              to="/vendors/vendor-design-1"
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white hover:text-slate-900 transition-all"
            >
              View Store
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
