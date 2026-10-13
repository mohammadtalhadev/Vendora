import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  DownloadCloud,
  KeyRound,
  Code2,
  Layers,
  ChevronRight,
  CheckCircle2,
  Star,
  FileCheck,
} from 'lucide-react';
import { useCurrency } from '../../../store/currency-store';
import { domainProductToCardItem, type ProductItem } from '../../products';
import { useProducts } from '../../catalog/hooks/useProducts';
import type { Product } from '../../../types/domain';

export interface DigitalShowcaseProps {
  onAddToCart?: (product: ProductItem) => void;
}

/** Decorative card dressing, cycled by position — never a data claim. */
const CARD_PRESETS = [
  {
    badgeColor: 'bg-blue-50 text-blue-700 ring-blue-200/80',
    iconBg: 'from-blue-500 to-indigo-600 shadow-blue-500/25',
    icon: <KeyRound className="h-6 w-6 text-white" />,
  },
  {
    badgeColor: 'bg-purple-50 text-purple-700 ring-purple-200/80',
    iconBg: 'from-purple-500 to-pink-600 shadow-purple-500/25',
    icon: <Layers className="h-6 w-6 text-white" />,
  },
  {
    badgeColor: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
    iconBg: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
    icon: <Code2 className="h-6 w-6 text-white" />,
  },
  {
    badgeColor: 'bg-amber-50 text-amber-800 ring-amber-200/80',
    iconBg: 'from-amber-500 to-orange-600 shadow-orange-500/25',
    icon: <FileCheck className="h-6 w-6 text-white" />,
  },
];

/**
 * Digital Goods vault. The four cards used to be invented products with
 * fabricated download counts that the Buy button injected straight into the
 * real cart (QA frontend-Critical-2). They are now the catalogue's real
 * digital products: title, price, rating and review count all come from the
 * database, and Buy adds that genuine product to the cart.
 */
export const DigitalShowcase: React.FC<DigitalShowcaseProps> = ({ onAddToCart }) => {
  const { formatPrice } = useCurrency();
  const { data } = useProducts({ type: 'digital', page: 1, limit: 4 });

  const products: Product[] = useMemo(() => data?.items ?? [], [data]);

  const handleBuy = (product: Product) => {
    if (!onAddToCart) return;
    onAddToCart(domainProductToCardItem(product));
  };

  if (products.length === 0) return null;

  return (
    <section className="mb-14">
      {/* Frosted Glass Outer Shell with Ambient Color Glows */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/90 bg-white/75 p-6 sm:p-9 backdrop-blur-2xl shadow-xl shadow-slate-900/5 transition-all">
        {/* Soft Ambient Radiance Orbs behind the frosted glass */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 h-64 w-96 rounded-full bg-indigo-300/10 blur-3xl" />

        {/* Header Row */}
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200/70 pb-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl font-outfit">
              Digital Goods &amp; Software Vault
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm max-w-2xl">
              Official genuine OEM licenses, UI design systems, production codebases &amp; cinematic media packs delivered directly to your dashboard in seconds
            </p>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/downloads"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs backdrop-blur-md transition-all hover:border-slate-300 hover:bg-white hover:text-slate-900"
            >
              <DownloadCloud className="h-4 w-4 text-[#FF7A1A]" />
              <span>My Vault</span>
            </Link>
            <Link
              to="/products?category=digital-products"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4.5 py-2.5 text-xs font-bold text-white shadow-md shadow-slate-900/15 transition-all hover:bg-[#FF7A1A] hover:shadow-orange-500/20 active:scale-95"
            >
              <span>Explore All Digital</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Feature Pills Subheader */}
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 border-b border-slate-200/50 pb-5">
          <div className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-slate-700 backdrop-blur-md border border-white/80">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Instant Auto-Key Delivery</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-slate-700 backdrop-blur-md border border-white/80">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
            <span>100% Genuine Encrypted</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-slate-700 backdrop-blur-md border border-white/80">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>48h Escrow Guarantee</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-slate-700 backdrop-blur-md border border-white/80">
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Free Lifetime Redownload</span>
          </div>
        </div>

        {/* 4 Cards Grid - Frosted Glass Luxury Cards */}
        <div className="relative z-10 mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => {
            const preset = CARD_PRESETS[index % CARD_PRESETS.length];
            const compareAt =
              product.compareAtPrice && product.compareAtPrice > product.price
                ? product.compareAtPrice
                : undefined;
            const badge =
              product.digitalAssetInfo?.licenseType || product.brand || product.category;
            const fileType = product.digitalAssetInfo?.fileSizeMb
              ? `${product.digitalAssetInfo.fileSizeMb} MB`
              : 'Digital';
            return (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between rounded-[24px] border border-white/95 bg-white/85 p-5 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-300 hover:bg-white/95 hover:shadow-xl hover:shadow-cyan-500/10"
              >
                <div>
                  {/* Top: Icon + Badge + File Type */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br ${preset.iconBg} shadow-md group-hover:scale-105 transition-transform duration-300`}
                    >
                      {preset.icon}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${preset.badgeColor}`}
                      >
                        {badge}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-mono font-bold text-slate-500">
                        {fileType}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-outfit mt-4 text-sm font-extrabold leading-snug text-slate-900 group-hover:text-[#FF7A1A] transition-colors line-clamp-2">
                    {product.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-[11px] font-medium text-slate-500 line-clamp-1">
                    {product.description}
                  </p>

                  {/* Rating & Reviews */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1 font-bold">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {product.rating}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {product.reviewCount.toLocaleString()} reviews
                    </span>
                  </div>
                </div>

                {/* Pricing & Instant Access Button */}
                <div className="mt-5 border-t border-slate-100 pt-3.5">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-outfit text-lg font-black text-slate-900">
                        {formatPrice(product.price)}
                      </span>
                      {compareAt && (
                        <span className="font-outfit text-xs text-slate-400 line-through">
                          {formatPrice(compareAt)}
                        </span>
                      )}
                    </div>
                    {compareAt && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                        Save {Math.round(((compareAt - product.price) / compareAt) * 100)}%
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBuy(product)}
                    className="cursor-pointer mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#FF7A1A] hover:shadow-md hover:shadow-orange-500/20 active:scale-95"
                  >
                    <DownloadCloud className="h-3.5 w-3.5" />
                    <span>Instant Access</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
