import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

import {
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Star,
  Check,
} from 'lucide-react';

import { useToast } from '../hooks/useToast';

import { Toast } from '../components/common/Toast';


export const AffiliatePage: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();

  // Earnings Estimator States
  const [monthlyClicks, setMonthlyClicks] = useState<number>(25000);
  const [avgOrderValue, setAvgOrderValue] = useState<number>(85);
  const [categoryRate, setCategoryRate] = useState<number>(0.16); // matches the first published category row

  // Interactive FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Application Form State
  const [handleInput, setHandleInput] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Dynamic calculated earnings
  const calculatedEarnings = useMemo(() => {
    // Standard e-commerce conversion: ~4.5% conversion of clicks into orders
    const estimatedOrders = monthlyClicks * 0.045;
    const grossMerchandise = estimatedOrders * avgOrderValue;
    const commission = grossMerchandise * categoryRate;
    return Math.round(commission);
  }, [monthlyClicks, avgOrderValue, categoryRate]);

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim()) {
      showToast('Please enter your email or social media handle', 'error');
      return;
    }
    setIsSubmitted(true);
    showToast(`Creator application received for ${handleInput}! Fast-track approval code sent.`, 'success');
  };

  const selectCategoryRate = (cat: { title: string; rate: string; rateNum: number }) => {
    setCategoryRate(cat.rateNum);
    showToast(`Selected ${cat.title} (${cat.rate}) for potential calculation`);
  };

  const categoryRates = [
    {
      title: 'Audio & Wearables',
      sub: 'Hi-Fi Earbuds, Studio Monitors, Smart Straps',
      rate: '14% – 18%',
      rateNum: 0.16,
      badge: 'TOP TIER',
      badgeColor: 'text-[#FF7A1A] bg-orange-50 border-orange-200',
    },
    {
      title: 'Beauty & Skincare',
      sub: 'Organic Serums, Dermatologic, Luxury Scents',
      rate: '12% – 15%',
      rateNum: 0.135,
      badge: 'POPULAR',
      badgeColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
    {
      title: 'Smart Home & Tech',
      sub: 'Swift Chargers, Deco-Displays, Hubs, Ambient Lighting',
      rate: '8% – 12%',
      rateNum: 0.10,
      badge: 'GROWING',
      badgeColor: 'text-rose-600 bg-rose-50 border-rose-200',
    },
    {
      title: 'Lifestyle & Kitchen',
      sub: 'Cast-Iron Sets, Modern Utensils, Aerators',
      rate: '10% – 14%',
      rateNum: 0.12,
      badge: 'TRENDING',
      badgeColor: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      title: 'Hardware & Gaming',
      sub: 'Custom Mech-Keyboards, Condensers, GPUs',
      rate: '5% – 8%',
      rateNum: 0.065,
      badge: 'HIGH TICKET',
      badgeColor: 'text-blue-600 bg-blue-50 border-blue-200',
    },
  ];

  const testimonials = [
    {
      name: 'Hamza Nasir',
      role: 'Tech & Audio Reviewer • 212K Subs',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      quote:
        '"Vendora\'s 60-day cookie and instant sample dispatch make affiliate recommendations frictionless. Made over $14k last month alone."',
    },
    {
      name: 'Sarah Jenkins',
      role: 'Clean Beauty & Skincare Enthusiast',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
      quote:
        '"No software sub-tiers and zero payout quarantine. Conversion rate jumped from 1.7% to 5.2% after switching to smart storefronts."',
    },
    {
      name: 'Rayan Tariq',
      role: 'Custom PC Build & Desk Setup Creator',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      quote:
        '"Weekly auto-deposits directly into my bank without hidden fees. Hands down easily the most reliable creator engine I have tested."',
    },
  ];

  const faqs = [
    {
      q: 'Who qualifies for the Vendora Creator Collective?',
      a: 'Any content creator, reviewer, publisher, or curator with an active engaged presence across YouTube, TikTok, Instagram, Substack, or dedicated blogs. We do not require massive follower minimums; we prioritize audience trust and authentic recommendations.',
    },
    {
      q: 'How does the 60-day cookie tracking work?',
      a: 'When a customer clicks your custom deep-link, a secure 60-day tracking cookie is registered. Even if the customer does not purchase immediately, any items they buy on Vendora over the next two months will be attributed to your payout ledger.',
    },
    {
      q: 'When and how do I receive my commission payouts?',
      a: 'Commissions are deposited every Wednesday directly to your connected bank account via IBAN transfer, Stripe Connect, or Payoneer. There is zero payout delay or invoice waiting period.',
    },
    {
      q: 'Can I promote products if I live outside Pakistan / selected countries?',
      a: 'Yes! Vendora ships internationally across 160+ countries. Creators worldwide can link products, earn in USD or local currency, and receive international wire payouts.',
    },
    {
      q: 'Are there minimum payout thresholds?',
      a: 'Our threshold is just $25 / PKR 5,000. Once your cleared balance crosses this modest amount, funds are disbursed on the immediate next Wednesday payout cycle automatically.',
    },
  ];

  return (
    <div className="pb-16 pt-4 sm:pt-6">
      {toast && <Toast toast={toast} onDismiss={hideToast} />}

      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Link to="/" className="hover:text-[#FF7A1A] transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
          <Link to="/become-a-seller" className="hover:text-[#FF7A1A] transition-colors">
            Sell on Vendora
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">Affiliate &amp; Creator Program</span>
        </nav>

        {/* Hero Section: Left Copy + Right Telemetry Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/40 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#FF7A1A] shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-[#FF7A1A] animate-pulse" />
              <span>VENDORA CREATOR COLLECTIVE • EARN UP TO 18% COMMISSION</span>
            </div>

            <h1 className="font-outfit text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
              Turn Your Curated Taste into{' '}
              <span className="bg-gradient-to-r from-[#FF7A1A] via-pink-500 to-indigo-600 bg-clip-text text-transparent">
                Scalable Revenue
              </span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Join thousands of content creators, tech reviewers, and lifestyle tastemakers monetizing authenticated gear directly with real-time payout ledgers and 60-day cookie tracking.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#creator-apply"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF7A1A] to-[#EA580C] px-6 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-orange-500/25 hover:from-[#EA580C] hover:to-[#C2410C] transition-all cursor-pointer hover:shadow-orange-500/35 active:scale-[0.98]"
              >
                <span>Apply for Creator Access</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#commission-rates"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 px-6 py-3.5 text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <span>Explore Commission Rates</span>
              </a>
            </div>

            {/* 4 Quick Stat Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 p-3 text-center backdrop-blur-xl">
                <div className="font-outfit text-xl font-black text-slate-900 dark:text-white">$2.8M+</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Paid to Creators</div>
              </div>
              <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 p-3 text-center backdrop-blur-xl">
                <div className="font-outfit text-xl font-black text-[#FF7A1A]">Up to 18%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Category Rates</div>
              </div>
              <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 p-3 text-center backdrop-blur-xl">
                <div className="font-outfit text-xl font-black text-indigo-600 dark:text-indigo-400">60 Days</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Attribution Window</div>
              </div>
              <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 p-3 text-center backdrop-blur-xl">
                <div className="font-outfit text-xl font-black text-emerald-600 dark:text-emerald-400">Weekly</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Automated Payouts</div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Creator Telemetry Card */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-7 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl space-y-5">
              {/* Card Header: Creator Handle + Active Pill */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#FF7A1A] to-[#FFA057] flex items-center justify-center text-white font-black text-sm">
                    CF
                  </div>
                  <div>
                    <h4 className="font-outfit text-sm font-black text-slate-900 dark:text-white">
                      @creator.smartfinds.live
                    </h4>
                    <span className="text-[10px] text-slate-400">Real-Time Telemetry Dashboard</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              {/* 30-Day Earnings & Conversion Metric */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    30-Day Revenue
                  </span>
                  <div className="font-outfit text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    $14,840.20
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 mt-0.5 block">
                    +22.4% vs last month
                  </span>
                </div>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Visitor Conversion
                  </span>
                  <div className="font-outfit text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    4.8%
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                    Industry Avg: 1.7%
                  </span>
                </div>
              </div>

              {/* SVG Sparkline Graph */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>Earnings Trajectory</span>
                  <span>Last 30 Days</span>
                </div>
                <div className="h-20 w-full rounded-2xl bg-gradient-to-t from-orange-50/80 via-transparent to-transparent p-1 flex items-end">
                  <svg className="w-full h-16" viewBox="0 0 300 70">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF7A1A" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#FF7A1A" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 60 Q 50 45 100 50 T 200 25 T 300 10 L 300 70 L 0 70 Z"
                      fill="url(#chartGrad)"
                    />
                    <path
                      d="M 0 60 Q 50 45 100 50 T 200 25 T 300 10"
                      fill="none"
                      stroke="#FF7A1A"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>
              </div>

              {/* Recent Commissions Ticker */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  RECENT COMMISSIONS
                </span>
                <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">Sony Alpha a7 IV Mirrorless</span>
                  </div>
                  <span className="font-outfit font-black text-emerald-600">+$140.50</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">Acoustic Series 2 Mini Prism</span>
                  </div>
                  <span className="font-outfit font-black text-emerald-600">+$88.40</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Industry-Leading Category Rates */}
        <section id="commission-rates" className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FF7A1A] block">
              UNMATCHED MONETIZATION
            </span>
            <h2 className="font-outfit text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              Industry–Leading Category Rates
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Earn competitive percentage revenue on all customer checkouts without payout caps across fully authenticated SKUs.
            </p>
          </div>

          <div role="radiogroup" aria-label="Commission rate category used by the earnings estimator" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {categoryRates.map((cat, i) => (
              <div
                key={i}
                role="radio"
                aria-checked={categoryRate === cat.rateNum}
                tabIndex={categoryRate === cat.rateNum ? 0 : -1}
                onClick={() => selectCategoryRate(cat)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectCategoryRate(cat);
                  }
                }}
                className={`rounded-3xl border p-5 backdrop-blur-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                  categoryRate === cat.rateNum
                    ? 'border-[#FF7A1A] bg-orange-50/60 dark:bg-orange-950/30'
                    : 'border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75'
                }`}
              >
                <div className="space-y-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${cat.badgeColor}`}>
                    {cat.badge}
                  </span>
                  <h4 className="font-outfit text-sm font-black text-slate-900 dark:text-white">
                    {cat.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {cat.sub}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="font-outfit text-2xl font-black text-[#FF7A1A]">
                    {cat.rate}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Commission / Sale</span>
                </div>
              </div>
            ))}
          </div>

          {/* VIP Privileges Bar */}
          <div className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-5 backdrop-blur-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h5 className="font-outfit text-sm font-extrabold text-slate-900 dark:text-white">
                  Creator Collective VIP Privileges
                </h5>
                <p className="text-xs text-slate-500">
                  All approved partners unlock dedicated sample request access and custom landing pages.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Dedicated Affiliate Manager
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Exclusive 10% Promo Codes
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Real-Time API Insights
              </span>
            </div>
          </div>
        </section>

        {/* Section: Three Simple Steps to Monetize */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FF7A1A] block">
              THREE SIMPLE STEPS TO MONETIZE
            </span>
            <h2 className="font-outfit text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              From First Click to Weekly Payout
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Designed specifically to integrate effortlessly into YouTube descriptions, newsletter recommendations, and community channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-6 backdrop-blur-xl shadow-xs space-y-3">
              <div className="font-outfit text-3xl font-black text-orange-400/60">01</div>
              <h4 className="font-outfit text-lg font-black text-slate-900 dark:text-white">
                Join &amp; Get Verified
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Instant fast-track vetting for creators with active audiences on YouTube, TikTok, or tech/lifestyle communities. Documentation takes under 5 minutes.
              </p>
            </div>

            <div className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-6 backdrop-blur-xl shadow-xs space-y-3">
              <div className="font-outfit text-3xl font-black text-indigo-400/60">02</div>
              <h4 className="font-outfit text-lg font-black text-slate-900 dark:text-white">
                Curate &amp; Deep-Link
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Generate customized AFF links, 1-click storefronts, and discount bundle codes with automated 60-day cookie retention.
              </p>
            </div>

            <div className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-6 backdrop-blur-xl shadow-xs space-y-3">
              <div className="font-outfit text-3xl font-black text-rose-400/60">03</div>
              <h4 className="font-outfit text-lg font-black text-slate-900 dark:text-white">
                Get Paid Weekly
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Commission funds deposit directly into your connected local bank account, Stripe Connect, or Payoneer. Zero commission cuts.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Loved by Content Tastemakers */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FF7A1A] block">
              CREATOR SPOTLIGHT
            </span>
            <h2 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Loved by Content Tastemakers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Discover why genuine product reviewers and digital influencers choose Vendora over traditional affiliate networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-6 backdrop-blur-xl shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-[#FF7A1A]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                    {t.quote}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <h5 className="font-outfit text-xs font-black text-slate-900 dark:text-white">
                      {t.name}
                    </h5>
                    <span className="text-[10px] text-slate-400">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Interactive Earnings Estimator */}
        <section className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-10 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl space-y-8">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FF7A1A] block">
                EARNINGS ESTIMATOR
              </span>
              <h3 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Calculate Your Potential
              </h3>
              <p className="text-xs text-slate-500">
                Estimate your monthly payout based on community clicks &amp; average cart basket sizes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Sliders on Left */}
              <div className="md:col-span-7 space-y-6">
                {/* Monthly Clicks Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <label htmlFor="affiliate-monthly-clicks" className="text-slate-700 dark:text-slate-300">Estimated Monthly Clicks:</label>
                    <span className="font-outfit font-black text-[#FF7A1A] text-sm">
                      {monthlyClicks.toLocaleString()}
                    </span>
                  </div>
                  <input
                    id="affiliate-monthly-clicks"
                    type="range"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={monthlyClicks}
                    onChange={(e) => setMonthlyClicks(Number(e.target.value))}
                    className="w-full accent-[#FF7A1A] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>1,000</span>
                    <span>50,000</span>
                    <span>100,000</span>
                  </div>
                </div>

                {/* Average Order Value Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <label htmlFor="affiliate-order-value" className="text-slate-700 dark:text-slate-300">Average Order Value (AOV):</label>
                    <span className="font-outfit font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      ${avgOrderValue}
                    </span>
                  </div>
                  <input
                    id="affiliate-order-value"
                    type="range"
                    min="20"
                    max="200"
                    step="5"
                    value={avgOrderValue}
                    onChange={(e) => setAvgOrderValue(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>$20</span>
                    <span>$100</span>
                    <span>$200</span>
                  </div>
                </div>

                {/* Category Focus Selector */}
                <div className="space-y-1.5">
                  <label htmlFor="affiliate-category-focus" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Primary Category Focus:
                  </label>
                  <select
                    id="affiliate-category-focus"
                    value={categoryRate}
                    onChange={(e) => setCategoryRate(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#FF7A1A] cursor-pointer"
                  >
                    <option value={0.16}>Audio &amp; Wearables (16% Avg Rate)</option>
                    <option value={0.135}>Beauty &amp; Personal Care (13.5% Avg Rate)</option>
                    <option value={0.10}>Smart Home &amp; Tech (10% Avg Rate)</option>
                    <option value={0.12}>Lifestyle &amp; Kitchen (12% Avg Rate)</option>
                    <option value={0.065}>Hardware &amp; Gaming (6.5% Avg Rate)</option>
                  </select>
                </div>
              </div>

              {/* Calculated Output Box on Right */}
              <div className="md:col-span-5 bg-gradient-to-br from-orange-50/90 to-amber-50/70 dark:from-slate-800 dark:to-slate-900 p-6 rounded-3xl border border-orange-200/80 dark:border-orange-500/20 text-center space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  ESTIMATED MONTHLY EARNINGS
                </span>
                <div className="font-outfit text-4xl sm:text-5xl font-black text-[#FF7A1A]">
                  ${calculatedEarnings.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 leading-tight">
                  Est. Completed Orders: <strong className="text-slate-800 dark:text-slate-200">{Math.round(monthlyClicks * 0.045)}/mo</strong>
                  <br />
                  Attribution Window: <strong className="text-slate-800 dark:text-slate-200">60 Days Lock</strong>
                </div>

                <a
                  href="#creator-apply"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF7A1A] to-[#EA580C] px-5 py-3 text-xs font-black text-white shadow-md shadow-orange-500/25 hover:from-[#EA580C] hover:to-[#C2410C] transition-all cursor-pointer"
                >
                  <span>Claim Your Creator Code</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Frequently Asked Questions */}
        <section className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FF7A1A] block">
              CREATOR FAQ
            </span>
            <h2 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-500">
              Everything you need to know about tracking, payout terms, store beta eligibility, and sample seeding.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`creator-faq-panel-${i}`}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer hover:bg-orange-50/20"
                >
                  <span className="font-outfit text-sm font-extrabold text-slate-900 dark:text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                      openFaq === i ? 'rotate-180 text-[#FF7A1A]' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div id={`creator-faq-panel-${i}`} className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section: Ready to Build Your Creator Empire on Vendora? */}
        <section id="creator-apply" className="pt-2">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF7A1A] via-[#EA580C] to-[#C2410C] p-8 sm:p-12 text-white shadow-2xl">
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                FAST 24-HOUR APPROVAL
              </span>
              <h2 className="font-outfit text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                Ready to Build Your Creator Empire on Vendora?
              </h2>
              <p className="text-xs sm:text-sm text-orange-100 leading-relaxed">
                Start earning up to 18% on thousands of authenticated gadgets, sound gear, and everyday lifestyle essentials today.
              </p>

              <form onSubmit={handleApplySubmit} className="flex flex-col sm:flex-row gap-2.5 pt-2 max-w-md">
                <input
                  id="creator-handle"
                  type="text"
                  required
                  aria-label="Email or social media handle"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  placeholder="Enter your email or social media handle..."
                  className="flex-1 rounded-2xl bg-white text-slate-900 px-4 py-3 text-xs placeholder:text-slate-400 focus:outline-none shadow-md font-semibold"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  {isSubmitted ? 'Submitted!' : 'Get Started Now'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AffiliatePage;
