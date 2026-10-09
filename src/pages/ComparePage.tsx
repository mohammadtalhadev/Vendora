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
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useCompareStore } from '../store/compare-store';
import { useCartStore } from '../store/cart-store';

export const ComparePage: React.FC = () => {
  const { items, removeItem, clearCompare } = useCompareStore();
  const { addItem } = useCartStore();

  const [highlightDiff, setHighlightDiff] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const handleAddToCart = (product: any) => {
    addItem({
      id: `${product.id}-default`,
      productId: product.id,
      title: product.title,
      price: product.price,
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

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-slate-50/50">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-100 text-[#0071DC] mb-6 shadow-lg shadow-blue-100">
            <ArrowLeftRight className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">No Products to Compare</h1>
          <p className="mt-2 text-sm text-slate-500">
            You haven't added any products to your comparison list yet. You can compare up to 4 products side-by-side.
          </p>
          <div className="mt-6">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-full bg-[#0071DC] px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-[#005bb5] transition-all"
            >
              <span>Explore Products</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Helper to determine if an attribute differs across items
  const isDifferent = (key: 'price' | 'brand' | 'category' | 'sellerName' | 'rating' | 'stock' | 'type') => {
    if (items.length <= 1) return false;
    const firstVal = items[0][key];
    return items.some((item) => item[key] !== firstVal);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-10">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0071DC] mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              Side-by-Side Product Comparison
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Compare Products ({items.length}/4)
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHighlightDiff(!highlightDiff)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer border ${
                highlightDiff
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{highlightDiff ? 'Differences Highlighted' : 'Highlight Differences'}</span>
            </button>

            <button
              type="button"
              onClick={clearCompare}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear All
            </button>

            <Link
              to="/products"
              className="inline-flex items-center gap-1 rounded-full bg-[#0071DC] px-4 py-2 text-xs font-bold text-white hover:bg-[#005bb5] transition-colors"
            >
              + Add More
            </Link>
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="w-48 p-5 bg-slate-50/60 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Feature / Spec
                </th>
                {items.map((item) => (
                  <th key={item.id} className="min-w-[280px] p-5 align-top">
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove from comparison"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <div className="h-44 w-full rounded-2xl bg-slate-100 overflow-hidden mb-3 border border-slate-100">
                        <img
                          src={item.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'}
                          alt={item.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {item.brand}
                      </div>

                      <Link
                        to={`/products/${item.id}`}
                        className="font-bold text-sm text-slate-900 hover:text-[#0071DC] line-clamp-2 leading-snug mb-2 block"
                      >
                        {item.title}
                      </Link>

                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-xl font-black text-slate-900">
                          ${item.price.toFixed(2)}
                        </span>
                        {item.compareAtPrice && item.compareAtPrice > item.price && (
                          <span className="text-xs text-slate-400 line-through">
                            ${item.compareAtPrice.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className={`w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 px-4 text-xs font-bold transition-all cursor-pointer ${
                          addedIds[item.id]
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#FF7A1A] hover:bg-[#e0650f] text-white shadow-md shadow-orange-500/20'
                        }`}
                      >
                        {addedIds[item.id] ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Added to Cart
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Add to Cart
                          </>
                        )}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {/* Sold By */}
              <tr className={highlightDiff && isDifferent('sellerName') ? 'bg-amber-50/40' : ''}>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/40">Seller / Store</td>
                {items.map((item) => (
                  <td key={item.id} className="p-4 font-medium text-slate-800">
                    {item.sellerType === 'platform' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-extrabold text-[#0071DC]">
                        Sold by Vendora
                      </span>
                    ) : (
                      <Link
                        to={`/vendors/${item.sellerId}`}
                        className="text-slate-800 font-bold hover:text-[#0071DC] hover:underline"
                      >
                        {item.sellerName}
                      </Link>
                    )}
                  </td>
                ))}
              </tr>

              {/* Rating */}
              <tr className={highlightDiff && isDifferent('rating') ? 'bg-amber-50/40' : ''}>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/40">Customer Rating</td>
                {items.map((item) => (
                  <td key={item.id} className="p-4">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{item.rating.toFixed(1)}</span>
                      <span className="text-slate-400 font-normal">({item.reviewCount} reviews)</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Category */}
              <tr className={highlightDiff && isDifferent('category') ? 'bg-amber-50/40' : ''}>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/40">Category</td>
                {items.map((item) => (
                  <td key={item.id} className="p-4 font-medium text-slate-700 capitalize">
                    {item.category}
                  </td>
                ))}
              </tr>

              {/* Fulfillment Type */}
              <tr className={highlightDiff && isDifferent('type') ? 'bg-amber-50/40' : ''}>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/40">Product Type</td>
                {items.map((item) => (
                  <td key={item.id} className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        item.type === 'digital'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <Package className="h-3 w-3" />
                      {item.type === 'digital' ? 'Digital Download' : 'Physical Parcel'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Stock Availability */}
              <tr className={highlightDiff && isDifferent('stock') ? 'bg-amber-50/40' : ''}>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/40">Availability</td>
                {items.map((item) => (
                  <td key={item.id} className="p-4 font-medium">
                    {item.stock > 0 ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        In Stock ({item.stock} available)
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold">Out of Stock</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Description Snippet */}
              <tr>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/40">Description</td>
                {items.map((item) => (
                  <td key={item.id} className="p-4 text-slate-600 leading-relaxed text-xs line-clamp-3">
                    {item.description}
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
