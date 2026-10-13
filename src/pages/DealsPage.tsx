import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Clock,
  ShieldCheck,
  ChevronRight,
  ShoppingCart,
  Check,
  Star,
} from 'lucide-react';
import { useCurrency } from '../store/currency-store';
import { useCartStore } from '../store/cart-store';

interface DealItem {
  id: string;
  title: string;
  category: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  stockSoldPercent: number;
  rating: number;
  reviews: number;
  image: string;
  seller: string;
  dealType: 'flash' | 'clearance' | 'under2k' | 'mega';
}

const DEALS_PRODUCTS: DealItem[] = [
  {
    id: 'deal-1',
    title: 'Ronin R-9 Platinum Edition ANC Wireless Earbuds',
    category: 'Audio',
    price: 4950,
    originalPrice: 8500,
    discountPercent: 42,
    stockSoldPercent: 84,
    rating: 4.8,
    reviews: 1420,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    seller: 'Ronin Official Store',
    dealType: 'flash',
  },
  {
    id: 'deal-2',
    title: 'Faster 20,000mAh PD 65W Laptop & Mobile Power Bank',
    category: 'Charging',
    price: 5200,
    originalPrice: 7900,
    discountPercent: 34,
    stockSoldPercent: 72,
    rating: 4.7,
    reviews: 620,
    image: 'https://images.unsplash.com/photo-1609592807664-42b781df577a?w=600&auto=format&fit=crop&q=80',
    seller: 'Faster Pakistan',
    dealType: 'flash',
  },
  {
    id: 'deal-3',
    title: 'Ultra-Fast 65W GaN Dual USB-C Fast Wall Charger',
    category: 'Power',
    price: 1850,
    originalPrice: 3200,
    discountPercent: 42,
    stockSoldPercent: 91,
    rating: 4.9,
    reviews: 980,
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
    seller: 'VoltCraft PK',
    dealType: 'under2k',
  },
  {
    id: 'deal-4',
    title: 'Anker Soundcore Sport X10 Rotatable Earbuds',
    category: 'Audio',
    price: 9990,
    originalPrice: 15500,
    discountPercent: 35,
    stockSoldPercent: 65,
    rating: 4.8,
    reviews: 430,
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    seller: 'Anker Official',
    dealType: 'mega',
  },
  {
    id: 'deal-5',
    title: 'Braided 100W 2-Meter Fast PD Charging Cable',
    category: 'Accessories',
    price: 950,
    originalPrice: 1800,
    discountPercent: 47,
    stockSoldPercent: 78,
    rating: 4.7,
    reviews: 1250,
    image: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=600&auto=format&fit=crop&q=80',
    seller: 'TechCables PK',
    dealType: 'under2k',
  },
  {
    id: 'deal-6',
    title: 'StudioCraft Solid Walnut Ergonomic Monitor Stand',
    category: 'Workspace',
    price: 6400,
    originalPrice: 9500,
    discountPercent: 33,
    stockSoldPercent: 55,
    rating: 4.9,
    reviews: 310,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80',
    seller: 'StudioCraft Nordique',
    dealType: 'clearance',
  },
];

type DealTab = 'all' | 'flash' | 'under2k' | 'mega' | 'clearance';

const DEAL_TABS: ReadonlyArray<{ id: DealTab; label: string }> = [
  { id: 'all', label: '🔥 All Deals' },
  { id: 'flash', label: '⚡ Flash Drops' },
  { id: 'under2k', label: '🏷️ Under Rs. 2,000' },
  { id: 'mega', label: '💎 Mega Savings (30%+)' },
  { id: 'clearance', label: '📦 Clearance Vault' },
];

