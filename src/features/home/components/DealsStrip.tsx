import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard, type ProductItem } from '../../products';

export interface DealsStripProps {
  onAddToCart?: (product: ProductItem) => void;
  onToggleWishlist?: (product: ProductItem) => void;
  isInWishlist?: (id: string) => boolean;
}

// 8 Best Sellers for the 4x2 grid
const BEST_SELLER_PRODUCTS: ProductItem[] = [
  {
    id: 'bs-sony-wh',
    title: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
    category: 'AUDIO',
    price: 298.0,
    compareAtPrice: 399.99,
    discountPercent: 25,
    rating: 4.9,
    reviewCount: 1420,
    stock: 18,
    maxStock: 30,
    sellerId: 'sony-official',
    sellerName: 'Sony Official Store',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/bevesi/1-13.jpg',
  },
  {
    id: 'bs-airpods-max',
    title: 'Apple AirPods Max Wireless Over-Ear Active Noise Cancellation',
    category: 'AUDIO',
    price: 499.0,
    compareAtPrice: 549.0,
    discountPercent: 9,
    rating: 4.9,
    reviewCount: 950,
    stock: 14,
    maxStock: 30,
    sellerId: 'apple-flagship',
    sellerName: 'Apple Authorized Partner',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/airpods_max_pink.png',
  },
  {
    id: 'bs-hype-sneaker',
    title: 'Pulse Runner V3 Cushioned Breathable Athletic Sneaker',
    category: 'FASHION',
    price: 89.0,
    compareAtPrice: 120.0,
    discountPercent: 26,
    rating: 4.88,
    reviewCount: 640,
    stock: 18,
    maxStock: 45,
    sellerId: 'urban-kicks',
    sellerName: 'Urban Kicks Official',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_hype_sneaker.jpg',
  },
  {
    id: 'bs-lumina-cream',
    title: 'Coastal Glow Bio-Hydra Night Treatment Peptide Cream 50ml',
    category: 'BEAUTY',
    price: 36.0,
    compareAtPrice: 48.0,
    discountPercent: 25,
    rating: 4.88,
    reviewCount: 1680,
    stock: 32,
    maxStock: 80,
    sellerId: 'lumina-lab',
    sellerName: 'Lumina Skincare Lab',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_lumina_cream.jpg',
  },
  {
    id: 'bs-titanium-phone',
    title: 'iPhone 15 Pro Max 256GB Natural Titanium Unlocked',
    category: 'ELECTRONICS',
    price: 1199.0,
    compareAtPrice: 1299.0,
    discountPercent: 8,
    rating: 4.92,
    reviewCount: 4210,
    stock: 19,
    maxStock: 40,
    sellerId: 'apple-flagship',
    sellerName: 'Apple Authorized Partner',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/iphone_15_pro_natural.png',
  },
  {
    id: 'bs-gold-watch',
    title: 'Chronograph Classic Gold Bezel Automatic Sapphire Watch',
    category: 'JEWELRY',
    price: 210.0,
    compareAtPrice: 280.0,
    discountPercent: 25,
    rating: 4.94,
    reviewCount: 780,
    stock: 8,
    maxStock: 25,
    sellerId: 'geneva-horology',
    sellerName: 'Geneva Horology',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_gold_watch.jpg',
  },
  {
    id: 'bs-glow-lamp',
    title: 'Aura Minimalist Warm LED Magnetic Ambient Bedside Lamp',
    category: 'HOME',
    price: 49.5,
    compareAtPrice: 65.0,
    discountPercent: 24,
    rating: 4.82,
    reviewCount: 512,
    stock: 25,
    maxStock: 50,
    sellerId: 'nordic-living',
    sellerName: 'Nordic Living Co',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_glow_lamp.jpg',
  },
  {
    id: 'bs-leather-bag',
    title: 'Artisan Heritage Full-Grain Italian Leather Crossbody Satchel',
    category: 'FASHION',
    price: 135.0,
    compareAtPrice: 180.0,
    discountPercent: 25,
    rating: 4.93,
    reviewCount: 380,
    stock: 11,
    maxStock: 30,
    sellerId: 'cuir-studio',
    sellerName: 'Cuir Studio',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_leather_bag.jpg',
  },
];

