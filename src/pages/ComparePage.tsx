import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  Trash2,
  ShoppingCart,
  Star,
  Check,
  Package,
  Layers,
  ArrowRight,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { useCompareStore } from '../store/compare-store';
import { useCartStore } from '../store/cart-store';
import { useCurrency } from '../store/currency-store';
import { PageHeader } from '../components/common/PageHeader';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const ComparePage: React.FC = () => {
  const { items, removeItem, clearCompare } = useCompareStore();
  const { addItem } = useCartStore();
  const { formatPrice } = useCurrency();

  const [highlightDiff, setHighlightDiff] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [clearOpen, setClearOpen] = useState(false);

  const handleAddToCart = (product: any) => {
    addItem({
      id: `${product.id}-default`,
      productId: product.id,
      title: product.title,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      maxStock: product.stock,
      image: product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sellerType: product.sellerType,
      type: product.type,
    });

    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  // Helper to determine if an attribute differs across items
  const isDifferent = (key: 'price' | 'brand' | 'category' | 'sellerName' | 'rating' | 'stock' | 'type') => {
    if (items.length <= 1) return false;
    const firstVal = items[0][key];
    return items.some((item) => item[key] !== firstVal);
  };

  if (items.length === 0) {
    return (
      <div className="relative min-h-[75vh] flex items-center justify-center px-4 py-16 overflow-hidden transition-colors">
        {/* Ambient background glow */}
        <div className="ambient-glow-wrapper" aria-hidden="true">
          <div className="ambient-orb-orange top-1/4 left-1/4 opacity-50" />
          <div className="ambient-orb-aqua bottom-1/4 right-1/4 opacity-40" />
        </div>

        <div className="relative z-10 max-w-lg w-full text-center glass-panel rounded-3xl p-8 sm:p-12 shadow-2xl border border-white/80 dark:border-white/10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-100 dark:bg-orange-950/50 text-sun-orange mb-6 shadow-lg shadow-orange-500/20">
            <ArrowLeftRight className="h-10 w-10" />
          </div>

          <span className="inline-block rounded-full bg-orange-100 dark:bg-orange-950/60 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-sun-orange mb-3">
            Comparison Matrix Empty
          </span>

          <h1 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            No Products to Compare
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Select up to 4 items from our catalog to compare specifications, pricing, seller ratings, and fulfillment details side-by-side.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/products"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-sun-orange px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 hover:bg-sun-orange-600 active:scale-95 transition-all"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Quick Categories */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Popular:</span>
            {['Electronics', 'Audio', 'Digital', 'Fashion'].map((category) => (
              <Link
                key={category}
                to={`/products?category=${category.toLowerCase()}`}
                className="rounded-full bg-slate-100 dark:bg-slate-800/80 px-3 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-sun-orange hover:bg-orange-50 dark:hover:bg-slate-700 transition-colors"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200 overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="ambient-glow-wrapper" aria-hidden="true">
        <div className="ambient-orb-orange -top-20 -left-20 opacity-60" />
        <div className="ambient-orb-aqua top-1/3 -right-24 opacity-50" />
        <div className="ambient-orb-indigo bottom-10 left-1/3 opacity-30" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px]">
        {/* Top Header — shared PageHeader inside the page's glass panel */}
        <div className="glass-panel rounded-3xl p-6 mb-8 border border-white/80 dark:border-white/10">
          <PageHeader
            className="mb-0"
            eyebrow="Side-by-Side Product Comparison"
            title={`Product Analysis Matrix (${items.length}/4)`}
            description="Evaluate hardware specs, seller credentials, and pricing across multi-vendor inventory."
            action={
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setHighlightDiff(!highlightDiff)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer border ${
                    highlightDiff
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 ring-2 ring-amber-500/30'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{highlightDiff ? 'Differences Highlighted' : 'Highlight Differences'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setClearOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear Matrix</span>
                </button>

                <Link
                  to="/products"
                  className="inline-flex items-center gap-1 rounded-full bg-sun-orange px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-sun-orange-600 transition-colors active:scale-95"
                >
                  <span>+ Add Product</span>
                </Link>
              </div>
            }
          />

          <ConfirmDialog
            open={clearOpen}
            onOpenChange={setClearOpen}
            title="Clear the comparison matrix?"
            description={`This removes all ${items.length} ${items.length === 1 ? 'product' : 'products'} from the comparison. This cannot be undone.`}
            confirmLabel="Clear Matrix"
            onConfirm={() => {
              clearCompare();
              setClearOpen(false);
            }}
          />
        </div>

        {/* Comparison Matrix Table */}
        <div className="overflow-x-auto glass-panel rounded-3xl border border-white/80 dark:border-white/10 shadow-2xl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10">
                <th className="w-56 p-6 bg-slate-50/70 dark:bg-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500">
                  Feature / Parameter
                </th>
                {items.map((item) => (
                  <th key={item.id} className="min-w-[300px] p-6 align-top">
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900 dark:hover:text-rose-300 transition-colors cursor-pointer shadow-sm border border-slate-200 dark:border-white/10"
                        title="Remove product"
                        aria-label={`Remove ${item.title || 'product'} from comparison`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <div className="h-48 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden mb-4 border border-white/80 dark:border-white/10 shadow-inner">
                        <img
                          src={item.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'}
                          alt={item.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 mb-1">
                        {item.brand?.trim() || '—'}
                      </div>

                      <Link
                        to={`/products/${item.id}`}
                        className="font-outfit font-black text-sm text-slate-900 dark:text-white hover:text-sun-orange dark:hover:text-sun-orange line-clamp-2 leading-snug mb-3 block transition-colors"
                      >
                        {item.title}
                      </Link>

                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {formatPrice(item.price)}
                        </span>
                        {item.compareAtPrice && item.compareAtPrice > item.price && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(item.compareAtPrice)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className={`w-full flex items-center justify-center gap-2 rounded-full py-3 px-4 text-xs font-extrabold transition-all cursor-pointer shadow-md active:scale-95 ${
                          addedIds[item.id]
                            ? 'bg-emerald-600 text-white'
                            : 'bg-sun-orange hover:bg-sun-orange-600 text-white shadow-orange-500/25'
                        }`}
                      >
                        {addedIds[item.id] ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Added to Cart</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-xs">
              {/* Seller / Store */}
              <tr className={highlightDiff && isDifferent('sellerName') ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                <td className="p-5 font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                  Seller / Store
                </td>
                {items.map((item) => (
                  <td key={item.id} className="p-5 font-semibold text-slate-800 dark:text-slate-200">
                    {item.sellerType === 'platform' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sun-orange/15 px-3 py-1 text-[11px] font-extrabold text-[#D9610B] dark:text-orange-400 border border-sun-orange/35">
                        Sold by Vendora
                      </span>
                    ) : (
                      <Link
                        to={`/vendors/${item.sellerId}`}
                        className="text-slate-800 dark:text-slate-200 font-bold hover:text-sun-orange hover:underline transition-colors"
                      >
                        {item.sellerName?.trim() || '—'}
                      </Link>
                    )}
                  </td>
                ))}
              </tr>

              {/* Customer Rating */}
              <tr className={highlightDiff && isDifferent('rating') ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                <td className="p-5 font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                  Customer Rating
                </td>
                {items.map((item) => (
                  <td key={item.id} className="p-5">
                    {item.reviewCount > 0 ? (
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-black">{item.rating.toFixed(1)}</span>
                        <span className="text-slate-400 font-normal">({item.reviewCount} reviews)</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-medium">No ratings yet</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Category */}
              <tr className={highlightDiff && isDifferent('category') ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                <td className="p-5 font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                  Category
                </td>
                {items.map((item) => (
                  <td key={item.id} className="p-5 font-semibold text-slate-700 dark:text-slate-300 capitalize">
                    {item.category?.trim() || '—'}
                  </td>
                ))}
              </tr>

              {/* Product Type */}
              <tr className={highlightDiff && isDifferent('type') ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                <td className="p-5 font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                  Fulfillment Type
                </td>
                {items.map((item) => (
                  <td key={item.id} className="p-5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                        item.type === 'digital'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      <Package className="h-3.5 w-3.5" />
                      <span>{item.type === 'digital' ? 'Digital License (Instant)' : 'Physical Parcel'}</span>
                    </span>
                  </td>
                ))}
              </tr>

              {/* Stock Status */}
              <tr className={highlightDiff && isDifferent('stock') ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                <td className="p-5 font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                  Availability
                </td>
                {items.map((item) => (
                  <td key={item.id} className="p-5 font-medium">
                    {item.stock > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                        <Check className="h-4 w-4" />
                        In Stock ({item.stock} available)
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">Out of Stock</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Shipping Estimate */}
              <tr>
                <td className="p-5 font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                  Shipping SLA
                </td>
                {items.map((item) => (
                  <td key={item.id} className="p-5 text-slate-700 dark:text-slate-300 font-medium">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-sun-orange shrink-0" />
                      <span>
                        {item.type === 'digital'
                          ? 'Instant digital access'
                          : item.shippingSettings?.freeShipping
                            ? 'Free shipping · SLA not specified'
                            : '—'}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Warranty & Guarantee */}
              <tr>
                <td className="p-5 font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                  Protection
                </td>
                {items.map((item) => (
                  <td key={item.id} className="p-5 text-slate-700 dark:text-slate-300 font-medium">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-aqua shrink-0" />
                      <span>—</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Description */}
              <tr>
                <td className="p-5 font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                  Overview
                </td>
                {items.map((item) => (
                  <td key={item.id} className="p-5 text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
                    <p className="line-clamp-3">{item.description?.trim() || '—'}</p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
