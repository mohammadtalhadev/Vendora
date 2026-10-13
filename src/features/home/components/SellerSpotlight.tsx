import React from 'react';
import { Link } from 'react-router-dom';
import { Store, Star, ShieldCheck, TrendingUp, ChevronRight, Rocket, Sparkles } from 'lucide-react';
/**
 * Display shape for a spotlighted seller. Defined here (it previously lived in the
 * deleted legacy store) — a parent feeding this component maps real
 * vendor_profiles data into it.
 */
export interface MarketplaceVendor {
  id: string;
  storeName: string;
  category: string;
  subdomain: string;
  ownerName: string;
  countryCode: string;
  email: string;
  kycStatus: 'Verified' | 'Pending Review' | 'Investigation';
  performanceTier: 'Tier 1 Elite' | 'Tier 2 Verified' | 'Tier 3 Standard';
  revenue: number;
  revenueFormatted: string;
  trend: string;
  trendType: 'positive' | 'neutral' | 'frozen';
  status: 'active' | 'suspended';
  commissionRate: number;
  rating: number;
  reviewCount: number;
  joinedDate: string;
}

export interface SellerSpotlightProps {
  vendors: MarketplaceVendor[];
}

export const SellerSpotlight: React.FC<SellerSpotlightProps> = ({ vendors }) => {
  if (vendors.length === 0) return null;

  return (
    <section className="mb-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Meet Top Verified Sellers</h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            KYC-verified flagship stores powering the Vendora marketplace
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {vendors.map((vendor) => (
          <Link
            key={vendor.id}
            to={`/vendors/${encodeURIComponent(vendor.id)}`}
            className="group flex flex-col rounded-[22px] border border-white/80 bg-white/70 p-4.5 backdrop-blur-md shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-orange-200/80 hover:bg-white/95 hover:shadow-lg hover:shadow-orange-500/5"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0C1046] to-[#312E81] text-white shadow-sm">
                <Store className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50/90 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200/70">
                <ShieldCheck className="h-3 w-3" /> {vendor.kycStatus}
              </span>
            </div>
            <p className="mt-3 text-sm font-extrabold tracking-tight text-slate-900 group-hover:text-sun-orange transition-colors line-clamp-1">
              {vendor.storeName}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{vendor.category}</p>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {vendor.rating.toFixed(2)}
                <span className="font-medium text-slate-400">({vendor.reviewCount.toLocaleString()})</span>
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                <TrendingUp className="h-3 w-3" /> {vendor.trend}
              </span>
            </div>
            <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-slate-100/80 px-2.5 py-1 text-[10px] font-bold text-slate-600 group-hover:bg-orange-50 group-hover:text-sun-orange transition-colors">
              Visit store <ChevronRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>

      {/* Become a Seller CTA banner (High-contrast, crystal clear typography) */}
      <div className="relative mt-8 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-gradient-to-br from-orange-50/90 via-white/85 to-cyan-50/75 dark:from-slate-900/90 dark:via-slate-800/80 dark:to-slate-900/90 backdrop-blur-2xl p-6 sm:p-8 shadow-xl sm:flex-row sm:items-center">
        {/* Top Multi-tone Accent Stripe */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sun-orange via-aqua to-lemon" />

        {/* Ambient Glowing Orbs inside CTA */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <div className="absolute -left-10 bottom-0 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -right-6 -top-10 h-44 w-44 rounded-full bg-sun-orange/25 blur-3xl" />
        </div>

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/80 bg-white/90 dark:bg-orange-950/40 px-3 py-1 text-[10px] font-bold text-sun-orange shadow-2xs">
            <Sparkles className="h-3 w-3 text-sun-orange" />
            <span>SELL ON VENDORA</span>
          </div>
          <h3 className="font-outfit text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
            Turn your store into a nationwide brand
          </h3>
          <p className="max-w-[580px] text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Flat 7–9% commission, bi-weekly payouts, escrow-protected orders and a full seller dashboard. Join 4,800+ verified sellers.
          </p>
        </div>

        <Link
          to="/become-a-seller"
          className="relative z-10 inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-sun-orange to-[#FF9040] hover:from-sun-orange-600 hover:to-sun-orange px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95"
        >
          <Rocket className="h-4 w-4" />
          <span>Start selling today</span>
        </Link>
      </div>
    </section>
  );
};