// 8 New Arrivals
const NEW_ARRIVALS_PRODUCTS: ProductItem[] = [
  {
    id: 'na-anker-buds',
    title: 'Soundcore by Anker Life P3 Noise Cancelling Earbuds',
    category: 'AUDIO',
    price: 49.99,
    compareAtPrice: 79.99,
    discountPercent: 38,
    rating: 4.8,
    reviewCount: 920,
    stock: 12,
    maxStock: 50,
    sellerId: 'anker-official',
    sellerName: 'Anker Official Flagship',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/bevesi/1-13.jpg',
  },
  {
    id: 'na-smart-watch',
    title: 'Apex Fit Pro AMOLED Rugged Smartwatch with GPS',
    category: 'AUDIO',
    price: 54.0,
    compareAtPrice: 99.0,
    discountPercent: 45,
    rating: 4.7,
    reviewCount: 310,
    stock: 9,
    maxStock: 35,
    sellerId: 'platform',
    sellerName: 'Vendora Direct',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_smart_watch.jpg',
  },
  {
    id: 'na-amber-serum',
    title: 'Pure Amber Niacinamide + HA Radiance Glow Serum 30ml',
    category: 'BEAUTY',
    price: 28.5,
    compareAtPrice: 38.0,
    discountPercent: 25,
    rating: 4.85,
    reviewCount: 1420,
    stock: 22,
    maxStock: 60,
    sellerId: 'lumina-lab',
    sellerName: 'Lumina Skincare Lab',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_amber_serum.jpg',
  },
  {
    id: 'na-pampas-vase',
    title: 'Nordic Fluted Matte Ceramic Donut Vase with Pampas Stems',
    category: 'HOME',
    price: 32.0,
    compareAtPrice: 45.0,
    discountPercent: 29,
    rating: 4.83,
    reviewCount: 430,
    stock: 22,
    maxStock: 60,
    sellerId: 'nordic-living',
    sellerName: 'Nordic Living Co',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_pampas_vase.jpg',
  },
  {
    id: 'na-cashmere-sweater',
    title: '100% Pure Mongolian Cashmere Ribbed Crewneck Knit Sweater',
    category: 'FASHION',
    price: 115.0,
    compareAtPrice: 160.0,
    discountPercent: 28,
    rating: 4.86,
    reviewCount: 390,
    stock: 16,
    maxStock: 35,
    sellerId: 'atelier-wool',
    sellerName: 'Atelier Wool',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_cashmere_sweater.jpg',
  },
  {
    id: 'na-jade-roller',
    title: 'Xiuyan Natural Dual-Ended Facial Jade Roller & Gua Sha Kit',
    category: 'BEAUTY',
    price: 19.99,
    compareAtPrice: 28.0,
    discountPercent: 29,
    rating: 4.79,
    reviewCount: 910,
    stock: 35,
    maxStock: 80,
    sellerId: 'zen-beauty',
    sellerName: 'Zen Glow Organics',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_jade_roller.jpg',
  },
  {
    id: 'na-luxury-perfume',
    title: 'Oud Noir & Amberwood Eau De Parfum Intense 100ml',
    category: 'BEAUTY',
    price: 68.0,
    compareAtPrice: 95.0,
    discountPercent: 28,
    rating: 4.91,
    reviewCount: 840,
    stock: 20,
    maxStock: 50,
    sellerId: 'parfum-royale',
    sellerName: 'Parfum Royale',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_luxury_perfume.jpg',
  },
  {
    id: 'na-silver-headphones',
    title: 'AeroTune Studio Pro Over-Ear Wireless Hi-Res Audio Headphones',
    category: 'AUDIO',
    price: 189.0,
    compareAtPrice: 240.0,
    discountPercent: 21,
    rating: 4.9,
    reviewCount: 1120,
    stock: 14,
    maxStock: 40,
    sellerId: 'platform',
    sellerName: 'Vendora Direct',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_silver_headphones.jpg',
  },
];

