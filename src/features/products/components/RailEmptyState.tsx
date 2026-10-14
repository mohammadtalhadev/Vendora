import React from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';

/**
 * Designed empty state for home rails/carousels (Batch 22J). A rail that ends
 * up with zero products renders this instead of a blank gap or a collapsed
 * hole, and category tabs are filtered to categories that actually have
 * products so shoppers never land here by tapping a dead tab.
 */
export const RailEmptyState: React.FC<{ message?: string }> = ({
  message = 'No products in this category yet — new stock lands every week.',
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-sun-orange">
        <PackageSearch className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-slate-800">Nothing to show here yet</p>
      <p className="max-w-sm text-xs leading-relaxed text-slate-500">{message}</p>
      <Link
        to="/products"
        className="mt-2 inline-flex items-center rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-sun-orange-600 active:scale-95"
      >
        Browse all products
      </Link>
    </div>
  );
};
