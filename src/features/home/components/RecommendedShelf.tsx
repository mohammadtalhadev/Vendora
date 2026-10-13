import React, { useState } from 'react';
import { Sparkles, History } from 'lucide-react';
import { ProductCard, type ProductItem } from '../../products';

export interface RecommendedShelfProps {
  onAddToCart?: (product: ProductItem) => void;
  onToggleWishlist?: (product: ProductItem) => void;
  isInWishlist?: (id: string) => boolean;
}

const RECOMMENDED_ITEMS: ProductItem[] = [
  {
    id: 'rec-hype-sneaker',
    title: 'Pulse Runner V3 Cushioned Breathable Athletic Sneaker - Snow White',
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
    id: 'rec-leather-bag',
    title: 'Artisan Heritage Full-Grain Italian Leather Everyday Crossbody Satchel',
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
  {
    id: 'rec-glow-lamp',
    title: 'Aura Minimalist Warm LED Magnetic Levitation Ambient Bedside Lamp',
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
    id: 'rec-silver-headphones',
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
  {
    id: 'rec-luxury-perfume',
    title: 'Oud Noir & Amberwood Eau De Parfum Intense 100ml Unisex Signature',
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
];

const RECENTLY_VIEWED_ITEMS: ProductItem[] = [
  {
    id: 'rv-gold-watch',
    title: 'Chronograph Classic Gold Bezel Automatic Sapphire Glass Watch',
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
    id: 'rv-cashmere-sweater',
    title: '100% Pure Mongolian Cashmere Ribbed Crewneck Knit Sweater Oat',
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
    id: 'rv-diamond-necklace',
    title: 'Solitaire Brilliant Lab Diamond 18K Solid White Gold Pendant Chain',
    category: 'JEWELRY',
    price: 340.0,
    compareAtPrice: 450.0,
    discountPercent: 24,
    rating: 4.97,
    reviewCount: 220,
    stock: 5,
    maxStock: 15,
    sellerId: 'aurum-fine',
    sellerName: 'Aurum Fine Jewels',
    sellerType: 'vendor',
    type: 'physical',
    image: '/images/products/prod_diamond_necklace.jpg',
  },
  {
    id: 'rv-jade-roller',
    title: 'Xiuyan Natural Dual-Ended Facial Jade Roller & Gua Sha Sculpting Kit',
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
    id: 'rv-pampas-vase',
    title: 'Nordic Fluted Matte Ceramic Donut Vase with Natural Pampas Stems',
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
];

export const RecommendedShelf: React.FC<RecommendedShelfProps> = ({
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
}) => {
  const [activeTab, setActiveTab] = useState<'recommended' | 'recent'>('recommended');

  const items = activeTab === 'recommended' ? RECOMMENDED_ITEMS : RECENTLY_VIEWED_ITEMS;

  return (
    <section className="mb-14">
      {/* Header and Pill Toggle */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/10 text-[#FF7A1A]">
              {activeTab === 'recommended' ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <History className="h-4 w-4" />
              )}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF7A1A]">
              Personalized Discovery
            </span>
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl font-outfit">
            {activeTab === 'recommended' ? 'Curated Picks For You' : 'Your Recently Viewed Items'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {activeTab === 'recommended'
              ? 'Realtime suggestions adapted to your browsing tastes and preferences'
              : 'Pick up right where you left off from your current shopping session'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-2xl bg-slate-200/60 p-1 backdrop-blur-xs">
          <button
            type="button"
            onClick={() => setActiveTab('recommended')}
            className={`cursor-pointer flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'recommended'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#FF7A1A]" />
            Recommended For You
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={`cursor-pointer flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'recent'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5 text-slate-500" />
            Recently Viewed
          </button>
        </div>
      </div>

      {/* Grid of Recommended Products using standard ProductCard */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            product={item}
            onAddToCart={onAddToCart || (() => {})}
            onToggleWishlist={onToggleWishlist || (() => {})}
            isWishlisted={isInWishlist ? isInWishlist(item.id) : false}
          />
        ))}
      </div>
    </section>
  );
};