// 8 Best Offers
const BEST_OFFERS_PRODUCTS: ProductItem[] = [
  {
    id: 'bo-ronin-powerbank',
    title: 'Ronin R-970 30000mAh 65W Super Fast PD Power Bank',
    category: 'ELECTRONICS',
    price: 34.5,
    compareAtPrice: 59.0,
    discountPercent: 42,
    rating: 4.9,
    reviewCount: 1420,
    stock: 7,
    maxStock: 40,
    sellerId: 'ronin-pk',
    sellerName: 'Ronin Official Store',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/bevesi/1-14.jpg',
  },
  {
    id: 'bo-anker-buds',
    title: 'Soundcore by Anker Life P3 Noise Cancelling Earbuds',
    category: 'AUDIO',
    price: 49.99,
    compareAtPrice: 79.99,
    discountPercent: 38,
    rating: 4.8,
    reviewCount: 920,
    stock: 12,
    maxStock: 50,
    sellerId: 'anker-official',
    sellerName: 'Anker Official Flagship',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/bevesi/1-13.jpg',
  },
  {
    id: 'bo-smart-watch',
    title: 'Apex Fit Pro AMOLED Rugged Smartwatch with GPS & Bluetooth Call',
    category: 'AUDIO',
    price: 54.0,
    compareAtPrice: 99.0,
    discountPercent: 45,
    rating: 4.7,
    reviewCount: 310,
    stock: 9,
    maxStock: 35,
    sellerId: 'platform',
    sellerName: 'Vendora Direct',
    sellerType: 'platform',
    type: 'physical',
    image: '/images/products/prod_smart_watch.jpg',
  },
  {
    id: 'bo-lumina-cream',
    title: 'Coastal Glow Bio-Hydra Peptide Replenishing Night Cream 50ml',
    category: 'BEAUTY',
    price: 24.0,
    compareAtPrice: 48.0,
    discountPercent: 50,
    rating: 4.9,
    reviewCount: 480,
    stock: 15,
    maxStock: 60,
    sellerId: 'glow-organics',
    sellerName: 'Lumina Skincare Lab',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_lumina_cream.jpg',
  },
  {
    id: 'bo-hype-sneaker',
    title: 'Pulse Runner V3 Cushioned Breathable Athletic Sneaker',
    category: 'FASHION',
    price: 69.0,
    compareAtPrice: 120.0,
    discountPercent: 42,
    rating: 4.88,
    reviewCount: 640,
    stock: 18,
    maxStock: 45,
    sellerId: 'urban-kicks',
    sellerName: 'Urban Kicks Official',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_hype_sneaker.jpg',
  },
  {
    id: 'bo-leather-bag',
    title: 'Artisan Heritage Full-Grain Italian Leather Everyday Crossbody',
    category: 'FASHION',
    price: 99.0,
    compareAtPrice: 180.0,
    discountPercent: 45,
    rating: 4.93,
    reviewCount: 380,
    stock: 11,
    maxStock: 30,
    sellerId: 'cuir-studio',
    sellerName: 'Cuir Studio',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_leather_bag.jpg',
  },
  {
    id: 'bo-glow-lamp',
    title: 'Aura Minimalist Warm LED Magnetic Levitation Ambient Bedside Lamp',
    category: 'HOME',
    price: 39.0,
    compareAtPrice: 65.0,
    discountPercent: 40,
    rating: 4.82,
    reviewCount: 512,
    stock: 25,
    maxStock: 50,
    sellerId: 'nordic-living',
    sellerName: 'Nordic Living Co',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_glow_lamp.jpg',
  },
  {
    id: 'bo-jade-roller',
    title: 'Xiuyan Natural Dual-Ended Facial Jade Roller & Gua Sha Kit',
    category: 'BEAUTY',
    price: 14.99,
    compareAtPrice: 28.0,
    discountPercent: 46,
    rating: 4.79,
    reviewCount: 910,
    stock: 35,
    maxStock: 80,
    sellerId: 'zen-beauty',
    sellerName: 'Zen Glow Organics',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_jade_roller.jpg',
  },
];

