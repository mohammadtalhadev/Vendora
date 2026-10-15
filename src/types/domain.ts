import { z } from 'zod';

// ==========================================
// 1. Roles & Permissions
// ==========================================
export type UserRole = 'guest' | 'customer' | 'vendor' | 'admin' | 'support' | 'rider';

export type VendorStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'suspended';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles: UserRole[];
  vendorStatus: VendorStatus;
  /**
   * Platform switch on the account (`profiles.account_status`). Optional
   * because demo/test fixtures predate it; the session layer always sets
   * it, and anything reading it treats an absent value as 'active'.
   */
  accountStatus?: 'active' | 'suspended' | 'banned';
  /** Persisted reason shown on the blocked page when the account is off. */
  accountStatusReason?: string;
  vendorId?: string;
  /** Persisted reason shown when a seller application was rejected or suspended. */
  rejectionReason?: string;
}

// ==========================================
// 2. Product & Catalog Models
// ==========================================
export type ProductType = 'physical' | 'digital';

export type ModerationStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';

export interface Variant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  brand: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  type: ProductType;
  sellerId: string; // 'platform' or vendorId
  sellerName: string;
  sellerType: 'platform' | 'vendor';
  sellerLogo?: string | null;
  variants: Variant[];
  stock: number;
  shippingSettings?: {
    weightKg?: number;
    freeShipping?: boolean;
    standardFee?: number;
  };
  digitalAssetInfo?: {
    fileSizeMb?: number;
    licenseType?: string;
    downloadUrl?: string;
  };
  rating: number;
  reviewCount: number;
  status: ModerationStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  commissionRateOverride?: number;
}

export interface VendorProfile {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  description: string;
  logo: string;
  banner?: string;
  rating: number;
  reviewCount: number;
  commissionRateOverride?: number;
  status: 'active' | 'suspended';
  createdAt: string;
}

// ==========================================
// 3. Cart & Multi-Vendor Grouping
// ==========================================
export interface CartItem {
  id: string; // unique item id (productId + variantId)
  productId: string;
  variantId?: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  maxStock: number;
  image: string;
  sellerId: string;
  sellerName: string;
  sellerType: 'platform' | 'vendor';
  type: ProductType;
}

export interface SellerCartGroup {
  sellerId: string;
  sellerName: string;
  sellerType: 'platform' | 'vendor';
  items: CartItem[];
  subtotal: number;
  fulfilmentNote: string;
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  grandTotal: number;
}

// ==========================================
// 4. Order Lifecycle & Split Sub-Orders
// ==========================================
export type PhysicalSubOrderStatus =
  | 'placed'
  | 'confirmed'
  | 'packed'
  | 'ready_for_pickup'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'delivery_failed'
  | 'return_requested'
  | 'return_approved'
  | 'return_rejected'
  | 'returned'
  | 'refunded';

export type DigitalSubOrderStatus =
  | 'placed'
  | 'paid'
  | 'available'
  | 'cancelled'
  | 'refunded';

export type SubOrderStatus = PhysicalSubOrderStatus | DigitalSubOrderStatus;

export interface TrackingEvent {
  status: SubOrderStatus;
  timestamp: string;
  actor: string; // 'Customer' | 'Vendor' | 'Rider' | 'Admin' | 'System'
  note?: string;
}

