import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Truck,
  RotateCcw,
  MapPin,
  CreditCard,
  Banknote,
  Headphones,
  ArrowRight,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react';
import { useCartStore } from '../store/cart-store';
import { useAuthStore } from '../store/auth-store';
import { useCurrency } from '../store/currency-store';
import { useCheckoutQuote, usePlaceOrder } from '../features/checkout/hooks/useCheckout';
import { cartSignature, type DeliveryChoice } from '../features/checkout/api/checkout';
import { useCheckoutDraftStore } from '../features/checkout/store/checkout-draft';
import { fetchCouponByCode } from '../features/cart/api/promotions';
import { shippingAddressSchema, type CartItem, type ShippingAddress } from '../types/domain';
import { validateCardLuhn, detectCardBrand } from '../features/checkout/utils/luhn';
import type { PaymentMethod } from '../features/checkout/types';

interface AddressOption extends ShippingAddress {
  id: string;
  label: string;
}

const DEFAULT_ADDRESSES: AddressOption[] = [
  {
    id: 'addr-home',
    label: 'Primary Home',
    fullName: '',
    street: 'House 42-B, Khayaban-e-Seher, Phase 6',
    city: 'Karachi',
    state: 'Sindh',
    zipCode: '75500',
    country: 'Pakistan',
    phone: '+92 321 445-8910',
  },
  {
    id: 'addr-office',
    label: 'Office',
    fullName: '',
    street: 'Suite 302, Arfa Software Technology Park',
    city: 'Lahore',
    state: 'Punjab',
    zipCode: '54000',
    country: 'Pakistan',
    phone: '+92 300 987-6543',
  },
];

