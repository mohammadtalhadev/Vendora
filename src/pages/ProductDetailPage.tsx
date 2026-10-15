import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  ShieldCheck,
  ShoppingCart,
  Heart,
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
  ArrowLeftRight,
} from 'lucide-react';
import { useProductDetail } from '../features/catalog/hooks/useProducts';
import { recordRecentlyViewed } from '../features/catalog/recently-viewed';
import { variantPrice as resolveVariantPrice } from '../features/catalog/api/product-row';
import { useCartStore } from '../store/cart-store';
import { useWishlistStore } from '../store/wishlist-store';
import { useCompareStore } from '../store/compare-store';
import { useToast } from '../hooks/useToast';
import { useOverlayA11y } from '../hooks/useOverlayA11y';
import { Toast } from '../components/common/Toast';
import { openCartDrawer } from '../features/cart/open-cart';
import { formatDeliveryWindow, resolveDeliveryRange } from '../lib/delivery-estimate';
import { useSellerDeliveryTimes } from '../features/delivery/hooks/useDeliveryTimes';
import type { Variant } from '../types/domain';
import { useCurrency } from '../store/currency-store';
import { QueryState } from '../components/common/QueryState';
import { Button } from '../components/ui/button';
import { PaymentIcons } from '../features/products/components/PaymentIcons';
import { SendOfferModal } from '../features/products/components/SendOfferModal';
import { LiveChatModal } from '../features/products/components/LiveChatModal';
import { OtherOffersSection, type MerchantOffer } from '../features/products/components/OtherOffersSection';
import { ProductDossierSection } from '../features/products/components/ProductDossierSection';
import { useReveal } from '../hooks/useReveal';
import { CustomerReviewsShowcase } from '../features/products/components/CustomerReviewsShowcase';
import { ProductSectionNav, ProductQuickAddPill, AddedBurstIcon } from '../features/products/components/PdpStickyBars';
import { StoreLogo } from '../features/vendor/components/StoreLogo';
import { useProductReviews } from '../features/reviews/hooks/useReviews';
import { ProductsYouMayLikeGrid } from '../features/products/components/ProductsYouMayLikeGrid';
import type { ProductItem } from '../features/products/components/ProductCard';

/**
 * The attribute map of one listed variant. Current rows carry `attributes`;
 * a minority of older rows carry the same map under `options` (the schema v2
 * backfill reads both), so the picker reads both rather than dropping them.
 */
