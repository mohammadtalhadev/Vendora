import React from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../../catalog/hooks/useProducts';
import { useCurrency } from '../../../store/currency-store';

interface CustomersAlsoViewedGridProps {
  /** The product being viewed, excluded from its own rail. */
  excludeId?: string;
}

/**
 * "Customers also viewed" rail. This used to render four invented products
 * with hard-coded AED price strings (QA M-3); it now shows real catalogue
 * products priced through the currency formatter, and renders nothing when
 * the catalogue has nothing to show.
 */
export const CustomersAlsoViewedGrid: React.FC<CustomersAlsoViewedGridProps> = ({ excludeId }) => {
  const { formatPrice } = useCurrency();
  const { data } = useProducts({ sort: 'featured', page: 1, limit: 5 });

  const items = (data?.items ?? []).filter((product) => product.id !== excludeId).slice(0, 4);
  if (items.length === 0) return null;

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
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              {/* Product Image Frame */}
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-50 p-2 flex items-center justify-center">
                <img
                  src={item.images[0] ?? ''}
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
                  {formatPrice(item.price)}
                </p>
              </div>
            </div>

            {/* View Deal Button */}
            <Link
              to={`/products/${item.id}`}
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
