import type { ShippingAddress } from '../../types/domain';

export type CheckoutStep = 'shipping_address' | 'delivery_options' | 'payment' | 'review';

export type PaymentMethod = 'card' | 'cod';

export type CardBrand = 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Unknown';

export interface DeliveryOptionPerSeller {
  sellerId: string;
  sellerName?: string;
  optionId: string;
  name: string;
  price: number;
  estimatedDays: string;
}

export interface CardPaymentDetails {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface CheckoutFormState {
  step: CheckoutStep;
  shippingAddress: ShippingAddress;
  selectedDeliveryOptions: Record<string, string>; // sellerId -> optionId
  deliveryOptionsPerSeller?: DeliveryOptionPerSeller[];
  paymentMethod: PaymentMethod;
  cardDetails: CardPaymentDetails;
  saveCard?: boolean;
  orderNotes?: string;
  isSubmitting: boolean;
  error?: string | null;
}

export interface MaskedCardSummary {
  brand: CardBrand;
  last4: string;
  masked: string;
}

export type TestCardOutcome = 'success' | 'insufficient_funds' | 'invalid_card' | 'declined';

export interface TestCardPreset {
  id: string;
  label: string;
  brand: CardBrand;
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  description: string;
  expectedOutcome: TestCardOutcome;
}
