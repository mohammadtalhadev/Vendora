import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ShippingAddress } from '../../../types/domain';
import { shippingAddressSchema } from '../../../types/domain';
import type {
  CheckoutStep,
  PaymentMethod,
  CardBrand,
  CardPaymentDetails,
  TestCardPreset,
} from '../types';
import { TEST_CARD_PRESETS, findTestCardByNumber } from '../utils/test-cards';
import { validateCardLuhn, detectCardBrand, validateExpiry, maskCardNumber } from '../utils/luhn';
import { useCartStore } from '../../../store/cart-store';
import { useAuthStore } from '../../../store/auth-store';
import { useCurrency } from '../../../store/currency-store';
import { useCheckoutDraftStore } from '../store/checkout-draft';
import { useCheckoutTotals, usePlaceOrder } from '../hooks/useCheckout';
import { useSavedAddresses } from '../../account/hooks/useSavedAddresses';
import type { AddressType } from '../../account/types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Loader2,
  ArrowRight,
  Store,
  Package,
  Edit2,
  Plus,
} from 'lucide-react';

interface SavedAddressItem extends ShippingAddress {
  id: string;
  label: string;
  isDefault?: boolean;
}

const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  home: 'Home',
  work: 'Work',
  other: 'Other',
};

/** The blank form a customer with no saved address starts from. */
const EMPTY_SHIPPING_ADDRESS: ShippingAddress = {
  fullName: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'United States',
  phone: '',
};

export interface AccordionCheckoutProps {
  onSuccess?: (orderId: string) => void;
  className?: string;
}