const emptyDraft = (name: string): AddressOption => ({
  id: '',
  label: 'New address',
  fullName: name,
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Pakistan',
  phone: '',
});

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const items = useCartStore((s) => s.items);
  const updateQuantityInStore = useCartStore((s) => s.updateQuantity);
  const removeItemInStore = useCartStore((s) => s.removeItem);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const deliveryOptions = useCheckoutDraftStore((s) => s.deliveryOptions);
  const chooseDeliveryOption = useCheckoutDraftStore((s) => s.chooseDeliveryOption);

  // The bill comes from `checkout_quote` (the same SQL that `place_order` books with),
  // priced from the stored cart - so the cart lines and their signature drive it.
  const signature = useMemo(() => cartSignature(items), [items]);
  const couponCode = appliedCoupon?.code ?? null;
  const totals = useCheckoutQuote(signature, deliveryOptions, couponCode, Boolean(user?.id));
  const quote = totals.data;

  const placeOrder = usePlaceOrder();

  // Address state: the two seeded entries plus any address the customer adds here.
  const [addresses, setAddresses] = useState<AddressOption[]>(() =>
    DEFAULT_ADDRESSES.map((a) => ({ ...a, fullName: user?.name ?? '' })),
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string>('addr-home');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const addressFormTriggerRef = useRef<HTMLButtonElement>(null);
  const [addressDraft, setAddressDraft] = useState<AddressOption>(() => emptyDraft(user?.name ?? ''));
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  // Payment: only the methods place_order accepts.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);

  // Voucher state is resolved against the `promotions` table, not a constant.
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const hasPhysical = items.some((i) => i.type === 'physical');
  const totalQuantity = items.reduce((acc, i) => acc + i.quantity, 0);

  const selectedAddress =
    addresses.find((a) => a.id === selectedAddressId) ?? addresses[0] ?? null;

  // Group the real cart by seller; every name and line comes from the stored items.
  const vendorGroups = useMemo(() => {
    const map = new Map<string, { sellerId: string; sellerName: string; sellerType: 'platform' | 'vendor'; items: CartItem[] }>();
    for (const item of items) {
      const isPlatform =
        item.sellerType === 'platform' ||
        item.sellerId === 'platform' ||
        item.sellerName?.toLowerCase() === 'vendora';
      const sellerId = isPlatform ? 'platform' : item.sellerId;
      let group = map.get(sellerId);
      if (!group) {
        group = {
          sellerId,
          sellerName: isPlatform ? 'Vendora' : item.sellerName,
          sellerType: isPlatform ? 'platform' : item.sellerType,
          items: [],
        };
        map.set(sellerId, group);
      }
      group.items.push(item);
    }
    return Array.from(map.values());
  }, [items]);

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = shippingAddressSchema.safeParse(addressDraft);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        errors[issue.path[0]?.toString() || 'form'] = issue.message;
      }
      setAddressErrors(errors);
      return;
    }
    const id = `addr-${Date.now()}`;
    const added: AddressOption = { ...validation.data, id, label: addressDraft.label || 'New address' };
    setAddresses((prev) => [...prev, added]);
    setSelectedAddressId(id);
    setShowAddressForm(false);
    setAddressErrors({});
    setAddressDraft(emptyDraft(user?.name ?? ''));
  };

  const handleApplyVoucher = async () => {
    setVoucherError(null);
    setVoucherBusy(true);
    try {
      const subtotal =
        quote?.subtotal ?? items.reduce((acc, i) => acc + i.price * i.quantity, 0);
      const coupon = await fetchCouponByCode(voucherInput, subtotal);
      applyCoupon(coupon);
      setVoucherInput('');
    } catch (err) {
      setVoucherError(err instanceof Error ? err.message : 'That code could not be checked.');
    } finally {
      setVoucherBusy(false);
    }
  };

  const couponKind = (coupon: NonNullable<typeof appliedCoupon>): string => {
    const type = coupon.type as string;
    if (type === 'percentage') return `${coupon.value}% off`;
    if (type === 'fixed') return `${formatPrice(coupon.value)} off`;
    return 'Free shipping';
  };

  const handlePlaceOrder = () => {
    setCardError(null);
    let card: { brand: string; last4: string } | undefined;
    if (paymentMethod === 'card') {
      const digits = cardNumber.replace(/\D/g, '');
      if (!validateCardLuhn(digits)) {
        setCardError('Card failed Luhn checksum validation. Please check the digits.');
        return;
      }
      card = { brand: detectCardBrand(digits), last4: digits.slice(-4) };
    }

    const shipping: ShippingAddress | undefined = hasPhysical && selectedAddress
      ? {
          fullName: selectedAddress.fullName,
          street: selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          zipCode: selectedAddress.zipCode,
          country: selectedAddress.country,
          phone: selectedAddress.phone,
        }
      : undefined;

    placeOrder.mutate(
      {
        shippingAddress: shipping,
        paymentMethod,
        deliveryOptions,
        couponCode,
        card,
      },
      {
        // The mutation's onSuccess already clears the cart, the draft and the quote cache.
        onSuccess: (placed) => navigate(`/orders/${placed.orderId}`),
      },
    );
  };

  const placeOrderError = placeOrder.isError
    ? placeOrder.error instanceof Error
      ? placeOrder.error.message
      : 'Your order could not be placed. Please try again.'
    : null;

  // =========================================================================
  // Gates: an order can only be priced and booked for a signed-in customer
  // whose cart lives on the server.
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased">
        <div className="relative z-10 mx-auto max-w-lg px-4 pt-24 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-[#FF7A1A] dark:bg-orange-950/60">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="font-outfit text-xl font-extrabold text-slate-900 dark:text-white">
            Sign in to complete your order
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Your cart is priced and booked from the copy saved on your Vendora account, so checkout
            needs a signed-in session. Your picked items come with you after signing in.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="rounded-2xl bg-[#FF7A1A] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#EA6C13]"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-2xl border border-slate-200 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased">
        <div className="relative z-10 mx-auto max-w-lg px-4 pt-24 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-[#FF7A1A] dark:bg-orange-950/60">
            <Truck className="h-8 w-8" />
          </div>
          <h1 className="font-outfit text-xl font-extrabold text-slate-900 dark:text-white">
            Your cart is empty
          </h1>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Nothing was removed by us - the cart on your account has no lines to check out.
          </p>
          <Link
            to="/products"
            className="mt-6 inline-block rounded-2xl bg-[#FF7A1A] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#EA6C13]"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6] dark:bg-slate-950 font-sans selection:bg-[#FF7A1A]/20 selection:text-[#FF7A1A] text-slate-800 dark:text-slate-100 antialiased overflow-hidden pb-16">
      {/* Radiant ambient glow orbs (Matching Homepage & Storefront) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-28 w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-[#FED7AA]/65 via-[#FFEDD5]/70 to-[#FED7AA]/40 blur-[130px] dark:from-[#FF7A1A]/10 dark:via-[#FED7AA]/5 pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-[#CFFAFE]/70 via-[#F1F5F9]/80 to-[#FFEDD5]/50 blur-[140px] dark:from-[#00B8C8]/10 dark:via-transparent pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-[620px] h-[620px] rounded-full bg-gradient-to-tr from-[#FFEDD5]/70 via-[#CFFAFE]/50 to-[#F1F5F9] blur-[130px] dark:from-[#FF7A1A]/5 pointer-events-none" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-6">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:text-[#FF7A1A] transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <Link to="/cart" className="hover:text-[#FF7A1A] transition-colors">Cart</Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-900 dark:text-white font-semibold">Checkout</span>
        </nav>

        {/* Top Header Title */}
        <div className="mb-6">
          <h1 className="font-outfit text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Your Cart &amp; Secure Checkout
          </h1>
        </div>

        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* ========================================================================= */}
          {/* Left Column: Vendor Packages & Checkout Controls (8 Cols)                  */}
          {/* ========================================================================= */}
          <div className="space-y-6 lg:col-span-8">
            {vendorGroups.map((group) => {
              const quoteGroup = quote?.groups.find((g) => g.sellerId === group.sellerId);
              const chosenOption: DeliveryChoice =
                deliveryOptions[group.sellerId] ?? quoteGroup?.deliveryOption ?? 'standard';

              return (
                <div key={group.sellerId} className="overflow-hidden rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 shadow-sm">
                  {/* Vendor Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xs">
                        {group.sellerName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                            {group.sellerName}
                          </h3>
                          {group.sellerType === 'platform' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                              <CheckCircle2 className="h-3 w-3 text-blue-600" />
                              Sold by Vendora
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                              <CheckCircle2 className="h-3 w-3 text-purple-600" />
                              Independent Merchant
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {group.items.length} line{group.items.length > 1 ? 's' : ''} in this package
                        </p>
                      </div>
                    </div>

                    {quoteGroup && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                        <Truck className="h-3.5 w-3.5 text-amber-600" />
                        {quoteGroup.hasPhysical
                          ? chosenOption === 'express'
                            ? 'Express delivery selected'
                            : 'Standard delivery selected'
                          : 'Instant digital delivery'}
                      </span>
                    )}
                  </div>

                  {/* Items in this seller's package */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {group.items.map((item) => {
                      const savingsPercent =
                        item.compareAtPrice && item.compareAtPrice > item.price
                          ? Math.round((1 - item.price / item.compareAtPrice) * 100)
                          : null;
                      return (
                        <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 flex-1 min-w-0">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white p-1 shadow-xs">
                              <img src={item.image} alt={item.title} className="h-full w-full object-contain" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-outfit text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                                {item.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {item.type === 'digital' ? 'Digital download' : 'Physical item'} ·{' '}
                                {item.variantId ? 'Selected variant' : 'Standard stock'}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantityInStore(item.id, item.quantity - 1)}
                                    aria-label={`Decrease quantity of ${item.title}`}
                                    className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A] rounded-l-lg"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="px-2 text-xs font-bold text-slate-900 dark:text-white">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantityInStore(item.id, item.quantity + 1)}
                                    aria-label={`Increase quantity of ${item.title} (up to ${item.maxStock} in stock)`}
                                    className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A] rounded-r-lg"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeItemInStore(item.id)}
                                  className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="text-right sm:shrink-0">
                            <div className="font-outfit text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                              {formatPrice(item.price * item.quantity)}
                            </div>
                            {item.compareAtPrice && item.compareAtPrice > item.price ? (
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className="text-[11px] text-slate-400 line-through">
                                  {formatPrice(item.compareAtPrice * item.quantity)}
                                </span>
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                  SAVE {savingsPercent}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400">
                                {formatPrice(item.price)} each
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Package subtotal footer - priced by checkout_quote */}
                  <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 p-3 text-xs border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Truck className="h-4 w-4 text-[#FF7A1A]" />
                      <span>
                        {quoteGroup
                          ? `Shipping for this package: ${quoteGroup.shippingFee === 0 ? 'FREE' : formatPrice(quoteGroup.shippingFee)}`
                          : 'Shipping priced with your order summary'}
                      </span>
                    </div>
                    <div className="font-outfit font-bold text-slate-900 dark:text-white mt-1 sm:mt-0">
                      Vendor Subtotal:{' '}
                      <span className="text-[#FF7A1A] font-extrabold">
                        {quoteGroup ? formatPrice(quoteGroup.subtotal) : 'Repricing…'}
                      </span>
                    </div>
                  </div>

                  {/* Delivery speed for this seller (standard vs express, quoted per seller) */}
                  {quoteGroup?.hasPhysical && (
                    <div
                      role="radiogroup"
                      aria-label={`Delivery speed for ${group.sellerName}`}
                      className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      {(['standard', 'express'] as const).map((option) => {
                        const fee = option === 'standard' ? quoteGroup.shippingStandard : quoteGroup.shippingExpress;
                        const checked = chosenOption === option;
                        return (
                          <label
                            key={option}
                            className={`cursor-pointer rounded-2xl border p-4 transition-all relative ${
                              checked
                                ? 'border-[#FF7A1A] bg-orange-50/40 dark:bg-orange-950/20 shadow-xs ring-1 ring-[#FF7A1A]/30'
                                : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 bg-white/50 dark:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name={`delivery-${group.sellerId}`}
                                value={option}
                                checked={checked}
                                onChange={() => chooseDeliveryOption(group.sellerId, option)}
                                className="mt-1 h-4 w-4 accent-[#FF7A1A] focus-visible:ring-2 focus-visible:ring-[#FF7A1A]"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-outfit text-xs font-bold text-slate-900 dark:text-white">
                                    {option === 'express' ? 'Express Priority' : 'Standard Delivery'}
                                  </h4>
                                  {option === 'express' && (
                                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                                      Faster
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Priced by this seller&apos;s shipping rules.
                                </p>
                                <div className="mt-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  {fee === 0 ? 'FREE' : formatPrice(fee)}
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Buyer Protection Callout - real mechanisms only */}
            <div className="rounded-3xl border border-orange-200/80 bg-orange-50/70 dark:border-orange-900/40 dark:bg-orange-950/20 backdrop-blur-md p-5 flex items-start gap-4 shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A1A] text-white shadow-md shadow-orange-500/20">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                    Vendora Buyer Protection
                  </h4>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Disputes supported
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  The total payable below —{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {quote ? formatPrice(quote.grandTotal) : 'quoted at checkout'}
                  </strong>{' '}
                  — is charged by card or promised as cash on delivery when the order is booked. If a
                  delivery arrives wrong,{' '}
                  <Link to="/disputes" className="font-bold text-[#FF7A1A] hover:underline">
                    open a dispute
                  </Link>{' '}
                  from your order page and the review team decides the refund.
                </p>
              </div>
            </div>

            {/* Delivery Address Selection */}
            {hasPhysical && (
              <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#FF7A1A]" />
                    <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                      Delivery Address
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm((v) => !v)}
                    ref={addressFormTriggerRef}
                    onKeyDown={(e) => { if (e.key === 'Escape') setShowAddressForm(false); }}
                    aria-expanded={showAddressForm}
                    aria-controls="checkout-address-form"
                    className="text-xs font-bold text-[#FF7A1A] hover:underline flex items-center gap-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {showAddressForm ? 'Close form' : 'Add New Address'}
                  </button>
                </div>

                <div role="radiogroup" aria-label="Delivery address" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((address) => {
                    const checked = address.id === selectedAddressId;
                    return (
                      <label
                        key={address.id}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all relative ${
                          checked
                            ? 'border-[#FF7A1A] bg-orange-50/40 dark:bg-orange-950/20 shadow-xs ring-1 ring-[#FF7A1A]/30'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 bg-white/50 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="rounded-md bg-orange-100 dark:bg-orange-950/60 px-2 py-0.5 text-[10px] font-bold text-orange-800 dark:text-orange-300">
                            {address.label}
                          </span>
                          <input
                            type="radio"
                            name="checkout-address"
                            checked={checked}
                            onChange={() => setSelectedAddressId(address.id)}
                            className="h-4 w-4 accent-[#FF7A1A] focus-visible:ring-2 focus-visible:ring-[#FF7A1A]"
                            aria-label={`Deliver to ${address.label}, ${address.street}, ${address.city}`}
                          />
                        </div>
                        <h4 className="font-outfit text-xs font-bold text-slate-900 dark:text-white">
                          {address.street}
                        </h4>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {address.city}, {address.state} • Postal {address.zipCode} • {address.country}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span>{address.phone}</span>
                          {address.fullName && <span className="font-semibold text-emerald-600 dark:text-emerald-400">{address.fullName}</span>}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Inline new-address form: adds to this page's address state */}
                {showAddressForm && (
                  <form
                    id="checkout-address-form"
                    onKeyDown={(e) => { if (e.key === 'Escape') { setShowAddressForm(false); addressFormTriggerRef.current?.focus(); } }}
                    onSubmit={handleAddAddress}
                    className="mt-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="addr-label" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Label
                        </label>
                        <input
                          id="addr-label"
                          type="text"
                          value={addressDraft.label}
                          onChange={(e) => setAddressDraft((p) => ({ ...p, label: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold focus:border-[#FF7A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/40"
                        />
                      </div>
                      <div>
                        <label htmlFor="addr-fullName" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Full Name *
                        </label>
                        <input
                          id="addr-fullName"
                          type="text"
                          value={addressDraft.fullName}
                          onChange={(e) => setAddressDraft((p) => ({ ...p, fullName: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold focus:border-[#FF7A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/40"
                        />
                        {addressErrors.fullName && <p className="mt-1 text-[11px] font-medium text-rose-500">{addressErrors.fullName}</p>}
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="addr-street" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Street Address *
                        </label>
                        <input
                          id="addr-street"
                          type="text"
                          value={addressDraft.street}
                          onChange={(e) => setAddressDraft((p) => ({ ...p, street: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold focus:border-[#FF7A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/40"
                        />
                        {addressErrors.street && <p className="mt-1 text-[11px] font-medium text-rose-500">{addressErrors.street}</p>}
                      </div>
                      <div>
                        <label htmlFor="addr-city" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          City *
                        </label>
                        <input
                          id="addr-city"
                          type="text"
                          value={addressDraft.city}
                          onChange={(e) => setAddressDraft((p) => ({ ...p, city: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold focus:border-[#FF7A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/40"
                        />
                        {addressErrors.city && <p className="mt-1 text-[11px] font-medium text-rose-500">{addressErrors.city}</p>}
                      </div>
                      <div>
                        <label htmlFor="addr-state" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          State *
                        </label>
                        <input
                          id="addr-state"
                          type="text"
                          value={addressDraft.state}
                          onChange={(e) => setAddressDraft((p) => ({ ...p, state: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold focus:border-[#FF7A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/40"
                        />
                        {addressErrors.state && <p className="mt-1 text-[11px] font-medium text-rose-500">{addressErrors.state}</p>}
                      </div>
                      <div>
                        <label htmlFor="addr-zip" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Postal Code *
                        </label>
                        <input
                          id="addr-zip"
                          type="text"
                          value={addressDraft.zipCode}
                          onChange={(e) => setAddressDraft((p) => ({ ...p, zipCode: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold focus:border-[#FF7A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/40"
                        />
                        {addressErrors.zipCode && <p className="mt-1 text-[11px] font-medium text-rose-500">{addressErrors.zipCode}</p>}
                      </div>
                      <div>
                        <label htmlFor="addr-country" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Country
                        </label>
                        <select
                          id="addr-country"
                          value={addressDraft.country}
                          onChange={(e) => setAddressDraft((p) => ({ ...p, country: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold focus:border-[#FF7A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/40"
                        >
                          <option value="Pakistan">Pakistan</option>
                          <option value="United States">United States</option>
                          <option value="United Arab Emirates">United Arab Emirates</option>
                          <option value="Saudi Arabia">Saudi Arabia</option>
                          <option value="United Kingdom">United Kingdom</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="addr-phone" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Phone *
                        </label>
                        <input
                          id="addr-phone"
                          type="tel"
                          value={addressDraft.phone}
                          onChange={(e) => setAddressDraft((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="+92 3XX XXXXXXX"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold focus:border-[#FF7A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/40"
                        />
                        {addressErrors.phone && <p className="mt-1 text-[11px] font-medium text-rose-500">{addressErrors.phone}</p>}
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]"
                    >
                      Save address for this order
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Select Payment Method */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-4 w-4 text-[#FF7A1A]" />
                <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                  Select Payment Method
                </h3>
              </div>

              {/* Only the methods place_order books: card and cash on delivery */}
              <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-[#FF7A1A] bg-orange-50/50 dark:bg-orange-950/30 ring-2 ring-[#FF7A1A]/30'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 bg-white/60 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="checkout-payment"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="h-4 w-4 accent-[#FF7A1A] focus-visible:ring-2 focus-visible:ring-[#FF7A1A]"
                    />
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-outfit text-xs font-bold text-slate-900 dark:text-white">Bank Card</h4>
                      <p className="text-[10px] text-slate-500">Visa / Mastercard / PayPak</p>
                    </div>
                  </div>
                </label>

                <label
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-[#FF7A1A] bg-orange-50/50 dark:bg-orange-950/30 ring-2 ring-[#FF7A1A]/30'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 bg-white/60 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="checkout-payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="h-4 w-4 accent-[#FF7A1A] focus-visible:ring-2 focus-visible:ring-[#FF7A1A]"
                    />
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-outfit text-xs font-bold text-slate-900 dark:text-white">Cash on Delivery</h4>
                      <p className="text-[10px] text-slate-500">Booked with payment pending</p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Method details */}
              <div className="mt-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800">
                {paymentMethod === 'card' ? (
                  <div>
                    <label htmlFor="card-number" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Card Number
                    </label>
                    <input
                      id="card-number"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={cardNumber}
                      onChange={(e) => {
                        setCardNumber(e.target.value);
                        if (cardError) setCardError(null);
                      }}
                      placeholder="4242 4242 4242 4242"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:border-[#FF7A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/40"
                    />
                    {cardError && (
                      <p role="alert" className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                        <AlertCircle className="h-3 w-3" />
                        {cardError}
                      </p>
                    )}
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                      Checked locally with the Luhn checksum. Only the detected brand
                      {cardNumber.replace(/\D/g, '').length >= 4 ? ` (${detectCardBrand(cardNumber)})` : ''} and the last
                      four digits are sent with the order - the full number never leaves your browser.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    Pay the courier in cash when your packages arrive. The order is booked with payment
                    status <strong>pending</strong>; a delivery code is generated for each physical package.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Right Column: Order Summary & Sticky Action Trigger (4 Cols)               */}
          {/* ========================================================================= */}
          <div className="space-y-6 lg:col-span-4 lg:sticky lg:top-24">
            {/* Order Summary Card */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
                  Order Summary
                </h3>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                  {totalQuantity} Item{totalQuantity === 1 ? '' : 's'}
                </span>
              </div>

              {totals.isError && (
                <p className="mt-3 flex items-start gap-1.5 text-[11px] font-semibold text-rose-600" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {totals.error instanceof Error ? totals.error.message : 'Checkout could not price your cart.'}
                </p>
              )}

              {/* Price Breakdown - every line from checkout_quote */}
              <div className="py-4 space-y-3 text-xs">
                {quote ? (
                  <>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Item Subtotal</span>
                      <span className="font-outfit font-bold text-slate-900 dark:text-white">
                        {formatPrice(quote.subtotal)}
                      </span>
                    </div>

                    {quote.groups.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Per-Package Shipping
                        </div>
                        {quote.groups.map((g) => (
                          <div key={g.sellerId} className="flex items-center justify-between text-slate-500 pl-2 text-[11px]">
                            <span>• {g.sellerName} ({g.deliveryOption === 'express' ? 'Express' : 'Standard'})</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {g.hasPhysical
                                ? g.shippingFee === 0
                                  ? 'FREE'
                                  : formatPrice(g.shippingFee)
                                : formatPrice(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {quote.discountTotal > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Promotion ({quote.couponCode})</span>
                        <span className="font-bold">-{formatPrice(quote.discountTotal)}</span>
                      </div>
                    )}

                    {/* Promo Voucher */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label htmlFor="voucher-code" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Have a promo voucher?
                      </label>
                      {appliedCoupon ? (
                        <div className="space-y-1.5">
                          <div className="mt-1.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2">
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                              <Check className="h-3 w-3" />
                              {appliedCoupon.code} · {couponKind(appliedCoupon)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCoupon()}
                              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                            >
                              Remove
                            </button>
                          </div>
                          {quote.discountTotal === 0 && (
                            <p className="text-[10px] text-slate-400">
                              This code did not lower the quoted total - check its minimum spend or scope.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            id="voucher-code"
                            type="text"
                            value={voucherInput}
                            onChange={(e) => {
                              setVoucherInput(e.target.value);
                              if (voucherError) setVoucherError(null);
                            }}
                            placeholder="Promo code"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-2 text-xs font-bold uppercase text-slate-800 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/40"
                          />
                          <button
                            type="button"
                            onClick={handleApplyVoucher}
                            disabled={voucherBusy || voucherInput.trim() === ''}
                            className="rounded-xl bg-[#FF7A1A] text-white px-3.5 py-2 text-xs font-bold hover:bg-[#EA6C13] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]"
                          >
                            {voucherBusy ? 'Checking…' : 'Apply'}
                          </button>
                        </div>
                      )}
                      {voucherError && (
                        <p className="mt-1.5 flex items-start gap-1 text-[11px] font-semibold text-rose-600" role="alert">
                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                          {voucherError}
                        </p>
                      )}
                    </div>

                    {/* Total Line */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                      <div>
                        <span className="font-outfit text-sm font-bold text-slate-900 dark:text-white">Total Payable</span>
                        <p className="text-[10px] text-slate-400">Calculated by the same rules that book the order</p>
                      </div>
                      <div className="text-right">
                        <span className="font-outfit text-2xl font-black text-rose-600 dark:text-rose-400">
                          {formatPrice(quote.grandTotal)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs font-semibold text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-[#FF7A1A]" />
                    <span>Pricing your cart against live seller rules…</span>
                  </div>
                )}
              </div>

              {placeOrderError && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-800"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                  <span>{placeOrderError}</span>
                </div>
              )}

              {/* Place Order CTA */}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={placeOrder.isPending || !quote || totals.isFetching}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9040] py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A] focus-visible:ring-offset-2"
              >
                {placeOrder.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Booking your order…</span>
                  </>
                ) : (
                  <>
                    <span>{quote ? 'Place Order' : 'Repricing your cart…'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-[10px] text-slate-400 leading-normal">
                By confirming, you agree to the{' '}
                <Link to="/terms" className="font-semibold hover:text-[#FF7A1A]">Vendora Terms</Link> and{' '}
                <Link to="/refund-policy" className="font-semibold hover:text-[#FF7A1A]">Refund Policy</Link>.
              </p>

              {/* 3 Pillars in a row */}
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                  Split orders per seller
                </div>
                <Link
                  to="/returns"
                  className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]"
                >
                  <RotateCcw className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                  Returns &amp; refunds
                </Link>
                <Link
                  to="/disputes"
                  className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]"
                >
                  <AlertCircle className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                  Dispute review team
                </Link>
              </div>
            </div>

            {/* Need Assistance - links to the real disputes workspace */}
            <div className="rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FF7A1A]">
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-outfit text-xs font-bold text-slate-900 dark:text-white">
                    Need help with an order?
                  </h4>
                  <p className="text-[11px] text-slate-400">Open a dispute and our team reviews it.</p>
                </div>
              </div>
              <Link
                to="/disputes"
                className="shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]"
              >
                Get Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
