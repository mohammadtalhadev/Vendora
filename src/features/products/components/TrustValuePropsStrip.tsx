import React from 'react';
import { Truck, Headphones, CreditCard, ShieldCheck } from 'lucide-react';

const TRUST_ITEMS = [
  {
    icon: Truck,
    title: 'Free Delivery',
    subtitle: 'On eligible orders across UAE',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    subtitle: 'Dedicated regional assistance',
  },
  {
    icon: CreditCard,
    title: 'Tabby & Tamara',
    subtitle: 'Split into 4 interest-free payments',
  },
  {
    icon: ShieldCheck,
    title: 'Genuine Warranty',
    subtitle: '100% authentic authorized goods',
  },
];

export const TrustValuePropsStrip: React.FC = () => {
  return (
    <div className="mt-12 mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {TRUST_ITEMS.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-colors hover:border-slate-300"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
              <p className="text-[11px] font-medium text-slate-500">{item.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
