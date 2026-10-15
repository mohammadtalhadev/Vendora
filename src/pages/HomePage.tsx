import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
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
import { useLiveRecentlyViewed } from '../features/catalog/recently-viewed';
import {
  SectionHeading,
  DealsStrip,
  RecommendedShelf,
  BrandSpotlight,
  DigitalShowcase,
  AppPromoSection,
  BackToTopButton,
  BannerCta,
} from '../features/home';
import {
  useHeroPortraits,
  useHeroSlides,
} from '../features/home/api/hero-banners';
import type { SiteSection } from '../features/home/api/sections';
import { HomeSectionAnchor } from '../features/home/sections/HomeSections';
import { CategoryTilesSection } from '../features/home/sections/renderers/CategoryTilesSection';
import { TrustStrip } from '../components/common/TrustStrip';
import { Toast } from '../components/common/Toast';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { CategoryPill } from '../components/common/CategoryPill';
import {
  BrandLogoMarquee,
  ELECTRONICS_BRAND_LOGOS,
  BEAUTY_BRAND_LOGOS,
} from '../components/common/BrandLogoMarquee';
import { ViewAllLink } from '../components/common/ViewAllLink';
import { GridSkeleton, Skeleton } from '../components/common/QueryState';
import { useToast } from '../hooks/useToast';


// Hero slides come from the CMS: the published `homepage_hero` banners the
// admin console writes, with the built-in slides as the fallback until one is
// published. See features/home/api/hero-banners.ts.

// The 12 Parent Categories with High-Resolution 2K Thumbnails
const POPULAR_CATEGORIES = [
  { id: 'cat-electronics', name: 'Electronics', image: '/images/categories/cat_electronics_thumb.webp', slug: 'electronics' },
  { id: 'cat-audio', name: 'Audio & Wearables', image: '/images/categories/cat_audio_wearables_thumb.webp', slug: 'audio-wearables' },
  { id: 'cat-cameras', name: 'Cameras & Photo', image: '/images/categories/cat_cameras_photo_thumb.webp', slug: 'cameras-photo' },
  { id: 'cat-fashion', name: 'Fashion', image: '/images/categories/cat_fashion_thumb.webp', slug: 'fashion' },
  { id: 'cat-shoes', name: 'Shoes', image: '/images/categories/cat_shoes_thumb.webp', slug: 'shoes' },
  { id: 'cat-bags', name: 'Bags & Luggage', image: '/images/categories/cat_bags_luggage_thumb.webp', slug: 'bags-luggage' },
  { id: 'cat-jewelry', name: 'Jewelry & Watches', image: '/images/categories/cat_jewelry_watches_thumb.webp', slug: 'jewelry-watches' },
  { id: 'cat-beauty', name: 'Beauty & Personal Care', image: '/images/categories/cat_beauty_personalcare_thumb.webp', slug: 'beauty-personal-care' },
  { id: 'cat-home', name: 'Home & Kitchen', image: '/images/categories/cat_home_kitchen_thumb.webp', slug: 'home-kitchen' },
  { id: 'cat-kids', name: 'Kids & Baby', image: '/images/categories/cat_kids_baby_thumb.webp', slug: 'kids-baby' },
  { id: 'cat-sports', name: 'Sports & Outdoors', image: '/images/categories/cat_sports_outdoors_thumb.webp', slug: 'sports-outdoors' },
  { id: 'cat-digital', name: 'Digital Products', image: '/images/categories/cat_digital_products_thumb.webp', slug: 'digital-products' },
];

/**
 * The built-in category tiles as a section (Batch 85): the tiles row is a
 * console-managed `category-tiles` section, and this synthetic section -
 * the original hard-coded list, unchanged - is what renders until the
 * sections read lands (and whenever it is unavailable).
 */
const FALLBACK_CATEGORY_SECTION: SiteSection = {
  id: 'builtin-popular-categories',
  key: 'popular-categories',
  type: 'category-tiles',
  title: 'Explore Popular Categories',
  settings: {},
  sortOrder: 0,
  isEnabled: true,
  items: POPULAR_CATEGORIES.map((cat, index) => ({
    id: cat.id,
    sectionId: 'builtin-popular-categories',
    imageUrl: cat.image,
    heading: cat.name,
    subtext: '',
    ctaLabel: '',
    ctaLink: `/products?category=${cat.slug}`,
    sortOrder: index + 1,
    isActive: true,
  })),
};

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