export const AccordionCheckout: FC<AccordionCheckoutProps> = ({ onSuccess, className = '' }) => {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const deliveryOptions = useCheckoutDraftStore((s) => s.deliveryOptions);
  const chooseDeliveryOption = useCheckoutDraftStore((s) => s.chooseDeliveryOption);
  const placeOrderMutation = usePlaceOrder();
  const totals = useCheckoutTotals();
  const quote = totals.data;
  const isSubmittingRef = useRef<boolean>(false);

  // Cart properties
  const hasPhysicalItems = useMemo(() => items.some((i) => i.type === 'physical'), [items]);
  const isDigitalOnly = items.length > 0 && !hasPhysicalItems;

  // Every package, named and priced by checkout_pricing rather than guessed here.
  const quoteGroups = quote?.groups ?? [];

  // Initial step: if digital-only cart, jump straight to payment
  const [activeStep, setActiveStep] = useState<CheckoutStep>(() =>
    isDigitalOnly ? 'payment' : 'shipping_address',
  );

  const [completedSteps, setCompletedSteps] = useState<Record<CheckoutStep, boolean>>({
    shipping_address: isDigitalOnly,
    delivery_options: isDigitalOnly,
    payment: false,
    review: false,
  });

  // Step 1: Shipping Address State. The saved options are the customer's own
  // rows from `user_addresses`; nothing is pre-filled, so until the book lands
  // (and whenever it is empty) the form starts blank on the "new" option.
  const savedAddressesQuery = useSavedAddresses();
  const savedAddressOptions = useMemo<SavedAddressItem[]>(
    () =>
      (savedAddressesQuery.data ?? []).map((saved) => ({
        id: saved.id,
        label: saved.label || ADDRESS_TYPE_LABELS[saved.type],
        isDefault: saved.isDefault,
        fullName: saved.fullName,
        street: saved.street,
        city: saved.city,
        state: saved.state,
        zipCode: saved.zipCode,
        country: saved.country,
        phone: saved.phone,
      })),
    [savedAddressesQuery.data],
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(() => ({
    ...EMPTY_SHIPPING_ADDRESS,
  }));
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [addressPicked, setAddressPicked] = useState(false);

  // Once the book lands, the customer's default address (else their first)
  // fills the form - unless they have already chosen an option themselves.
  useEffect(() => {
    if (addressPicked) return;
    const preferred = savedAddressOptions.find((a) => a.isDefault) ?? savedAddressOptions[0];
    if (!preferred) return;
    setAddressPicked(true);
    setSelectedAddressId(preferred.id);
    setShippingAddress({
      fullName: preferred.fullName,
      street: preferred.street,
      city: preferred.city,
      state: preferred.state,
      zipCode: preferred.zipCode,
      country: preferred.country,
      phone: preferred.phone,
    });
  }, [savedAddressOptions, addressPicked]);

  // Step 3: Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cardDetails, setCardDetails] = useState<CardPaymentDetails>({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });
  const [detectedBrand, setDetectedBrand] = useState<CardBrand>('Unknown');
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  // Step 4: Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // The quoted money, or a clear "not yet known" rather than a number invented here.
  const subtotal = quote?.subtotal;
  const discountTotal = quote?.discountTotal;
  const dynamicShippingTotal = quote?.shippingTotal;
  const grandTotal = quote?.grandTotal;
  const expressFee = quote?.expressFee;
  const { formatPrice } = useCurrency();

  const price = (value: number | undefined) => formatPrice(value);

  // Handle saved address radio selection
  const handleSelectSavedAddress = (id: string) => {
    setAddressPicked(true);
    setSelectedAddressId(id);
    setAddressErrors({});
    if (id === 'new') {
      setShippingAddress({
        fullName: user?.name || '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
        phone: '',
      });
    } else {
      const found = savedAddressOptions.find((a) => a.id === id);
      if (found) {
        setShippingAddress({
          fullName: found.fullName,
          street: found.street,
          city: found.city,
          state: found.state,
          zipCode: found.zipCode,
          country: found.country,
          phone: found.phone,
        });
      }
    }
  };

  // Step 1 Validation & Proceed
  const handleProceedFromAddress = (e: FormEvent) => {
    e.preventDefault();
    if (isDigitalOnly) {
      setCompletedSteps((prev) => ({ ...prev, shipping_address: true, delivery_options: true }));
      setActiveStep('payment');
      return;
    }

    const validation = shippingAddressSchema.safeParse(shippingAddress);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0]?.toString() || 'form';
        errors[fieldName] = issue.message;
      }
      setAddressErrors(errors);
      return;
    }

    setAddressErrors({});
    setCompletedSteps((prev) => ({ ...prev, shipping_address: true }));
    setActiveStep('delivery_options');
  };

  // Step 2 Proceed
  const handleProceedFromDelivery = () => {
    setCompletedSteps((prev) => ({ ...prev, delivery_options: true }));
    setActiveStep('payment');
  };

  // Test card autofill handler
  const handleApplyTestCard = (preset: TestCardPreset) => {
    setCardDetails({
      cardNumber: preset.cardNumber,
      cardholderName: preset.cardholderName,
      expiryMonth: preset.expiryMonth,
      expiryYear: preset.expiryYear,
      cvv: preset.cvv,
    });
    setDetectedBrand(preset.brand);
    setPaymentErrors({});
  };

  // Card input change handler
  const handleCardNumberChange = (value: string) => {
    setCardDetails((prev) => ({ ...prev, cardNumber: value }));
    const brand = detectCardBrand(value);
    setDetectedBrand(brand);
    if (paymentErrors.cardNumber) {
      setPaymentErrors((prev) => ({ ...prev, cardNumber: '' }));
    }
  };

  // Step 3 Validation & Proceed
  const handleProceedFromPayment = (e: FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'cod') {
      setPaymentErrors({});
      setCompletedSteps((prev) => ({ ...prev, payment: true }));
      setActiveStep('review');
      return;
    }

    // Card validation
    const errors: Record<string, string> = {};

    const cleanCard = cardDetails.cardNumber.replace(/\s+/g, '');
    if (!validateCardLuhn(cleanCard)) {
      errors.cardNumber = 'Card failed Luhn checksum validation. Please check digits.';
    }

    if (!cardDetails.cardholderName || cardDetails.cardholderName.trim().length < 3) {
      errors.cardholderName = 'Cardholder name is required (at least 3 characters)';
    }

    if (!validateExpiry(cardDetails.expiryMonth, cardDetails.expiryYear)) {
      errors.expiry = 'Expiration date is invalid or has already passed';
    }

    if (!/^\d{3,4}$/.test(cardDetails.cvv)) {
      errors.cvv = 'CVV must be 3 or 4 digits';
    }

    if (Object.keys(errors).length > 0) {
      setPaymentErrors(errors);
      return;
    }

    setPaymentErrors({});
    setCompletedSteps((prev) => ({ ...prev, payment: true }));
    setActiveStep('review');
  };

  // Step 4: Final Order Placement with double-submit guard
  const handlePlaceOrder = async () => {
    if (isSubmitting || isSubmittingRef.current || placeOrderMutation.isPending) {
      return;
    }

    setOrderError(null);

    // Check simulated failure conditions from test card presets
    if (paymentMethod === 'card') {
      const preset = findTestCardByNumber(cardDetails.cardNumber);
      if (preset?.expectedOutcome === 'insufficient_funds') {
        setOrderError('Payment Failed: Insufficient funds on selected test card.');
        return;
      }
      if (preset?.expectedOutcome === 'declined') {
        setOrderError('Payment Failed: Card declined by issuing bank (Simulated Sandbox).');
        return;
      }
      if (preset?.expectedOutcome === 'invalid_card') {
        setOrderError('Payment Failed: Card failed Luhn checksum validation.');
        return;
      }
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await placeOrderMutation.mutateAsync({
        shippingAddress: isDigitalOnly ? undefined : shippingAddress,
        paymentMethod,
        deliveryOptions,
        couponCode: appliedCoupon?.code ?? null,
        card:
          paymentMethod === 'card'
            ? { brand: detectedBrand, last4: cardDetails.cardNumber.replace(/\D/g, '').slice(-4) }
            : undefined,
      });

      if (onSuccess) {
        onSuccess(response.orderId);
      }

      navigate(`/orders/${response.orderId}`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'An error occurred while placing your order. Please try again.';
      setOrderError(errorMsg);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const maskedCard = maskCardNumber(cardDetails.cardNumber);

  /* A guest gets no quote and no order: both are priced and booked from the cart stored
     under the signed-in customer's id, so the honest screen asks for a session. */
  if (!isAuthenticated) {
    return (
      <div
        className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-sm"
        data-testid="checkout-signin-gate"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-sun-orange">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h3 className="font-outfit text-lg font-black text-slate-900">Sign in to complete your order</h3>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
          Shipping, seller discounts and the final total are priced from the cart saved on your account,
          and an order can only be booked for a signed-in customer. Sign in and the items you have
          picked come with you.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="orange-cta" className="rounded-full px-6">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full px-6">
            <Link to="/register">Create an account</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ========================================================================= */}
      {/* STEP 1: Shipping Address Accordion Item                                  */}
      {/* ========================================================================= */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => {
            if (!isDigitalOnly) setActiveStep('shipping_address');
          }}
          disabled={isDigitalOnly}
          className={`flex w-full items-center justify-between p-6 text-left transition-colors ${
            activeStep === 'shipping_address' ? 'bg-slate-50/60' : 'hover:bg-slate-50/30'
          }`}
          data-testid="step-1-header"
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                completedSteps.shipping_address && !isDigitalOnly
                  ? 'bg-emerald-500 text-white'
                  : activeStep === 'shipping_address'
                    ? 'bg-sun-orange text-white shadow-md'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {completedSteps.shipping_address && !isDigitalOnly ? (
                <Check className="h-4 w-4 stroke-[3]" />
              ) : (
                '1'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Shipping Address</span>
                {isDigitalOnly && (
                  <Badge variant="vendora-platform" size="sm">
                    Skipped · Digital Only
                  </Badge>
                )}
                {completedSteps.shipping_address && !isDigitalOnly && (
                  <Badge variant="in-stock" size="sm">
                    Completed
                  </Badge>
                )}
              </div>
              {/* Summary when collapsed */}
              {activeStep !== 'shipping_address' && !isDigitalOnly && completedSteps.shipping_address && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {shippingAddress.fullName} · {shippingAddress.street}, {shippingAddress.city},{' '}
                  {shippingAddress.state} {shippingAddress.zipCode}
                </p>
              )}
              {isDigitalOnly && (
                <p className="mt-0.5 text-xs text-slate-400">
                  Digital items will be delivered directly to your account.
                </p>
              )}
            </div>
          </div>
          {!isDigitalOnly && (
            <div className="text-slate-400">
              {activeStep === 'shipping_address' ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          )}
        </button>

        {/* Accordion Content */}
        {activeStep === 'shipping_address' && !isDigitalOnly && (
          <div className="border-t border-slate-100 p-6 pt-5" data-testid="step-1-content">
            <form onSubmit={handleProceedFromAddress} className="space-y-6">
              {/* Saved Addresses Radio Group */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select Delivery Address
                  </label>
                  <span className="text-xs text-slate-400">Choose saved or enter new</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {savedAddressOptions.map((preset) => (
                    <label
                      key={preset.id}
                      className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                        selectedAddressId === preset.id
                          ? 'border-sun-orange bg-sun-orange/5 shadow-sm ring-1 ring-sun-orange'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      data-testid={`saved-address-${preset.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="addressSelection"
                            value={preset.id}
                            checked={selectedAddressId === preset.id}
                            onChange={() => handleSelectSavedAddress(preset.id)}
                            className="h-4 w-4 text-sun-orange focus:ring-sun-orange"
                          />
                          <span className="text-xs font-bold text-slate-900">{preset.label}</span>
                        </div>
                        {preset.isDefault && (
                          <Badge variant="secondary" size="sm">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2.5 text-[11px] leading-relaxed text-slate-600">
                        <p className="font-semibold text-slate-800">{preset.fullName}</p>
                        <p>{preset.street}</p>
                        <p>
                          {preset.city}, {preset.state} {preset.zipCode}
                        </p>
                        <p className="text-slate-400">{preset.phone}</p>
                      </div>
                    </label>
                  ))}

                  {/* Option: Enter New Address */}
                  <label
                    className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-4 text-center transition-all ${
                      selectedAddressId === 'new'
                        ? 'border-sun-orange bg-sun-orange/5 shadow-sm ring-1 ring-sun-orange'
                        : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/50'
                    }`}
                    data-testid="saved-address-new"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="addressSelection"
                        value="new"
                        checked={selectedAddressId === 'new'}
                        onChange={() => handleSelectSavedAddress('new')}
                        className="h-4 w-4 text-sun-orange focus:ring-sun-orange"
                      />
                      <span className="text-xs font-bold text-slate-800">Add New Address</span>
                    </div>
                    <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 shadow-xs">
                      <Plus className="h-4 w-4" />
                    </div>
                  </label>
                </div>
              </div>

              {/* Address Form Inputs */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-600">
                  {selectedAddressId === 'new' ? 'Enter Address Details' : 'Verify Address Details'}
                </h4>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      data-testid="input-fullName"
                      value={shippingAddress.fullName}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      placeholder="e.g. Sarah Customer"
                      hasError={Boolean(addressErrors.fullName)}
                    />
                    {addressErrors.fullName && (
                      <p className="mt-1 text-[11px] font-medium text-rose-500" data-testid="error-fullName">
                        {addressErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Street Address <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      data-testid="input-street"
                      value={shippingAddress.street}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, street: e.target.value }))
                      }
                      placeholder="Street address, apartment, suite, etc."
                      hasError={Boolean(addressErrors.street)}
                    />
                    {addressErrors.street && (
                      <p className="mt-1 text-[11px] font-medium text-rose-500" data-testid="error-street">
                        {addressErrors.street}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      data-testid="input-city"
                      value={shippingAddress.city}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, city: e.target.value }))
                      }
                      placeholder="San Francisco"
                      hasError={Boolean(addressErrors.city)}
                    />
                    {addressErrors.city && (
                      <p className="mt-1 text-[11px] font-medium text-rose-500" data-testid="error-city">
                        {addressErrors.city}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        State <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        data-testid="input-state"
                        value={shippingAddress.state}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({ ...prev, state: e.target.value }))
                        }
                        placeholder="CA"
                        hasError={Boolean(addressErrors.state)}
                      />
                      {addressErrors.state && (
                        <p className="mt-1 text-[11px] font-medium text-rose-500" data-testid="error-state">
                          {addressErrors.state}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        ZIP Code <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        data-testid="input-zipCode"
                        value={shippingAddress.zipCode}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({ ...prev, zipCode: e.target.value }))
                        }
                        placeholder="94105"
                        hasError={Boolean(addressErrors.zipCode)}
                      />
                      {addressErrors.zipCode && (
                        <p className="mt-1 text-[11px] font-medium text-rose-500" data-testid="error-zipCode">
                          {addressErrors.zipCode}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Country
                    </label>
                    <Input
                      data-testid="input-country"
                      value={shippingAddress.country}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, country: e.target.value }))
                      }
                      placeholder="United States"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      data-testid="input-phone"
                      value={shippingAddress.phone}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="555-123-4567"
                      hasError={Boolean(addressErrors.phone)}
                    />
                    {addressErrors.phone && (
                      <p className="mt-1 text-[11px] font-medium text-rose-500" data-testid="error-phone">
                        {addressErrors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="orange-cta"
                  className="px-6"
                  data-testid="btn-continue-delivery"
                >
                  <span>Continue to Delivery</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 2: Delivery Option per Seller Accordion Item                         */}
      {/* ========================================================================= */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => {
            if (!isDigitalOnly && completedSteps.shipping_address) {
              setActiveStep('delivery_options');
            }
          }}
          disabled={isDigitalOnly || !completedSteps.shipping_address}
          className={`flex w-full items-center justify-between p-6 text-left transition-colors ${
            activeStep === 'delivery_options' ? 'bg-slate-50/60' : 'hover:bg-slate-50/30'
          }`}
          data-testid="step-2-header"
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                completedSteps.delivery_options && !isDigitalOnly
                  ? 'bg-emerald-500 text-white'
                  : activeStep === 'delivery_options'
                    ? 'bg-sun-orange text-white shadow-md'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {completedSteps.delivery_options && !isDigitalOnly ? (
                <Check className="h-4 w-4 stroke-[3]" />
              ) : (
                '2'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  Delivery Option per Seller
                </span>
                {isDigitalOnly && (
                  <Badge variant="vendora-platform" size="sm">
                    Skipped · Digital Only
                  </Badge>
                )}
                {completedSteps.delivery_options && !isDigitalOnly && (
                  <Badge variant="in-stock" size="sm">
                    Completed
                  </Badge>
                )}
              </div>
              {/* Summary when collapsed */}
              {activeStep !== 'delivery_options' && !isDigitalOnly && completedSteps.delivery_options && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {quoteGroups.length} package{quoteGroups.length > 1 ? 's' : ''} configured · Shipping:{' '}
                  {price(dynamicShippingTotal)}
                </p>
              )}
              {isDigitalOnly && (
                <p className="mt-0.5 text-xs text-slate-400">
                  Instant digital downloads require no physical courier dispatch.
                </p>
              )}
            </div>
          </div>
          {!isDigitalOnly && (
            <div className="text-slate-400">
              {activeStep === 'delivery_options' ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          )}
        </button>

        {/* Accordion Content */}
        {activeStep === 'delivery_options' && !isDigitalOnly && (
          <div className="border-t border-slate-100 p-6 pt-5" data-testid="step-2-content">
            <p className="mb-4 text-xs text-slate-500">
              Because Vendora fulfills multi-vendor orders directly from respective merchant warehouses, choose
              shipping speeds for each package below:
            </p>

            {!quote ? (
              <div
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs font-semibold text-slate-500"
                data-testid="quote-pending"
              >
                <Loader2 className="h-4 w-4 animate-spin text-sun-orange" />
                <span>Repricing your cart against each seller's live shipping rules…</span>
              </div>
            ) : (
              <div className="space-y-6">
                {quoteGroups.map((group) => {
                  const currentOption = group.deliveryOption;

                  return (
                    <div
                      key={group.sellerId}
                      className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs"
                      data-testid={`seller-package-${group.sellerId}`}
                    >
                      {/* Seller Package Header */}
                      <div className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-slate-400" />
                          <span className="text-xs font-bold text-slate-900">
                            Package from: {group.sellerName}
                          </span>
                          {group.sellerType === 'platform' ? (
                            <Badge variant="vendora-platform" size="sm">
                              Vendora
                            </Badge>
                          ) : (
                            <Badge variant="secondary" size="sm">
                              Independent Merchant
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                          Package Subtotal: {price(group.subtotal)}
                        </span>
                      </div>

                      {/* Items preview in package */}
                      <div className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((item) => (
                            <div
                              key={`${item.productId}-${item.variantId}`}
                              className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                            >
                              <span className="font-semibold">{item.quantity}x</span>
                              <span className="max-w-[160px] truncate">{item.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery Option Radios */}
                      {!group.hasPhysical ? (
                        <div className="rounded-xl bg-emerald-50/70 p-3 text-xs text-emerald-800">
                          Instant Digital Download · No shipping fee required ({price(0)})
                        </div>
                      ) : (
                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {/* Standard Shipping */}
                          <label
                            className={`flex cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-all ${
                              currentOption === 'standard'
                                ? 'border-sun-orange bg-sun-orange/5 ring-1 ring-sun-orange'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                            data-testid={`option-standard-${group.sellerId}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="radio"
                                name={`delivery-${group.sellerId}`}
                                value="standard"
                                checked={currentOption === 'standard'}
                                onChange={() => chooseDeliveryOption(group.sellerId, 'standard')}
                                className="mt-0.5 h-4 w-4 text-sun-orange focus:ring-sun-orange"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900">Standard Delivery</span>
                                  {group.shippingStandard === 0 && (
                                    <Badge variant="in-stock" size="sm">
                                      Free with this seller
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                  Estimated 3-5 business days
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-900">
                              {group.shippingStandard === 0 ? 'FREE' : price(group.shippingStandard)}
                            </span>
                          </label>

                          {/* Express Shipping */}
                          <label
                            className={`flex cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-all ${
                              currentOption === 'express'
                                ? 'border-sun-orange bg-sun-orange/5 ring-1 ring-sun-orange'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                            data-testid={`option-express-${group.sellerId}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="radio"
                                name={`delivery-${group.sellerId}`}
                                value="express"
                                checked={currentOption === 'express'}
                                onChange={() => chooseDeliveryOption(group.sellerId, 'express')}
                                className="mt-0.5 h-4 w-4 text-sun-orange focus:ring-sun-orange"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900">Express Priority</span>
                                  <Badge variant="secondary" size="sm">
                                    Fast
                                  </Badge>
                                </div>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                  Estimated 1-2 business days with priority courier (+{price(expressFee)})
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-900">{price(group.shippingExpress)}</span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step 2 Actions */}
            <div className="mt-6 flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep('shipping_address')}
              >
                Back to Address
              </Button>
              <Button
                type="button"
                variant="orange-cta"
                onClick={handleProceedFromDelivery}
                className="px-6"
                data-testid="btn-continue-payment"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 3: Payment Accordion Item                                           */}
      {/* ========================================================================= */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => {
            if (isDigitalOnly || completedSteps.delivery_options) {
              setActiveStep('payment');
            }
          }}
          disabled={!isDigitalOnly && !completedSteps.delivery_options}
          className={`flex w-full items-center justify-between p-6 text-left transition-colors ${
            activeStep === 'payment' ? 'bg-slate-50/60' : 'hover:bg-slate-50/30'
          }`}
          data-testid="step-3-header"
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                completedSteps.payment
                  ? 'bg-emerald-500 text-white'
                  : activeStep === 'payment'
                    ? 'bg-sun-orange text-white shadow-md'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {completedSteps.payment ? <Check className="h-4 w-4 stroke-[3]" /> : '3'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Payment Method</span>
                {completedSteps.payment && (
                  <Badge variant="in-stock" size="sm">
                    Completed
                  </Badge>
                )}
              </div>
              {/* Summary when collapsed */}
              {activeStep !== 'payment' && completedSteps.payment && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {paymentMethod === 'card'
                    ? `${detectedBrand} ending in •••• ${maskedCard.last4}`
                    : 'Cash on Delivery (COD)'}
                </p>
              )}
            </div>
          </div>
          <div className="text-slate-400">
            {activeStep === 'payment' ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </button>

        {/* Accordion Content */}
        {activeStep === 'payment' && (
          <div className="border-t border-slate-100 p-6 pt-5" data-testid="step-3-content">
            <form onSubmit={handleProceedFromPayment} className="space-y-6">
              {/* Payment Method Selectors */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-sun-orange bg-sun-orange/5 ring-1 ring-sun-orange'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                  data-testid="payment-method-card"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="h-4 w-4 text-sun-orange focus:ring-sun-orange"
                  />
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="h-5 w-5 text-slate-700" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Credit / Debit Card</p>
                      <p className="text-[11px] text-slate-500">Simulated Sandbox with Luhn verification</p>
                    </div>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-sun-orange bg-sun-orange/5 ring-1 ring-sun-orange'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                  data-testid="payment-method-cod"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="h-4 w-4 text-sun-orange focus:ring-sun-orange"
                  />
                  <div className="flex items-center gap-2.5">
                    <Banknote className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Cash on Delivery (COD)</p>
                      <p className="text-[11px] text-slate-500">Pay cash upon courier arrival</p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Card Payment Inputs & Test Card Pills */}
              {paymentMethod === 'card' ? (
                <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                  {/* Test Card Pills */}
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Sparkles className="h-3.5 w-3.5 text-sun-orange" />
                      <span>Test Card Presets (Click to autofill sandbox):</span>
                    </div>
                    <div className="flex flex-wrap gap-2" data-testid="test-card-pills">
                      {TEST_CARD_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyTestCard(preset)}
                          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition-colors hover:border-sun-orange hover:bg-orange-50/50"
                          data-testid={`test-card-pill-${preset.id}`}
                        >
                          <span>{preset.label}</span>
                          <span className="text-[10px] text-slate-400">({preset.brand})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">
                          Card Number <span className="text-rose-500">*</span>
                        </label>
                        <Badge variant="secondary" size="sm">
                          Detected: {detectedBrand}
                        </Badge>
                      </div>
                      <Input
                        data-testid="input-cardNumber"
                        value={cardDetails.cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        hasError={Boolean(paymentErrors.cardNumber)}
                      />
                      {paymentErrors.cardNumber && (
                        <p className="mt-1 text-[11px] font-medium text-rose-500" data-testid="error-cardNumber">
                          {paymentErrors.cardNumber}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Cardholder Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        data-testid="input-cardholderName"
                        value={cardDetails.cardholderName}
                        onChange={(e) =>
                          setCardDetails((prev) => ({ ...prev, cardholderName: e.target.value }))
                        }
                        placeholder="Jane Doe"
                        hasError={Boolean(paymentErrors.cardholderName)}
                      />
                      {paymentErrors.cardholderName && (
                        <p className="mt-1 text-[11px] font-medium text-rose-500" data-testid="error-cardholderName">
                          {paymentErrors.cardholderName}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Exp Month (MM) <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          data-testid="input-expiryMonth"
                          value={cardDetails.expiryMonth}
                          onChange={(e) =>
                            setCardDetails((prev) => ({ ...prev, expiryMonth: e.target.value }))
                          }
                          placeholder="12"
                          maxLength={2}
                          hasError={Boolean(paymentErrors.expiry)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Exp Year (YY) <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          data-testid="input-expiryYear"
                          value={cardDetails.expiryYear}
                          onChange={(e) =>
                            setCardDetails((prev) => ({ ...prev, expiryYear: e.target.value }))
                          }
                          placeholder="28"
                          maxLength={4}
                          hasError={Boolean(paymentErrors.expiry)}
                        />
                      </div>
                      {paymentErrors.expiry && (
                        <p className="col-span-2 mt-1 text-[11px] font-medium text-rose-500" data-testid="error-expiry">
                          {paymentErrors.expiry}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        CVV / CVC <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        data-testid="input-cvv"
                        type="password"
                        value={cardDetails.cvv}
                        onChange={(e) =>
                          setCardDetails((prev) => ({ ...prev, cvv: e.target.value }))
                        }
                        placeholder="123"
                        maxLength={4}
                        hasError={Boolean(paymentErrors.cvv)}
                      />
                      {paymentErrors.cvv && (
                        <p className="mt-1 text-[11px] font-medium text-rose-500" data-testid="error-cvv">
                          {paymentErrors.cvv}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Cash on delivery notice */
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-xs text-emerald-800">
                  <div className="flex items-center gap-2 font-bold">
                    <Banknote className="h-4 w-4" />
                    <span>Pay with Cash upon Courier Arrival</span>
                  </div>
                  <p className="mt-1.5 leading-relaxed text-emerald-700">
                    Your physical packages will be scheduled for delivery. Please ensure you have the exact
                    amount ready. A 4-digit verification PIN code will be generated upon confirmation for rider
                    authentication.
                  </p>
                </div>
              )}

              {/* Step 3 Actions */}
              <div className="flex justify-between pt-2">
                {!isDigitalOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep('delivery_options')}
                  >
                    Back to Delivery
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="orange-cta"
                  className="px-6"
                  data-testid="btn-continue-review"
                >
                  <span>Continue to Review</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 4: Review and Place Order Accordion Item                            */}
      {/* ========================================================================= */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => {
            if (completedSteps.payment) setActiveStep('review');
          }}
          disabled={!completedSteps.payment}
          className={`flex w-full items-center justify-between p-6 text-left transition-colors ${
            activeStep === 'review' ? 'bg-slate-50/60' : 'hover:bg-slate-50/30'
          }`}
          data-testid="step-4-header"
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                activeStep === 'review'
                  ? 'bg-sun-orange text-white shadow-md'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              4
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Review and Place Order</span>
                <Badge variant="secondary" size="sm">
                  Final Step
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Summary of seller packages, price validation, and instant confirmation
              </p>
            </div>
          </div>
          <div className="text-slate-400">
            {activeStep === 'review' ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </button>

        {/* Accordion Content */}
        {activeStep === 'review' && (
          <div className="border-t border-slate-100 p-6 pt-5" data-testid="step-4-content">
            {/* Error Banner */}
            {orderError && (
              <div
                className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800"
                data-testid="order-error-banner"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div>
                  <p className="font-bold">Order Placement Error</p>
                  <p className="mt-0.5 text-rose-700">{orderError}</p>
                </div>
              </div>
            )}

            {/* Seller Split Packages Summary */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Seller Packages ({quoteGroups.length})
              </h4>

              {quoteGroups.map((group) => (
                <div
                  key={group.sellerId}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-2.5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-900">{group.sellerName}</span>
                      {group.sellerType === 'platform' && (
                        <Badge variant="vendora-platform" size="sm">
                          Platform Fulfilled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <span>
                        {!group.hasPhysical
                          ? 'Digital Instant Delivery (FREE)'
                          : group.deliveryOption === 'express'
                            ? `Express Shipping (${price(group.shippingFee)})`
                            : group.shippingFee === 0
                              ? 'Standard Shipping (FREE)'
                              : `Standard Shipping (${price(group.shippingFee)})`}
                      </span>
                    </div>
                  </div>

                  {/* Item list */}
                  <div className="divide-y divide-slate-100 py-2">
                    {group.items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantId}`}
                        className="flex items-center justify-between py-2 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-10 w-10 rounded-xl object-cover"
                          />
                          <div>
                            <p className="font-semibold text-slate-900">{item.title}</p>
                            <p className="text-[11px] text-slate-400">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-bold text-slate-900">{price(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {group.discount > 0 && (
                    <div className="flex justify-between py-1 text-xs font-medium text-emerald-600">
                      <span>Coupon ({group.couponCode})</span>
                      <span>-{price(group.discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-slate-100 pt-2 text-xs font-medium text-slate-600">
                    <span>Package Total (incl. shipping)</span>
                    <span className="font-bold text-slate-900">
                      {price(group.netSubtotal + group.shippingFee)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Address & Payment Recaps */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Address Recap */}
              {!isDigitalOnly && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-900">Shipping Destination</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveStep('shipping_address')}
                      className="flex items-center gap-1 text-xs font-semibold text-sun-orange hover:underline"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">{shippingAddress.fullName}</p>
                    <p>{shippingAddress.street}</p>
                    <p>
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
                    </p>
                    <p className="text-slate-400">{shippingAddress.phone}</p>
                  </div>
                </div>
              )}

              {/* Payment Recap */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-900">Payment Selection</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStep('payment')}
                    className="flex items-center gap-1 text-xs font-semibold text-sun-orange hover:underline"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  {paymentMethod === 'card' ? (
                    <div>
                      <p className="font-semibold text-slate-800">
                        {detectedBrand} ending in •••• {maskedCard.last4}
                      </p>
                      <p className="text-slate-500">Name on Card: {cardDetails.cardholderName}</p>
                      <p className="text-slate-400">
                        Expires: {cardDetails.expiryMonth}/{cardDetails.expiryYear}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-slate-800">Cash on Delivery</p>
                      <p className="text-slate-500">Pay when physical package is delivered</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price Re-validation Summary */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Price Re-Validation
                </h4>
                {totals.isFetching && (
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Repricing</span>
                  </span>
                )}
              </div>

              {totals.error && (
                <p className="mb-3 text-[11px] font-semibold text-rose-600" data-testid="quote-error">
                  {totals.error instanceof Error
                    ? totals.error.message
                    : 'Checkout could not price your cart.'}
                </p>
              )}

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-slate-900">{price(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Total</span>
                  <span className="font-semibold text-slate-900">
                    {dynamicShippingTotal === 0 ? 'FREE' : price(dynamicShippingTotal)}
                  </span>
                </div>
                {(discountTotal ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({quote?.couponCode ?? appliedCoupon?.code})</span>
                    <span className="font-semibold">-{price(discountTotal)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-3 flex justify-between text-base font-extrabold text-slate-900">
                  <span>Order Grand Total</span>
                  <span className="text-sun-orange">{price(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Double-Submit Protected Action Button */}
            <div className="mt-6">
              <Button
                type="button"
                variant="orange-cta"
                disabled={isSubmitting || placeOrderMutation.isPending || !quote || totals.isFetching}
                onClick={handlePlaceOrder}
                className="w-full py-4 text-base font-bold shadow-lg"
                data-testid="btn-place-order"
              >
                {isSubmitting || placeOrderMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Placing Your Order...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    <span>{quote ? `Place Order · ${price(grandTotal)}` : 'Repricing your cart…'}</span>
                  </>
                )}
              </Button>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Simulated PCI-Compliant Checkout · Instant Order Splitting</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
