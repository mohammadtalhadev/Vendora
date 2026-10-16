import React from 'react';
import { Truck, ShieldCheck, RotateCcw, Headphones } from 'lucide-react';

/**
 * The ONE canonical trust-badge strip. It used to live only on the
 * sign-in page in four different pastel colours while the homepage — the page
 * shoppers actually land on — had none. It now belongs to the homepage in the
 * single muted treatment the homepage sections use (white frosted cards, one
 * peach icon treatment), and inner pages do not carry stray copies.
 */
const TRUST_ITEMS = [
  {
    icon: Truck,
    title: 'Fast & Free Shipping',
    subtitle: 'Nationwide courier network',
  },
  {
    icon: ShieldCheck,
    title: '100% Authentic',
    subtitle: 'Verified independent sellers',
  },
  {
    icon: RotateCcw,
    title: '30-Day Easy Returns',
    subtitle: 'Zero-hassle door pickups',
  },
  {
    icon: Headphones,
    title: '24/7 Dedicated Support',
    subtitle: 'Live chat & dispute mediation',
  },
];

export const TrustStrip: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {TRUST_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-xs backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sun-orange dark:bg-orange-950/40">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