export const DealsStrip: React.FC<DealsStripProps> = ({
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
}) => {
  const [activeTab, setActiveTab] = useState<'best-sellers' | 'new-arrivals' | 'best-offers'>('best-sellers');
  const [timeLeft, setTimeLeft] = useState({ hours: 20, minutes: 45, seconds: 9 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDigits = (n: number) => n.toString().padStart(2, '0');

  const products =
    activeTab === 'best-sellers'
      ? BEST_SELLER_PRODUCTS
      : activeTab === 'new-arrivals'
      ? NEW_ARRIVALS_PRODUCTS
      : BEST_OFFERS_PRODUCTS;

  return (
    <section className="mb-14">
      {/* Top Centered Section Tabs matching the user screenshot */}
      <div className="mb-7 flex items-center justify-center gap-6 sm:gap-10 border-b border-slate-200/80 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('new-arrivals')}
          className={`cursor-pointer font-outfit text-base sm:text-lg font-bold transition-all ${
            activeTab === 'new-arrivals'
              ? 'text-[#0C1046] border-b-2 border-[#FF7A1A] pb-3 -mb-[17px] font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          New Arrivals
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('best-sellers')}
          className={`cursor-pointer font-outfit text-base sm:text-lg font-bold transition-all ${
            activeTab === 'best-sellers'
              ? 'text-[#0C1046] border-b-2 border-[#FF7A1A] pb-3 -mb-[17px] font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Best Seller
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('best-offers')}
          className={`cursor-pointer font-outfit text-base sm:text-lg font-bold transition-all ${
            activeTab === 'best-offers'
              ? 'text-[#0C1046] border-b-2 border-[#FF7A1A] pb-3 -mb-[17px] font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Best Offers
        </button>
      </div>

      {/* Main Grid: Left Tall Promo Card + Right 4x2 Grid of Standard ProductCards */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        {/* Left Column: Tall Promo Card with Countdown */}
        <div className="group relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-[26px] bg-black p-6 sm:p-7 text-white shadow-lg lg:col-span-3">
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />

          {/* Top: Limited time only + Countdown Pills */}
          <div className="relative z-10 text-center">
            <p className="font-outfit text-xs font-semibold text-slate-300">Limited time only!</p>
            <div className="mt-3 flex items-center justify-center gap-1.5 font-mono">
              <span className="rounded-xl bg-white px-3 py-1.5 text-base font-black text-slate-900 shadow-sm">
                {formatDigits(timeLeft.hours)}
              </span>
              <span className="font-black text-white text-lg">:</span>
              <span className="rounded-xl bg-white px-3 py-1.5 text-base font-black text-slate-900 shadow-sm">
                {formatDigits(timeLeft.minutes)}
              </span>
              <span className="font-black text-white text-lg">:</span>
              <span className="rounded-xl bg-white px-3 py-1.5 text-base font-black text-slate-900 shadow-sm">
                {formatDigits(timeLeft.seconds)}
              </span>
            </div>
          </div>

          {/* Middle: Hero Graphic Preview */}
          <div className="relative z-10 my-auto flex items-center justify-center py-4">
            <img
              src="/images/bevesi/art_elec_phones.png"
              alt="Limited drop smartphones and audio"
              className="max-h-56 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          {/* Bottom: Campaign Title + Subtitle + Shop Now */}
          <div className="relative z-10 text-center">
            <h3 className="font-outfit text-2xl font-black tracking-tight text-white sm:text-[26px]">
              Tech Fest 2026
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              Up to 45% off Flagship Devices
            </p>
            <Link
              to="/deals"
              className="mt-4 inline-flex items-center justify-center gap-1 font-outfit text-sm font-bold text-[#FF7A1A] hover:underline"
            >
              <span>Shop Now</span>
            </Link>
          </div>
        </div>

        {/* Right Column: 4 Columns x 2 Rows (8 Standard ProductCards) */}
        <div className="lg:col-span-9">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={onAddToCart || (() => {})}
                onToggleWishlist={onToggleWishlist || (() => {})}
                isWishlisted={isInWishlist ? isInWishlist(p.id) : false}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
