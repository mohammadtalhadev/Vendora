import React from 'react';
import { Link } from 'react-router-dom';

import {
  ChevronRight,
  ShieldCheck,
  Globe2,
  TrendingUp,
  Zap,
  Leaf,
  Award,
  Package,
  MapPin,
  Lock,
  Compass,
  Truck,
  HeartHandshake,
  Cpu,
  ShoppingBag,
  Store,
} from 'lucide-react';


export const AboutPage: React.FC = () => {
  const leadershipTeam = [
    {
      name: 'Tariq Ali - Manzoor',
      role: 'Co-Founder, Chief Executive Officer',
      badge: 'Co-Founder',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      bio: '"We created Vendora to prove that an e-commerce platform can scale exponentially without extractive fees or broken seller trust."',
      credentials: 'Ex-Regional Head of Marketplaces',
    },
    {
      name: 'Elena Rostova',
      role: 'Chief Experience Officer',
      badge: 'Experience Design',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      bio: '"Every UI element, escrow guarantee, and tracking telemetry node is crafted around radical user transparency."',
      credentials: 'Sustainable Design Pioneer',
    },
    {
      name: 'Zainab Khalid',
      role: 'Head of Trust & Escrow Tech',
      badge: 'Trust & Safety',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
      bio: '"The future of commerce belongs to automated escrow settlements, non-custodial dispute arbitration, and biometric verified couriers."',
      credentials: 'Fintech Escrow Architect',
    },
    {
      name: 'Marcus Vance',
      role: 'VP, Global Merchant Ecosystem',
      badge: 'Merchant Growth',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      bio: '"When independent manufacturers thrive, local economies prosper. We provide the institutional rails they deserve."',
      credentials: 'Global Merchant Community Lead',
    },
  ];

  const milestones = [
    {
      year: '2021',
      title: 'Founded in Karachi & Dubai',
      description: 'Launched with 50 curated consumer tech and audio accessories brand stores; pioneers of 0% base listing fees.',
    },
    {
      year: '2023',
      title: 'Scale to 14,000+ Vendors & 3-Hour Dispatch',
      description: 'Inaugurated dedicated micro-fulfillment hubs across Karachi, Lahore, and Islamabad; introduced sub-6-hour municipal express delivery.',
    },
    {
      year: '2024',
      title: 'Zero-Commission Tier & Global Escrow',
      description: 'Introduced cryptographic escrow protection for buyer deposits and cross-border trade settlements across 160+ territories.',
    },
    {
      year: '2025',
      title: '2.4 Million Active Buyers Reached',
      description: 'Solidifying our position as the fastest-growing multi-vendor marketplace in the Middle East & South Asia.',
    },
  ];

  return (
    <div className="pb-16 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* =========================================================================
            2. Breadcrumbs Strip
           ========================================================================= */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Link to="/" className="hover:text-sun-orange transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">About Vendora</span>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-white">Mission &amp; Creed</span>
        </nav>

        {/* =========================================================================
            3. Hero Section: Empowering Independent Creators
           ========================================================================= */}
        <div className="text-center max-w-4xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/40 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-sun-orange shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-sun-orange animate-pulse" />
            <span>OUR MISSION &amp; CREED</span>
          </div>

          <h1 className="font-outfit text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            Empowering Independent Creators, Brands &amp; Conscious Shoppers Across{' '}
            <span className="bg-gradient-to-r from-sun-orange via-pink-500 to-indigo-600 bg-clip-text text-transparent">
              160+ Countries
            </span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Founded to dismantle monopolistic e-commerce fees and give genuine artisans, high-performance tech brands, and verified merchants direct, fair access to global consumers.
          </p>

          {/* 4 KPI Metric Badges in Frosted Card */}
          <div className="pt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-5 sm:p-7 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="text-center p-2 sm:p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  TOTAL TRANSACTED
                </span>
                <div className="font-outfit text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
                  $450M+
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-sun-orange mt-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>100% Escrow Protected</span>
                </div>
              </div>

              <div className="text-center p-2 sm:p-3 sm:border-l border-slate-200/80 dark:border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  ACTIVE MERCHANTS
                </span>
                <div className="font-outfit text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
                  45,000+
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  <Store className="h-3.5 w-3.5" />
                  <span>Verified Flagship Stores</span>
                </div>
              </div>

              <div className="text-center p-2 sm:p-3 border-t sm:border-t-0 sm:border-l border-slate-200/80 dark:border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  COUNTRIES SERVED
                </span>
                <div className="font-outfit text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
                  160+
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  <Globe2 className="h-3.5 w-3.5" />
                  <span>Markets Served Direct</span>
                </div>
              </div>

              <div className="text-center p-2 sm:p-3 border-t lg:border-t-0 sm:border-l border-slate-200/80 dark:border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  ON-TIME PERFORMANCE
                </span>
                <div className="font-outfit text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
                  99.8%
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Fulfilled SLA Benchmark</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. ARCHITECTURAL PRINCIPLES: The Vendora Operating Philosophy
           ========================================================================= */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/60 dark:border-white/10 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-sun-orange block">
                ARCHITECTURAL PRINCIPLES
              </span>
              <h2 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                The Vendora Operating Philosophy
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
              A modern marketplace built on algorithmic transparency, equitable economics, and cryptographic trust safeguards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Radical 0% Commission Framework */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-6 sm:p-7 shadow-[0_15px_35px_rgba(15,23,42,0.04)] backdrop-blur-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-sun-orange border border-orange-200/80 dark:border-orange-800/40 shadow-xs">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-sun-orange border border-orange-200">
                    Disruptive Economics
                  </span>
                </div>
                <div>
                  <h3 className="font-outfit text-xl font-black text-slate-900 dark:text-white mb-2">
                    Radical 0% Commission Framework
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    We eliminate the exorbitant and rent-seeking 15%–30% platform commissions charged by legacy platforms. By transferring savings directly into superior product quality and fair seller take-home margins, merchants invest into genuine innovation.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Standard Market Take: 15% – 30% Cut</span>
                <span className="text-sun-orange">Vendora Rate: 0% Base Fee</span>
              </div>
            </div>

            {/* Card 2: Cryptographic Escrow & Trust */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-6 sm:p-7 shadow-[0_15px_35px_rgba(15,23,42,0.04)] backdrop-blur-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/40 shadow-xs">
                    <Lock className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-600 border border-blue-200">
                    Zero Counterfeit
                  </span>
                </div>
                <div>
                  <h3 className="font-outfit text-xl font-black text-slate-900 dark:text-white mb-2">
                    Cryptographic Escrow &amp; Trust
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Funds remain securely buffered in escrow vaults until doorstep delivery OTP verification clears without disputes, eliminating risk for buyers while safeguarding verified merchants from fraudulent returns.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>SafeVault™ Escrow Protocol</span>
                <span className="text-blue-600 dark:text-blue-400">100% Anti-Fraud Guarantee</span>
              </div>
            </div>

            {/* Card 3: Hyperlocal Express Logistics */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-6 sm:p-7 shadow-[0_15px_35px_rgba(15,23,42,0.04)] backdrop-blur-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40 shadow-xs">
                    <Truck className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 border border-emerald-200">
                    Near-Zero Carbon
                  </span>
                </div>
                <div>
                  <h3 className="font-outfit text-xl font-black text-slate-900 dark:text-white mb-2">
                    Hyperlocal Express Logistics
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Sub-6 hour intra-city dispatch powered by localized micro-fulfillment hubs strategically placed across Karachi, Lahore, and Rawalpindi/Islamabad, slashing fuel waste while delivering lightning speed.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="text-emerald-600 font-extrabold">-42% Fleet Carbon Emissions</span>
                <span>3–6h SpeedXpert Network</span>
              </div>
            </div>

            {/* Card 4: Global Sourcing, Local Roots */}
            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-6 sm:p-7 shadow-[0_15px_35px_rgba(15,23,42,0.04)] backdrop-blur-xl flex flex-col sm:flex-row gap-5 items-center justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Compass className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-600">
                    Direct Access
                  </span>
                </div>
                <h3 className="font-outfit text-xl font-black text-slate-900 dark:text-white">
                  Global Sourcing, Local Roots
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Bridging artisan workshops from artisan pottery, leathercraft, and consumer electronics direct to urban doorsteps without middleman markups.
                </p>
              </div>
              <div className="relative w-full sm:w-44 h-36 rounded-2xl overflow-hidden shadow-md shrink-0 border border-white/40">
                <img
                  src="https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80"
                  alt="Artisan Craftsmanship"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-2.5">
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">
                    Verified Craft Guild
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. PLANET-FIRST RESPONSIBILITY: Sustainable Logistics & Conscious Trade
           ========================================================================= */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/60 dark:border-white/10 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                PLANET-FIRST RESPONSIBILITY
              </span>
              <h2 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Sustainable Logistics &amp; Conscious Trade
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
              Commerce should empower communities without depleting our environment. Here is our concrete pledge for climate resilience and dignity in all working standards.
            </p>
          </div>

          {/* Featured Metric Card: Carbon-Neutral Last-Mile by 2026 */}
          <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 shadow-[0_15px_35px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-3 py-1 text-[10px] font-black uppercase">
                  <Leaf className="h-3.5 w-3.5" />
                  <span>CARBON-NEUTRAL PLEDGE</span>
                </div>
                <h3 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Carbon–Neutral Last–Mile by 2026
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Transitioning 65% of urban municipal city deliveries to electric three-wheelers and high-efficiency cargo hubs across Karachi, Lahore, Rawalpindi, and regional parcel corridors.
                </p>
              </div>

              {/* Radial Progress Gauge */}
              <div className="flex items-center gap-4 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/30 shrink-0">
                <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-white dark:bg-slate-800 shadow-sm border-4 border-emerald-500">
                  <span className="font-outfit text-base font-black text-emerald-600 dark:text-emerald-400">
                    68%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    FLEET TRANSITION
                  </span>
                  <span className="font-outfit text-sm font-extrabold text-slate-900 dark:text-white">
                    On-Track for 2026 Target
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Environmental Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 p-5 backdrop-blur-xl shadow-xs space-y-2">
              <div className="h-9 w-9 rounded-xl bg-orange-50 text-sun-orange flex items-center justify-center font-bold">
                <Package className="h-4 w-4" />
              </div>
              <h4 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                100% Recyclable Packaging
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All Fulfilled by Vendora (FBV) parcels use biodegradable unbleached cardboard and water-activated paper tape. Zero single-use plastics.
              </p>
            </div>

            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 p-5 backdrop-blur-xl shadow-xs space-y-2">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Zap className="h-4 w-4" />
              </div>
              <h4 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                EV Fleet Partnerships
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Co-subsidizing local courier riders to transition to electric 2-wheelers and solar-battery swap hubs, lowering operational costs.
              </p>
            </div>

            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 p-5 backdrop-blur-xl shadow-xs space-y-2">
              <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Cpu className="h-4 w-4" />
              </div>
              <h4 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                Audio &amp; Tech Take-Back
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Customers receive store trade-in credit for obsolete earphones, DACs, and chargers, diverting e-waste into certified closed-loop recycling.
              </p>
            </div>

            <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 p-5 backdrop-blur-xl shadow-xs space-y-2">
              <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <HeartHandshake className="h-4 w-4" />
              </div>
              <h4 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                Ethical Labor Audits
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Mandatory fair-wage audits across partner logistics hubs and warehousing facilities. 100% of riders are provided medical injury insurance.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. THE LEADERSHIP: Pioneering Fair Commerce
           ========================================================================= */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-sun-orange block">
              THE LEADERSHIP
            </span>
            <h2 className="font-outfit text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
              Pioneering Fair Commerce
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Architects, operators, and engineers united to rebuild global marketplaces on fair foundations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {leadershipTeam.map((leader, index) => (
              <div
                key={index}
                className="group rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)] transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-100">
                    <img
                      src={leader.image}
                      alt={leader.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute bottom-2.5 left-2.5 rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                      {leader.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-outfit text-base font-black text-slate-900 dark:text-white">
                      {leader.name}
                    </h4>
                    <p className="text-[11px] font-bold text-sun-orange mt-0.5">
                      {leader.role}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                    {leader.bio}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                  <Award className="h-3 w-3 text-sun-orange" />
                  <span>{leader.credentials}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            7. Global Logistics Flow & Decentralization Milestones
           ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Direct Cross-Border Flow Map graphic */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-sun-orange block">
                GLOBAL LOGISTICS FLOW
              </span>
              <h3 className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
                Direct Cross–Border Flow
              </h3>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-5 shadow-[0_15px_35px_rgba(15,23,42,0.05)] backdrop-blur-xl">
              {/* Map Graphic with Route Nodes */}
              <div className="relative h-60 rounded-2xl bg-gradient-to-br from-blue-50/80 via-slate-100 to-orange-50/60 dark:from-slate-800 dark:to-slate-900 overflow-hidden border border-slate-200/80 dark:border-white/10 flex items-center justify-center p-4">
                <svg className="absolute inset-0 w-full h-full text-slate-300 dark:text-slate-700 opacity-40" xmlns="http://www.w3.org/2000/svg">
                  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="currentColor" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Simulated Telemetry Curved Flight Lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 200">
                  <path
                    d="M 40 140 Q 150 40 260 90"
                    fill="none"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    className="animate-pulse stroke-sun-orange"
                  />
                  <path
                    d="M 150 40 Q 200 130 260 160"
                    fill="none"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="stroke-aqua"
                  />
                </svg>

                {/* Hub Pins */}
                <div className="absolute left-8 bottom-12 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl shadow-md border border-orange-200 text-center">
                  <div className="flex items-center gap-1 text-[10px] font-black text-sun-orange">
                    <span className="h-1.5 w-1.5 rounded-full bg-sun-orange" />
                    Hub Karachi 01
                  </div>
                </div>

                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl shadow-md border border-cyan-200 text-center">
                  <div className="flex items-center gap-1 text-[10px] font-black text-cyan-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                    Dubai Gateway Hub
                  </div>
                </div>

                <div className="absolute right-6 top-16 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl shadow-md border border-indigo-200 text-center">
                  <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    London Heathrow Hub
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-sun-orange">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Primary Port Axis &amp; MENA Corridor</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sub-48 hour bonded air freight routes seamlessly connect suppliers across South Asia, the GCC, and Western Europe.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Milestones in Decentralization Timeline */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-sun-orange block">
                FOUNDING TIMELINE
              </span>
              <h3 className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
                Milestones in Decentralization
              </h3>
            </div>

            <div className="space-y-3.5">
              {milestones.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 p-5 shadow-xs backdrop-blur-xl flex items-start gap-4 hover:border-orange-200 transition-colors"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-sun-orange border border-orange-200/80 dark:border-orange-800/40 font-outfit font-black text-sm shadow-2xs">
                    '{item.year.slice(2)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-outfit text-sm font-black text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-extrabold text-slate-500">
                        {item.year}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            8. Final CTA Banner: Join the Future of Transparent Commerce
           ========================================================================= */}
        <section className="pt-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-12 text-white shadow-2xl border border-white/10">
            {/* Ambient radiant glow accents */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sun-orange/30 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/30 blur-[110px] pointer-events-none" />

            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="inline-block rounded-full bg-orange-500/20 border border-orange-500/40 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-sun-orange">
                BE PART OF THE SHIFT
              </span>
              <h2 className="font-outfit text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                Join the Future of Transparent, Fair &amp; Sustainable Commerce
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Whether you are an independent manufacturer searching for an equitable marketplace, or a customer who demands authenticity protected by escrow protection.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 px-6 py-3.5 text-xs sm:text-sm font-extrabold shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <ShoppingBag className="h-4 w-4 text-sun-orange" />
                  <span>Explore Products</span>
                </Link>
                <Link
                  to="/become-a-seller"
                  className="inline-flex items-center gap-2 rounded-full bg-sun-orange hover:bg-sun-orange-600 text-white px-6 py-3.5 text-xs sm:text-sm font-extrabold shadow-lg shadow-orange-500/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Store className="h-4 w-4" />
                  <span>Sell on Vendora</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