function variantAttributes(variant: Variant): Record<string, string> {
  const raw = variant as unknown as {
    attributes?: Record<string, string>;
    options?: Record<string, string>;
  };
  return raw.attributes ?? raw.options ?? {};
}

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  useReveal();
  const navigate = useNavigate();
  const { data: product, isLoading, isError, error, refetch } = useProductDetail(productId || '');

  // Recently Viewed: snapshot this product into the browser-local history.
  useEffect(() => {
    if (product) recordRecentlyViewed(product);
  }, [product]);

  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const { formatPrice } = useCurrency();
  const { toast, showToast, hideToast } = useToast();

  // Compare — the toggle the compare page and navbar badge always assumed existed.
  const compareItems = useCompareStore((s) => s.items);
  const addToCompare = useCompareStore((s) => s.addItem);
  const removeFromCompare = useCompareStore((s) => s.removeItem);
  const isCompared = product ? compareItems.some((item) => item.id === product.id) : false;

  const handleToggleCompare = () => {
    if (!product) return;
    if (isCompared) {
      removeFromCompare(product.id);
      showToast(`Removed ${product.title} from compare`, 'info');
      return;
    }
    if (addToCompare(product)) {
      showToast(`Added ${product.title} to compare`);
    } else {
      showToast('Compare is full — remove a product before adding another (max 4).', 'error');
    }
  };

  // Price & Seller Selection State
  const basePrice = product?.price ?? 0;
  const [selectedOffer, setSelectedOffer] = useState<{ sellerName: string; price: number } | null>(null);

  // Real variants — the only options offered are the rows the seller actually
  // listed, from the product's variants jsonb: the same ids (and prices) the
  // cart and place_order resolve against. Nothing is generated from the title.
  const listedVariants = useMemo(() => product?.variants ?? [], [product]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const selectedVariant: Variant | null =
    listedVariants.find((v) => v.id === selectedVariantId) ??
    listedVariants.find((v) => v.stock > 0) ??
    listedVariants[0] ??
    null;
  const variantAttributeKeys = useMemo(
    () => [...new Set(listedVariants.flatMap((v) => Object.keys(variantAttributes(v))))],
    [listedVariants],
  );
  const variantPickerLabel =
    variantAttributeKeys.length === 1 ? variantAttributeKeys[0] : 'Options';

  // State
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [shippingOption, setShippingOption] = useState<'delivery' | 'pickup'>('delivery');
  const [shareCopied, setShareCopied] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const zoomPanelRef = useOverlayA11y<HTMLDivElement>(isZoomOpen, () => setIsZoomOpen(false));
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Batch 121 — desktop quick-add pill: shown only once the buy box has
  // scrolled up out of view (same rule as Ronin's sticky bar). The mobile
  // sticky buy bar below is untouched and covers small screens.
  const buyBoxRef = useRef<HTMLDivElement>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  useEffect(() => {
    if (!buyBoxRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowQuickAdd(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(buyBoxRef.current);
    return () => observer.disconnect();
    // Re-run when the product arrives: the buy box only mounts after the
    // detail query resolves, so a mount-only effect would never observe it.
  }, [product]);

  // The selected variant carries its own stock; another seller's offer and a
  // variant-less product fall back to the product row's stock.
  const effectiveStock = selectedOffer
    ? (product?.stock ?? 0)
    : selectedVariant
      ? selectedVariant.stock
      : (product?.stock ?? 0);

  // Handlers
  const handleQuantityChange = (delta: number) => {
    if (!product) return;
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      const max = effectiveStock > 0 ? effectiveStock : 99;
      return next > max ? max : next;
    });
  };

  // A variant resolves its own price through the same helper the cart prices
  // lines with; an accepted offer from another seller overrides it, as before.
  const variantUnitPrice = product ? resolveVariantPrice(product, selectedVariant?.id) : basePrice;
  const unitPrice = selectedOffer ? selectedOffer.price : variantUnitPrice;
  const currentSellerName = selectedOffer
    ? selectedOffer.sellerName
    : product?.sellerName?.trim() || 'Vendora Seller';
  // The strikethrough "was" price comes only from the real `compare_at_price` column, never a fabricated markup.
  const compareAtPrice = product?.compareAtPrice;
  const hasRealSavings = compareAtPrice !== undefined && compareAtPrice > unitPrice;
  const totalAmount = unitPrice * quantity;

  /** The cart line this page's current selection (variant / accepted offer) names. */
  const buildSelectedLine = () => {
    if (!product) return null;
    // An offer line belongs to another seller's listing, whose variants are
    // not this page's — it carries no variant id rather than this seller's.
    const lineVariant = selectedOffer ? null : selectedVariant;
    return {
      id: lineVariant ? `${product.id}-${lineVariant.id}` : product.id,
      productId: product.id,
      variantId: lineVariant?.id,
      title: lineVariant ? `${product.title} (${lineVariant.name})` : product.title,
      price: unitPrice,
      compareAtPrice: product.compareAtPrice,
      maxStock: effectiveStock,
      image: displayImages[selectedImageIndex] || displayImages[0],
      sellerId: product.sellerId,
      sellerName: currentSellerName,
      sellerType: product.sellerType || 'vendor',
      type: product.type || 'physical',
    };
  };

  const handleAddToCart = (openDrawer = true) => {
    const line = buildSelectedLine();
    if (!line) return;
    addItem(line, quantity);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
    if (openDrawer) openCartDrawer();
  };

  // Card handlers for the "Products You May Like" rail — the same wiring
  // HomePage gives the shared ProductCard: cart lines carry the card item's
  // own seller/price, wishlist toggles carry a full product shape.
  const handleCardAddToCart = (item: ProductItem) => {
    addItem({
      id: item.id,
      productId: item.id,
      title: item.title,
      price: item.price,
      maxStock: item.maxStock,
      image: item.image,
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      sellerType: item.sellerType,
      type: item.type,
    });
    showToast(`Added ${item.title} to cart`);
  };

  const handleCardToggleWishlist = (item: ProductItem) => {
    const wasWishlisted = isInWishlist(item.id);
    toggleWishlist({
      id: item.id,
      title: item.title,
      slug: item.id,
      description: item.title,
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      images: [item.image],
      category: item.category,
      brand: 'Vendora',
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      sellerType: item.sellerType,
      type: item.type,
      stock: item.stock,
      rating: item.rating,
      reviewCount: item.reviewCount,
      variants: [],
      status: 'approved',
      createdAt: new Date().toISOString(),
    });
    showToast(wasWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  /**
   * Buy Now goes straight to checkout with the selection at exactly the
   * quantity picked here. It must never stack onto a line the cart already
   * holds (the old handler re-added, turning 2 units into 4, and then
   * detoured through the cart page): an existing line is SET to the picked
   * quantity, a missing one is added at it. Note checkout itself books
   * the stored cart — `place_order` prices `cart_lines_for(auth.uid())`
   * and takes no line items — so "exactly this item alone" cannot be
   * booked without replacing the customer's cart, which Buy Now must not
   * do; what it guarantees is this line, at this quantity, and no detour.
   */
  const handleBuyNow = () => {
    const line = buildSelectedLine();
    if (!line) return;
    const existing = useCartStore.getState().items.find((item) => item.id === line.id);
    if (existing) {
      if (existing.quantity !== quantity) {
        void useCartStore.getState().updateQuantity(line.id, quantity);
      }
    } else {
      void addItem(line, quantity);
    }
    navigate('/checkout');
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

  // Product image gallery source list — exactly the images the seller
  // uploaded. The list used to be padded to four by repeating the last
  // image, which filled the thumbnail strip with duplicates of the same
  // photo (and a fake "video" tile); a product with one image now shows
  // one image and no strip.
  const displayImages = useMemo(() => {
    const fallback = '/images/products/prod_silver_headphones.webp';
    return product?.images?.length ? [...product.images] : [fallback];
  }, [product]);

  const displayTitle = product?.title ?? 'Product';

  const displayBrand = product?.brand ?? 'Vendora';

  // The header rating reads the SAME reviews query the reviews section
  // below renders from — never the product row's stored rating fields, which
  // are only a rollup cache. One source means the header can never advertise
  // reviews the section does not have.
  const reviewsQuery = useProductReviews(product?.id);

  // The delivery estimate is the SELLER's, from the times they published
  // (Batch 91). The buyer's region is not known on this page, so the quote
  // is the span across the seller's tiers; a seller who set nothing — or a
  // database without the times view yet — resolves to the standard quote.
  const sellerTimesQuery = useSellerDeliveryTimes(product?.sellerId ? [product.sellerId] : []);
  const sellerProfile = product?.sellerId ? sellerTimesQuery.data?.get(product.sellerId) : undefined;
  const deliveryRange = resolveDeliveryRange(sellerProfile?.times);
  const displayRating = reviewsQuery.data?.breakdown.average ?? 0;
  const displayReviews = reviewsQuery.data?.breakdown.total ?? 0;
  const hasReviews = displayReviews > 0;
  const reviewsLoading = reviewsQuery.isLoading;

  const categoryLabel = (product?.category ?? '')
    .replace(/^cat-/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Products';

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
      { label: 'Return Window', value: '30 days from delivery — see the Vendora returns policy' },
      { label: 'Shipping & Handling', value: product?.type === 'digital' ? 'Instant Download Link' : 'Tracked & Insured Courier' },
    ];
    // No warranty row: the schema carries no warranty field, so the page
    // states none rather than promising every product the same cover.
    const sku = selectedVariant?.sku ?? product?.variants?.[0]?.sku;
    if (sku) {
      facts.unshift({ label: 'SKU / Model', value: sku });
    }
    return facts;
  }, [displayBrand, categoryLabel, product?.type, product?.variants, selectedVariant]);

  return (
    <div className="relative min-h-screen py-6 px-4 sm:px-6 lg:px-8 transition-colors duration-200 overflow-hidden">
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

              {/* Compare toggle pill */}
              <button
                type="button"
                onClick={handleToggleCompare}
                aria-pressed={isCompared}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                  isCompared
                    ? 'border-sun-orange bg-sun-orange text-white hover:bg-sun-orange-600'
                    : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300'
                }`}
                title="Compare this product"
                aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>{isCompared ? 'In Compare' : 'Compare'}</span>
              </button>
            </div>
          </div>
            {/* ========================================================= */}
            {/* MAIN 3-COLUMN PRODUCT HERO                                */}
            {/* ========================================================= */}
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start">
              {/* ========================================================= */}
              {/* COLUMN 1: Gallery & Seller Card (4 cols)                  */}
              {/* On mobile the wrapper dissolves (max-lg:contents) so the      */}
              {/* gallery, details column and seller card order as flex items:  */}
              {/* gallery -> title/details -> seller card. Desktop grid is      */}
              {/* untouched.                                                    */}
              {/* ========================================================= */}
              <div className="max-lg:contents lg:col-span-5 xl:col-span-4 lg:space-y-4">
                {/* Main Image Showcase Frame */}
                <div className="order-1 lg:order-none glass-panel relative aspect-square w-full overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 p-6 flex items-center justify-center shadow-xl">
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
                    className="absolute bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-md hover:text-sun-orange hover:scale-105 active:scale-95 transition-all cursor-pointer z-10 border border-slate-200/80"
                    title="Zoom in view"
                    aria-label="Zoom image"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>

                {/* Thumbnail Strip — one tile per real image, only when the
                    product actually has more than one. There is no video
                    tile: no product video exists, so a Play overlay would
                    promise a demo the click cannot deliver (it opened the
                    still-image zoom). */}
                {displayImages.length > 1 && (
                  <div className="order-2 lg:order-none grid grid-cols-4 gap-2.5">
                    {displayImages.slice(0, 4).map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all cursor-pointer p-1.5 bg-white ${
                          selectedImageIndex === idx
                            ? 'border-sun-orange ring-2 ring-orange-500/20'
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
                  </div>
                )}

                {/* Seller Store Card — the LISTING's seller (Batch 123):
                    real store logo, the seller's OWN rating rollup, and
                    seller facts only. An accepted offer from another
                    seller never relabels this card. */}
                <div className="order-4 lg:order-none glass-panel rounded-3xl border border-white/80 dark:border-white/10 p-5 shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <StoreLogo
                      name={product.sellerName}
                      logo={product.sellerLogo}
                      className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-slate-200/70"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={`/vendors/${product.sellerId}`}
                          className="font-bold text-sm text-slate-900 hover:text-sun-orange transition-colors truncate"
                        >
                          {product.sellerName}
                        </Link>
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-aqua border border-cyan-200/60">
                          <ShieldCheck className="h-3 w-3 text-aqua" />
                          Verified
                        </span>
                      </div>
                      {/* The seller's rating rollup from vendor_profiles —
                          NOT this product's reviews aggregate. */}
                      <div className="flex items-center gap-1 text-xs text-amber-500 pt-0.5">
                        {(product.sellerReviewCount ?? 0) > 0 ? (
                          <>
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-slate-800">
                              {(product.sellerRating ?? 0).toFixed(1)}
                            </span>
                            <span className="text-slate-400 font-normal">
                              ({(product.sellerReviewCount ?? 0).toLocaleString()} reviews)
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">No reviews yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Seller facts (Batch 123, owner order — the product-tag
                      pills that used to sit here are gone): the seller's
                      published delivery window, the same range the buy
                      box quotes, and the ships-from city when published.
                      No response-time or orders-delivered tiles: the
                      system does not record them, so none are shown. */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 space-y-0.5">
                      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        <Truck className="h-3.5 w-3.5 text-sun-orange" />
                        Delivery time
                      </span>
                      <span className="block text-xs font-bold text-slate-900">
                        {deliveryRange.min}–{deliveryRange.max} business days
                      </span>
                    </div>
                    {sellerProfile?.originCity && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 space-y-0.5">
                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          <MapPin className="h-3.5 w-3.5 text-sun-orange" />
                          Ships from
                        </span>
                        <span className="block text-xs font-bold text-slate-900">
                          {sellerProfile.originCity}
                          {sellerProfile.originState ? `, ${sellerProfile.originState}` : ''}
                        </span>
                      </div>
                    )}
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
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-sun-orange hover:text-sun-orange transition-all cursor-pointer active:scale-95"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-sun-orange" />
                      <span>Live chat</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* COLUMN 2: Details & Configuration (5 cols)                */}
              {/* ========================================================= */}
              <div className="order-3 lg:order-none lg:col-span-7 xl:col-span-5 space-y-4">
                {/* Brand Accent */}
                <div>
                  <Link
                    to="/products"
                    className="text-xs font-bold text-sun-orange hover:underline uppercase tracking-wide"
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
                  {reviewsLoading ? (
                    <span className="font-semibold text-slate-400">Loading reviews…</span>
                  ) : hasReviews ? (
                    <>
                      <span className="font-extrabold text-slate-900">
                        {displayRating.toFixed(1)}{' '}
                        <span className="font-medium text-slate-400">({displayReviews.toLocaleString()})</span>
                      </span>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={scrollToReviews}
                        className="font-bold text-slate-800 underline hover:text-sun-orange transition-colors cursor-pointer"
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
                  <div className="font-outfit text-sm font-black tracking-tight text-slate-900">
                    {marketingHeadline}
                  </div>
                  <p className="text-xs sm:text-[13px] leading-relaxed text-slate-700 font-medium">
                    {marketingDescription}
                  </p>
                </div>

                {/* Quantity Stepper & Limited Quantity Badge */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <span className="text-xs font-bold text-slate-700">Quantity:</span>

                  <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-1 py-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-slate-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      disabled={effectiveStock > 0 && quantity >= effectiveStock}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Amber low stock warning pill — only when the real stock supports it */}
                  {effectiveStock > 0 && effectiveStock <= 10 && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>Only {effectiveStock} left in stock</span>
                    </div>
                  )}
                </div>

                {/* Real Variant Picker — only the variants the seller listed.
                    A product with no variants renders no picker at all. */}
                {listedVariants.length > 0 && (
                  <div className="space-y-2.5 pt-1" role="group" aria-label={`${variantPickerLabel} options`}>
                    <span className="text-xs font-bold text-slate-700">
                      {variantPickerLabel}:{' '}
                      <span className="text-slate-900">{selectedVariant?.name}</span>
                    </span>
                    {listedVariants.map((variant) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      const attributes = variantAttributes(variant);
                      const attributeText = Object.entries(attributes)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(' · ');
                      const outOfStock = variant.stock <= 0;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          disabled={outOfStock}
                          onClick={() => {
                            setSelectedVariantId(variant.id);
                            setSelectedOffer(null);
                            setQuantity(1);
                          }}
                          aria-pressed={isSelected}
                          className={`w-full rounded-2xl p-3.5 text-left transition-all ${
                            outOfStock
                              ? 'border border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'border-2 border-sun-orange bg-orange-50/20 shadow-2xs cursor-pointer'
                                : 'border border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                          }`}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="block min-w-0">
                              <span
                                className={`block text-xs font-bold ${
                                  isSelected ? 'text-sun-orange' : 'text-slate-900'
                                }`}
                              >
                                {variant.name}
                              </span>
                              {attributeText && (
                                <span className="mt-0.5 block text-[11px] text-slate-500">
                                  {attributeText}
                                </span>
                              )}
                              {variant.sku && (
                                <span className="mt-0.5 block font-mono text-[10px] text-slate-400">
                                  SKU {variant.sku}
                                </span>
                              )}
                            </span>
                            <span className="block shrink-0 text-right">
                              <span className="block text-xs font-extrabold text-slate-900">
                                {formatPrice(Number(variant.price))}
                              </span>
                              <span
                                className={`mt-0.5 block text-[11px] font-medium ${
                                  outOfStock ? 'text-rose-500' : 'text-slate-400'
                                }`}
                              >
                                {outOfStock
                                  ? 'Out of stock'
                                  : variant.stock <= 10
                                    ? `Only ${variant.stock} left`
                                    : 'In stock'}
                              </span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* COLUMN 3: Buy Box & Delivery */}
              {/* ========================================================= */}
              <div ref={buyBoxRef} className="order-5 lg:order-none lg:col-span-12 xl:col-span-3 space-y-4">
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
                          ? 'border-2 border-sun-orange bg-orange-50/20'
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
                        <Truck className="h-4 w-4 text-sun-orange shrink-0" />
                      </span>
                    </button>

                    {/* Pickup — availability derived from the real stock number */}
                    <button
                      type="button"
                      onClick={() => setShippingOption('pickup')}
                      disabled={product.stock <= 0}
                      aria-pressed={shippingOption === 'pickup'}
                      className={`w-full rounded-xl p-3 transition-all relative text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                        product.stock > 0 ? 'cursor-pointer' : ''} ${
                        shippingOption === 'pickup'
                          ? 'border-2 border-sun-orange bg-orange-50/20'
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

                  {/* Estimated delivery — the seller's published times via
                      the shared resolver (their span here, since the buyer's
                      region is unknown on this page), falling back to the
                      standard window. The word "Estimated" in the label
                      itself carries that it is an estimate — no trailing
                      repeat of the word (Batch 122, owner screenshot).
                      Digital products deliver instantly instead. */}
                  {product.type === 'physical' && shippingOption === 'delivery' && (
                    <p className="flex flex-nowrap items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      <Truck className="h-3.5 w-3.5 shrink-0 text-sun-orange" />
                      <span className="whitespace-nowrap">
                        Estimated delivery{' '}
                        <span className="font-bold text-slate-900">
                          {formatDeliveryWindow(new Date(), deliveryRange)}
                        </span>
                      </span>
                    </p>
                  )}

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
                    <Button
                      type="button"
                      variant="default"
                      size="lg"
                      onClick={() => handleAddToCart()}
                      disabled={effectiveStock <= 0}
                      className={addedAnimation ? 'w-full bg-emerald-600 hover:bg-emerald-700' : 'w-full'}
                    >
                      {effectiveStock <= 0 ? (
                        <span>Out of Stock</span>
                      ) : addedAnimation ? (
                        <>
                          <AddedBurstIcon className="h-5 w-5" />
                          <span>Added to Cart!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          <span>Add to cart</span>
                        </>
                      )}
                    </Button>

                    {/* Secondary 1-Click Buy Now */}
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={effectiveStock <= 0}
                      className="w-full rounded-full bg-slate-100 hover:bg-slate-200 py-2.5 text-xs font-bold text-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Buy Now with 1-Click
                    </button>
                  </div>

                  {/* Batch 122 — Amazon-style seller details under the CTAs
                      (owner order). Every value is real page data: the
                      current seller name (an accepted offer names its own
                      seller, who has no store id in page state, so plain
                      text then), the store link + verified chip otherwise,
                      and the origin city only when the seller published
                      delivery settings. No Returns/Payment rows here — the
                      buy box already carries both. */}
                  <div
                    data-testid="pdp-seller-details"
                    className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex w-[92px] shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <Store className="h-3.5 w-3.5 text-sun-orange" />
                        Sold by
                      </span>
                      {selectedOffer ? (
                        <span className="text-xs font-bold text-slate-900">{currentSellerName}</span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Link
                            to={`/vendors/${product.sellerId}`}
                            className="text-xs font-bold text-slate-900 hover:text-sun-orange transition-colors"
                          >
                            {currentSellerName}
                          </Link>
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-aqua border border-cyan-200/60">
                            <ShieldCheck className="h-3 w-3 text-aqua" />
                            Verified
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="flex w-[92px] shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <Truck className="h-3.5 w-3.5 text-sun-orange" />
                        Ships from
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {currentSellerName}
                        {sellerProfile?.originCity ? ` · ${sellerProfile.originCity}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Have a better price? Send offer */}
                  <div className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs">
                    <span className="text-slate-500">Have a better price?</span>
                    <button
                      type="button"
                      onClick={() => setIsOfferOpen(true)}
                      className="font-bold text-sun-orange hover:text-[#EA580C] hover:underline cursor-pointer"
                    >
                      Send offer
                    </button>
                  </div>

                  {/* Returns Card — the cover every order actually carries.
                      No warranty is promised: the schema has no warranty field. */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
                      <Shield className="h-3.5 w-3.5 text-emerald-600 fill-emerald-100" />
                      <span>30-Day Returns</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Hassle-free returns &amp; refund within 30 days of delivery
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Batch 121 — sticky section-nav pill (Overview / Specs / Reviews) */}
            <ProductSectionNav />

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
            {/* PRODUCTS YOU MAY LIKE                                     */}
            {/* ========================================================= */}
            <ProductsYouMayLikeGrid
              excludeId={product.id}
              category={product.category}
              onAddToCart={handleCardAddToCart}
              onToggleWishlist={handleCardToggleWishlist}
              isInWishlist={isInWishlist}
            />

            {/* Spacer so the mobile sticky bar never covers page content */}
            <div className="h-24 lg:hidden" aria-hidden="true" />

            {/* Batch 121 — desktop quick-add pill: appears once the buy box
                scrolls away; hidden while the zoom lightbox is open. */}
            {showQuickAdd && !isZoomOpen && (
              <ProductQuickAddPill
                image={displayImages[selectedImageIndex] || displayImages[0]}
                title={displayTitle}
                variantName={selectedVariant?.name}
                priceLabel={formatPrice(unitPrice)}
                compareAtLabel={
                  hasRealSavings && compareAtPrice !== undefined
                    ? formatPrice(compareAtPrice)
                    : undefined
                }
                inStock={effectiveStock > 0}
                added={addedAnimation}
                onAdd={() => handleAddToCart()}
              />
            )}

            {/* ========================================================= */}
            {/* MOBILE STICKY BUY BAR (< lg) — mirrors the buy box: same
                variant, same quantity, same actions. Sits above the
                BottomNav on small phones, flush on md screens.          */}
            {/* ========================================================= */}
            <div className="fixed inset-x-0 bottom-[76px] md:bottom-0 z-40 lg:hidden border-t border-slate-200/80 bg-white/92 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="min-w-0 shrink-0">
                  <div className="font-outfit text-base font-black leading-tight text-slate-900">
                    {formatPrice(unitPrice)}
                  </div>
                  <div className="max-w-[110px] truncate text-[10px] font-medium text-slate-500">
                    {selectedVariant ? selectedVariant.name : displayTitle}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddToCart()}
                  disabled={effectiveStock <= 0}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                    addedAnimation && effectiveStock > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                      : 'bg-sun-orange hover:bg-sun-orange-600 shadow-orange-500/25'
                  }`}
                >
                  {addedAnimation && effectiveStock > 0 ? (
                    <>
                      <AddedBurstIcon className="h-4 w-4" />
                      <span>Added!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>{effectiveStock <= 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={effectiveStock <= 0}
                  className="shrink-0 cursor-pointer rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Buy Now
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* INTERACTIVE MODALS                                        */}
            {/* ========================================================= */}
            {/* 1. Zoom Lightbox Modal — portaled to document.body like the
                page's other overlays (Batch 127): inline, a fixed overlay in
                this subtree can be captured by an ancestor containing block
                and land at the bottom of the page instead of the viewport. */}
            {isZoomOpen &&
              createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
                <div
                  ref={zoomPanelRef}
                  tabIndex={-1}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Product image zoom"
                  className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
                >
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
                      className="inline-flex items-center gap-1 text-sun-orange hover:underline"
                    >
                      Open full resolution
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>,
              document.body,
            )}

            {/* 2. Send Offer Modal */}
            <SendOfferModal
              isOpen={isOfferOpen}
              onClose={() => setIsOfferOpen(false)}
              productTitle={displayTitle}
              currentPrice={unitPrice}
              sellerName={currentSellerName}
              sellerId={product.sellerId}
              productId={product.id}
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
      <Toast toast={toast} onDismiss={hideToast} />
    </div>
  );
};