export const DealsPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { addItem } = useCartStore();
  const [activeTab, setActiveTab] = useState<DealTab>('all');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Countdown timer simulation (Hours, Minutes, Seconds)
  const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 24, seconds: 48 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAddToCart = (deal: DealItem) => {
    addItem({
      id: deal.id,
      productId: deal.id,
      title: deal.title,
      price: deal.price,
      compareAtPrice: deal.originalPrice,
      maxStock: 25,
      image: deal.image,
      sellerId: 'deals-store',
      sellerName: deal.seller,
      sellerType: 'vendor',
      type: 'physical',
    });
    setAddedIds((prev) => ({ ...prev, [deal.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [deal.id]: false }));
    }, 1500);
  };

  const filteredDeals = activeTab === 'all'
    ? DEALS_PRODUCTS
    : DEALS_PRODUCTS.filter((d) => d.dealType === activeTab);

  const handleTabListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const ids = DEAL_TABS.map((tab) => tab.id);
    const index = ids.indexOf(activeTab);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % ids.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + ids.length) % ids.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = ids.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = ids[nextIndex];
    setActiveTab(next);
    document.getElementById(`deals-tab-${next}`)?.focus();
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-[#FF7A1A]/20 selection:text-[#FF7A1A] pb-24">
      {/* Radiant ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-28 w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-[#FED7AA]/60 via-[#FFEDD5]/65 to-[#FED7AA]/35 blur-[130px] dark:from-[#FF7A1A]/10 pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-[#CFFAFE]/70 via-[#F1F5F9]/80 to-[#FFEDD5]/50 blur-[140px] dark:from-[#00B8C8]/10 pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-[620px] h-[620px] rounded-full bg-gradient-to-tr from-[#FFEDD5]/70 via-[#CFFAFE]/50 to-[#F1F5F9] blur-[130px] dark:from-[#FF7A1A]/5 pointer-events-none" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-12 pt-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-[#FF7A1A] transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">Daily Flash Deals &amp; Discounts</span>
        </nav>

        {/* Hero Banner with Countdown Timer */}
        <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-gradient-to-r from-orange-500 via-rose-500 to-[#FF7A1A] p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-black uppercase tracking-wider">
                <Flame className="h-4 w-4 text-amber-300" aria-hidden="true" />
                <span>Super Savings • Up to 50% Off</span>
              </div>
              <h1 className="font-outfit text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Today's Flash Deals &amp; Mega Drops
              </h1>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                Direct factory-priced deals with full State Bank escrow safety. Funds released to merchants only after you inspect the unboxed parcel.
              </p>
            </div>

            {/* Countdown Box */}
            <div role="timer" aria-live="off" aria-label="Time remaining in this deals window" className="rounded-2xl bg-black/30 backdrop-blur-xl border border-white/20 p-5 shrink-0 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>Ends In</span>
              </div>
              <div className="flex items-center justify-center gap-2 font-mono font-black text-2xl sm:text-3xl">
                <div className="bg-black/40 rounded-xl px-3 py-1.5">
                  {String(timeLeft.hours).padStart(2, '0')}
                  <span className="block text-[9px] font-sans font-bold text-white/60 tracking-wider">HRS</span>
                </div>
                <span>:</span>
                <div className="bg-black/40 rounded-xl px-3 py-1.5">
                  {String(timeLeft.minutes).padStart(2, '0')}
                  <span className="block text-[9px] font-sans font-bold text-white/60 tracking-wider">MIN</span>
                </div>
                <span>:</span>
                <div className="bg-black/40 rounded-xl px-3 py-1.5 text-amber-400">
                  {String(timeLeft.seconds).padStart(2, '0')}
                  <span className="block text-[9px] font-sans font-bold text-white/60 tracking-wider">SEC</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Deal categories"
          onKeyDown={handleTabListKeyDown}
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3 shadow-sm"
        >
          {DEAL_TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`deals-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="deals-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  selected
                    ? 'bg-[#FF7A1A] text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Deals Grid */}
        <div
          id="deals-panel"
          role="tabpanel"
          aria-labelledby={`deals-tab-${activeTab}`}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredDeals.map((deal) => {
            const isAdded = !!addedIds[deal.id];
            return (
              <div
                key={deal.id}
                className="group rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-xl hover:border-[#FF7A1A]/40 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Image with discount badge */}
                  <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4">
                    <img
                      src={deal.image}
                      alt={deal.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Discount Tag */}
                    <div className="absolute top-3 left-3 rounded-full bg-rose-600 text-white px-2.5 py-1 text-[11px] font-black tracking-wider uppercase shadow-md">
                      -{deal.discountPercent}% OFF
                    </div>
                    {/* Escrow Badge */}
                    <div className="absolute bottom-3 left-3 rounded-full bg-black/50 backdrop-blur-md text-white px-2.5 py-0.5 text-[10px] font-bold border border-white/20 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                      <span>Escrow Safe</span>
                    </div>
                  </div>

                  {/* Brand & Category */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>{deal.seller}</span>
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="h-3 w-3 fill-amber-400" aria-hidden="true" />
                      {deal.rating} ({deal.reviews})
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-outfit text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 mb-3">
                    {deal.title}
                  </h3>

                  {/* Pricing */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="font-outfit text-xl font-black text-rose-600">
                      {formatPrice(deal.price)}
                    </span>
                    <span className="font-outfit text-xs text-slate-400 line-through">
                      {formatPrice(deal.originalPrice)}
                    </span>
                  </div>

                  {/* Sold Stock Progress Bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Claimed: {deal.stockSoldPercent}%</span>
                      <span className="text-rose-500 font-bold">Almost Sold Out!</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                        style={{ width: `${deal.stockSoldPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Add to Cart button */}
                <button
                  type="button"
                  onClick={() => handleAddToCart(deal)}
                  aria-live="polite"
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold transition-all cursor-pointer ${
                    isAdded
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                      : 'bg-[#FF7A1A] hover:bg-[#EA6C13] text-white shadow-md shadow-orange-500/25 active:scale-95'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      <span>Added to Bag!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                      <span>Claim This Deal</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
