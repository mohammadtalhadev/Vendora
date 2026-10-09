import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star, ShieldCheck, ShoppingCart, Search } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { VendorProfile, Product } from '../types/domain';
import { useCartStore } from '../store/cart-store';
import { QueryState } from '../components/common/QueryState';
import { Badge } from '../components/ui/badge';

interface VendorStoreResponse extends VendorProfile {
  products: Product[];
}

export const VendorStorefrontPage: React.FC = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const { addItem } = useCartStore();
  const [inStoreSearch, setInStoreSearch] = useState('');

  const { data: vendorData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['vendor', 'storefront', vendorId],
    queryFn: ({ signal }) => apiClient<VendorStoreResponse>(`/api/vendors/${vendorId}`, { signal }),
    enabled: Boolean(vendorId),
  });

  const filteredProducts = vendorData?.products?.filter((p) =>
    inStoreSearch ? p.title.toLowerCase().includes(inStoreSearch.toLowerCase()) : true,
  );

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6">
      <QueryState
        isLoading={isLoading}
        isError={isError}
        errorMessage={error?.message}
        onRetry={refetch}
        isEmpty={!vendorData}
        emptyTitle="Vendor storefront not found"
      >
        {vendorData && (
          <div>
            {/* Vendor Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-lg">
              {vendorData.banner ? (
                <div className="h-48 w-full sm:h-64">
                  <img src={vendorData.banner} alt="" className="h-full w-full object-cover opacity-60" />
                </div>
              ) : (
                <div className="h-48 w-full bg-gradient-to-r from-slate-900 to-slate-800" />
              )}

              {/* Vendor Info Glass Card Overlay */}
              <div className="glass-surface relative -mt-16 mx-4 mb-4 rounded-3xl p-6 sm:mx-8 sm:flex sm:items-center sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-white shadow-md bg-white">
                    <img src={vendorData.logo} alt={vendorData.storeName} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-extrabold text-slate-900">{vendorData.storeName}</h1>
                      <ShieldCheck className="h-5 w-5 text-[#00B8C8]" />
                    </div>
                    <p className="mt-1 max-w-xl text-xs text-slate-600">{vendorData.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-amber-500 font-semibold">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span>{vendorData.rating}</span>
                      </div>
                      <span className="text-slate-400">({vendorData.reviewCount} customer reviews)</span>
                      <span className="text-slate-300">·</span>
                      <Badge variant="vendor-verified">Verified Independent Seller</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* In-Store Search & Catalog Header */}
            <div className="mt-10 mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Products by {vendorData.storeName}</h2>
                <p className="text-xs text-slate-500">Showing {filteredProducts?.length ?? 0} active listings</p>
              </div>

              {/* In-store search input */}
              <div className="relative w-full max-w-xs">
                <input
                  type="text"
                  value={inStoreSearch}
                  onChange={(e) => setInStoreSearch(e.target.value)}
                  placeholder="Search in this store..."
                  className="w-full rounded-full border border-slate-200 bg-white py-2 pl-4 pr-10 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:border-[#FF7A1A] focus:outline-none"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* In-Store Product Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts?.map((product) => (
                <div
                  key={product.id}
                  className="card-near-solid group flex flex-col justify-between overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div>
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    <div className="p-4">
                      <div className="flex items-center gap-1 text-xs text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-slate-700">{product.rating}</span>
                        <span className="text-slate-400">({product.reviewCount})</span>
                      </div>

                      <Link to={`/products/${product.id}`} className="mt-1 block">
                        <h4 className="font-outfit line-clamp-2 text-sm font-semibold text-slate-800 group-hover:text-[#FF7A1A]">
                          {product.title}
                        </h4>
                      </Link>

                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.description}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 p-4 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-slate-900">${product.price.toFixed(2)}</span>

                      <button
                        onClick={() =>
                          addItem({
                            id: product.id,
                            productId: product.id,
                            title: product.title,
                            price: product.price,
                            maxStock: product.stock,
                            image: product.images[0],
                            sellerId: product.sellerId,
                            sellerName: product.sellerName,
                            sellerType: product.sellerType,
                            type: product.type,
                          })
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF7A1A] text-white shadow-md transition-all hover:bg-[#EA6C13] active:scale-95"
                        title="Add to cart"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
};
