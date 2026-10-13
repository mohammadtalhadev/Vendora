import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ArrowRight,
  Calculator,
  ShieldCheck,
  Clock,
  Zap,
  TrendingUp,
  Package,
  Globe2,
  CheckCircle2,
  Check,
  Star,
  Layers,
  Store,
} from 'lucide-react';



interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  stars: number;
  quote: string;
  statBadge: string;
  categoryBadge: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Marcus Vance',
    role: 'Founder & CEO',
    company: 'NorthTech Performance Footwear',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    stars: 5,
    quote:
      'Migrating to Vendora was the single greatest commercial decision we made this year. We achieved a +420% YoY cross-border volume within 9 months, and having 0% fees during our launch period let us reinvest $84,000 directly into R&D.',
    statBadge: '+420% YoY International Revenue Growth',
    categoryBadge: 'Footwear & Apparel',
  },
  {
    name: 'Elena Rostova',
    role: 'Master Perfumer & Director',
    company: 'Lunation Fragrances',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    stars: 5,
    quote:
      "Vendora's temperature-monitored freight passes the integrity of our fragile scents seamlessly. Payout timing is concrete: we receive our capital the minute regardless of the consumer's local third-party courier partner.",
    statBadge: '< 18 Hrs Average Global Parcel SLA',
    categoryBadge: 'Artisanal Perfumery',
  },
];

