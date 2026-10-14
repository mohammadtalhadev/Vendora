import { supabase } from '../../../lib/supabase';
import { toFriendlyError } from '../../../lib/friendly-error';
import type {
  CartItem,
  ProductType,
  ShippingAddress,
  SubOrderStatus,
} from '../../../types/domain';
import type { PaymentMethod } from '../types';

export type DeliveryChoice = 'standard' | 'express';

/**
 * A fingerprint of the cart lines. `checkout_quote` prices the *stored* cart, so nothing in
 * the request changes when a quantity does - the key has to carry it or a stale bill is shown.
 */
export function cartSignature(items: CartItem[]): string {
  return items.map((item) => `${item.productId}:${item.variantId ?? ''}:${item.quantity}`).join(';');
}

/** One cart line as the server priced it. */
export interface QuoteItem {
  productId: string;
  variantId: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  sellerId: string;
  sellerName: string;
}

/** One seller's package in the quote: what it costs, and what each service costs. */
export interface QuoteGroup {
  sellerId: string;
  sellerName: string;
  sellerType: 'platform' | 'vendor';
  hasPhysical: boolean;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  netSubtotal: number;
  deliveryOption: DeliveryChoice;
  shippingStandard: number;
  shippingExpress: number;
  shippingFee: number;
  commissionRate: number;
  commissionAmount: number;
  netPayout: number;
  couponCode: string | null;
}

export interface CheckoutQuote {
  groups: QuoteGroup[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
  couponCode: string | null;
  /** The flat express surcharge, so the screen can say what "express" costs. */
  expressFee: number;
}

export interface PlacedSubOrder {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerType: 'platform' | 'vendor';
  type: ProductType;
  status: SubOrderStatus;
  subtotal: number;
  discount: number;
  shippingFee: number;
  deliveryOption: DeliveryChoice;
  commissionAmount: number;
  netPayout: number;
  /** Shown once, here. Only its hash is stored, so a lost code is re-issued, not read back. */
  deliveryCode: string | null;
  licenseKey: string | null;
}

export interface PlacedOrder {
  orderId: string;
  subOrders: PlacedSubOrder[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
  paymentStatus: 'succeeded' | 'pending' | 'failed' | 'refunded';
  paymentDetails: { brand?: string; last4?: string; method?: string };
  /** Gift-card money the server actually applied (0 when none / not launched). */
  giftCardApplied?: number;
  /** What remains payable after the gift card: grandTotal - giftCardApplied. */
  amountDue?: number;
}

export interface PlaceOrderInput {
  /** Omitted for a digital-only order, which has nothing to deliver. */
  shippingAddress?: ShippingAddress;
  paymentMethod: PaymentMethod;
  deliveryOptions: Record<string, DeliveryChoice>;
  couponCode?: string | null;
  customerNotes?: string | null;
  /** Only the brand and last four digits leave the browser; the number itself never does. */
  card?: { brand: string; last4: string };
  /** Optional gift-card code; the server applies it only if gift cards exist. */
  giftCardCode?: string | null;
}

type RpcRow = Record<string, unknown>;

/** Addresses and option maps cross the wire as plain records, never as interface types. */
type JsonRecord = Record<string, string>;

const money = (value: unknown) => Number(value ?? 0);
const text = (value: unknown) => (value === null || value === undefined ? '' : String(value));

function addressJson(address?: ShippingAddress): JsonRecord {
  if (!address) return {};
  return {
    fullName: address.fullName,
    street: address.street,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: address.country,
    phone: address.phone,
  };
}

/** Generated RPC args omit an unset default rather than carrying a null, so undefined is the wire value. */
function normalisedCoupon(couponCode?: string | null): string | undefined {
  const code = couponCode?.trim().toUpperCase();
  return code || undefined;
}

function readQuote(raw: RpcRow): CheckoutQuote {
  const groups = Array.isArray(raw.groups) ? (raw.groups as RpcRow[]) : [];
  return {
    groups: groups.map((group) => ({
      sellerId: text(group.sellerId),
      sellerName: text(group.sellerName),
      sellerType: group.sellerType === 'platform' ? 'platform' : 'vendor',
      hasPhysical: Boolean(group.hasPhysical),
      items: (Array.isArray(group.items) ? (group.items as RpcRow[]) : []).map((item) => ({
        productId: text(item.productId),
        variantId: text(item.variantId),
        title: text(item.title),
        price: money(item.price),
        quantity: money(item.quantity),
        image: text(item.image),
        sellerId: text(item.sellerId),
        sellerName: text(item.sellerName),
      })),
      subtotal: money(group.subtotal),
      discount: money(group.discount),
      netSubtotal: money(group.netSubtotal),
      deliveryOption: group.deliveryOption === 'express' ? 'express' : 'standard',
      shippingStandard: money(group.shippingStandard),
      shippingExpress: money(group.shippingExpress),
      shippingFee: money(group.shippingFee),
      commissionRate: money(group.commissionRate),
      commissionAmount: money(group.commissionAmount),
      netPayout: money(group.netPayout),
      couponCode: group.couponCode === null ? null : text(group.couponCode),
    })),
    subtotal: money(raw.subtotal),
    discountTotal: money(raw.discountTotal),
    shippingTotal: money(raw.shippingTotal),
    grandTotal: money(raw.grandTotal),
    couponCode: raw.couponCode === null ? null : text(raw.couponCode),
    expressFee: money(raw.expressFee),
  };
}

/**
 * What this cart costs, calculated by the same function `placeOrder` books with.
 * A quote writes nothing, so it can be re-read every time a delivery option changes.
 */
export async function quoteCheckout(
  deliveryOptions: Record<string, DeliveryChoice>,
  couponCode?: string | null,
  signal?: AbortSignal,
): Promise<CheckoutQuote> {
  let call = supabase.rpc('checkout_quote', {
    p_delivery_options: deliveryOptions,
    p_coupon_code: normalisedCoupon(couponCode),
  });
  if (signal) call = call.abortSignal(signal);

  const { data, error } = await call;
  if (error) throw toFriendlyError(error, { context: 'checkout' });
  if (!data || typeof data !== 'object') throw new Error('Checkout could not price your cart.');
  return readQuote(data as RpcRow);
}

/**
 * Idempotency for one checkout attempt (Batch 44). Generated lazily on the
 * first try and REUSED by every retry, double-click and resubmit of that
 * attempt, so `place_order` can recognise a repeat and hand back the order
 * it already booked instead of booking a second one. Cleared only after a
 * successful order — the next checkout is a new attempt with a new key.
 */
let orderAttemptKey: string | null = null;

function currentAttemptKey(): string {
  if (!orderAttemptKey) orderAttemptKey = crypto.randomUUID();
  return orderAttemptKey;
}

/** Start a fresh attempt (a successful order already clears the key itself). */
export function resetOrderAttemptKey(): void {
  orderAttemptKey = null;
}

/** Books the order. The money written is the money quoted, because both read one function. */
export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  if (input.paymentMethod === 'card' && !input.card) {
    throw new Error('Enter the card you want this order paid with.');
  }

