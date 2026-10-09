import React from 'react';
import { Link } from 'react-router-dom';

export interface AlsoViewedItem {
  id: string;
  brand: string;
  title: string;
  price: string;
  image: string;
  link: string;
}

const DEFAULT_ALSO_VIEWED: AlsoViewedItem[] = [
  {
    id: 'viewed-s24',
    brand: 'Samsung Official',
    title: 'Galaxy S24 Ultra 5G',
    price: 'AED 4,199',
    image: '/images/bevesi/hero_samsung_s24.jpg',
    link: '/products',
  },
  {
    id: 'viewed-watch',
    brand: 'Apple Official',
    title: 'Apple Watch Ultra 2',
    price: 'AED 3,199',
    image: '/images/emox/hero_apple_watch.jpg',
    link: '/products',
  },
  {
    id: 'viewed-airpods',
    brand: 'Apple Official',
    title: 'AirPods Pro (2nd Gen)',
    price: 'AED 849',
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80',
    link: '/products',
  },
  {
    id: 'viewed-adapter',
    brand: 'Apple Official',
    title: '20W USB-C Power Adapter',
    price: 'AED 79',
    image: 'https://images.unsplash.com/photo-1622445268462-349711fc8117?auto=format&fit=crop&w=600&q=80',
    link: '/products',
  },
];

export const CustomersAlsoViewedGrid: React.FC = () => {
  return (
    <section className="mt-14 space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
          ALTERNATIVE FLAGSHIPS
        </span>
        <h3 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
          Customers Also Viewed
        </h3>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEFAULT_ALSO_VIEWED.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              {/* Product Image Frame */}
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-50 p-2 flex items-center justify-center">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Product Info */}
              <div className="mt-3.5 space-y-1">
                <span className="text-[11px] font-bold text-blue-600 tracking-wide">
                  {item.brand}
                </span>
                <h4 className="font-outfit text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h4>
                <p className="text-sm font-black text-slate-900 pt-0.5">
                  {item.price}
                </p>
              </div>
            </div>

            {/* View Deal Button */}
            <Link
              to={item.link}
              className="mt-3.5 block w-full rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              View Deal
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};
