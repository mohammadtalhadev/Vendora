import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star,
  ShieldCheck,
  ShoppingCart,
  Search,
  Check,
  Package,
} from 'lucide-react';
import { useProducts } from '../features/catalog/hooks/useProducts';
import { useStoreByHandle } from '../features/vendor/hooks/useVendorStore';
import type { Product } from '../types/domain';
import { useCartStore } from '../store/cart-store';
import { QueryState } from '../components/common/QueryState';

export const VendorStorefrontPage: React.FC = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const { addItem } = useCartStore();
  const [inStoreSearch, setInStoreSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const storeQuery = useStoreByHandle(vendorId ?? '');
  const store = storeQuery.data;
  // A wall is the store's own approved shelf, capped at one page worth; the count badge
  // reads `total` so the number stays true even when the shelf is longer.
  const listingsQuery = useProducts({ sellerId: store?.id ?? '', limit: 100 }, Boolean(store?.id));

  const isLoading = storeQuery.isPending || (Boolean(store) && listingsQuery.isPending);
  const error = storeQuery.error ?? listingsQuery.error;
  const isError = storeQuery.isError || listingsQuery.isError;
  const refetch = () => {
    if (storeQuery.isError) void storeQuery.refetch();
    else void listingsQuery.refetch();
  };

  const products = listingsQuery.data?.items ?? [];
  const listedCount = listingsQuery.data?.total ?? products.length;

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      maxStock: product.stock,
      image: product.images[0] ?? '',
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sellerType: product.sellerType,
      type: product.type,
    });

    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const filteredProducts = products.filter((p) => {
    const matchesSearch = inStoreSearch
      ? p.title.toLowerCase().includes(inStoreSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(inStoreSearch.toLowerCase())
      : true;

    const matchesCategory =
      selectedCategory === 'all' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="relative min-h-screen bg-slate-50/70 dark:bg-[#0b1120] py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200 overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="ambient-glow-wrapper" aria-hidden="true">
        <div className="ambient-orb-orange -top-24 -left-24 opacity-50" />
        <div className="ambient-orb-aqua top-1/3 -right-32 opacity-40" />
        <div className="ambient-orb-indigo bottom-10 left-1/3 opacity-30" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          errorMessage={error?.message}
          onRetry={refetch}
          isEmpty={!store}
          emptyTitle="Vendor storefront not found"
        >
          {store && (
            <div>
              {/* Vendor Hero Banner & Glass Overlays */}
              <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-2xl border border-white/60 dark:border-white/10">
                {store.banner ? (
                  <div className="h-56 sm:h-72 w-full overflow-hidden">
                    <img
                      src={store.banner}
                      alt={store.storeName}
                      className="h-full w-full object-cover opacity-70 filter saturate-110"
                    />
                  </div>
                ) : (
                  <div className="h-56 sm:h-72 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
                )}

                {/* Ambient dark gradient overlay on banner */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                {/* Vendor Info Glass Card Overlay */}
                <div className="glass-panel-elevated relative -mt-20 mx-4 mb-5 rounded-3xl p-6 sm:p-8 sm:flex sm:items-center sm:justify-between gap-6 shadow-2xl border border-white/90 dark:border-white/15">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 flex-1 min-w-0">
                    <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-white dark:border-white/20 shadow-xl bg-white dark:bg-slate-800">
                      {store.logo ? (
                        <img
                          src={store.logo}
                          alt={store.storeName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-full w-full items-center justify-center font-outfit text-3xl font-black text-slate-400"
                          aria-hidden="true"
                        >
                          {store.storeName.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                          {store.storeName}
                        </h1>
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 dark:bg-cyan-950/60 px-3 py-0.5 text-xs font-bold text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                          <ShieldCheck className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>
                            {store.status === 'active' ? 'Approved seller' : 'Store suspended'}
                          </span>
                        </span>
                        {store.vacationMode && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                            On vacation
                          </span>
                        )}
                      </div>

                      <p className="max-w-2xl text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {store.description || 'This store has not written a description yet.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1">
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {store.reviewCount > 0 ? (
                            <>
                              <span className="font-black text-slate-900 dark:text-white">{store.rating}</span>
                              <span className="text-slate-400">
                                ({store.reviewCount} customer review
                                {store.reviewCount === 1 ? '' : 's'})
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">No reviews yet</span>
                          )}
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5 text-slate-400" />
                          <span>{listedCount} Listed Items</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* In-Store Filter & Search Strip */}
              <div className="mt-10 mb-8 glass-panel rounded-3xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-white/80 dark:border-white/10">
                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-sun-orange text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/30'
                        : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>All Products ({products.length})</span>
                  </button>

                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold capitalize transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-sun-orange text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/30'
                          : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>

                {/* In-Store Search */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={inStoreSearch}
                    onChange={(e) => setInStoreSearch(e.target.value)}
                    placeholder={`Search within ${store.storeName}...`}
                    className="w-full rounded-full border border-slate-200/90 dark:border-white/15 bg-white/90 dark:bg-slate-800/90 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sun-orange focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              {/* Product Grid */}
              {products.length < listedCount && (
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                  Showing the {products.length} newest approved listings of {listedCount}.
                </p>
              )}

              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="glass-panel group flex flex-col justify-between rounded-3xl overflow-hidden border border-white/80 dark:border-white/10 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                    >
                      <div>
                        <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                          {product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                              <Package className="h-7 w-7" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">
                                No photo on this listing
                              </span>
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <span className="rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs px-2.5 py-1 text-[10px] font-extrabold text-slate-800 dark:text-slate-200 shadow-sm border border-white/60 dark:border-white/10">
                              {product.type === 'digital' ? 'Digital License' : 'Direct Dispatch'}
                            </span>
                          </div>
                        </div>

                        <div className="p-5">
                          <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-1.5">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{product.rating}</span>
                            <span className="text-slate-400">({product.reviewCount})</span>
                          </div>

                          <Link to={`/products/${product.id}`} className="block">
                            <h4 className="font-outfit font-extrabold line-clamp-2 text-sm text-slate-900 dark:text-white group-hover:text-sun-orange transition-colors">
                              {product.title}
                            </h4>
                          </Link>

                          <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                            {product.description}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 dark:border-white/10 p-5 pt-3 bg-white/40 dark:bg-slate-900/40">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xl font-black text-slate-900 dark:text-white">
                              ${product.price.toFixed(2)}
                            </span>
                            {product.compareAtPrice && product.compareAtPrice > product.price && (
                              <span className="ml-2 text-xs text-slate-400 line-through">
                                ${product.compareAtPrice.toFixed(2)}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 active:scale-95 cursor-pointer ${
                              addedIds[product.id]
                                ? 'bg-emerald-600 shadow-emerald-500/20'
                                : 'bg-sun-orange hover:bg-sun-orange-600 shadow-orange-500/25'
                            }`}
                            title="Add to cart"
                          >
                            {addedIds[product.id] ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <ShoppingCart className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-panel rounded-3xl p-12 text-center border border-white/80 dark:border-white/10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-sun-orange mb-4 shadow-sm">
                    <Search className="h-8 w-8" />
                  </div>
                  <h3 className="font-outfit text-lg font-bold text-slate-900 dark:text-white">
                    No products found in this store
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Try clearing the keyword search or selecting another category filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setInStoreSearch('');
                      setSelectedCategory('all');
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Reset Store Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </QueryState>
      </div>
    </div>
  );
};
