import React from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { PolicyShell } from '../components/common/PolicyShell';
import {
  STANDARD_DELIVERY_BUSINESS_DAYS,
  formatDeliveryRange,
} from '../lib/delivery-estimate';

import {
  ShieldCheck,
  Globe2,
  TrendingUp,
  Zap,
  Leaf,
  Package,
  MapPin,
  Compass,
  Truck,
  HeartHandshake,
  Cpu,
  ShoppingBag,
  Store,
} from 'lucide-react';


export const AboutPage: React.FC = () => {
  useReveal();

  const milestones = [
    {
      year: '2021',
      title: 'Founded in Karachi & Dubai',
      description: 'Launched with 50 consumer tech and audio accessories stores, with 0% base listing fees.',
    },
    {
      year: '2023',
      title: 'Fulfilment Hubs in Three Cities',
      description: 'Inaugurated dedicated micro-fulfilment hubs across Karachi, Lahore, and Islamabad, with municipal express delivery.',
    },
    {
      year: '2024',
      title: 'Buyer Protection & the Dispute Desk',
      description:
        'Introduced a structured dispute flow on every order: raise a case from the order, exchange evidence with the seller, and the Vendora team reviews the full record before any refund is decided.',
    },
    {
      year: '2025',
      title: 'A Growing Buyer Community',
      description: 'Continued growth across Pakistan, with new seller categories joining the marketplace.',
    },
  ];

  return (
    <PolicyShell
      eyebrow="Our Mission & Creed"
      title={
        <>
          Empowering Independent Creators, Brands &amp; Shoppers Across{' '}
          <span className="text-sun-orange">Pakistan</span>
        </>
      }
      intro={
        <p>
          Founded to give artisans, tech brands, and verified merchants a fairer way to sell — without the heavy fees of legacy e-commerce platforms.
        </p>
      }
      bodyClassName="space-y-12"
    >

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'BUYER PROTECTION', value: 'Dispute Desk', icon: ShieldCheck, note: 'On every order', noteClass: 'text-sun-orange' },
            { label: 'SELLER FEES', value: 'Published', icon: Store, note: 'One public fee schedule', noteClass: 'text-indigo-600' },
            { label: 'DELIVERY', value: 'Nationwide', icon: Globe2, note: 'Across Pakistan', noteClass: 'text-emerald-600' },
            { label: 'SUPPORT', value: 'Human', icon: Zap, note: 'Help for Buyers & Sellers', noteClass: 'text-rose-600' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-2xs sm:p-6"
            >
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                {stat.label}
              </span>
              <div className="mt-1 font-outfit text-2xl font-black text-slate-900 sm:text-3xl">
                {stat.value}
              </div>
              <div className={`mt-1 flex items-center justify-center gap-1 text-xs font-bold ${stat.noteClass}`}>
                <stat.icon className="h-3.5 w-3.5" />
                <span>{stat.note}</span>
              </div>
            </div>
          ))}
        </div>

        {/* =========================================================================
            4. ARCHITECTURAL PRINCIPLES: The Vendora Operating Philosophy
           ========================================================================= */}
        <section className="reveal space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-sun-orange block">
                ARCHITECTURAL PRINCIPLES
              </span>
              <h2 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900">
                The Vendora Operating Philosophy
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg leading-relaxed">
              A modern marketplace built on transparency, fair economics, and a dispute desk that reviews every case on its record.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Published, Category-Based Commission */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-sun-orange border border-orange-200/80 shadow-xs">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-sun-orange border border-orange-200">
                    Disruptive Economics
                  </span>
                </div>
                <div>
                  <h3 className="font-outfit text-lg font-black text-slate-900 mb-2">
                    Published, Category-Based Commission
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Legacy platforms take 15%–30% of every sale. Vendora charges one category-based commission and publishes the whole schedule, so sellers can see exactly what selling costs before they list.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Legacy platforms: 15% – 30%</span>
                <span className="text-sun-orange">Vendora Rate: Published per category</span>
              </div>
            </div>

            {/* Card 3: Nationwide Standard Delivery */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-xs">
                    <Truck className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-600 border border-emerald-200">
                    Near-Zero Carbon
                  </span>
                </div>
                <div>
                  <h3 className="font-outfit text-lg font-black text-slate-900 mb-2">
                    Nationwide Standard Delivery
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Sellers dispatch from their own stores and workshops across Pakistan. Standard delivery takes {formatDeliveryRange(STANDARD_DELIVERY_BUSINESS_DAYS)} nationwide, and every package carries its own tracking from dispatch to your door.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="text-emerald-600 font-extrabold">Standard window: {formatDeliveryRange(STANDARD_DELIVERY_BUSINESS_DAYS)}</span>
                <span>Per-package tracking</span>
              </div>
            </div>

            {/* Card 4: Global Sourcing, Local Roots */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 flex flex-col sm:flex-row gap-5 items-center justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Compass className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-purple-600">
                    Direct Access
                  </span>
                </div>
                <h3 className="font-outfit text-lg font-black text-slate-900">
                  Global Sourcing, Local Roots
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
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
                  <span className="text-xs font-black text-white uppercase tracking-wider">
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
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/60 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 block">
                PLANET-FIRST RESPONSIBILITY
              </span>
              <h2 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900">
                Sustainable Logistics &amp; Conscious Trade
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg leading-relaxed">
              Commerce should empower communities without depleting our environment. Here is our concrete pledge for climate resilience and dignity in all working standards.
            </p>
          </div>

          {/* Featured Metric Card: Carbon-Neutral Last-Mile by 2026 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-600 px-3 py-1 text-xs font-black uppercase">
                  <Leaf className="h-3.5 w-3.5" />
                  <span>CARBON-NEUTRAL PLEDGE</span>
                </div>
                <h3 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900">
                  Carbon–Neutral Last–Mile by 2026
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Transitioning 65% of urban municipal city deliveries to electric three-wheelers and high-efficiency cargo hubs across Karachi, Lahore, Rawalpindi, and regional parcel corridors.
                </p>
              </div>

              {/* Radial Progress Gauge */}
              <div className="flex items-center gap-4 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/70 shrink-0">
                <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-white shadow-sm border-4 border-emerald-500">
                  <span className="font-outfit text-base font-black text-emerald-600">
                    68%
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-500 block">
                    FLEET TRANSITION
                  </span>
                  <span className="font-outfit text-sm font-extrabold text-slate-900">
                    On-Track for 2026 Target
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Environmental Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2">
              <div className="h-9 w-9 rounded-xl bg-orange-50 text-sun-orange flex items-center justify-center font-bold">
                <Package className="h-4 w-4" />
              </div>
              <h4 className="font-outfit text-sm font-bold text-slate-900">
                100% Recyclable Packaging
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                All Fulfilled by Vendora (FBV) parcels use biodegradable unbleached cardboard and water-activated paper tape. Zero single-use plastics.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Zap className="h-4 w-4" />
              </div>
              <h4 className="font-outfit text-sm font-bold text-slate-900">
                EV Fleet Partnerships
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Co-subsidizing local courier riders to transition to electric 2-wheelers and solar-battery swap hubs, lowering operational costs.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2">
              <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Cpu className="h-4 w-4" />
              </div>
              <h4 className="font-outfit text-sm font-bold text-slate-900">
                Audio &amp; Tech Take-Back
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Customers receive store trade-in credit for obsolete earphones, DACs, and chargers, diverting e-waste into certified closed-loop recycling.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2">
              <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <HeartHandshake className="h-4 w-4" />
              </div>
              <h4 className="font-outfit text-sm font-bold text-slate-900">
                Ethical Labor Audits
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mandatory fair-wage audits across partner logistics hubs and warehousing facilities. 100% of riders are provided medical injury insurance.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            7. Global Logistics Flow & Decentralization Milestones
           ========================================================================= */}
        <section className="reveal grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Direct Cross-Border Flow Map graphic */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-sun-orange block">
                LOGISTICS FLOW
              </span>
              <h3 className="font-outfit text-2xl font-black text-slate-900">
                Direct Cross–Border Flow
              </h3>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs">
              {/* Map Graphic with Route Nodes */}
              <div className="relative h-60 rounded-2xl bg-gradient-to-br from-blue-50/80 via-slate-100 to-orange-50/60 overflow-hidden border border-slate-200/80 flex items-center justify-center p-4">
                <svg className="absolute inset-0 w-full h-full text-slate-300 opacity-40" xmlns="http://www.w3.org/2000/svg">
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
                <div className="absolute left-8 bottom-12 bg-white px-2.5 py-1 rounded-xl shadow-md border border-orange-200 text-center">
                  <div className="flex items-center gap-1 text-xs font-black text-sun-orange">
                    <span className="h-1.5 w-1.5 rounded-full bg-sun-orange" />
                    Hub Karachi 01
                  </div>
                </div>

                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white px-2.5 py-1 rounded-xl shadow-md border border-cyan-200 text-center">
                  <div className="flex items-center gap-1 text-xs font-black text-cyan-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                    Dubai Gateway Hub
                  </div>
                </div>

                <div className="absolute right-6 top-16 bg-white px-2.5 py-1 rounded-xl shadow-md border border-indigo-200 text-center">
                  <div className="flex items-center gap-1 text-xs font-black text-indigo-600">
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
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sub-48 hour bonded air freight routes connect suppliers across South Asia, the GCC, and Western Europe.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Milestones in Decentralization Timeline */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-sun-orange block">
                FOUNDING TIMELINE
              </span>
              <h3 className="font-outfit text-2xl font-black text-slate-900">
                Milestones in Decentralization
              </h3>
            </div>

            <div className="space-y-3.5">
              {milestones.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs flex items-start gap-4 hover:border-orange-200 transition-colors"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-sun-orange border border-orange-200/80 font-outfit font-black text-sm shadow-2xs">
                    '{item.year.slice(2)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-outfit text-sm font-black text-slate-900">
                        {item.title}
                      </h4>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold text-slate-500">
                        {item.year}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
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
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 sm:p-12 text-white shadow-2xs">
            {/* Ambient radiant glow accents */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sun-orange/30 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/30 blur-[110px] pointer-events-none" />

            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="inline-block rounded-full bg-orange-500/20 border border-orange-500/40 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-sun-orange">
                BE PART OF THE SHIFT
              </span>
              <h2 className="font-outfit text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                Join the Future of Transparent, Fair &amp; Sustainable Commerce
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Whether you are an independent manufacturer searching for an equitable marketplace, or a customer who wants every order backed by a real dispute desk.
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
    </PolicyShell>
  );
};

export default AboutPage;
