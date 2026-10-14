import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { useReveal } from '../hooks/useReveal';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';
import {
  ProductCard,
  ProductCarouselWithTabs,
  ProductCarouselWithoutTabs,
  domainProductToCardItem,
  type ProductItem,
} from '../features/products';
import { useProducts } from '../features/catalog/hooks/useProducts';
import {
  SectionHeading,
  DealsStrip,
  BestSellersRail,
  RecommendedShelf,
  BrandSpotlight,
  DigitalShowcase,
  AppPromoSection,
  BackToTopButton,
} from '../features/home';
import { useHeroSlides } from '../features/home/api/hero-banners';
import { TrustStrip } from '../components/common/TrustStrip';


// Hero slides come from the CMS: the published `homepage_hero` banners the
// admin console writes, with the built-in slides as the fallback until one is
// published. See features/home/api/hero-banners.ts.

// The 12 Parent Categories with High-Resolution 2K Thumbnails
const POPULAR_CATEGORIES = [
  { id: 'cat-electronics', name: 'Electronics', image: '/images/categories/cat_electronics_2k.png', slug: 'electronics' },
  { id: 'cat-audio', name: 'Audio & Wearables', image: '/images/categories/cat_audio_wearables_2k.png', slug: 'audio-wearables' },
  { id: 'cat-cameras', name: 'Cameras & Photo', image: '/images/categories/cat_cameras_photo_2k.png', slug: 'cameras-photo' },
  { id: 'cat-fashion', name: 'Fashion', image: '/images/categories/cat_fashion_2k.png', slug: 'fashion' },
  { id: 'cat-shoes', name: 'Shoes', image: '/images/categories/cat_shoes_2k.png', slug: 'shoes' },
  { id: 'cat-bags', name: 'Bags & Luggage', image: '/images/categories/cat_bags_luggage_2k.png', slug: 'bags-luggage' },
  { id: 'cat-jewelry', name: 'Jewelry & Watches', image: '/images/categories/cat_jewelry_watches_2k.png', slug: 'jewelry-watches' },
  { id: 'cat-beauty', name: 'Beauty & Personal Care', image: '/images/categories/cat_beauty_personalcare_2k.png', slug: 'beauty-personal-care' },
  { id: 'cat-home', name: 'Home & Kitchen', image: '/images/categories/cat_home_kitchen_2k.png', slug: 'home-kitchen' },
  { id: 'cat-kids', name: 'Kids & Baby', image: '/images/categories/cat_kids_baby_2k.png', slug: 'kids-baby' },
  { id: 'cat-sports', name: 'Sports & Outdoors', image: '/images/categories/cat_sports_outdoors_2k.png', slug: 'sports-outdoors' },
  { id: 'cat-digital', name: 'Digital Products', image: '/images/categories/cat_digital_products_2k.png', slug: 'digital-products' },
];

// Sub-categories under parent category Electronics
const ELECTRONICS_SUBCATEGORIES = [
  { id: 'sub-audio', name: 'Audio & Headphones' },
  { id: 'sub-computers', name: 'Computers & Laptops' },
  { id: 'sub-smartphones', name: 'Smartphones & Tablets' },
  { id: 'sub-cameras', name: 'Cameras & Drones' },
];




interface SaleCategoryDef {
  id: string;
  name: string;
  slug: string;
}

interface SaleCategoryWithProducts extends SaleCategoryDef {
  products: ProductItem[];
}