/** Page-shaped placeholder for a product rail whose query is still in flight
 * (Batch 47): a heading bar over a card grid, so the section holds its space
 * instead of popping in when the data lands. */
const HomeRailSkeleton: React.FC = () => (
  <div className="mb-14" role="status" aria-label="Loading products">
    <Skeleton className="mb-6 h-8 w-56" />
    <GridSkeleton count={4} />
  </div>
);


export const HomePage: React.FC = () => {
  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  // Scroll reveal for the page's `.reveal` sections and grid items.
  useReveal();


  // Shared toast (Batch 47) — this page used to run its own private pill.
  const { toast, showToast, hideToast } = useToast(3200);

  // Hero Section Carousel state. The slide list can change length when the CMS
  // read lands, so the rendered index is always taken modulo the list.
  const heroSlides = useHeroSlides();
  const heroPortraits = useHeroPortraits();
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const activeHeroIndex = heroSlides.length > 0 ? heroSlideIndex % heroSlides.length : 0;
  const [heroPortraitIndex, setHeroPortraitIndex] = useState(0);
  const activePortraitIndex =
    heroPortraits.length > 0 ? heroPortraitIndex % heroPortraits.length : 0;

  // Section 3: Limited Campaign (Sale Offers by Parent Category)
  // Real catalogue data: one broad fetch, grouped by category and filtered
  // to genuine discounts (compare-at price above price). Only parent
  // categories that actually have products on sale become pills — the ~115
  // hard-coded products this page used to render are gone (QA
  // frontend-Critical-2). Batch 92 (owner point): the pills are the
  // TRENDING parents only — the five categories with the most products on
  // sale, busiest first; ties keep the SALE_CATEGORY_DEFS order.
  const { data: campaignPoolData } = useProducts({ sort: 'featured', page: 1, limit: 100 });

  const parentCategoriesWithSales = useMemo<SaleCategoryWithProducts[]>(() => {
    const pool = campaignPoolData?.items ?? [];
    const withSales = SALE_CATEGORY_DEFS.map((def) => ({
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
    return withSales
      .map((cat, defOrder) => ({ cat, defOrder }))
      .sort((a, b) => b.cat.products.length - a.cat.products.length || a.defOrder - b.defOrder)
      .slice(0, 5)
      .map(({ cat }) => cat);
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
  const { data: electronicsData, isLoading: electronicsLoading } = useProducts({ category: 'electronics', sort: 'best_selling', page: 1, limit: 24 });
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

  const { data: beautyData, isLoading: beautyLoading } = useProducts({ category: 'beauty-personal-care', sort: 'best_selling', page: 1, limit: 20 });
  const beautyItems = useMemo<ProductItem[]>(
    () => (beautyData?.items ?? []).map(domainProductToCardItem),
    [beautyData],
  );

  // Recently Viewed rail: the shopper's own browser-local history,
  // hydrated with the LIVE product rows (stock, price) before it reaches
  // the shared card mapping — a raw snapshot renders its view-time stock
  // (which the snapshot never even recorded, so cards claimed
  // "Out of stock" for products the PDP showed as In Stock).
  const { products: recentlyViewedLive } = useLiveRecentlyViewed();
  const recentlyViewedItems = useMemo<ProductItem[]>(
    () => recentlyViewedLive.map(domainProductToCardItem),
    [recentlyViewedLive],
  );

  const { data: homeData, isLoading: homeLoading } = useProducts({ category: 'home-kitchen', sort: 'best_selling', page: 1, limit: 20 });
  const homeItems = useMemo<ProductItem[]>(
    () => (homeData?.items ?? []).map(domainProductToCardItem),
    [homeData],
  );

  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  // One clock for the whole hero (Batch 96): a single interval advances the
  // main carousel and the portrait rail in the same tick, so the two always
  // switch together, and the shared hover pause stops both. (Two private
  // intervals used to restart at different moments — whenever their own
  // list's CMS read landed — and drift apart.) A side whose list is empty
  // stays put, and a single published portrait stays static.
  useEffect(() => {
    if (isCarouselPaused) return;
    const timer = setInterval(() => {
      if (heroSlides.length > 0) {
        setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
      }
      if (heroPortraits.length > 1) {
        setHeroPortraitIndex((prev) => (prev + 1) % heroPortraits.length);
      }
    }, 6500);
    return () => clearInterval(timer);
  }, [isCarouselPaused, heroSlides.length, heroPortraits.length]);

  const nextHeroSlide = () => {
    setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
  };

  const prevHeroSlide = () => {
    setHeroSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
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
      {/* The page's one h1 (Batch 47). The hero is image-only by the owner's
          decision (Batch 29), so the h1 is visually hidden rather than
          painted over the banners — but the page now has the standard
          single-h1 outline every other storefront page carries. */}
      <h1 className="sr-only">Vendora — Electronics, Beauty, Home &amp; More</h1>
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
        {/* =========================================================================
            1. Hero Featured Carousel & Portrait Rail (Batch 87: back to the
            two planned parts — the slides carousel plus the 9:16 portrait
            carousel. The Batch 85 left-promo column that briefly lived in
            this row is gone; that placement now feeds the left picture of
            the New Arrivals / Best Seller / Best Offers section below.)
            ========================================================================= */}
        <section className="mb-10">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div
              className="relative overflow-hidden rounded-[28px] bg-[#0C1046] shadow-xl group aspect-[16/9] lg:aspect-auto lg:h-full min-h-[260px] sm:min-h-[320px] flex items-center justify-center lg:col-span-9"
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
                    {...(idx === 0
                      ? { fetchPriority: 'high' as const }
                      : { loading: 'lazy' as const, decoding: 'async' as const })}
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

            {/* Right rail: the portrait banners — their own CMS placement
                (homepage_hero_portrait) with a built-in campaign fallback.
                Batch 85: every published banner joins the rail and it
                rotates like the main carousel; a single banner is static.
                Batch 96: the rail's strict 9:16 box is the hero row's height
                driver — neither column self-starts, so on desktop the grid
                stretches the main carousel to the same height while the
                portrait creatives keep their designed ratio. Stacked under
                the carousel on mobile; beside it on desktop. */}
            <div
              className="group relative aspect-[9/16] overflow-hidden rounded-[28px] bg-[#0C1046] shadow-lg lg:col-span-3"
              onMouseEnter={() => setIsCarouselPaused(true)}
              onMouseLeave={() => setIsCarouselPaused(false)}
            >
              {heroPortraits.map((portrait, idx) => (
                <div
                  key={`${portrait.image}-${idx}`}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    activePortraitIndex === idx
                      ? 'opacity-100 z-10'
                      : 'opacity-0 pointer-events-none z-0'
                  }`}
                >
                  <img
                    src={portrait.image}
                    alt={portrait.alt}
                    {...(idx > 0
                      ? { loading: 'lazy' as const, decoding: 'async' as const }
                      : {})}
                    className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  <Link
                    to={portrait.link}
                    className="absolute inset-0 z-20"
                    title={portrait.alt}
                    aria-label={portrait.alt}
                  />
                </div>
              ))}

              {heroPortraits.length > 1 && (
                <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5">
                  {heroPortraits.map((_, idx) => (
                    <button
                      key={`portrait-dot-${idx}`}
                      type="button"
                      onClick={() => setHeroPortraitIndex(idx)}
                      aria-label={`Go to portrait banner ${idx + 1}`}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${
                        activePortraitIndex === idx
                          ? 'h-1.5 w-5 bg-white'
                          : 'h-1.5 w-1.5 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              )}
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
                    : 'h-2 w-2 bg-slate-300 hover:bg-sun-orange/70'
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
            2. Explore Popular Categories - a console-managed section
            (Batch 85): the tiles render from the `category-tiles` section
            the admin owns; the built-in list above is the fallback while
            the sections read is unavailable.
            ========================================================================= */}
        <HomeSectionAnchor
          anchor="categories"
          fallback={<CategoryTilesSection section={FALLBACK_CATEGORY_SECTION} />}
        />

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
              /* Parent category pills: the top 5 trending categories by products on sale */
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {parentCategoriesWithSales.map((cat) => (
                  <CategoryPill
                    key={cat.id}
                    selected={selectedSaleCategory === cat.id}
                    onClick={() => setSelectedSaleCategory(cat.id)}
                  >
                    {cat.name}
                  </CategoryPill>
                ))}
              </div>
            }
            action={
              <ViewAllLink
                to={`/products?category=${currentSaleCategory?.slug || 'electronics'}`}
                className="hidden shrink-0 sm:inline-flex"
              />
            }
          />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {currentSaleCategory?.products.slice(0, 6).map((product) => (
              <div key={product.id} className="reveal h-full">
                <ProductCard
                  product={product}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={isInWishlist(product.id)}
                  showStockUrgency
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
                loading="lazy" decoding="async"
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
                  <BannerCta to="/products?category=electronics" className="mt-5">
                    Shop Electronics
                  </BannerCta>
                </div>
                <CountdownTimer
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
                    loading="lazy" decoding="async"
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
                    loading="lazy" decoding="async"
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
                  loading="lazy" decoding="async"
                  className="absolute bottom-0 right-[6%] h-[92%] w-auto object-contain object-bottom transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
            </div>
          </div>

          {/* Electronics Brand Strip */}
          <div className="mt-8 flex items-center justify-center border-t border-slate-100/80 pt-6 w-full">
            <BrandLogoMarquee
              logos={ELECTRONICS_BRAND_LOGOS}
              label="Official electronics brands"
            />
          </div>
        </section>

        {/* =========================================================================
            3B. Product Cards Carousel 1: Electronics (with sub-category tabs)
            ========================================================================= */}
        {electronicsLoading && electronicsItems.length === 0 && <HomeRailSkeleton />}
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
            3C. Dual Countdown Beauty Promo
            ========================================================================= */}
        <section className="reveal mb-14">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Card 1: Glow Up Your Routine */}
            <div className="group relative min-h-[360px] overflow-hidden rounded-[26px] bg-[#F2F1EF] shadow-sm transition-all hover:shadow-lg sm:min-h-[440px]">
              <img
                src="/images/bevesi/beauty_face_full.jpg"
                alt="Skincare model applying cleanser"
                loading="lazy" decoding="async"
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
                  <BannerCta to="/products?category=beauty" className="mt-5">
                    Shop Beauty
                  </BannerCta>
                </div>
                <CountdownTimer
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
                loading="lazy" decoding="async"
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
                  <BannerCta to="/products?category=beauty" className="mt-5">
                    Shop Beauty
                  </BannerCta>
                </div>
                <CountdownTimer
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
            <BrandLogoMarquee
              logos={BEAUTY_BRAND_LOGOS}
              label="Official beauty brands"
            />
          </div>
        </section>

        {/* =========================================================================
            3D. Product Cards Carousel 2: Beauty & Personal Care (without tabs)
            ========================================================================= */}
        {beautyLoading && beautyItems.length === 0 && <HomeRailSkeleton />}
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
            3D-1B. Recently Viewed — the shopper's own history on this device
            ========================================================================= */}
        {recentlyViewedItems.length > 0 && (
          <section className="reveal mb-14" aria-label="Recently viewed">
            <SectionHeading
              title="Recently Viewed"
              action={
                <ViewAllLink to="/recently-viewed" />
              }
            />
            <div className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar py-1">
              {recentlyViewedItems.map((product) => (
                <div key={product.id} className="w-44 shrink-0 sm:w-52">
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
                loading="lazy" decoding="async"
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
                loading="lazy" decoding="async"
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
                  <BannerCta to="/products?category=appliances" className="mt-5">
                    Shop Now
                  </BannerCta>
                </div>
                <CountdownTimer
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
                  loading="lazy" decoding="async"
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
                  loading="lazy" decoding="async"
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
        {homeLoading && homeItems.length === 0 && <HomeRailSkeleton />}
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
            3G. Inspiration Mosaic - a console-managed section (Batch 85).
            It renders only when an enabled mosaic section exists; the
            seeded one starts disabled, so the page is unchanged until an
            admin turns it on.
            ========================================================================= */}
        <HomeSectionAnchor anchor="mosaic" />

        {/* =========================================================================
            4. Brand Spotlight & Official Stores
            ========================================================================= */}
        <BrandSpotlight />

        {/* =========================================================================
            4B. Digital Goods & Software Vault
            ========================================================================= */}
        <DigitalShowcase
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          isInWishlist={isInWishlist}
        />



        {/* =========================================================================
            7. Mobile App Promo Banner - a console-managed section
            (Batch 85): the promo panel's copy lives in the `promo-banner`
            section's settings; the built-in panel is the fallback while
            the sections read is unavailable.
            ========================================================================= */}
        <HomeSectionAnchor anchor="promo" fallback={<AppPromoSection />} />
      </div>

      {/* Floating Back-To-Top Button */}
      <BackToTopButton />

      {/* Shared toast (Batch 47) — replaces this page's private pill. */}
      <Toast toast={toast} onDismiss={hideToast} />
    </div>
  );
};
