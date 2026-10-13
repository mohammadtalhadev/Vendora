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
  Sparkles,
  Play,
} from 'lucide-react';
import { useProductDetail } from '../features/catalog/hooks/useProducts';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';
import { useCurrency } from '../store/currency-store';
import { QueryState } from '../components/common/QueryState';
import { PaymentIcons } from '../features/products/components/PaymentIcons';
import { SendOfferModal } from '../features/products/components/SendOfferModal';
import { LiveChatModal } from '../features/products/components/LiveChatModal';
import { OtherOffersSection, type MerchantOffer } from '../features/products/components/OtherOffersSection';
import { ProductDossierSection } from '../features/products/components/ProductDossierSection';
import { CustomerReviewsShowcase } from '../features/products/components/CustomerReviewsShowcase';
import { CustomersAlsoViewedGrid } from '../features/products/components/CustomersAlsoViewedGrid';

interface VariantChoice {
  id: string;
  title: string;
  subtitle: string;
  description: string;
}

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError, error, refetch } = useProductDetail(productId || '');
  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const { formatPrice } = useCurrency();

  // Price & Seller Selection State
  const basePrice = product?.price ?? 0;
  const [selectedOffer, setSelectedOffer] = useState<{ sellerName: string; price: number } | null>(null);

  // Variant Choice Options
  const choiceOptions: VariantChoice[] = useMemo(() => {
    const isSkincare =
      !product?.title ||
      product.title.toLowerCase().includes('cleanser') ||
      product.title.toLowerCase().includes('cream') ||
      product.title.toLowerCase().includes('skin') ||
      product.title.toLowerCase().includes('serum') ||
      product.category?.toLowerCase().includes('beauty');

    if (isSkincare) {
      return [
        {
          id: 'choice-oily',
          title: 'Normal to Oily',
          subtitle: 'Matte Finish',
          description: 'Lightweight oil-control barrier protection',
        },
        {
          id: 'choice-dry',
          title: 'Normal to Dry',
          subtitle: 'Hydrating Formula',
          description: 'Deep moisture replenishment with ceramides',
        },
      ];
    }

    const isTech =
      product.title.toLowerCase().includes('phone') ||
      product.title.toLowerCase().includes('iphone') ||
      product.category?.toLowerCase().includes('electronics');

    if (isTech) {
      return [
        {
          id: 'choice-standard',
          title: 'Natural Titanium',
          subtitle: '256 GB',
          description: 'Aerospace Grade 5 Alloy',
        },
        {
          id: 'choice-pro',
          title: 'Black Titanium',
          subtitle: '512 GB',
          description: 'Deep Space PVD Coated',
        },
      ];
    }

    return [
      {
        id: 'choice-standard',
        title: 'Standard Edition',
        subtitle: 'Factory Sealed',
        description: 'Authentic verified packaging',
      },
      {
        id: 'choice-pro',
        title: 'Deluxe Package',
        subtitle: 'Extended Bundle',
        description: 'Includes bundle accessories',
      },
    ];
  }, [product]);

  // State
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>('choice-dry');
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

  const selectedChoice = choiceOptions.find((c) => c.id === selectedChoiceId) || choiceOptions[0];
  const unitPrice = selectedOffer ? selectedOffer.price : basePrice;
  const currentSellerName = selectedOffer
    ? selectedOffer.sellerName
    : product?.sellerName?.trim() || 'Vendora Seller';
  // Protection plan: an explicitly-labelled add-on with a single clear price, no invented market comparison.
  const PROTECTION_PLAN_PRICE = 14.99;
  // The strikethrough "was" price comes only from the real `compare_at_price` column, never a fabricated markup.
  const compareAtPrice = product?.compareAtPrice;
  const hasRealSavings = compareAtPrice !== undefined && compareAtPrice > unitPrice;
  const totalAmount = unitPrice * quantity + (hasProtectionPlan ? PROTECTION_PLAN_PRICE : 0);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(
      {
        id: `${product.id}-${selectedChoiceId}`,
        productId: product.id,
        variantId: selectedChoiceId,
        title: `${product.title} (${selectedChoice.title})`,
        price: unitPrice,
        compareAtPrice: product.compareAtPrice,
        maxStock: product.stock,
        image: displayImages[selectedImageIndex] || displayImages[0],
        sellerId: product.sellerId,
        sellerName: currentSellerName,
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

  // Product image gallery source list
  const displayImages = useMemo(() => {
    const fallback = '/images/products/prod_silver_headphones.jpg';
    const list: string[] = product?.images?.length ? [...product.images] : [fallback];
    while (list.length < 4) list.push(list[list.length - 1]);
    return list;
  }, [product]);

  const displayTitle = product?.title ?? 'Product';

  const displayBrand = product?.brand ?? 'Vendora';

  const displayRating = product?.rating ?? 0;
  const displayReviews = product?.reviewCount ?? 0;
  const hasReviews = displayReviews > 0;

  const categoryLabel = (product?.category ?? '')
    .replace(/^cat-/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Products';

  const sellerTags = useMemo(() => {
    const tags = [categoryLabel, displayBrand];
    if (product?.type === 'digital') tags.push('Instant Download');
    return [...new Set(tags.filter(Boolean))];
  }, [categoryLabel, displayBrand, product?.type]);

  // Marketing Headline & Summary
  const marketingHeadline = useMemo(() => {
    return 'Product Overview';
  }, []);

  const marketingDescription = useMemo(() => {
    if (product?.description && product.description.trim().length > 0) {
      return product.description;
    }
    return 'High-quality verified item sourced through certified vendors with buyer protection and hassle-free returns.';
  }, [product?.description]);

  const productKeyFacts = useMemo(() => {
    const facts = [
      { label: 'Brand', value: displayBrand || 'Vendora Verified' },
      { label: 'Category', value: categoryLabel || 'General Catalog' },
      { label: 'Item Type', value: product?.type === 'digital' ? 'Digital Download (Instant Delivery)' : 'Physical Merchandise' },
      { label: 'Condition', value: 'Brand New (Original Factory Packaging)' },
      { label: 'Authenticity', value: '100% Genuine & Verified by Vendora' },
      { label: 'Return Window', value: '30 Days Money-Back Guarantee' },
      { label: 'Warranty', value: '1 Year Manufacturer / Vendor Warranty' },
      { label: 'Shipping & Handling', value: product?.type === 'digital' ? 'Instant Download Link' : 'Tracked & Insured Courier' },
    ];
    const sku = product?.variants?.[0]?.sku;
    if (sku) {
      facts.unshift({ label: 'SKU / Model', value: sku });
    }
    return facts;
  }, [displayBrand, categoryLabel, product?.type, product?.variants]);

  return (
    <div className="relative min-h-screen bg-slate-50/70 dark:bg-[#0b1120] py-6 px-4 sm:px-6 lg:px-8 transition-colors duration-200 overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="ambient-glow-wrapper" aria-hidden="true">
        <div className="ambient-orb-orange -top-24 -left-24 opacity-40" />
        <div className="ambient-orb-aqua top-1/3 -right-32 opacity-40" />
        <div className="ambient-orb-indigo bottom-10 left-1/3 opacity-30" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px]">

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
            {/* Top Breadcrumb & Social Proof Bar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Breadcrumb Trail */}
            <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500">
              <Link to="/products" className="hover:text-slate-800 transition-colors">
                {categoryLabel}
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
              {/* Wishlist toggle pill */}
              <button
                type="button"
                onClick={() => product && toggleWishlist(product)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                  product && isInWishlist(product.id)
                    ? 'border-rose-200 bg-rose-50 text-rose-600'
                    : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300'
                }`}
                title="Save to wishlist"
                aria-label={product && isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${
                    product && isInWishlist(product.id)
                      ? 'fill-rose-500 text-rose-500'
                      : 'text-slate-400'
                  }`}
                />
                <span>{product && isInWishlist(product.id) ? 'Saved' : 'Save'}</span>
              </button>

              {/* Bookmark pill */}
              <button
                type="button"
                onClick={() => setIsBookmarked((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                  isBookmarked
                    ? 'border-orange-200 bg-orange-50 text-[#FF7A1A]'
                    : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300'
                }`}
                title="Bookmark item"
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark item'}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${
                    isBookmarked ? 'fill-[#FF7A1A] text-[#FF7A1A]' : 'text-slate-400'
                  }`}
                />
                <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>

              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                className="relative flex items-center justify-center rounded-full border border-slate-200/80 bg-white p-2 text-slate-600 shadow-2xs hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                title="Share link"
                aria-label="Copy product link to clipboard"
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
            {/* ========================================================= */}
            {/* MAIN 3-COLUMN PRODUCT HERO                                */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* ========================================================= */}
              {/* COLUMN 1: Gallery & Seller Card (4 cols)                  */}
              {/* ========================================================= */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                {/* Main Image Showcase Frame */}
                <div className="glass-panel relative aspect-square w-full overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 p-6 flex items-center justify-center shadow-xl">
                  {/* Top Badges Overlay */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 shadow-2xs border ${
                        product.stock > 0
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          product.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      100% Authentic
                    </span>
                  </div>

                  {/* Centered Product Image */}
                  <img
                    src={displayImages[selectedImageIndex] || displayImages[0]}
                    alt={displayTitle}
                    className="max-h-[88%] max-w-[88%] object-contain transition-transform duration-300 hover:scale-105"
                  />

                  {/* Floating Zoom Button */}
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="absolute bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-md hover:text-[#FF7A1A] hover:scale-105 active:scale-95 transition-all cursor-pointer z-10 border border-slate-200/80"
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
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all cursor-pointer p-1.5 bg-white ${
                        selectedImageIndex === idx
                          ? 'border-[#FF7A1A] ring-2 ring-orange-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))}

                  {/* 4th Thumbnail: Video Demo / Preview Play Button */}
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="relative aspect-square flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer overflow-hidden group p-1"
                  >
                    <img
                      src={displayImages[3] || displayImages[0]}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-60 group-hover:scale-105 transition-transform"
                    />
                    <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-xs text-[#FF7A1A]">
                      <Play className="h-3 w-3 fill-[#FF7A1A] ml-0.5" />
                    </div>
                  </button>
                </div>

                {/* Seller Store Card */}
                <div className="glass-panel rounded-3xl border border-white/80 dark:border-white/10 p-5 shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF7A1A]">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={`/vendors/${product.sellerId}`}
                          className="font-bold text-sm text-slate-900 hover:text-[#FF7A1A] transition-colors truncate"
                        >
                          {currentSellerName}
                        </Link>
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-[#00B8C8] border border-cyan-200/60">
                          <ShieldCheck className="h-3 w-3 text-[#00B8C8]" />
                          Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-500 pt-0.5">
                        {hasReviews ? (
                          <>
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-slate-800">{displayRating.toFixed(1)}</span>
                            <span className="text-slate-400 font-normal">({displayReviews.toLocaleString()})</span>
                          </>
                        ) : (
                          <span className="text-slate-400">No reviews yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Seller attribute pills, derived from the actual product */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {sellerTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Live Chat conversation invite */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Have a question?</h4>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Start conversation with seller
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChatOpen(true)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-[#FF7A1A] hover:text-[#FF7A1A] transition-all cursor-pointer active:scale-95"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-[#FF7A1A]" />
                      <span>Live chat</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* COLUMN 2: Details & Configuration (5 cols)                */}
              {/* ========================================================= */}
              <div className="lg:col-span-7 xl:col-span-5 space-y-4">
                {/* Brand Accent */}
                <div>
                  <Link
                    to="/products"
                    className="text-xs font-bold text-[#FF7A1A] hover:underline uppercase tracking-wide"
                  >
                    {displayBrand}
                  </Link>
                  <h1 className="font-outfit mt-1 text-2xl lg:text-[28px] font-black text-slate-900 leading-snug tracking-tight">
                    {displayTitle}
                  </h1>
                </div>

                {/* Rating & Review row */}
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          hasReviews && i < Math.round(displayRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-slate-200 text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  {hasReviews ? (
                    <>
                      <span className="font-extrabold text-slate-900">
                        {displayRating.toFixed(1)}{' '}
                        <span className="font-medium text-slate-400">({displayReviews.toLocaleString()})</span>
                      </span>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={scrollToReviews}
                        className="font-bold text-slate-800 underline hover:text-[#FF7A1A] transition-colors cursor-pointer"
                      >
                        {displayReviews.toLocaleString()} reviews
                      </button>
                    </>
                  ) : (
                    <span className="font-semibold text-slate-400">No reviews yet — be the first to review</span>
                  )}
                </div>

                {/* ── Marketing Summary / Highlight Section ── */}
                <div className="rounded-2xl border border-orange-200/70 bg-gradient-to-r from-orange-50/70 via-amber-50/30 to-white p-4 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#FF7A1A]">
                    <Sparkles className="h-3.5 w-3.5 text-[#FF7A1A] shrink-0" />
                    <span>{marketingHeadline}</span>
                  </div>
                  <p className="text-xs sm:text-[13px] leading-relaxed text-slate-700 font-medium">
                    {marketingDescription}
                  </p>
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

                  {/* Amber low stock warning pill — only when the real row stock supports it */}
                  {product.stock > 0 && product.stock <= 10 && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>Only {product.stock} left in stock</span>
                    </div>
                  )}
                </div>

                {/* Choice / Variant Cards */}
                <div className="space-y-2.5 pt-1" role="group" aria-label="Edition options">
                  {choiceOptions.map((choice) => {
                    const isSelected = selectedChoiceId === choice.id;
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => setSelectedChoiceId(choice.id)}
                        aria-pressed={isSelected}
                        className={`w-full cursor-pointer rounded-2xl p-3.5 text-left transition-all ${
                          isSelected
                            ? 'border-2 border-[#FF7A1A] bg-orange-50/20 shadow-2xs'
                            : 'border border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          <span className="block">
                            <span
                              className={`block text-xs font-bold ${
                                isSelected ? 'text-[#FF7A1A]' : 'text-slate-900'
                              }`}
                            >
                              {choice.title}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-slate-500">
                              {choice.subtitle}
                            </span>
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {choice.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Protection Plan Checkbox */}
                <div className="pt-1">
                  <label
                    htmlFor={protectionPlanId}
                    className="flex cursor-pointer items-center gap-2.5 text-xs select-none"
                  >
                    <input
                      id={protectionPlanId}
                      type="checkbox"
                      checked={hasProtectionPlan}
                      onChange={(e) => setHasProtectionPlan(e.target.checked)}
                      className="h-4 w-4 rounded-md border-slate-300 text-[#FF7A1A] accent-[#FF7A1A] focus:ring-[#FF7A1A] cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800">
                      2-year protection plan {formatPrice(PROTECTION_PLAN_PRICE)}
                    </span>
                  </label>
                </div>
              </div>

              {/* ========================================================= */}
              {/* COLUMN 3: Buy Box & Delivery */}
              {/* ========================================================= */}
              <div className="lg:col-span-12 xl:col-span-3 space-y-4">
                <div className="glass-panel-elevated rounded-3xl border border-white/90 dark:border-white/15 p-5 shadow-2xl space-y-4">
                  {/* Delivery Option Cards */}
                  <div className="space-y-2.5" role="group" aria-label="Delivery options">
                    {/* Delivery — label derived from the real freeShipping flag, no invented SLA */}
                    <button
                      type="button"
                      onClick={() => setShippingOption('delivery')}
                      aria-pressed={shippingOption === 'delivery'}
                      className={`w-full cursor-pointer rounded-xl p-3 transition-all relative text-left ${
                        shippingOption === 'delivery'
                          ? 'border-2 border-[#FF7A1A] bg-orange-50/20'
                          : 'border border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-start justify-between">
                        <span className="block">
                          <span className="block text-xs font-bold text-slate-900">
                            {product?.shippingSettings?.freeShipping ? 'Free delivery' : 'Standard delivery'}
                          </span>
                          <span className="mt-1 block text-[11px] text-slate-500 leading-tight">
                            {product?.shippingSettings?.freeShipping
                              ? 'Free shipping on this item'
                              : 'Shipping calculated at checkout'}
                          </span>
                        </span>
                        <Truck className="h-4 w-4 text-[#FF7A1A] shrink-0" />
                      </span>
                    </button>

                    {/* Pickup — availability derived from the real stock number */}
                    <button
                      type="button"
                      onClick={() => setShippingOption('pickup')}
                      aria-pressed={shippingOption === 'pickup'}
                      className={`w-full cursor-pointer rounded-xl p-3 transition-all relative text-left ${
                        shippingOption === 'pickup'
                          ? 'border-2 border-[#FF7A1A] bg-orange-50/20'
                          : 'border border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-start justify-between">
                        <span className="block">
                          <span className="block text-xs font-bold text-slate-900">Store pickup</span>
                          <span className="mt-1 block text-[11px] text-slate-500 leading-tight">
                            {product.stock > 0
                              ? `Collect from ${currentSellerName} when prepared`
                              : 'Unavailable for pickup'}
                          </span>
                        </span>
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      </span>
                    </button>
                  </div>

                  {/* Total Amount & Price Calculation */}
                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-medium text-slate-500">Total amount:</span>
                      <div className="text-right">
                        <span className="font-outfit text-2xl font-black text-slate-900 tracking-tight">
                          {formatPrice(totalAmount)}
                        </span>
                        {hasRealSavings && compareAtPrice !== undefined && (
                          <div className="text-[11px] text-slate-400 line-through">
                            {formatPrice(compareAtPrice)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Icons Row */}
                  <div className="border-t border-slate-100 pt-3">
                    <PaymentIcons />
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-2 pt-1">
                    {/* Primary Solid Sun Orange Add To Cart */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-bold text-white shadow-sm transition-all cursor-pointer active:scale-[0.99] ${
                        addedAnimation
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-[#FF7A1A] hover:bg-[#EA580C] shadow-orange-glow/40'
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
                      className="font-bold text-[#FF7A1A] hover:text-[#EA580C] hover:underline cursor-pointer"
                    >
                      Send offer
                    </button>
                  </div>

                  {/* Official Warranty Card */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
                      <Shield className="h-3.5 w-3.5 text-emerald-600 fill-emerald-100" />
                      <span>1-Year Official Warranty</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      14-day hassle-free returns &amp; refund
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* OTHER OFFERS FOR THIS ITEM                                */}
            {/* Renders only real seller offers; hidden when none exist.  */}
            {/* ========================================================= */}
            <OtherOffersSection
              currentSellerId={product.sellerId}
              currentSellerName={product.sellerName}
              onSelectSeller={(offer: MerchantOffer) =>
                setSelectedOffer({ sellerName: offer.sellerName, price: offer.itemPrice })
              }
            />

            {/* ========================================================= */}
            {/* PRODUCT DOSSIER & SPECIFICATIONS                          */}
            {/* ========================================================= */}
            <ProductDossierSection
              title="Full Product Description"
              category={product.category}
              mechanismHeadline={
                product.category?.toLowerCase().includes('skincare') || product.category?.toLowerCase().includes('beauty')
                  ? 'Product Overview & Specifications'
                  : 'Product Overview & Key Features'
              }
              mechanismText={
                product.description ||
                'High-quality verified item sourced through certified vendors with buyer protection and quality assurance.'
              }
              keyFacts={productKeyFacts}
            />

            {/* ========================================================= */}
            {/* CUSTOMER REVIEWS & RATINGS SHOWCASE                       */}
            {/* ========================================================= */}
            <CustomerReviewsShowcase
              productId={product.id}
              productTitle={displayTitle}
            />

            {/* ========================================================= */}
            {/* CUSTOMERS ALSO VIEWED                                     */}
            {/* ========================================================= */}
            <CustomersAlsoViewedGrid excludeId={product.id} />

            {/* ========================================================= */}
            {/* INTERACTIVE MODALS                                        */}
            {/* ========================================================= */}
            {/* 1. Zoom Lightbox Modal */}
            {isZoomOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
                <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(false)}
                    className="absolute top-5 right-5 z-10 rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                    aria-label="Close zoom preview"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <img
                    src={displayImages[selectedImageIndex] || displayImages[0]}
                    alt={displayTitle}
                    className="max-h-[75vh] w-auto rounded-2xl object-contain mx-auto"
                  />
                  <div className="mt-4 flex items-center justify-between px-2 text-xs text-slate-500">
                    <span className="font-bold text-slate-900">{displayTitle}</span>
                    <a
                      href={displayImages[selectedImageIndex] || displayImages[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#FF7A1A] hover:underline"
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
              sellerName={currentSellerName}
            />

            {/* 3. Live Chat Modal */}
            <LiveChatModal
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              sellerName={currentSellerName}
              sellerId={product.sellerId}
              productId={product.id}
            />
          </div>
        )}
      </QueryState>
      </div>
    </div>
  );
};