// Parent categories the Limited Campaign can draw from. The campaign itself
// is built from real catalogue data in the component below — only categories
// with genuine discounts (compare-at price above price) become pills.
const SALE_CATEGORY_DEFS: SaleCategoryDef[] = [
  { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
  { id: 'cat-audio', name: 'Audio & Wearables', slug: 'audio-wearables' },
  { id: 'cat-fashion', name: 'Fashion', slug: 'fashion' },
  { id: 'cat-beauty', name: 'Beauty & Personal Care', slug: 'beauty-personal-care' },
  { id: 'cat-home', name: 'Home & Kitchen', slug: 'home-kitchen' },
  { id: 'cat-shoes', name: 'Shoes', slug: 'shoes' },
  { id: 'cat-kids', name: 'Kids & Baby', slug: 'kids-baby' },
  { id: 'cat-bags', name: 'Bags & Luggage', slug: 'bags-luggage' },
  { id: 'cat-jewelry', name: 'Jewelry & Watches', slug: 'jewelry-watches' },
  { id: 'cat-sports', name: 'Sports & Outdoors', slug: 'sports-outdoors' },
  { id: 'cat-digital', name: 'Digital Products', slug: 'digital-products' },
  { id: 'cat-cameras', name: 'Cameras & Photo', slug: 'cameras-photo' },
];

interface CountdownPillsProps {
  initialDays?: number;
  initialHours?: number;
  initialMinutes?: number;
  initialSeconds?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

/** Live "Remaining Time" widget used on the promo banners (self-contained timer to prevent page re-renders). */
const CountdownPills: React.FC<CountdownPillsProps> = ({
  initialDays = 39,
  initialHours = 5,
  initialMinutes = 4,
  initialSeconds = 57,
  days: propDays,
  hours: propHours,
  minutes: propMinutes,
  seconds: propSeconds,
}) => {
  const [time, setTime] = useState(() => ({
    days: propDays ?? initialDays,
    hours: propHours ?? initialHours,
    minutes: propMinutes ?? initialMinutes,
    seconds: propSeconds ?? initialSeconds,
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div>
      <p className="font-outfit mb-1.5 text-[11px] font-medium text-[#5A5148]">Remaining Time:</p>
      <div className="font-outfit inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-bold tabular-nums shadow-sm sm:text-sm">
        <span className="text-slate-400">{pad(time.days)}</span>
        <span className="text-slate-400">:</span>
        <span className="text-slate-400">{pad(time.hours)}</span>
        <span className="text-slate-400">:</span>
        <span className="text-slate-400">{pad(time.minutes)}</span>
        <span className="text-slate-400">:</span>
        <span className="text-slate-900">{pad(time.seconds)}</span>
      </div>
    </div>
  );
};


export const HomePage: React.FC = () => {
  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  // Scroll reveal for the page's `.reveal` sections and grid items.
  useReveal();


  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hero Section Carousel state. The slide list can change length when the CMS
  // read lands, so the rendered index is always taken modulo the list.
  const heroSlides = useHeroSlides();
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const activeHeroIndex = heroSlides.length > 0 ? heroSlideIndex % heroSlides.length : 0;

  // Section 3: Limited Campaign (Sale Offers by Parent Category)
  // Real catalogue data: one broad fetch, grouped by category and filtered
  // to genuine discounts (compare-at price above price). Only parent
  // categories that actually have products on sale become pills — the ~115
  // hard-coded products this page used to render are gone (QA
  // frontend-Critical-2).
  const { data: campaignPoolData } = useProducts({ sort: 'featured', page: 1, limit: 100 });

  const parentCategoriesWithSales = useMemo<SaleCategoryWithProducts[]>(() => {
    const pool = campaignPoolData?.items ?? [];
    return SALE_CATEGORY_DEFS.map((def) => ({
      ...def,
      products: pool
        .filter(
          (product) =>
            product.category === def.name &&
            product.compareAtPrice !== undefined &&
            product.compareAtPrice > product.price,
        )
        .map(domainProductToCardItem),
    })).filter((cat) => cat.products.length > 0);
  }, [campaignPoolData]);

  const [selectedSaleCategory, setSelectedSaleCategory] = useState<string>('cat-electronics');

  const currentSaleCategory = useMemo(() => {
    return (
      parentCategoriesWithSales.find((c) => c.id === selectedSaleCategory) ||
      parentCategoriesWithSales[0]
    );
  }, [parentCategoriesWithSales, selectedSaleCategory]);

  // Product carousels: real catalogue shelves. The Electronics carousel
  // merges its three sibling catalogue categories (Electronics, Audio &
  // Wearables, Cameras & Photo); the shared mapper's title-driven inference
  // feeds the sub-category tab filter, with category-derived ids normalised
  // onto the tab ids.
  const { data: electronicsData } = useProducts({ category: 'electronics', sort: 'best_selling', page: 1, limit: 24 });
  const { data: audioData } = useProducts({ category: 'audio-wearables', sort: 'best_selling', page: 1, limit: 12 });
  const { data: camerasData } = useProducts({ category: 'cameras-photo', sort: 'best_selling', page: 1, limit: 12 });

  const electronicsItems = useMemo<ProductItem[]>(() => {
    const seen = new Set<string>();
    const merged: ProductItem[] = [];
    for (const product of [
      ...(electronicsData?.items ?? []),
      ...(audioData?.items ?? []),
      ...(camerasData?.items ?? []),
    ]) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      const item = domainProductToCardItem(product);
      if (item.subCategoryId?.startsWith('sub-audio')) item.subCategoryId = 'sub-audio';
      if (item.subCategoryId?.startsWith('sub-camera')) item.subCategoryId = 'sub-cameras';
      if (item.subCategoryId?.startsWith('sub-computer')) item.subCategoryId = 'sub-computers';
      merged.push(item);
    }
    return merged;
  }, [electronicsData, audioData, camerasData]);

  const { data: beautyData } = useProducts({ category: 'beauty-personal-care', sort: 'best_selling', page: 1, limit: 20 });
  const beautyItems = useMemo<ProductItem[]>(
    () => (beautyData?.items ?? []).map(domainProductToCardItem),
    [beautyData],
  );

  const { data: homeData } = useProducts({ category: 'home-kitchen', sort: 'best_selling', page: 1, limit: 20 });
  const homeItems = useMemo<ProductItem[]>(
    () => (homeData?.items ?? []).map(domainProductToCardItem),
    [homeData],
  );

  // Ref for Popular Categories interactive smooth scrolling
  const categoriesRef = useRef<HTMLDivElement>(null);

  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  useEffect(() => {
    if (isCarouselPaused || heroSlides.length === 0) return;
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isCarouselPaused, heroSlides.length]);

  const scrollContainer = useCallback((ref: React.RefObject<HTMLDivElement | null>, offset: number) => {
    const el = ref.current;
    if (!el) return;
    // Viewport-aware paging: move ~85% of the visible width per press,
    // in the direction requested (sign of offset).
    const step = Math.max(Math.round(el.clientWidth * 0.85), 160) * Math.sign(offset);
    el.scrollBy({ left: step, behavior: 'smooth' });
  }, []);

  const nextHeroSlide = () => {
    setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
  };

  const prevHeroSlide = () => {
    setHeroSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleAddToCart = useCallback((item: ProductItem) => {
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
    });
    showToast(`Added ${item.title} to cart`);
  }, [addItem]);

  const handleToggleWishlist = useCallback((item: ProductItem) => {
    const isWishlisted = isInWishlist(item.id);
    toggleWishlist({
      id: item.id,
      title: item.title,
      slug: item.id,
      description: item.title,
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      images: [item.image],
      category: item.category,
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
    });
    showToast(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  }, [isInWishlist, toggleWishlist]);


  return (
    <div className="w-full text-[#1F2937] dark:text-slate-100">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
        {/* =========================================================================
            1. Hero Featured Carousel & Highlights
            ========================================================================= */}
        <section className="mb-10">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div
              className="relative overflow-hidden rounded-[28px] bg-[#0C1046] shadow-xl lg:col-span-9 group aspect-[16/9] min-h-[260px] sm:min-h-[320px] flex items-center justify-center"
              onMouseEnter={() => setIsCarouselPaused(true)}
              onMouseLeave={() => setIsCarouselPaused(false)}
            >
              {heroSlides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    activeHeroIndex === idx ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <Link to={slide.link} className="absolute inset-0 z-20" title={slide.title} aria-label={slide.title} />
                </div>
              ))}

              {/* Prev / Next Carousel Navigation Arrows */}
              <button
                type="button"
                onClick={prevHeroSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all cursor-pointer"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={nextHeroSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all cursor-pointer"
                aria-label="Next Slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Right Card: wireless headphones photo (3 Cols, hidden on mobile).
                This slot previously used a pre-rendered marketing banner whose
                pixels carried a product name and a "From $249*" price claim —
                a claim no catalogue row backs — so it now uses a clean,
                text-free product photo like the carousel slides. */}
            <div className="relative overflow-hidden hidden md:block rounded-[28px] bg-[#0C1046] shadow-lg lg:col-span-3 group lg:aspect-auto aspect-[16/9] min-h-[260px] sm:min-h-[320px]">
              <img
                src="/images/products/prod_silver_headphones.jpg"
                alt="Wireless noise-cancelling headphones"
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <Link to="/products?category=audio-wearables" className="absolute inset-0 z-20" title="Wireless Headphones" />
            </div>
          </div>

          {/* Interactive Carousel Pagination Dots */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setHeroSlideIndex(idx)}
                aria-label={`Go to hero slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  activeHeroIndex === idx
                    ? 'h-2 w-7 bg-sun-orange'
                    : 'h-2 w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </section>

        {/* =========================================================================
            1B. Trust Strip — the canonical placement (Batch 22H): the four
            assurance cards live on the homepage, nowhere else.
            ========================================================================= */}
        <section className="reveal mb-14" aria-label="Why shop with Vendora">
          <TrustStrip />
        </section>

        {/* =========================================================================
            2. Explore Popular Categories
            ========================================================================= */}
        <section className="reveal mb-14">
          <SectionHeading
            title="Explore Popular Categories"
            action={
              <Link
                to="/products"
                className="group inline-flex items-center gap-1 rounded-full bg-orange-50 px-3.5 py-1.5 text-xs font-bold text-sun-orange-700 transition-colors hover:bg-orange-100"
              >
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          />

          <div className="relative flex items-center justify-between">
            {/* Left arrow scroll button */}
            <button
              type="button"
              onClick={() => scrollContainer(categoriesRef, -240)}
              className="flex mr-2 h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:scale-105 transition-all cursor-pointer"
              title="Previous categories"
              aria-label="Previous categories"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div
              ref={categoriesRef}
              className="flex items-center gap-4 sm:gap-6 md:gap-7 overflow-x-auto scroll-smooth no-scrollbar py-3 px-2 justify-start w-full"
            >
              {POPULAR_CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.slug}`}
                  className="group flex flex-col items-center shrink-0 transition-transform hover:-translate-y-1"
                >
                  <div className="flex h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 items-center justify-center rounded-full bg-[#F4F6F8] p-3 overflow-hidden shadow-2xs border border-slate-100 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:bg-[#FFF4EC] group-hover:border-sun-orange/60 group-hover:ring-4 group-hover:ring-orange-500/15">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-xs"
                    />
                  </div>
                  <span className="mt-3 text-xs font-bold text-slate-800 text-center tracking-tight group-hover:text-sun-orange transition-colors max-w-[100px] leading-tight">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>

            {/* Right arrow scroll button */}
            <button
              type="button"
              onClick={() => scrollContainer(categoriesRef, 240)}
              className="flex ml-2 h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:scale-105 transition-all cursor-pointer"
              title="Next categories"
              aria-label="Next categories"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        {/* =========================================================================
            2B. Flash Deals Strip (Urgency ticker with countdown & claimed stats)
            ========================================================================= */}
        <DealsStrip
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          isInWishlist={isInWishlist}
        />

        {/* =========================================================================
            3. Limited Campaign (Sale Offers by Parent Category)
            ========================================================================= */}
        {parentCategoriesWithSales.length > 0 && (
        <section className="reveal mb-14">
          <SectionHeading
            title="Limited Campaign"
            inline={
              /* Parent category pills: only show categories that have products on sale */
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {parentCategoriesWithSales.map((cat) => {
                  const isSelected = selectedSaleCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedSaleCategory(cat.id)}
                      className={`cursor-pointer rounded-full px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                        isSelected
                          ? 'border border-sun-orange bg-sun-orange text-white shadow-md shadow-orange-500/25 font-bold'
                          : 'border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            }
            action={
              <Link
                to={`/products?category=${currentSaleCategory?.slug || 'electronics'}`}
                className="group hidden items-center gap-1 rounded-full bg-orange-50 px-3.5 py-1.5 text-xs font-bold text-sun-orange-700 transition-colors hover:bg-orange-100 sm:inline-flex shrink-0"
              >
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {currentSaleCategory?.products.map((product) => (
              <div key={product.id} className="reveal h-full">
                <ProductCard
                  product={product}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={isInWishlist(product.id)}
                />
              </div>
            ))}
          </div>
        </section>
        )}

        {/* =========================================================================
            3A. Electronics Bento Countdown Promo (Screenshot 2026-10-05 235506.png)
            ========================================================================= */}
        <section className="reveal mb-14">
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-12">
            {/* Left Large Card: Headphones, Laptops & More */}
            <div className="group relative min-h-[400px] overflow-hidden rounded-[26px] bg-[#EFEFEF] shadow-sm transition-all hover:shadow-lg sm:min-h-[460px] md:col-span-7">
              <img
                src="/images/bevesi/art_elec_man.png"
                alt="Man wearing wireless headphones"
                className="absolute bottom-0 right-0 h-full w-auto max-w-[62%] object-cover object-left [mask-image:linear-gradient(to_right,transparent,black_18%)] transition-transform duration-700 group-hover:scale-105"
              />
              <div className="relative z-10 flex h-full max-w-[62%] flex-col justify-between p-6 sm:p-9">
                <div>
                  <p className="font-outfit text-xs font-semibold text-[#5A5148] sm:text-sm">Top Deals on Tech</p>
                  <h3 className="font-outfit mt-2 text-3xl font-extrabold leading-[0.96] tracking-tight text-[#5A5148] sm:text-[44px] lg:text-[52px]">
                    Headphones,<br />Laptops & More
                  </h3>
                  <p className="font-outfit mt-3.5 max-w-[340px] text-xs font-normal leading-relaxed text-[#6B635B] sm:text-sm">
                    Save up to 30% on audio and computers from trusted vendors.
                  </p>
                  <Link
                    to="/products?category=electronics"
                    className="font-outfit mt-5 inline-flex items-center rounded-full border border-slate-900 bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-800 sm:text-sm"
                  >
                    Shop Electronics
                  </Link>
                </div>
                <CountdownPills
                  initialDays={39}
                  initialHours={5}
                  initialMinutes={4}
                  initialSeconds={57}
                />
              </div>
            </div>

            {/* Right Bento Grid: 2 Top Cards + 1 Bottom Card */}
            <div className="flex flex-col justify-between gap-5 md:col-span-5">
              <div className="grid flex-1 grid-cols-2 gap-5">
                {/* Smartphones (Purple) */}
                <Link
                  to="/products?category=electronics"
                  className="group relative flex min-h-[240px] flex-col items-center overflow-hidden rounded-[22px] bg-[#EEE8F4] px-3 pt-5 text-center shadow-sm transition-all hover:shadow-lg"
                >
                  <p className="font-outfit text-[11px] font-semibold text-[#6B5B8A] sm:text-xs">Smartphones</p>
                  <h3 className="font-outfit mt-1.5 text-base font-extrabold leading-[1.05] tracking-tight text-[#6B5B8A] sm:text-xl">
                    Latest Phones,<br />Best Prices
                  </h3>
                  <p className="font-outfit text-[10px] text-[#6B5B8A]/80 mt-0.5">
                    Compare top brands. Free returns.
                  </p>
                  <img
                    src="/images/bevesi/art_elec_phones.png"
                    alt="Foldable smartphones"
                    className="mt-auto w-[88%] object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>

                {/* Retro Radio (Peach) */}
                <Link
                  to="/products?category=electronics"
                  className="group relative flex min-h-[240px] flex-col items-center overflow-hidden rounded-[22px] bg-[#F8F3EF] px-3 pt-5 text-center shadow-sm transition-all hover:shadow-lg"
                >
                  <p className="font-outfit text-[11px] font-semibold text-[#9A6B66] sm:text-xs">Home Audio</p>
                  <h3 className="font-outfit mt-1.5 text-base font-extrabold leading-[1.05] tracking-tight text-[#9A6B66] sm:text-xl">
                    Retro Sound,<br />Modern Quality
                  </h3>
                  <p className="font-outfit text-[10px] text-[#9A6B66]/80 mt-0.5">
                    Speakers, radios & soundbars for every room.
                  </p>
                  <img
                    src="/images/bevesi/art_elec_radio.png"
                    alt="Retro bluetooth radio"
                    className="mt-auto w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
              </div>

              {/* Bottom Card: Coffee Maker / Gadgets (Mint) */}
              <Link
                to="/products?category=electronics"
                className="group relative flex min-h-[200px] flex-1 overflow-hidden rounded-[22px] bg-[#F2F2F2] shadow-sm transition-all hover:shadow-lg"
              >
                <div className="relative z-10 flex max-w-[58%] flex-col justify-center p-5 sm:p-7">
                  <p className="font-outfit text-[11px] font-semibold text-[#567A6B] sm:text-xs">Trending Now</p>
                  <h3 className="font-outfit mt-1.5 text-2xl font-extrabold leading-[1.02] tracking-tight text-[#567A6B] sm:text-[32px]">
                    Tech Everyone’s<br />Buying
                  </h3>
                  <p className="font-outfit mt-2 text-[11px] font-normal leading-relaxed text-[#567A6B] sm:text-sm">
                    Top-rated gadgets this week. Fast delivery from verified sellers.
                  </p>
                </div>
                <img
                  src="/images/bevesi/art_elec_coffee.png"
                  alt="Coffee maker"
                  className="absolute bottom-0 right-[6%] h-[92%] w-auto object-contain object-bottom transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
            </div>
          </div>

          {/* Electronics Brand Strip */}
          <div className="mt-8 flex items-center justify-center border-t border-slate-100/80 pt-6 w-full">
            <img
              src="/images/bevesi/brands_electronics_strip_clean.png"
              alt="Official Electronics Brands: oppo, SIEMENS, dyson, SONY, DELL, Lenovo, intel"
              className="h-14 sm:h-18 lg:h-22 w-full max-w-6xl object-contain transition-transform duration-300 hover:scale-[1.01]"
            />
          </div>
        </section>

        {/* =========================================================================
            3B. Product Cards Carousel 1: Electronics (with sub-category tabs)
            ========================================================================= */}
        {electronicsItems.length > 0 && (
          <div className="reveal">
            <ProductCarouselWithTabs
              title="Electronics"
              categorySlug="electronics"
              tabs={ELECTRONICS_SUBCATEGORIES}
              products={electronicsItems}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              isInWishlist={isInWishlist}
            />
          </div>
        )}

        {/* =========================================================================
            3B-2. Best-Sellers Rail (Leaderboard & Top Sales Velocity)
            ========================================================================= */}
        <BestSellersRail
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          isInWishlist={isInWishlist}
        />

        {/* =========================================================================
            3C. Dual Countdown Beauty Promo
            ========================================================================= */}
        <section className="reveal mb-14">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Card 1: Glow Up Your Routine */}
            <div className="group relative min-h-[360px] overflow-hidden rounded-[26px] bg-[#F2F1EF] shadow-sm transition-all hover:shadow-lg sm:min-h-[440px]">
              <img
                src="/images/bevesi/beauty_face_full.jpg"
                alt="Skincare model applying cleanser"
                className="absolute inset-0 h-full w-full object-cover object-right transition-transform duration-700 group-hover:scale-105"
              />
              <div className="relative z-10 flex h-full max-w-[56%] sm:max-w-[50%] flex-col justify-between p-6 sm:p-9">
                <div>
                  <p className="font-outfit text-xs font-semibold text-[#5A5148] sm:text-sm">Beauty Essentials</p>
                  <h3 className="font-outfit mt-2 text-2xl font-extrabold leading-[1.05] tracking-tight text-[#5A5148] sm:text-[34px] lg:text-[40px]">
                    Glow Up Your Routine
                  </h3>
                  <p className="font-outfit mt-3 max-w-[340px] text-xs leading-relaxed text-[#6B635B] sm:text-sm">
                    Skincare, makeup and fragrances. Up to 25% off.
                  </p>
                  <Link
                    to="/products?category=beauty"
                    className="font-outfit mt-5 inline-flex items-center rounded-full bg-sun-orange px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-colors hover:bg-sun-orange-600 sm:text-sm"
                  >
                    Shop Beauty
                  </Link>
                </div>
                <CountdownPills
                  initialDays={37}
                  initialHours={17}
                  initialMinutes={4}
                  initialSeconds={57}
                />
              </div>
            </div>

            {/* Card 2: Serums, SPF & Moisturizers */}
            <div className="group relative min-h-[360px] overflow-hidden rounded-[26px] bg-[#F2F1EF] shadow-sm transition-all hover:shadow-lg sm:min-h-[440px]">
              <img
                src="/images/bevesi/beauty_primer_full.jpg"
                alt="Coastal Glow Hydrating Tint SPF 30"
                className="absolute inset-0 h-full w-full object-cover object-right transition-transform duration-700 group-hover:scale-105"
              />
              <div className="relative z-10 flex h-full max-w-[62%] flex-col justify-between p-6 sm:p-9">
                <div>
                  <p className="font-outfit text-xs font-semibold text-[#5A5148] sm:text-sm">Skincare Picks</p>
                  <h3 className="font-outfit mt-2 text-2xl font-extrabold leading-[1.05] tracking-tight text-[#5A5148] sm:text-[34px] lg:text-[40px]">
                    Serums, SPF &amp; Moisturizers
                  </h3>
                  <p className="font-outfit mt-3 max-w-[340px] text-xs leading-relaxed text-[#6B635B] sm:text-sm">
                    Skincare, makeup and fragrances. Up to 25% off.
                  </p>
                  <Link
                    to="/products?category=beauty"
                    className="font-outfit mt-5 inline-flex items-center rounded-full bg-sun-orange px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-colors hover:bg-sun-orange-600 sm:text-sm"
                  >
                    Shop Beauty
                  </Link>
                </div>
                <CountdownPills
                  initialDays={38}
                  initialHours={17}
                  initialMinutes={4}
                  initialSeconds={57}
                />
              </div>
            </div>
          </div>

          {/* Beauty Brands Strip */}
          <div className="mt-8 flex items-center justify-center border-t border-slate-100/80 pt-6 w-full">
            <img
              src="/images/bevesi/brands_beauty_strip_clean.png"
              alt="Official Beauty Brands: allure, L'Oreal, Aesop, Kerastase, Biotherm, Unilever, Dior, Aveda"
              className="h-14 sm:h-18 lg:h-22 w-full max-w-6xl object-contain transition-transform duration-300 hover:scale-[1.01]"
            />
          </div>
        </section>

        {/* =========================================================================
            3D. Product Cards Carousel 2: Beauty & Personal Care (without tabs)
            ========================================================================= */}
        {beautyItems.length > 0 && (
          <div className="reveal">
            <ProductCarouselWithoutTabs
              title="Beauty & Personal Care"
              categorySlug="beauty-personal-care"
              products={beautyItems}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              isInWishlist={isInWishlist}
            />
          </div>
        )}

        {/* =========================================================================
            3D-2. Recommended For You & Recently Viewed Shelf
            ========================================================================= */}
        <RecommendedShelf
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          isInWishlist={isInWishlist}
        />

        {/* =========================================================================
            3E. Home Equipment Bento Promo
            ========================================================================= */}
        <section className="reveal mb-14">
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-12">
            {/* Left tall card: Kitchen Favorites */}
            <Link
              to="/products?category=appliances"
              className="group relative min-h-[420px] overflow-hidden rounded-[26px] bg-[#F3F3F3] shadow-sm transition-all hover:shadow-lg md:col-span-3 md:min-h-[480px]"
            >
              <img
                src="/images/bevesi/banner-16.jpg"
                alt="Pastel green stand mixer"
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div className="relative z-10 px-4 pt-7 text-center">
                <p className="font-outfit text-[11px] font-medium text-slate-500 sm:text-xs">Kitchen Favorites</p>
                <h3 className="font-outfit mt-1 text-2xl font-extrabold tracking-tight text-[#5A5A5A] sm:text-[28px]">
                  Make Cooking Easier
                </h3>
              </div>
              <p className="font-outfit absolute inset-x-0 bottom-6 z-10 px-4 text-center text-xs font-medium text-slate-600 sm:text-sm">
                Mixers, kettles &amp; cookware for every kitchen.
              </p>
            </Link>

            {/* Center wide card: Home Appliances + countdown */}
            <div className="group relative min-h-[420px] overflow-hidden rounded-[26px] bg-[#EEF2F8] shadow-sm transition-all hover:shadow-lg md:col-span-6 md:min-h-[480px]">
              <img
                src="/images/bevesi/banner-13.jpg"
                alt="Front-load washing machine"
                className="absolute inset-0 h-full w-full object-cover object-right-bottom transition-transform duration-700 group-hover:scale-105"
              />
              <div className="relative z-10 flex h-full max-w-[62%] flex-col justify-between p-6 sm:p-9">
                <div>
                  <p className="font-outfit text-xs font-semibold text-slate-600 sm:text-sm">Home Appliances</p>
                  <h3 className="font-outfit mt-2 text-3xl font-extrabold leading-[1.02] tracking-tight text-[#3B4254] sm:text-[44px]">
                    Upgrade Your Home
                  </h3>
                  <p className="font-outfit mt-3 max-w-[340px] text-xs leading-relaxed text-slate-600 sm:text-sm">
                    Air fryers, vacuums &amp; more. Up to 25% off.
                  </p>
                  <Link
                    to="/products?category=appliances"
                    className="font-outfit mt-5 inline-flex items-center rounded-lg bg-sun-orange px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-sun-orange-600 sm:text-sm"
                  >
                    Shop Now
                  </Link>
                </div>
                <CountdownPills
                  initialDays={37}
                  initialHours={13}
                  initialMinutes={4}
                  initialSeconds={57}
                />
              </div>
            </div>

            {/* Right stacked cards: Small Appliances + Breakfast Corner */}
            <div className="flex flex-col gap-5 md:col-span-3">
              <Link
                to="/products?category=appliances"
                className="group relative min-h-[230px] flex-1 overflow-hidden rounded-[22px] bg-[#F1EFEA] shadow-sm transition-all hover:shadow-lg"
              >
                <img
                  src="/images/bevesi/banner-14.jpg"
                  alt="Air purifier"
                  className="absolute inset-0 h-full w-full object-cover object-bottom transition-transform duration-500 group-hover:scale-105"
                />
                <div className="relative z-10 px-3 pt-4 text-center">
                  <p className="font-outfit text-[11px] font-medium text-[#7A6A8A]">Small Appliances</p>
                  <h3 className="font-outfit mt-0.5 text-lg font-extrabold leading-tight tracking-tight text-[#6F5C86] sm:text-xl">
                    Everyday Essentials
                  </h3>
                  <p className="font-outfit mt-1 text-[11px] font-medium text-[#7A6A8A]/90">
                    Top-rated everyday picks.
                  </p>
                </div>
              </Link>
              <Link
                to="/products?category=appliances"
                className="group relative min-h-[230px] flex-1 overflow-hidden rounded-[22px] bg-[#EEF6EE] shadow-sm transition-all hover:shadow-lg"
              >
                <img
                  src="/images/bevesi/banner-15.jpg"
                  alt="Pastel green toaster"
                  className="absolute inset-0 h-full w-full object-cover object-bottom transition-transform duration-500 group-hover:scale-105"
                />
                <div className="relative z-10 px-3 pt-4 text-center">
                  <p className="font-outfit text-[11px] font-medium text-[#5E7A62]">Breakfast Corner</p>
                  <h3 className="font-outfit mt-0.5 text-lg font-extrabold leading-tight tracking-tight text-[#476A50] sm:text-xl">
                    Toasters &amp; Coffee Makers
                  </h3>
                  <p className="font-outfit mt-1 text-[11px] font-medium text-[#5E7A62]/90">
                    Start your day right.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3F. Product Cards Carousel 3: Home & Kitchen (without tabs)
            ========================================================================= */}
        {homeItems.length > 0 && (
          <div className="reveal">
            <ProductCarouselWithoutTabs
              title="Home & Kitchen"
              categorySlug="home-kitchen"
              products={homeItems}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              isInWishlist={isInWishlist}
            />
          </div>
        )}


        {/* =========================================================================
            4. Brand Spotlight & Official Stores
            ========================================================================= */}
        <BrandSpotlight />

        {/* =========================================================================
            4B. Digital Goods & Software Vault
            ========================================================================= */}
        <DigitalShowcase onAddToCart={handleAddToCart} />



        {/* =========================================================================
            7. Mobile App Promo Banner
            ========================================================================= */}
        <AppPromoSection />
      </div>

      {/* Floating Back-To-Top Button */}
      <BackToTopButton />

      {/* Floating Toast Notification Pill */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-white/50 bg-white/75 px-5 py-3 text-xs font-semibold text-slate-800 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 animate-in fade-in slide-in-from-bottom-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