  const { data, error } = await supabase.rpc('place_order', {
    p_address: addressJson(input.shippingAddress),
    p_payment_method: input.paymentMethod,
    p_coupon_code: normalisedCoupon(input.couponCode),
    p_customer_notes: input.customerNotes?.trim() || undefined,
    p_delivery_options: input.deliveryOptions,
    p_card_brand: input.card?.brand,
    p_card_last4: input.card?.last4,
    p_idempotency_key: currentAttemptKey(),
    p_gift_card_code: input.giftCardCode?.trim() || undefined,
  });
  if (error) throw toFriendlyError(error, { context: 'checkout' });
  if (!data || typeof data !== 'object') throw new Error('Your order could not be placed. Please try again.');
  resetOrderAttemptKey();

  const raw = data as RpcRow;
  const rows = Array.isArray(raw.subOrders) ? (raw.subOrders as RpcRow[]) : [];
  return {
    orderId: text(raw.orderId),
    subOrders: rows.map((row) => ({
      id: text(row.id),
      sellerId: text(row.sellerId),
      sellerName: text(row.sellerName),
      sellerType: row.sellerType === 'platform' ? 'platform' : 'vendor',
      type: row.type === 'digital' ? 'digital' : 'physical',
      status: text(row.status) as SubOrderStatus,
      subtotal: money(row.subtotal),
      discount: money(row.discount),
      shippingFee: money(row.shippingFee),
      deliveryOption: row.deliveryOption === 'express' ? 'express' : 'standard',
      commissionAmount: money(row.commissionAmount),
      netPayout: money(row.netPayout),
      deliveryCode: row.deliveryCode === null ? null : text(row.deliveryCode),
      licenseKey: row.licenseKey === null ? null : text(row.licenseKey),
    })),
    subtotal: money(raw.subtotal),
    discountTotal: money(raw.discountTotal),
    shippingTotal: money(raw.shippingTotal),
    grandTotal: money(raw.grandTotal),
    paymentStatus: text(raw.paymentStatus) as PlacedOrder['paymentStatus'],
    paymentDetails: (raw.paymentDetails ?? {}) as PlacedOrder['paymentDetails'],
    giftCardApplied: money(raw.giftCardApplied),
    amountDue: raw.amountDue === undefined ? money(raw.grandTotal) : money(raw.amountDue),
  };
}