export interface SubOrder {
  id: string;
  orderGroupId: string;
  sellerId: string;
  sellerName: string;
  sellerType: 'platform' | 'vendor';
  type: ProductType;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  deliveryOption?: 'standard' | 'express';
  commissionRate: number; // Frozen at order placement (e.g., 0.10 for 10%)
  commissionAmount: number; // Frozen fee paid to platform
  netPayout: number; // Frozen net vendor earnings: subtotal - commissionAmount
  status: SubOrderStatus;
  riderId?: string;
  deliveryCode?: string; // 4-digit verification PIN for rider delivery
  licenseKey?: string; // For digital assets
  history: TrackingEvent[];
  returnReason?: string;
  rmaCode?: string;
  refundAmount?: number;
  returnRejectReason?: string;
  createdAt: string;
  carrierName?: string;
  trackingNumber?: string;
  shippingAddress?: ShippingAddress;
  customerNotes?: string;
}

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface OrderGroup {
  id: string;
  customerId: string;
  customerEmail: string;
  shippingAddress?: ShippingAddress;
  paymentMethod: 'card' | 'cod';
  /** A cash-on-delivery order names no card, so neither field can be assumed. */
  paymentDetails: {
    brand?: string;
    last4?: string;
  };
  /**
   * Written by place_order: 'succeeded' for a captured card, 'pending' for cash.
   * Later transitions: 'refunded' once refund rows cover the order, 'voided'
   * when an uncollected COD order is cancelled in full (Batch 56).
   */
  paymentStatus?: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'voided';
  /** How much of this order's total gift cards have covered (orders.gift_card_amount). */
  giftCardAmount: number;
  subOrderIds: string[];
  createdAt: string;
}

// ==========================================
// 5. Commission & Platform Admin
// ==========================================
export interface CommissionConfig {
  globalDefaultRate: number; // e.g. 0.10 for 10%
  categoryOverrides: Record<string, number>; // categoryId -> rate (e.g. 'electronics' -> 0.08)
  vendorOverrides: Record<string, number>; // vendorId -> rate (e.g. 'vendor-1' -> 0.07)
}

// ==========================================
// 5b. Vendor Applications (seller onboarding lifecycle)
// ==========================================
export type VendorApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface VendorApplication {
  id: string;
  userId: string;
  businessName: string;
  description: string;
  categoryFocus: string;
  contactEmail: string;
  contactPhone?: string;
  policyAccepted: boolean;
  status: VendorApplicationStatus;
  /** Persisted when the admin rejects the application, shown to the applicant. */
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

// ==========================================
// 6. Disputes & Support Tickets
// ==========================================
export type DisputeStatus = 'open' | 'under_review' | 'escalated' | 'resolved_refund' | 'resolved_denied';

export interface DisputeMessage {
  id: string;
  senderRole: UserRole;
  senderName: string;
  senderAvatar?: string;
  content: string;
  isInternalNote: boolean;
  timestamp: string;
  attachments?: string[];
}

export interface Dispute {
  id: string;
  subOrderId: string;
  orderGroupId: string;
  customerId: string;
  customerName?: string;
  customerAvatar?: string;
  vendorId: string;
  vendorName?: string;
  reason: string;
  status: DisputeStatus;
  urgency?: 'urgent' | 'standard';
  messages: DisputeMessage[];
  assignedAgentId?: string;
  resolutionNote?: string;
  resolutionAmount?: number;
  evidencePhotos?: string[];
  createdAt: string;
}

// ==========================================
// 7. Zod Validation Schemas
// ==========================================
export const shippingAddressSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State / Province is required'),
  zipCode: z.string().min(4, 'ZIP / Postal code is required'),
  country: z.string().default('United States'),
  phone: z.string().min(7, 'Valid phone number required'),
});

export const cardPaymentSchema = z.object({
  cardNumber: z
    .string()
    .regex(/^[0-9\s]{13,19}$/, 'Invalid card number format')
    .refine((val) => {
      // Luhn algorithm check
      const digits = val.replace(/\s+/g, '');
      let sum = 0;
      let shouldDouble = false;
      for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits.charAt(i), 10);
        if (shouldDouble) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
      }
      return sum % 10 === 0;
    }, 'Card failed Luhn checksum validation'),
  cardholderName: z.string().min(3, 'Cardholder name is required'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, 'Expiry must be MM/YY'),
  cvv: z.string().regex(/^[0-9]{3,4}$/, 'CVV must be 3 or 4 digits'),
});