export const SellOnVendoraPage: React.FC = () => {
  const navigate = useNavigate();

  // Calculator states
  const [salesSlider, setSalesSlider] = useState(120000);
  const [selectedCategoryRate, setSelectedCategoryRate] = useState(0.15); // 15% default for Electronics
  const [emailInput, setEmailInput] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState(false);

  // Dynamic calculations
  const legacyMarketFeeMonthly = Math.round(salesSlider * selectedCategoryRate);
  const annualSavings = Math.round(legacyMarketFeeMonthly * 3); // savings over first 90 days (3 months)
  const marginBoostPercent = (selectedCategoryRate * 100).toFixed(1);

  const handleClaimFreeTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setSubmittedEmail(true);
    setTimeout(() => setSubmittedEmail(false), 4000);
  };

  return (
    <div className="pb-24">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-10">
        {/* ========================================================================= */}
        {/* 1. Hero Section: Scale Your Brand Across 160+ Countries                   */}
        {/* ========================================================================= */}
        <div className="text-center max-w-4xl mx-auto space-y-5">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/80 dark:border-orange-900/40 dark:bg-orange-950/40 px-4 py-1.5 text-xs font-bold text-[#FF7A1A]">
            <span className="h-2 w-2 rounded-full bg-[#FF7A1A] animate-pulse" />
            0% COMMISSION FOR FIRST 90 DAYS • SBP/SEC COMPLIANT
          </div>

          {/* Headline with Brand Gradient */}
          <h1 className="font-outfit text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Scale Your Brand Across{' '}
            <span className="bg-gradient-to-r from-[#FF7A1A] via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              160+ Countries
            </span>{' '}
            With 0% Commission
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Join over 45,000+ borderless brands and local artisans on Vendora. Access 2.4M+ high-intent shoppers, next-day global logistics, and instant multi-currency settlement.
          </p>

          {/* Hero CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#calculator"
              className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9040] px-7 py-3.5 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <span>Start Selling Today</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>

            <a
              href="#calculator"
              className="w-full sm:w-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <Calculator className="h-4 w-4 text-[#FF7A1A]" aria-hidden="true" />
              <span>Calculate Your Economics</span>
            </a>
          </div>

          {/* 3 Sub-Features */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-6 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              0% Escrow Fee Initial 90 Days
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-purple-500" />
              15-Min Fast Verification
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#FF7A1A]" />
              T+0 Instant Payouts
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. Floating Live Merchant Performance Card (Telemetry Mock)               */}
        {/* ========================================================================= */}
        <div className="mt-12 max-w-4xl mx-auto rounded-3xl border border-white/90 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-outfit font-black text-sm">
                AN
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                    Atelier Nordique • Flagship
                  </h3>
                  <span className="rounded-full bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200/60">
                    Verified Brand
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Nordic Apparel &amp; Lifestyle Guild Hub (KHI / OSLO)</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-3 py-1 border border-emerald-200">
                ● Global Reach Active (Net: 160)
              </span>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1">
                Tier 1 USD / PK
              </span>
            </div>
          </div>

          {/* 3 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Daily Gross Volume</div>
              <div className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                $148,920
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                <TrendingUp className="h-3 w-3" />
                +34.2% from index
              </span>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Dispatched Orders</div>
              <div className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                1,842
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">99.4% on-time dispatch</span>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fraud &amp; Chargeback Rate</div>
              <div className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                0.8%
              </div>
              <span className="text-[11px] font-semibold text-purple-600 mt-0.5 block">Lowest industry tier</span>
            </div>
          </div>

          {/* Hourly Settlement Velocity Wave Chart */}
          <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-outfit font-bold text-slate-700 dark:text-slate-300">
                Hourly Settlement Velocity (Last 24 Hours)
              </span>
              <span className="text-[10px] font-semibold text-[#FF7A1A]">Avg. T+1 Settlement SLA Met</span>
            </div>

            {/* SVG Wave */}
            <div className="h-20 w-full">
              <svg viewBox="0 0 500 80" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF7A1A" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#FF7A1A" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 Q60,65 120,50 T240,40 T360,25 T440,20 T500,10 L500,80 L0,80 Z"
                  fill="url(#velocityGradient)"
                />
                <path
                  d="M0,60 Q60,65 120,50 T240,40 T360,25 T440,20 T500,10"
                  fill="none"
                  stroke="#FF7A1A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="500" cy="10" r="4" fill="#FF7A1A" />
              </svg>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. Section: The Vendora Merchant Edge (4 Bento Cards)                     */}
        {/* ========================================================================= */}
        <div className="mt-24 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
              THE VENDORA MERCHANT EDGE
            </span>
            <h2 className="font-outfit text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
              Engineered for Frictionless High–Scale Commerce
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Modern merchants lose up to 18% of revenue to multi-layered platform fees, delayed payouts, and compounding foreign integrations. Vendora changes the equation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all">
              <div className="space-y-3">
                <div className="h-11 w-11 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FF7A1A] flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                  Hyper–Fast Onboarding
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Get verified and list your catalogue inventory under 15 minutes with automated AI categorizing and multi-language translation.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-[#FF7A1A] flex items-center gap-1">
                <span>ZERO SETUP WAIT</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all">
              <div className="space-y-3">
                <div className="h-11 w-11 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                  Zero Upfront Risk
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  0% platform base rate for your initial 90 days. First-time or gross-merchant tier rates. Retain maximum profit while establishing traction.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-blue-600 flex items-center gap-1">
                <span>RISK EQUALIZATION</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all">
              <div className="space-y-3">
                <div className="h-11 w-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <Package className="h-5 w-5" />
                </div>
                <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                  Express Fulfillment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Two-hour city dispatch network with temperature-controlled logistics freight hubs. 99.8% on-time global delivery time guarantee.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-rose-600 flex items-center gap-1">
                <span>NEXT-DAY DISPATCH</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Card 4 */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all">
              <div className="space-y-3">
                <div className="h-11 w-11 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                  Instant Multi–Settlement
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Automated payouts directly to business banking accounts in PKR, EUR, GBP, USD, or USDT within 24 hours of fulfillment initiation.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-purple-600 flex items-center gap-1">
                <span>T+0 LIQUIDITY CYCLE</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. Section: Projected Margin Model (Calculator Bento)                     */}
        {/* ========================================================================= */}
        <div id="calculator" className="mt-24 rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl p-6 sm:p-10 shadow-xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7A1A]">
                PROJECTED MARGIN MODEL
              </span>
              <h2 className="font-outfit text-xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                Project Your Gross Margin Advantage
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Compare Vendora's zero-commission structure tier and escrow fee advantage against traditional legacy marketplaces.
              </p>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-200">
              <Calculator className="h-3.5 w-3.5" />
              <span>Real-Time Fee Engine</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Form (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-2">
                  <label htmlFor="seller-monthly-sales">Estimated Monthly Sales</label>
                  <span className="font-outfit text-base font-black text-[#FF7A1A]">
                    ${salesSlider.toLocaleString()}
                  </span>
                </div>
                <input
                  id="seller-monthly-sales"
                  type="range"
                  min="10000"
                  max="500000"
                  step="5000"
                  value={salesSlider}
                  onChange={(e) => setSalesSlider(Number(e.target.value))}
                  className="w-full accent-[#FF7A1A] cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mt-1">
                  <span>$10,000 / mo</span>
                  <span>$250,000 / mo</span>
                  <span>$500,000 / mo</span>
                </div>
              </div>

              <div>
                <label htmlFor="seller-merch-category" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Merchandise Category
                </label>
                <select
                  id="seller-merch-category"
                  value={selectedCategoryRate}
                  onChange={(e) => setSelectedCategoryRate(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden"
                >
                  <option value={0.15}>Electronics &amp; Gadgets (Legacy Fee: 15%)</option>
                  <option value={0.18}>Fashion &amp; Apparel (Legacy Fee: 18%)</option>
                  <option value={0.16}>Beauty &amp; Skincare (Legacy Fee: 16%)</option>
                  <option value={0.12}>Home, Decor &amp; Kitchen (Legacy Fee: 12%)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300 font-semibold pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>0% Fee for First 90 Days</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>No Hidden Listing Charges</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Instant Integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Automated Dual Banking</span>
                </div>
              </div>
            </div>

            {/* Right Projected Savings Panel (5 cols) */}
            <div className="lg:col-span-5 rounded-3xl border border-orange-200/80 bg-orange-50/70 dark:border-orange-900/40 dark:bg-orange-950/30 p-6 sm:p-7 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Annual Projected Savings
                </span>
                <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                  First 90 Days
                </span>
              </div>

              <div>
                <div className="font-outfit text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400">
                  +${annualSavings.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Estimated extra retainable selling on Vendora vs traditional legacy commission marketplace.
                </p>
              </div>

              <div className="space-y-2 border-t border-orange-200/60 dark:border-orange-900/60 pt-3 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Legacy Market Take:</span>
                  <span className="font-bold text-rose-600">-${legacyMarketFeeMonthly.toLocaleString()} / mo</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Vendora Welcome Take:</span>
                  <span className="font-bold text-emerald-600">$0 / mo (0%)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-bold">
                  <span>Net Margin Boost:</span>
                  <span className="font-outfit text-slate-900 dark:text-white">+{marginBoostPercent}% (Best Tier)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/become-a-seller')}
                className="w-full rounded-full bg-sun-orange py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:bg-[#EA6C13] transition-all cursor-pointer"
              >
                Start seller application
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. Section: Launch in 3 Painless Steps                                    */}
        {/* ========================================================================= */}
        <div className="mt-24 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
              ONBOARDING PROCESS
            </span>
            <h2 className="font-outfit text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
              Launch in 3 Painless Steps
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Zero complex multi-week merchant audits. Our modern cryptographic identity stack confirms your credentials instantaneously.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
              <span className="absolute -bottom-4 -right-2 font-outfit text-8xl font-black text-slate-100 dark:text-slate-800/30 pointer-events-none select-none">
                01
              </span>
              <div className="space-y-4 relative z-10">
                <div className="h-11 w-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
                    Create Merchant Account
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Submit your store name, primary operating region, along with payment details to receive instant digital KYC verification result.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 relative z-10 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                <span>Navigation Time: 4 Mins</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
              <span className="absolute -bottom-4 -right-2 font-outfit text-8xl font-black text-slate-100 dark:text-slate-800/30 pointer-events-none select-none">
                02
              </span>
              <div className="space-y-4 relative z-10">
                <div className="h-11 w-11 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
                    Sync Your Catalog
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    One-click auto-bridge with Shopify, WooCommerce, Amazon FBA, or upload via CSV/REST API. High-res imagery automatically formatted.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 relative z-10 text-[11px] font-bold text-purple-600 flex items-center gap-1">
                <span>Real-Time SKU Mapping</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
              <span className="absolute -bottom-4 -right-2 font-outfit text-8xl font-black text-slate-100 dark:text-slate-800/30 pointer-events-none select-none">
                03
              </span>
              <div className="space-y-4 relative z-10">
                <div className="h-11 w-11 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
                    Sell &amp; Scale Globally
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Vendora algorithmic discovery highlights your products to 2.4M+ pre-qualified consumers. Full-bay local or swift consignment.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 relative z-10 text-[11px] font-bold text-blue-600 flex items-center gap-1">
                <span>NATIONWIDE DISTRIBUTION</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. Section: Backed By Visionary Founders (2 Testimonials)                 */}
        {/* ========================================================================= */}
        <div className="mt-24 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7A1A]">
              FOUNDER TESTIMONIALS &amp; TRACTION
            </span>
            <h2 className="font-outfit text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
              Backed By Visionary Founders
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Hear how independent manufacturers and premier brands shifted their primary sales channel to our platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="h-12 w-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                    <div>
                      <h4 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                        {t.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {t.role}, {t.company}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{t.quote}"
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <span className="font-bold text-[#FF7A1A]">{t.statBadge}</span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-slate-600 dark:text-slate-300 font-semibold">
                    {t.categoryBadge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 7. Section: Transparent Merchant Tiers (3 Pricing Cards)                  */}
        {/* ========================================================================= */}
        <div className="mt-24 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
              TRANSPARENT MERCHANT TIERS
            </span>
            <h2 className="font-outfit text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
              Simple Economics. No Concealed Penalties.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Every merchant tier includes our 0% 90-day introductory framework. Choose your growth pathway on your terms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Tier 1: Starter */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Starter Merchant
                </span>
                <div className="font-outfit text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  Free
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  For budding craftsmen and independent creators entering the borderless footprint.
                </p>

                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>0% Fee for Initial 90 Days</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>5.0% Standard fee thereafter</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Standard Real-Time Analytics</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Community Merchant Support</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Unlimited SKU Ingestion</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/become-a-seller')}
                className="mt-8 w-full rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 py-3 text-xs font-bold hover:bg-indigo-100 transition-all"
              >
                Enroll as Starter
              </button>
            </div>

            {/* Tier 2: Growth Brand (Highlighted) */}
            <div className="relative rounded-3xl border-2 border-[#FF7A1A] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between -translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#FF7A1A] px-4 py-1 text-[10px] font-black text-white uppercase tracking-wider shadow-md">
                MOST POPULAR MERCHANT CHOICE
              </div>

              <div className="space-y-4 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7A1A]">
                  Growth Brand
                </span>
                <div className="font-outfit text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  $79 <span className="text-xs text-slate-400 font-normal">/ month</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Rapid-scaling lifestyle, tech and fashion brands ready for global velocity.
                </p>

                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-[#FF7A1A] shrink-0" />
                    <span>0% Fee for Initial 90 Days</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-[#FF7A1A] shrink-0" />
                    <span>3.5% Optimized Platform Fee</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-[#FF7A1A] shrink-0" />
                    <span>Priority Prime Category Placement</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-[#FF7A1A] shrink-0" />
                    <span>Dedicated Brand Account Manager</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-[#FF7A1A] shrink-0" />
                    <span>Same-Day Multi-Currency Settlement</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-[#FF7A1A] shrink-0" />
                    <span>T+0 Instant Auto-Commission</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/become-a-seller')}
                className="mt-8 w-full rounded-2xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9040] py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:scale-105 transition-all cursor-pointer"
              >
                Launch Growth Tier
              </button>
            </div>

            {/* Tier 3: Enterprise Global */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Enterprise Global
                </span>
                <div className="font-outfit text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  Custom
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Consortium-scale foreign brands and multi-state distributors doing &gt;$1M/month.
                </p>

                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Sub-2.0% Custom Volume Rate</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Custom ERP &amp; SAP Real-Time Sync</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>99.99% Guarantee Infrastructure SLA</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Dedicated Regional Logistics Hubs</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Custom Domain &amp; Store White-Labeling</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/become-a-seller')}
                className="mt-8 w-full rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 py-3 text-xs font-bold hover:bg-indigo-100 transition-all"
              >
                Contact Enterprise Sales
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 8. Bottom CTA Banner                                                      */}
        {/* ========================================================================= */}
        <div className="mt-24 rounded-3xl border border-white/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl p-8 sm:p-12 shadow-2xl text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 shadow-md">
            <Store className="h-7 w-7" />
          </div>

          <h2 className="font-outfit text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
            Ready to Build Your Digital Commerce Empire?
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            Open your Vendora merchant store in 15 minutes. Start selling to 2.4M+ consumers with zero hidden fees today.
          </p>

          <form onSubmit={handleClaimFreeTier} className="pt-2 max-w-md mx-auto flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your commercial email address"
              className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden focus:border-[#FF7A1A]"
            />
            <button
              type="submit"
              className="rounded-2xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9040] px-6 py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:bg-[#EA6C13] transition-all cursor-pointer whitespace-nowrap"
            >
              Claim 0% Free Tier →
            </button>
          </form>

          {submittedEmail && (
            <div className="text-xs font-bold text-emerald-600 animate-fade-in">
              ✓ Verification invite dispatched to {emailInput}! Check your inbox.
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            No credit card required. Instant KYC domain format anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellOnVendoraPage;
