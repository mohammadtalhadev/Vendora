import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Star, ShoppingCart, SlidersHorizontal, X } from 'lucide-react';
import { useProducts, useCategories } from '../features/catalog/hooks/useProducts';
import { useCartStore } from '../store/cart-store';
import { QueryState } from '../components/common/QueryState';
import { Badge } from '../components/ui/badge';

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCartStore();

  // 1. Read URL state
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const type = (searchParams.get('type') as 'physical' | 'digital') || undefined;
  const seller = (searchParams.get('seller') as 'platform' | 'vendor') || undefined;
  const sort = searchParams.get('sort') || 'featured';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // 2. Fetch data via TanStack Query hook
  const { data, isLoading, isError, error, refetch } = useProducts({
    q: q || undefined,
    category: category || undefined,
    type,
    seller,
    sort,
    page,
    limit: 12,
  });

  const { data: categoriesData } = useCategories();

  // Helper to update URL params and reset page to 1
  const updateFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set('page', '1'); // Invariant: changing filter resets page to 1
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', newPage.toString());
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header & Search Bar Summary */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {q ? `Search results for "${q}"` : 'Marketplace Catalog'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Showing {data?.total ?? 0} verified listings
          </p>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Sort by:</span>
          <select
            value={sort === 'best-selling' ? 'best_selling' : sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-[#FF7A1A] focus:outline-none"
          >
            <option value="featured">Featured</option>
            <option value="best_selling">Best Selling</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Active Filter Chips Strip */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters:
        </span>

        {/* Category Filter Pills */}
        <button
          onClick={() => updateFilter('category', null)}
          className={`glass-pill px-3 py-1 text-xs font-semibold ${
            !category ? 'bg-slate-900 text-white' : 'text-slate-700'
          }`}
        >
          All Categories
        </button>
        {categoriesData?.categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => updateFilter('category', cat.id === category ? null : cat.id)}
            className={`glass-pill px-3 py-1 text-xs font-semibold ${
              category === cat.id ? 'bg-[#FF7A1A] text-white border-transparent' : 'text-slate-700'
            }`}
          >
            {cat.name}
          </button>
        ))}

        {/* Seller Type Pill */}
        <button
          onClick={() => updateFilter('seller', seller === 'platform' ? null : 'platform')}
          className={`glass-pill px-3 py-1 text-xs font-semibold ${
            seller === 'platform' ? 'bg-[#00B8C8] text-white border-transparent' : 'text-slate-700'
          }`}
        >
          Sold by Vendora
        </button>

        {/* Digital Asset Pill */}
        <button
          onClick={() => updateFilter('type', type === 'digital' ? null : 'digital')}
          className={`glass-pill px-3 py-1 text-xs font-semibold ${
            type === 'digital' ? 'bg-slate-900 text-white border-transparent' : 'text-slate-700'
          }`}
        >
          Digital Only
        </button>

        {/* Clear All Pill */}
        {(q || category || type || seller) && (
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300"
          >
            <span>Clear Filters</span>
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Product Grid State */}
      <QueryState
        isLoading={isLoading}
        isError={isError}
        errorMessage={error?.message}
        onRetry={refetch}
        isEmpty={(data?.items?.length ?? 0) === 0}
        emptyTitle="No products found"
        emptyMessage="Try adjusting your keywords or clearing the active filters."
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data?.items?.map((product) => {
            const isPlatform = product.sellerType === 'platform';
            return (
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
                    <div className="absolute top-3 left-3">
                      {isPlatform ? (
                        <Badge variant="vendora-platform">Sold by Vendora</Badge>
                      ) : (
                        <Link to={`/vendors/${product.sellerId}`}>
                          <Badge variant="vendor-verified">{product.sellerName}</Badge>
                        </Link>
                      )}
                    </div>
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
                    <div>
                      <div className="flex items-baseline">
                        <span className="text-lg font-bold text-slate-900">${product.price.toFixed(2)}</span>
                        {product.compareAtPrice && (
                          <span className="ml-2 text-xs text-slate-400 line-through">
                            ${product.compareAtPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="inline-block rounded-md bg-[#E0F2FE] px-2 py-0.5 text-[10px] font-bold text-[#0369A1]">
                          Shipping within 3 days
                        </span>
                      </div>
                    </div>

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
            );
          })}
        </div>

        {/* Pagination Stepper */}
        {data && data.totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="glass-pill px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: data.totalPages }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    page === p ? 'bg-[#FF7A1A] text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={page >= data.totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="glass-pill px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </QueryState>
    </div>
  );
};
