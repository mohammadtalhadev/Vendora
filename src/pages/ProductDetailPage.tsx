import React, { useState, useId, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  ShieldCheck,
  ShoppingCart,
  Check,
  Heart,
  Bookmark,
  Share2,
  Eye,
  Search,
  MessageSquare,
  Truck,
  Store,
  X,
  ExternalLink,
  AlertTriangle,
  Minus,
  Plus,
  MapPin,
  Shield,
} from 'lucide-react';
import { useProductDetail } from '../features/catalog/hooks/useProducts';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';
import { QueryState } from '../components/common/QueryState';
import { PaymentIcons } from '../features/products/components/PaymentIcons';
import { SendOfferModal } from '../features/products/components/SendOfferModal';
import { LiveChatModal } from '../features/products/components/LiveChatModal';
import { BentoSiliconBanner } from '../features/products/components/BentoSiliconBanner';
import { TechSpecsGrid } from '../features/products/components/TechSpecsGrid';
import { CustomerReviewsShowcase } from '../features/products/components/CustomerReviewsShowcase';
import { CustomersAlsoViewedGrid } from '../features/products/components/CustomersAlsoViewedGrid';
import { TrustValuePropsStrip } from '../features/products/components/TrustValuePropsStrip';

interface ColorChoiceOption {
  id: string;
  name: string;
  finish: string;
  statusBadge: string;
  isPopular?: boolean;
  price: number;
}

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError, error, refetch } = useProductDetail(productId || '');
  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlistStore();

  // Color & Finish choices (matching mockup)
  const colorChoices: ColorChoiceOption[] = useMemo(
    () => [
      {
        id: 'color-desert',
        name: 'Desert Titanium',
        finish: 'Warm Sand Matte Finish',
        statusBadge: 'In Stock',
        price: product?.price ? Math.max(product.price, 4899) : 4899,
      },
      {
        id: 'color-natural',
        name: 'Natural Titanium',
        finish: 'Grade 5 Aerospace Alloy',
        statusBadge: 'Popular',
        isPopular: true,
        price: product?.price ? Math.max(product.price, 4899) : 4899,
      },
      {
        id: 'color-black',
        name: 'Black Titanium',
        finish: 'Deep Space Precision PVD Coated',
        statusBadge: 'Ready to Ship',
        price: product?.price ? Math.max(product.price, 4899) : 4899,
      },
    ],
    [product?.price],
  );

  // Storage capacities
  const storageCapacities = ['256 GB', '512 GB', '1 TB'];

  // State
  const [selectedColorId, setSelectedColorId] = useState<string>('color-natural');
  const [selectedStorage, setSelectedStorage] = useState<string>('256 GB');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [shippingOption, setShippingOption] = useState<'delivery' | 'pickup'>('delivery');
  const [hasProtectionPlan, setHasProtectionPlan] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const protectionPlanId = useId();

  // Handlers
  const handleQuantityChange = (delta: number) => {
    if (!product) return;
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      const max = product.stock > 0 ? product.stock : 99;
      return next > max ? max : next;
    });
  };

  const selectedColor = colorChoices.find((c) => c.id === selectedColorId) || colorChoices[1];
  const unitPrice = selectedColor ? selectedColor.price : (product?.price ? Math.max(product.price, 4899) : 4899);
  const PROTECTION_PLAN_PRICE = 649;
  const originalPrice = unitPrice + 400; // e.g. AED 5,299 vs 4,899
  const totalAmount = unitPrice * quantity + (hasProtectionPlan ? PROTECTION_PLAN_PRICE : 0);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(
      {
        id: `${product.id}-${selectedColorId}-${selectedStorage}`,
        productId: product.id,
        variantId: `${selectedColorId}-${selectedStorage}`,
        title: `${product.title || 'iPhone 16 Pro Max'} (${selectedStorage}, ${selectedColor.name})`,
        price: unitPrice,
        maxStock: product.stock || 25,
        image: displayImages[selectedImageIndex] || displayImages[0],
        sellerId: product.sellerId || 'matrix-store',
        sellerName: product.sellerName || 'Matrix Store',
        sellerType: product.sellerType || 'vendor',
        type: product.type || 'physical',
      },
      quantity,
    );
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const scrollToReviews = () => {
    const el = document.getElementById('reviews-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // High-fidelity image gallery matching mockup slots
  const displayImages = useMemo(() => {
    const fallbackList = [
      '/images/emox/scaled_hero_iphone.png',
      '/images/emox/hero_iphone.png',
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80',
    ];

    if (!product || !product.images || product.images.length === 0) {
      return fallbackList;
    }

    // Merge product images with fallback so we always have at least 4 items
    const combined = [...product.images];
    for (let i = combined.length; i < 4; i++) {
      combined.push(fallbackList[i % fallbackList.length]);
    }
    return combined;
  }, [product]);

  // Dynamic Product Title: use iPhone title if tech/phone or fallback to product title
  const displayTitle = useMemo(() => {
    if (!product) return 'iPhone 16 Pro Max (256GB, Grade 5 Natural Titanium)';
    if (
      product.title.toLowerCase().includes('phone') ||
      product.title.toLowerCase().includes('iphone') ||
      product.title.toLowerCase().includes('titanium')
    ) {
      return `iPhone 16 Pro Max (${selectedStorage}, ${selectedColor.name})`;
    }
    return product.title;
  }, [product, selectedStorage, selectedColor]);

  const displayBrand = product?.brand || 'Apple Official';

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Breadcrumb & Social Proof Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Breadcrumb Trail */}
        <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500">
          <Link to="/products" className="hover:text-slate-800 transition-colors">
            Electronics
          </Link>
          <span className="text-slate-300">&gt;</span>
          <Link to="/products?category=phones" className="hover:text-slate-800 transition-colors">
            Mobile Phones
          </Link>
          <span className="text-slate-300">&gt;</span>
          <span className="text-slate-600">{displayBrand}</span>
          <span className="text-slate-300">&gt;</span>
          <span className="font-bold text-slate-900 line-clamp-1 max-w-[200px] sm:max-w-xs">
            {displayTitle}
          </span>
        </nav>

        {/* Right Social Proof & Interaction Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Watchers pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            <Eye className="h-3.5 w-3.5 text-slate-400" />
            <span>18 people are watching</span>
          </div>

          {/* Wishlist toggle pill */}
          <button
            type="button"
            onClick={() => product && toggleWishlist(product)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
              product && isInWishlist(product.id)
                ? 'border-rose-200 bg-rose-50 text-rose-600'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
            title="Save to wishlist"
          >
            <Heart
              className={`h-3.5 w-3.5 ${
                product && isInWishlist(product.id)
                  ? 'fill-rose-500 text-rose-500'
                  : 'text-slate-400'
              }`}
            />
            <span>{product && isInWishlist(product.id) ? '257' : '256'}</span>
          </button>

          {/* Bookmark pill */}
          <button
            type="button"
            onClick={() => setIsBookmarked((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
              isBookmarked
                ? 'border-blue-200 bg-blue-50 text-blue-600'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
            title="Bookmark item"
          >
            <Bookmark
              className={`h-3.5 w-3.5 ${
                isBookmarked ? 'fill-blue-600 text-blue-600' : 'text-slate-400'
              }`}
            />
            <span>{isBookmarked ? '34' : '33'}</span>
          </button>

          {/* Share button */}
          <button
            type="button"
            onClick={handleShare}
            className="relative flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-2xs hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
            title="Share link"
          >
            <Share2 className="h-3.5 w-3.5" />
            {shareCopied && (
              <span className="absolute -top-7 right-0 rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white shadow-md animate-fade-in whitespace-nowrap">
                Link copied!
              </span>
            )}
          </button>
        </div>
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
            {/* ========================================================= */}
            {/* MAIN 3-COLUMN PRODUCT SHOWCASE                            */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* ========================================================= */}
              {/* COLUMN 1: Gallery & Seller Card (4 cols)                  */}
              {/* ========================================================= */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                {/* Main Dark Image Showcase Frame */}
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#0B0F19] p-6 flex items-center justify-center shadow-md">
                  {/* Top Badges Overlay */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-800/90 px-3 py-1 text-[11px] font-semibold text-slate-200 border border-slate-700/60 shadow-xs">
                        Titanium Grade 5
                      </span>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        In Stock
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 hidden sm:inline-block">
                      Natural Titanium Flagship
                    </span>
                  </div>

                  {/* Centered Product Image */}
                  <img
                    src={displayImages[selectedImageIndex] || displayImages[0]}
                    alt={displayTitle}
                    className="max-h-[85%] max-w-[85%] object-contain transition-transform duration-300 hover:scale-105"
                  />

                  {/* Floating Zoom Button */}
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="absolute bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer z-10"
                    title="Zoom in view"
                    aria-label="Zoom image"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>

                {/* 4-Thumbnail Strip */}
                <div className="grid grid-cols-4 gap-2.5">
                  {displayImages.slice(0, 3).map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all cursor-pointer p-1 ${
                        selectedImageIndex === idx
                          ? 'border-blue-600 bg-[#0B0F19] ring-2 ring-blue-500/30'
                          : 'border-slate-200 bg-[#0B0F19] hover:border-slate-300 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))}

                  {/* 4th Thumbnail: 64+ Gallery Pill Button */}
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="relative aspect-square flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-bold tracking-tight">...</span>
                    <span className="text-[11px] font-bold text-slate-700">64+</span>
                    <span className="text-[10px] text-slate-400 font-medium">gallery</span>
                  </button>
                </div>

                {/* Seller Store Card (Matrix Store) */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/vendors/${product.sellerId || 'matrix'}`}
                          className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {product.sellerName || 'Matrix Store'}
                        </Link>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-500 pt-0.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-slate-800">4.9</span>
                        <span className="text-slate-400 font-normal">(5,417 ratings)</span>
                      </div>
                    </div>
                  </div>

                  {/* Seller Category Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      Apple Authorized
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      Dubai Mall Hub
                    </span>
                  </div>

                  {/* Live Chat conversation box */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Have a question?</h4>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Start conversation with seller
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChatOpen(true)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer active:scale-95"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                      <span>Live chat</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* COLUMN 2: Details & Configuration (5 cols)                */}
              {/* ========================================================= */}
              <div className="lg:col-span-7 xl:col-span-5 space-y-5">
                {/* Brand Accent */}
                <div>
                  <Link
                    to="/products"
                    className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-wide"
                  >
                    {displayBrand}
                  </Link>
                  <h1 className="mt-1 text-2xl lg:text-[26px] font-black text-slate-900 leading-snug tracking-tight">
                    {displayTitle}
                  </h1>
                </div>

                {/* Rating & Review row */}
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="font-extrabold text-slate-900">
                    4.9 <span className="font-medium text-slate-400">(1,842)</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={scrollToReviews}
                    className="font-bold text-slate-800 underline hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    2477 reviews
                  </button>
                </div>

                {/* Quantity Stepper & Limited Quantity Badge */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <span className="text-xs font-bold text-slate-700">Quantity:</span>

                  <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-1.5 py-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      disabled={product.stock > 0 && quantity >= product.stock}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Amber low stock warning pill */}
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Limited quantity available</span>
                  </div>
                </div>

                {/* SELECT COLOR & FINISH */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    SELECT COLOR & FINISH
                  </span>

                  <div className="space-y-2">
                    {colorChoices.map((choice) => {
                      const isSelected = selectedColorId === choice.id;
                      return (
                        <div
                          key={choice.id}
                          onClick={() => setSelectedColorId(choice.id)}
                          className={`cursor-pointer rounded-2xl p-3.5 transition-all ${
                            isSelected
                              ? 'border-2 border-blue-600 bg-blue-50/20 shadow-2xs'
                              : 'border border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4
                                  className={`text-xs font-bold ${
                                    isSelected ? 'text-blue-600' : 'text-slate-900'
                                  }`}
                                >
                                  {choice.name}
                                </h4>
                                {choice.isPopular && isSelected && (
                                  <Check className="h-3.5 w-3.5 text-blue-600 stroke-[3]" />
                                )}
                              </div>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {choice.finish}
                              </p>
                            </div>

                            <div className="text-right">
                              <span
                                className={`text-[11px] font-bold ${
                                  choice.isPopular ? 'text-blue-600' : 'text-slate-500'
                                }`}
                              >
                                {choice.statusBadge}
                              </span>
                              <p className="text-xs font-bold text-slate-900 mt-0.5">
                                AED {choice.price.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Storage Capacity */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-700">Storage Capacity:</span>
                  <div className="flex items-center gap-2.5">
                    {storageCapacities.map((cap) => {
                      const isSelected = selectedStorage === cap;
                      return (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => setSelectedStorage(cap)}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-2 border-blue-600 bg-blue-50/30 text-blue-600 shadow-2xs'
                              : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {cap}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AppleCare+ Protection Checkbox */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <label
                    htmlFor={protectionPlanId}
                    className="flex cursor-pointer items-center gap-2.5 text-xs select-none"
                  >
                    <input
                      id={protectionPlanId}
                      type="checkbox"
                      checked={hasProtectionPlan}
                      onChange={(e) => setHasProtectionPlan(e.target.checked)}
                      className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">
                      2-year AppleCare+ protection plan AED {PROTECTION_PLAN_PRICE.toFixed(2)}
                    </span>
                  </label>
                </div>
              </div>

              {/* ========================================================= */}
              {/* COLUMN 3: Buy Box & Delivery (3 cols on desktop)          */}
              {/* ========================================================= */}
              <div className="lg:col-span-12 xl:col-span-3 space-y-4">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs space-y-4">
                  {/* Delivery Option Cards */}
                  <div className="space-y-2.5">
                    {/* Free 2-day delivery */}
                    <div
                      onClick={() => setShippingOption('delivery')}
                      className={`cursor-pointer rounded-xl p-3 transition-all relative ${
                        shippingOption === 'delivery'
                          ? 'border-2 border-blue-600 bg-blue-50/20'
                          : 'border border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Free 2-day delivery
                          </h4>
                          <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                            Express dispatch to Dubai, Abu Dhabi &amp; Northern Emirates
                          </p>
                        </div>
                        <Truck className="h-4 w-4 text-blue-600 shrink-0" />
                      </div>
                    </div>

                    {/* Free pickup-today */}
                    <div
                      onClick={() => setShippingOption('pickup')}
                      className={`cursor-pointer rounded-xl p-3 transition-all relative ${
                        shippingOption === 'pickup'
                          ? 'border-2 border-blue-600 bg-blue-50/20'
                          : 'border border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Free pickup-today
                          </h4>
                          <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                            In stock at Apple Store Dubai Mall &amp; Mall of the Emirates
                          </p>
                        </div>
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Total Amount & Price Calculation */}
                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-medium text-slate-500">Total amount :</span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                          AED {totalAmount.toLocaleString()}
                        </span>
                        <div className="text-[11px] text-slate-400 line-through">
                          AED {originalPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Icons Row */}
                  <div className="border-t border-slate-100 pt-3">
                    <PaymentIcons />
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-2 pt-1">
                    {/* Primary Solid Blue Add To Cart */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-bold text-white shadow-sm transition-all cursor-pointer active:scale-[0.99] ${
                        addedAnimation
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-[#FF7A1A] hover:bg-[#EA580C]'
                      }`}
                    >
                      {addedAnimation ? (
                        <>
                          <Check className="h-4 w-4 stroke-[3]" />
                          <span>Added to Cart!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          <span>Add to cart</span>
                        </>
                      )}
                    </button>

                    {/* Secondary 1-Click Buy Now */}
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="w-full rounded-full bg-slate-100 hover:bg-slate-200 py-2.5 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                    >
                      Buy Now with 1-Click
                    </button>
                  </div>

                  {/* Have a better price? Send offer */}
                  <div className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs">
                    <span className="text-slate-500">Have a better price?</span>
                    <button
                      type="button"
                      onClick={() => setIsOfferOpen(true)}
                      className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Send offer
                    </button>
                  </div>

                  {/* 1-Year Official Warranty Pill Card */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
                      <Shield className="h-3.5 w-3.5 text-emerald-600 fill-emerald-100" />
                      <span>1-Year Official Apple Warranty</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      14-day hassle-free returns &amp; refund
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* DARK BENTO BANNER: A18 Pro Silicon Groundbreaking Speed   */}
            {/* ========================================================= */}
            <BentoSiliconBanner />

            {/* ========================================================= */}
            {/* TECHNICAL SPECIFICATIONS: 6-Card Spec Grid                */}
            {/* ========================================================= */}
            <TechSpecsGrid />

            {/* ========================================================= */}
            {/* CUSTOMER REVIEWS & RATINGS SHOWCASE                       */}
            {/* ========================================================= */}
            <CustomerReviewsShowcase
              productId={product.id}
              productTitle={displayTitle}
            />

            {/* ========================================================= */}
            {/* CUSTOMERS ALSO VIEWED (ALTERNATIVE FLAGSHIPS)             */}
            {/* ========================================================= */}
            <CustomersAlsoViewedGrid />

            {/* ========================================================= */}
            {/* TRUST VALUE PROPS STRIP (4 CARDS)                         */}
            {/* ========================================================= */}
            <TrustValuePropsStrip />

            {/* ========================================================= */}
            {/* INTERACTIVE MODALS                                        */}
            {/* ========================================================= */}
            {/* 1. Zoom Lightbox Modal */}
            {isZoomOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
                <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl bg-[#0B0F19] p-6 shadow-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(false)}
                    className="absolute top-5 right-5 z-10 rounded-full bg-slate-800/80 p-2 text-white hover:bg-slate-700 transition-colors cursor-pointer"
                    aria-label="Close zoom preview"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <img
                    src={displayImages[selectedImageIndex] || displayImages[0]}
                    alt={displayTitle}
                    className="max-h-[75vh] w-auto rounded-2xl object-contain mx-auto"
                  />
                  <div className="mt-4 flex items-center justify-between px-2 text-xs text-slate-400">
                    <span className="font-bold text-white">{displayTitle}</span>
                    <a
                      href={displayImages[selectedImageIndex] || displayImages[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                    >
                      Open full resolution
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Send Offer Modal */}
            <SendOfferModal
              isOpen={isOfferOpen}
              onClose={() => setIsOfferOpen(false)}
              productTitle={displayTitle}
              currentPrice={unitPrice}
              sellerName={product.sellerName || 'Matrix Store'}
            />

            {/* 3. Live Chat Modal */}
            <LiveChatModal
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              sellerName={product.sellerName || 'Matrix Store'}
            />
          </div>
        )}
      </QueryState>
    </div>
  );
};
