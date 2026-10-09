import { z } from 'zod';

/**
 * Zod schemas validating responses at the API boundary (PRD §16.2:
 * "Zod validation at API boundaries"). Services parse every payload through
 * these so a malformed response surfaces as a validation error instead of
 * silently corrupting the cache.
 */

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const variantSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  stock: z.number(),
  attributes: z.record(z.string(), z.string()),
});

export const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  category: z.string(),
  brand: z.string(),
  images: z.array(z.string()),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  type: z.enum(['physical', 'digital']),
  sellerId: z.string(),
  sellerName: z.string(),
  sellerType: z.enum(['platform', 'vendor']),
  variants: z.array(variantSchema),
  stock: z.number(),
  shippingSettings: z
    .object({
      weightKg: z.number().optional(),
      freeShipping: z.boolean().optional(),
      standardFee: z.number().optional(),
    })
    .optional(),
  digitalAssetInfo: z
    .object({
      fileSizeMb: z.number().optional(),
      licenseType: z.string().optional(),
      downloadUrl: z.string().optional(),
    })
    .optional(),
  rating: z.number(),
  reviewCount: z.number(),
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected', 'archived']),
  rejectionReason: z.string().optional(),
  createdAt: z.string(),
});

export const productsResponseSchema = z.object({
  items: z.array(productSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
  hasMore: z.boolean(),
});

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().optional(),
  image: z.string().optional(),
  commissionRateOverride: z.number().optional(),
});

export const categoriesResponseSchema = z.object({
  categories: z.array(categorySchema),
});

export const suggestionsResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.enum(['product', 'category', 'vendor']),
      title: z.string(),
      id: z.string(),
      price: z.number().optional(),
    }),
  ),
});

export const vendorDetailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  storeName: z.string(),
  slug: z.string(),
  description: z.string(),
  logo: z.string(),
  banner: z.string().optional(),
  rating: z.number(),
  reviewCount: z.number(),
  commissionRateOverride: z.number().optional(),
  status: z.enum(['active', 'suspended']),
  createdAt: z.string(),
  products: z.array(productSchema).optional(),
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const cartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  title: z.string(),
  price: z.number(),
  quantity: z.number(),
  maxStock: z.number(),
  image: z.string(),
  sellerId: z.string(),
  sellerName: z.string(),
  sellerType: z.enum(['platform', 'vendor']),
  type: z.enum(['physical', 'digital']),
});

export const trackingEventSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  actor: z.string(),
  note: z.string().optional(),
});

export const subOrderStatusSchema = z.enum([
  'placed',
  'confirmed',
  'packed',
  'ready_for_pickup',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'delivery_failed',
  'return_requested',
  'return_approved',
  'refunded',
  'paid',
  'available',
]);

export const subOrderSchema = z.object({
  id: z.string(),
  orderGroupId: z.string(),
  sellerId: z.string(),
  sellerName: z.string(),
  sellerType: z.enum(['platform', 'vendor']),
  type: z.enum(['physical', 'digital']),
  items: z.array(cartItemSchema),
  subtotal: z.number(),
  shippingFee: z.number(),
  commissionRate: z.number(),
  commissionAmount: z.number(),
  netPayout: z.number(),
  status: subOrderStatusSchema,
  riderId: z.string().optional(),
  deliveryCode: z.string().optional(),
  licenseKey: z.string().optional(),
  history: z.array(trackingEventSchema),
  returnReason: z.string().optional(),
  createdAt: z.string(),
});

export const orderGroupSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerEmail: z.string(),
  shippingAddress: z
    .object({
      fullName: z.string(),
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
      country: z.string(),
      phone: z.string(),
    })
    .optional(),
  paymentMethod: z.enum(['card', 'cod']),
  paymentDetails: z.object({
    brand: z.string(),
    last4: z.string(),
  }),
  subOrderIds: z.array(z.string()),
  createdAt: z.string(),
});

export const createOrderRequestSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  shippingAddress: orderGroupSchema.shape.shippingAddress.optional(),
  paymentMethod: z.enum(['card', 'cod']),
  paymentBrand: z.string().optional(),
  last4: z.string().optional(),
});

export const createOrderResponseSchema = z.object({
  orderGroup: orderGroupSchema,
  subOrders: z.array(subOrderSchema),
});

export const ordersListResponseSchema = z.object({
  orderGroups: z.array(orderGroupSchema),
  subOrders: z.array(subOrderSchema),
});

export const orderDetailResponseSchema = ordersListResponseSchema;

export const deliveriesResponseSchema = z.object({
  deliveries: z.array(subOrderSchema),
});

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------

export const disputeMessageSchema = z.object({
  id: z.string(),
  senderRole: z.string(),
  senderName: z.string(),
  senderAvatar: z.string().optional(),
  content: z.string(),
  isInternalNote: z.boolean(),
  timestamp: z.string(),
  attachments: z.array(z.string()).optional(),
});

export const disputeSchema = z.object({
  id: z.string(),
  subOrderId: z.string(),
  orderGroupId: z.string(),
  customerId: z.string(),
  customerName: z.string().optional(),
  customerAvatar: z.string().optional(),
  vendorId: z.string(),
  vendorName: z.string().optional(),
  reason: z.string(),
  status: z.enum(['open', 'under_review', 'escalated', 'resolved_refund', 'resolved_denied']),
  urgency: z.enum(['urgent', 'standard']).optional(),
  messages: z.array(disputeMessageSchema),
  assignedAgentId: z.string().optional(),
  resolutionNote: z.string().optional(),
  resolutionAmount: z.number().optional(),
  evidencePhotos: z.array(z.string()).optional(),
  createdAt: z.string(),
});

export const disputesResponseSchema = z.object({
  disputes: z.array(disputeSchema),
});

export const disputeDetailResponseSchema = z.object({
  dispute: disputeSchema,
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
  roles: z.array(
    z.enum(['guest', 'customer', 'vendor', 'admin', 'support', 'rider']),
  ),
  vendorStatus: z.enum(['none', 'pending', 'approved', 'rejected', 'suspended']),
  vendorId: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerRequestSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});

// ---------------------------------------------------------------------------
// Admin & vendor lifecycle
// ---------------------------------------------------------------------------

export const commissionConfigSchema = z.object({
  globalDefaultRate: z.number(),
  categoryOverrides: z.record(z.string(), z.number()),
  vendorOverrides: z.record(z.string(), z.number()),
});

export const vendorApplicationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  businessName: z.string(),
  description: z.string(),
  categoryFocus: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string().optional(),
  policyAccepted: z.boolean(),
  status: z.enum(['pending', 'approved', 'rejected']),
  rejectionReason: z.string().optional(),
  createdAt: z.string(),
  reviewedAt: z.string().optional(),
});

export const vendorApplicationsResponseSchema = z.object({
  applications: z.array(vendorApplicationSchema),
});

export const vendorStatsSchema = z.object({
  grossSales: z.number(),
  commissionDeducted: z.number(),
  netPayout: z.number(),
  pendingOrders: z.number(),
  lowStockCount: z.number(),
  totalOrders: z.number(),
});
