import React from 'react';
import { Star, ShieldCheck, CheckCircle2, Quote } from 'lucide-react';

interface TestimonialItem {
  id: string;
  name: string;
  city: string;
  avatarColor: string;
  rating: number;
  date: string;
  quote: string;
  productName: string;
  productImage: string;
  verifiedLabel: string;
}

const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'test-1',
    name: 'Hamza Farooq',
    city: 'DHA Phase 6, Karachi',
    avatarColor: 'from-orange-500 to-amber-500',
    rating: 5,
    date: '3 days ago',
    quote:
      'Ordered the Sony WH-1000XM5 headphones. The SBP Escrow held my payment securely until I unboxed and verified the serial number on Sony’s portal. Smoothest high-ticket purchase I’ve made in Pakistan!',
    productName: 'Sony WH-1000XM5 Wireless Headphones',
    productImage: '/images/bevesi/1-13.jpg',
    verifiedLabel: 'Verified Purchase • Escrow Released',
  },
  {
    id: 'test-2',
    name: 'Ayesha Siddiqui',
    city: 'Gulberg III, Lahore',
    avatarColor: 'from-pink-500 to-rose-500',
    rating: 5,
    date: '1 week ago',
    quote:
      'I was hesitant about skincare authenticity online, but Vendora’s direct flagship partnership with Lumina gave me total confidence. Arrived in 24 hours in sealed tamper-proof packaging.',
    productName: 'Coastal Glow Bio-Hydra Night Treatment',
    productImage: '/images/products/prod_lumina_cream.jpg',
    verifiedLabel: 'Verified Purchase • 100% Authentic',
  },
  {
    id: 'test-3',
    name: 'Bilal Khan',
    city: 'F-7/2, Islamabad',
    avatarColor: 'from-blue-500 to-indigo-500',
    rating: 5,
    date: '2 weeks ago',
    quote:
      'Got a Windows 11 Pro OEM key for my workstation. The instant vault download worked immediately — key popped up within 5 seconds and activated with Microsoft without a hitch.',
    productName: 'Microsoft Windows 11 Pro Genuine License',
    productImage: '/images/categories/cat_digital_products_2k.png',
    verifiedLabel: 'Instant Digital Fulfillment • Active',
  },
];

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="mb-14">
      {/* Header & Escrow Trust Stats */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Real Shopper Trust
              </span>
            </div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl font-outfit">
              Customer Experiences &amp; Unboxing Stories
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Protected by State Bank of Pakistan compliant Escrow — your funds are safely reserved until your inspection is complete
            </p>
          </div>

          {/* Micro Stat Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-1.5 backdrop-blur-md shadow-2xs">
              <span className="font-outfit text-sm font-black text-slate-900">4.92 / 5.0</span>
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>120k+ Escrow Protected Orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Review Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.id}
            className="group relative flex flex-col justify-between rounded-[24px] border border-white/80 bg-white/75 p-6 backdrop-blur-md shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:bg-white/95 hover:shadow-xl hover:shadow-orange-500/5"
          >
            {/* Top Row: Avatar, Name, City, Stars */}
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${t.avatarColor} text-sm font-black text-white shadow-sm`}
                  >
                    {t.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                      {t.name}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-400">{t.city}</p>
                  </div>
                </div>

                <Quote className="h-6 w-6 text-orange-200/60" />
              </div>

              {/* Star Rating & Date */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex text-amber-400">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[11px] font-medium text-slate-400">{t.date}</span>
              </div>

              {/* Quote Body */}
              <p className="mt-3 text-xs leading-relaxed text-slate-600 font-normal">
                "{t.quote}"
              </p>
            </div>

            {/* Bottom Row: Item purchased pill */}
            <div className="mt-5 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-3">
                <img
                  src={t.productImage}
                  alt={t.productName}
                  className="h-10 w-10 rounded-xl object-cover bg-slate-100 border border-slate-200/60"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800">
                    {t.productName}
                  </p>
                  <p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    {t.verifiedLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
