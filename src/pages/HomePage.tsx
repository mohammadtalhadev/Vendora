import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Star, Sparkles, CheckCircle2, ShoppingCart } from 'lucide-react';
import { useProducts, useCategories } from '../features/catalog/hooks/useProducts';
import { useCartStore } from '../store/cart-store';
import { QueryState } from '../components/common/QueryState';
import { Badge } from '../components/ui/badge';

export const HomePage: React.FC = () => {
  const { data: productsData, isLoading, isError, error, refetch } = useProducts({ limit: 8 });
  const { data: categoriesData } = useCategories();
  const { addItem } = useCartStore();

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
      {/* =========================================================================
          1. Hero Bento Grid (Asymmetric 60/40 Split)
          ========================================================================= */}
      <section className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Big Showcase Banner (60% / 7 cols) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-xl lg:col-span-7 lg:p-12">
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-[#FF7A1A]" />
                <span>Next-Gen Audio & Computing</span>
              </div>
              <h1 className="max-w-md text-3xl font-extrabold tracking-tight sm:text-5xl">
                Elevate Your Digital Lifestyle
              </h1>
              <p className="mt-4 max-w-sm text-sm text-slate-300">
                Direct platform flagships paired with curated independent artisan technology. Guaranteed buyer protection.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-full bg-[#FF7A1A] px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <span>Shop Catalog</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/products?seller=platform"
                className="rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20"
              >
                Sold by Vendora
              </Link>
            </div>
          </div>

          {/* Background Ambient Glow & Graphic */}
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-72 w-72 rounded-full bg-[#FF7A1A]/30 blur-3xl" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full bg-[#00B8C8]/25 blur-3xl" />
        </div>

        {/* Right Bento Column (40% / 5 cols) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          {/* Top Card */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 border border-orange-200/60 shadow-sm">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">Featured Vendor</span>
              <h3 className="mt-1 text-xl font-bold text-slate-900">SoundWave Direct</h3>
              <p className="mt-1 text-xs text-slate-600">Precision in-ear studio monitors tuned for audiophiles.</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-900">Starting at $189.00</span>
              <Link
                to="/vendors/vendor-tech-1"
                className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                Explore Store
              </Link>
            </div>
          </div>

          {/* Bottom Card */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-50 to-sky-50/50 p-6 border border-cyan-200/60 shadow-sm">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">Digital Library</span>
              <h3 className="mt-1 text-xl font-bold text-slate-900">StudioCraft UI Assets</h3>
              <p className="mt-1 text-xs text-slate-600">400+ production components & auto-layout Figma kits.</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-extrabold text-cyan-900">Instant Download</span>
              <Link
                to="/products?type=digital"
                className="rounded-full bg-[#00B8C8] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#009EAD]"
              >
                View Licenses
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. Category Capsule Browse Strip
          ========================================================================= */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Browse by Category</h2>
          <Link to="/products" className="text-xs font-semibold text-[#FF7A1A] hover:underline">
            View All →
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {categoriesData?.categories?.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.id}`}
              className="glass-pill flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-[#FF7A1A] whitespace-nowrap"
            >
              <span>{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================================
          3. Limited Campaign / Flash Deals Banner
          ========================================================================= */}
      <section className="mb-10 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white shadow-md sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <Flame className="h-6 w-6 text-yellow-300 animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-100">Limited Deal Event</span>
              <h3 className="text-xl font-extrabold sm:text-2xl">Use Code VENDORAPRO for 10% Off</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-mono font-bold tracking-wider">
              PROMO: VENDORAPRO
            </span>
            <Link
              to="/products"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
            >
              Shop Flash Deals
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. Featured Marketplace Catalog Grid
          ========================================================================= */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Featured Listings</h2>
            <p className="text-xs text-slate-500">Live multi-vendor inventory loaded from in-browser MSW engine</p>
          </div>
          <Link to="/products" className="text-xs font-bold text-[#FF7A1A] hover:underline">
            View All ({productsData?.total ?? 0}) →
          </Link>
        </div>

        <QueryState
          isLoading={isLoading}
          isError={isError}
          errorMessage={error?.message}
          onRetry={refetch}
          isEmpty={(productsData?.items?.length ?? 0) === 0}
          emptyTitle="No featured products currently available"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {productsData?.items?.map((product) => {
              const isPlatform = product.sellerType === 'platform';
              return (
                <div
                  key={product.id}
                  className="card-near-solid group flex flex-col justify-between overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div>
                    {/* Image Container with Badges */}
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Seller Tag */}
                      <div className="absolute top-3 left-3">
                        {isPlatform ? (
                          <Badge variant="vendora-platform">Sold by Vendora</Badge>
                        ) : (
                          <Link to={`/vendors/${product.sellerId}`}>
                            <Badge variant="vendor-verified">{product.sellerName}</Badge>
                          </Link>
                        )}
                      </div>

                      {/* Compare at price discount tag */}
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <div className="absolute bottom-3 left-3">
                          <Badge variant="discount-coral">
                            {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% OFF
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-center gap-1 text-xs text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-slate-700">{product.rating}</span>
                        <span className="text-slate-400">({product.reviewCount})</span>
                      </div>

                      <Link to={`/products/${product.id}`} className="mt-1 block">
                        <h4 className="line-clamp-2 text-sm font-semibold text-slate-800 group-hover:text-[#FF7A1A]">
                          {product.title}
                        </h4>
                      </Link>

                      {/* Stock availability indicator */}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Stock: {product.stock > 100 ? '99+' : product.stock}</span>
                        <span className="font-medium text-emerald-600">
                          {product.type === 'digital' ? 'Instant Access' : 'In Stock'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="border-t border-slate-100 p-4 pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-slate-900">${product.price.toFixed(2)}</span>
                        {product.compareAtPrice && (
                          <span className="ml-2 text-xs text-slate-400 line-through">
                            ${product.compareAtPrice.toFixed(2)}
                          </span>
                        )}
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
        </QueryState>
      </section>

      {/* =========================================================================
          5. Verified Multi-Vendor Spotlight Strip
          ========================================================================= */}
      <section className="mb-10 rounded-3xl bg-slate-900 p-6 text-white sm:p-10">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#00B8C8]">Platform Ecosystem</span>
            <h2 className="text-2xl font-bold tracking-tight text-white">Vetted Independent Vendors</h2>
          </div>
          <Link
            to="/become-a-seller"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20"
          >
            <span>Apply as a Vendor</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Vendor 1 */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-800/80 p-5 border border-slate-700/80">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[#00B8C8]">
                <img
                  src="https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=120&q=80"
                  alt="SoundWave Direct"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-white">SoundWave Direct</h4>
                  <CheckCircle2 className="h-4 w-4 text-[#00B8C8]" />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-amber-400">★ 4.9 (382 reviews)</span>
                  <span>·</span>
                  <span>Electronics & Audio</span>
                </div>
              </div>
            </div>

            <Link
              to="/vendors/vendor-tech-1"
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white hover:text-slate-900 transition-all"
            >
              View Store
            </Link>
          </div>

          {/* Vendor 2 */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-800/80 p-5 border border-slate-700/80">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[#FF7A1A]">
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80"
                  alt="StudioCraft Assets"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-white">StudioCraft Assets</h4>
                  <CheckCircle2 className="h-4 w-4 text-[#FF7A1A]" />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-amber-400">★ 4.95 (890 reviews)</span>
                  <span>·</span>
                  <span>Digital Software & UI</span>
                </div>
              </div>
            </div>

            <Link
              to="/vendors/vendor-design-1"
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white hover:text-slate-900 transition-all"
            >
              View Store
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
