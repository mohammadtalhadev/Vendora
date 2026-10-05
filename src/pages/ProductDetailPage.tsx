import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, ShieldCheck, Truck, ShoppingCart, ArrowLeft, Download, Check } from 'lucide-react';
import { useProductDetail } from '../features/catalog/hooks/useProducts';
import { useCartStore } from '../store/cart-store';
import { QueryState } from '../components/common/QueryState';
import { Badge } from '../components/ui/badge';

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError, error, refetch } = useProductDetail(productId || '');
  const { addItem } = useCartStore();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addedAnimation, setAddedAnimation] = useState(false);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      id: selectedVariantId ? `${product.id}-${selectedVariantId}` : product.id,
      productId: product.id,
      variantId: selectedVariantId || undefined,
      title: product.title,
      price: product.price,
      maxStock: product.stock,
      image: product.images[selectedImageIndex] || product.images[0],
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sellerType: product.sellerType,
      type: product.type,
    });
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6">
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to catalog</span>
        </Link>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        errorMessage={error?.message}
        onRetry={refetch}
        isEmpty={!product}
        emptyTitle="Product not found"
      >
        {product && (
          <div>
            {/* Top Grid: Gallery + Sticky Buy Box */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Media Gallery (7 cols) */}
              <div className="lg:col-span-7">
                <div className="overflow-hidden rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm">
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-50">
                    <img
                      src={product.images[selectedImageIndex] || product.images[0]}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                    {product.type === 'digital' && (
                      <div className="absolute top-4 left-4">
                        <Badge variant="vendor-verified">Digital Asset License</Badge>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Selector */}
                  {product.images.length > 1 && (
                    <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                      {product.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition-all ${
                            selectedImageIndex === idx
                              ? 'border-[#FF7A1A] shadow-md scale-105'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Purchase Box (5 cols) */}
              <div className="lg:col-span-5">
                <div className="card-near-solid p-6 shadow-sm">
                  {/* Seller Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    {product.sellerType === 'platform' ? (
                      <Badge variant="vendora-platform">Sold directly by Vendora</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Sold by:</span>
                        <Link
                          to={`/vendors/${product.sellerId}`}
                          className="text-xs font-bold text-slate-800 hover:text-[#FF7A1A] underline"
                        >
                          {product.sellerName}
                        </Link>
                      </div>
                    )}
                    <span className="text-xs text-emerald-600 font-semibold">Verified Listing</span>
                  </div>

                  {/* Title & Ratings */}
                  <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {product.title}
                  </h1>

                  <div className="mt-2 flex items-center gap-2 text-sm text-amber-500">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="font-bold text-slate-800">{product.rating}</span>
                    <span className="text-xs text-slate-400">({product.reviewCount} customer reviews)</span>
                  </div>

                  {/* Pricing */}
                  <div className="mt-6 flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-slate-900">${product.price.toFixed(2)}</span>
                    {product.compareAtPrice && (
                      <span className="text-base text-slate-400 line-through">
                        ${product.compareAtPrice.toFixed(2)}
                      </span>
                    )}
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <Badge variant="discount-coral">
                        Save ${(product.compareAtPrice - product.price).toFixed(2)}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-4 text-xs leading-relaxed text-slate-600">{product.description}</p>

                  {/* Variants (if applicable) */}
                  {product.variants.length > 0 && (
                    <div className="mt-6">
                      <span className="text-xs font-bold text-slate-700">Choose Option:</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.variants.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVariantId(v.id)}
                            className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                              selectedVariantId === v.id
                                ? 'border-[#FF7A1A] bg-orange-50 text-orange-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fulfillment Info */}
                  <div className="mt-6 space-y-2 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                    {product.type === 'physical' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-slate-700" />
                          <span>Ships within 24h · Free shipping on orders over $100</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-slate-700" />
                          <span>14-day hassle-free return window</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4 text-cyan-700" />
                          <span>Instant digital download upon payment confirmation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-cyan-700" />
                          <span>Unique simulated license key generated on order</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* CTAs */}
                  <div className="mt-8 flex flex-col gap-3">
                    <button
                      onClick={handleAddToCart}
                      className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white shadow-lg transition-all ${
                        addedAnimation ? 'bg-emerald-600' : 'bg-[#FF7A1A] hover:bg-[#EA6C13]'
                      }`}
                    >
                      {addedAnimation ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Added to Cart!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleBuyNow}
                      className="w-full rounded-full bg-slate-900 py-3.5 text-sm font-bold text-white shadow-md hover:bg-slate-800"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Independent Details & Review Sections Below */}
            <div className="mt-14 space-y-8">
              {/* Product Specifications */}
              <div className="card-near-solid p-6">
                <h3 className="text-lg font-bold text-slate-900">Technical Specifications</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                  <div className="flex justify-between border-b border-slate-100 py-2">
                    <span className="text-slate-400">Brand</span>
                    <span className="font-semibold text-slate-800">{product.brand}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-2">
                    <span className="text-slate-400">Category</span>
                    <span className="font-semibold text-slate-800">{product.category}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-2">
                    <span className="text-slate-400">Type</span>
                    <span className="font-semibold text-slate-800 uppercase">{product.type}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-2">
                    <span className="text-slate-400">Fulfillment</span>
                    <span className="font-semibold text-slate-800">
                      {product.sellerType === 'platform' ? 'Vendora Warehouse' : 'Vendor Dispatch'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Reviews Section */}
              <div className="card-near-solid p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Customer Reviews</h3>
                  <Badge variant="in-stock">100% Verified Purchases</Badge>
                </div>

                <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="flex flex-col items-center justify-center rounded-2xl bg-amber-50/50 p-6 border border-amber-200/50 text-center">
                    <span className="text-4xl font-extrabold text-amber-600">{product.rating}</span>
                    <div className="mt-2 flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="mt-1 text-xs text-slate-500">Based on {product.reviewCount} ratings</span>
                  </div>

                  <div className="flex-1 space-y-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-500">5 stars</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-amber-400 w-[85%]" />
                      </div>
                      <span className="w-8 text-right font-medium text-slate-600">85%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-500">4 stars</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-amber-400 w-[12%]" />
                      </div>
                      <span className="w-8 text-right font-medium text-slate-600">12%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-500">3 stars</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-amber-400 w-[3%]" />
                      </div>
                      <span className="w-8 text-right font-medium text-slate-600">3%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
};
