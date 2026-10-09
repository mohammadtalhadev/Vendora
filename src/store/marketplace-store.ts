import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, SubOrder, SubOrderStatus, Dispute } from '../types/domain';
import { SEED_PRODUCTS } from '../mocks/seed/catalog';
import { mockDb } from '../mocks/db';

export interface MarketplaceVendor {
  id: string;
  storeName: string;
  category: string;
  subdomain: string;
  ownerName: string;
  countryCode: string;
  email: string;
  kycStatus: 'Verified' | 'Pending Review' | 'Investigation';
  performanceTier: 'Tier 1 Elite' | 'Tier 2 Verified' | 'Tier 3 Standard';
  revenue: number;
  revenueFormatted: string;
  trend: string;
  trendType: 'positive' | 'neutral' | 'frozen';
  status: 'active' | 'suspended';
  commissionRate: number;
  rating: number;
  reviewCount: number;
  joinedDate: string;
}

export interface MarketplaceReturn {
  id: string;
  rmaId: string;
  orderNumber: string;
  orderTime: string;
  customerName: string;
  customerCity: string;
  productImage: string;
  productName: string;
  productVariant: string;
  reason: string;
  badgeType?: 'photos' | 'video' | 'unopened' | 'dock' | 'restocked' | 'mismatch' | 'passed';
  badgeLabel?: string;
  serialNote?: string;
  refundAmount: number;
  refundAmountFormatted: string;
  status: 'pending' | 'approved' | 'rejected' | 'restocked' | 'in_transit';
}

export interface MarketplacePromotion {
  id: string;
  name: string;
  code: string;
  typeValue: string;
  discountType: 'percentage' | 'fixed';
  discountAmount: number;
  minOrder: string;
  scope: string;
  scopeIcon: 'audio' | 'keyboard' | 'storewide';
  window: string;
  windowSubtext: string;
  redemptionsCurrent: number;
  redemptionsMax: number | 'unlimited';
  salesAttributed: number;
  ordersAttributed: number;
  status: 'active' | 'scheduled' | 'expired' | 'draft';
  isEnabled: boolean;
}

export interface MarketplacePayout {
  id: string;
  period: string;
  destination: string;
  amount: number;
  status: 'processing' | 'completed' | 'failed';
  traceId: string;
  createdAt: string;
}

export interface MarketplaceBankAccount {
  id: string;
  bankName: string;
  accountType: string;
  last4: string;
  routing: string;
  isDefault: boolean;
  statusText: string;
}

export interface CustomerMessageItem {
  id: string;
  sender: 'customer' | 'vendor' | 'support';
  senderName: string;
  avatar: string;
  time: string;
  text: string;
  attachments?: { name: string; size: string }[];
}

export interface CustomerThread {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerAvatar: string;
  country: string;
  lifetimeSpend: string;
  totalOrders: number;
  activeOrderId: string;
  activeOrderProduct: string;
  activeOrderTotal: string;
  activeOrderStatus: string;
  subject: string;
  preview: string;
  timestamp: string;
  unread: boolean;
  status: 'urgent' | 'open' | 'pending' | 'resolved' | 'escalated';
  channel: 'order_inquiry' | 'return_rma' | 'product_question' | 'dispute';
  productContext: string;
  slaMinutes: number;
  messages: CustomerMessageItem[];
}

export interface MarketplaceReview {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorCountry: string;
  verifiedPurchase: boolean;
  orderNumber: string;
  rating: number;
  date: string;
  productName: string;
  variant: string;
  headline: string;
  body: string;
  photos: string[];
  helpfulCount: number;
  hasSellerReply: boolean;
  sellerReply?: {
    date: string;
    text: string;
  };
}

export interface MarketplaceUserRecord {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: 'Vendor Admin' | 'Vendor Staff' | 'Buyer' | 'Dispute Moderator' | 'Platform Admin';
  status: 'Active' | 'Suspended' | 'Inactive';
  totalVolume: string;
  lastActive: string;
  joinDate: string;
}

export interface MarketplaceReportArchive {
  id: string;
  name: string;
  type: string;
  dateRange: string;
  fileSize: string;
  authorInitials: string;
  authorName: string;
  status: 'Ready' | 'Processing';
}

export interface MarketplaceAlert {
  id: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  type: 'critical' | 'warning' | 'broadcast' | 'info';
  title: string;
  teamBadge: string;
  statusBadge: string;
  statusBadgeStyle: string;
  timestamp: string;
  description: string;
  meta: string;
  primaryAction?: string;
  secondaryAction?: string;
  isAcknowledged?: boolean;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  currency: string;
  multiCurrency: boolean;
  payoutSchedule: string;
  minPayoutFloor: string;
  reserveRetentionDays: string;
  slaCeiling: string;
  refundWindowDays: string;
  aiModerationMode: string;
  autoRefundOnDispute: boolean;
  sessionTimeout: string;
  ipWhitelisting: boolean;
}

export interface StoreSettings {
  storeName: string;
  slug: string;
  description: string;
  category: string;
  email: string;
  phone: string;
  taxId: string;
  registeredName: string;
  registrationNumber: string;
  handlingTime: string;
  freeShippingThreshold: number;
  vacationMode: boolean;
  enabledCarriers: {
    fedex: boolean;
    ups: boolean;
    dhl: boolean;
    vendoraExpress: boolean;
  };
}

export interface CategoryFeeOverride {
  id: string;
  categoryName: string;
  subtext: string;
  baseTierFee: string;
  categoryOverride: string;
  fixedOrderFee: string;
  merchantsCount: number;
  status: 'Active' | 'Exp in 6d';
}

interface MarketplaceState {
  products: Product[];
  vendors: MarketplaceVendor[];
  subOrders: SubOrder[];
  disputes: Dispute[];
  categoryOverrides: CategoryFeeOverride[];
  globalCommissionRate: number; // e.g. 0.10
  returns: MarketplaceReturn[];
  promotions: MarketplacePromotion[];
  payouts: MarketplacePayout[];
  bankAccounts: MarketplaceBankAccount[];
  threads: CustomerThread[];
  reviews: MarketplaceReview[];
  users: MarketplaceUserRecord[];
  reports: MarketplaceReportArchive[];
  alerts: MarketplaceAlert[];
  platformSettings: PlatformSettings;
  storeSettings: Record<string, StoreSettings>; // vendorId -> StoreSettings

  // Product Actions
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  moderateProduct: (id: string, status: 'approved' | 'rejected', reason?: string) => void;
  batchModerateProducts: (ids: string[], status: 'approved' | 'rejected') => void;

  // Order Actions
  advanceSubOrderStatus: (id: string, nextStatus: SubOrderStatus, actor?: string, note?: string) => void;
  bulkAdvanceOrders: (ids: string[], nextStatus: SubOrderStatus) => void;
  refundOrder: (id: string, reason?: string) => void;

  // Vendor Actions
  updateVendorKyc: (id: string, status: 'Verified' | 'Pending Review' | 'Investigation') => void;
  updateVendorTier: (id: string, tier: 'Tier 1 Elite' | 'Tier 2 Verified' | 'Tier 3 Standard') => void;
  updateVendorStatus: (id: string, status: 'active' | 'suspended') => void;
  onboardVendor: (vendor: Omit<MarketplaceVendor, 'id' | 'revenue' | 'revenueFormatted' | 'trend' | 'trendType' | 'rating' | 'reviewCount' | 'joinedDate'>) => void;

  // Dispute Actions
  resolveDispute: (id: string, resolution: string) => void;
  escalateDispute: (id: string) => void;

  // Commission Actions
  updateGlobalCommissionRate: (rate: number) => void;
  addCategoryOverride: (override: Omit<CategoryFeeOverride, 'id'>) => void;
  updateCategoryOverride: (id: string, rate: string, fixedFee?: string) => void;

  // Return Actions
  approveReturn: (rmaId: string, refundAmount?: number) => void;
  rejectReturn: (rmaId: string, reason?: string) => void;
  markReturnRestocked: (rmaId: string) => void;

  // Promotion Actions
  createPromotion: (promo: Omit<MarketplacePromotion, 'id' | 'redemptionsCurrent' | 'salesAttributed' | 'ordersAttributed'>) => void;
  togglePromotion: (id: string, enabled: boolean) => void;
  deletePromotion: (id: string) => void;

  // Payout Actions
  requestInstantPayout: (amount: number, destination: string) => void;
  addBankAccount: (bank: Omit<MarketplaceBankAccount, 'id'>) => void;
  setDefaultBankAccount: (id: string) => void;

  // Message Actions
  sendCustomerMessage: (threadId: string, text: string, senderRole?: 'vendor' | 'support') => void;
  updateThreadStatus: (threadId: string, status: CustomerThread['status']) => void;

  // Review Actions
  addReviewReply: (reviewId: string, replyText: string) => void;
  voteReviewHelpful: (reviewId: string) => void;

  // User Actions
  updateUserStatus: (id: string, status: 'Active' | 'Suspended' | 'Inactive') => void;
  updateUserRole: (id: string, role: MarketplaceUserRecord['role']) => void;
  addUser: (user: Omit<MarketplaceUserRecord, 'id' | 'joinDate' | 'lastActive' | 'totalVolume'>) => void;

  // Report Actions
  generateReport: (name: string, type: string, dateRange: string) => void;

  // Alert Actions
  acknowledgeAlert: (id: string) => void;
  dismissAlert: (id: string) => void;
  createBroadcastAlert: (title: string, description: string, teamBadge?: string) => void;

  // Settings Actions
  savePlatformSettings: (settings: Partial<PlatformSettings>) => void;
  saveStoreSettings: (vendorId: string, settings: Partial<StoreSettings>) => void;
}

// ==========================================
// Initial Baseline Seeds
// ==========================================

const INITIAL_VENDORS_DATA: MarketplaceVendor[] = [
  {
    id: 'vendor-tech-1',
    storeName: 'SoundWave Direct',
    category: 'AUDIO & SOUND',
    subdomain: 'soundwave.vendora.shop',
    ownerName: 'Marcus Vance',
    countryCode: 'US',
    email: 'marcus@soundwavedirect.com',
    kycStatus: 'Verified',
    performanceTier: 'Tier 1 Elite',
    revenue: 34820,
    revenueFormatted: '$34,820',
    trend: '+14%',
    trendType: 'positive',
    status: 'active',
    commissionRate: 0.07,
    rating: 4.9,
    reviewCount: 382,
    joinedDate: '15 Jan 2025',
  },
  {
    id: 'vendor-design-1',
    storeName: 'StudioCraft Assets',
    category: 'DIGITAL LICENSES',
    subdomain: 'studiocraft.vendora.shop',
    ownerName: 'Elena Rostova',
    countryCode: 'FR',
    email: 'elena@studiocraft.design',
    kycStatus: 'Verified',
    performanceTier: 'Tier 1 Elite',
    revenue: 41290,
    revenueFormatted: '$41,290',
    trend: '+18%',
    trendType: 'positive',
    status: 'active',
    commissionRate: 0.15,
    rating: 4.95,
    reviewCount: 890,
    joinedDate: '01 Feb 2025',
  },
  {
    id: 'v-3',
    storeName: 'Nexus Tech Hub',
    category: 'HARDWARE',
    subdomain: 'nexustech.vendora.shop',
    ownerName: 'Tariq Mansour',
    countryCode: 'AE',
    email: 'tariq@nexusglobal.ae',
    kycStatus: 'Pending Review',
    performanceTier: 'Tier 3 Standard',
    revenue: 18920,
    revenueFormatted: '$18,920',
    trend: 'In escrow',
    trendType: 'neutral',
    status: 'active',
    commissionRate: 0.10,
    rating: 4.7,
    reviewCount: 140,
    joinedDate: '12 Mar 2025',
  },
  {
    id: 'v-4',
    storeName: 'Urban Nomad Living',
    category: 'HOME & LIVING',
    subdomain: 'urbannomad.vendora.shop',
    ownerName: 'Chloe Davenport',
    countryCode: 'UK',
    email: 'chloe@urbannomad.co.uk',
    kycStatus: 'Verified',
    performanceTier: 'Tier 1 Elite',
    revenue: 72810,
    revenueFormatted: '$72,810',
    trend: '+22%',
    trendType: 'positive',
    status: 'active',
    commissionRate: 0.10,
    rating: 4.9,
    reviewCount: 620,
    joinedDate: '20 Nov 2024',
  },
  {
    id: 'v-5',
    storeName: 'Artisan Kitchen',
    category: 'COOKWARE',
    subdomain: 'artisankitchen.vendora.shop',
    ownerName: 'Marco Bellini',
    countryCode: 'IT',
    email: 'marco@bellini-kitchen.it',
    kycStatus: 'Verified',
    performanceTier: 'Tier 2 Verified',
    revenue: 34500,
    revenueFormatted: '$34,500',
    trend: '+5%',
    trendType: 'positive',
    status: 'active',
    commissionRate: 0.10,
    rating: 4.8,
    reviewCount: 510,
    joinedDate: '05 Jan 2025',
  },
  {
    id: 'v-6',
    storeName: 'Apex Tech',
    category: 'FLAGGED',
    subdomain: 'apextech-direct.vendora.shop',
    ownerName: 'Arthur Pendelton',
    countryCode: 'CA',
    email: 'art@apexsupplies.ca',
    kycStatus: 'Investigation',
    performanceTier: 'Tier 3 Standard',
    revenue: 8210,
    revenueFormatted: '$8,210',
    trend: 'Payouts Frozen',
    trendType: 'frozen',
    status: 'suspended',
    commissionRate: 0.10,
    rating: 3.4,
    reviewCount: 88,
    joinedDate: '28 Dec 2024',
  },
];

const INITIAL_SUB_ORDERS_DATA: SubOrder[] = [
  {
    id: 'sub-ord-2001',
    orderGroupId: 'ord-grp-2001',
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    items: [
      {
        id: 'item-2001-1',
        productId: 'prod-vend-1',
        title: 'Aura Precision Studio Reference In-Ear Monitors',
        price: 189.0,
        quantity: 1,
        maxStock: 14,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
        type: 'physical',
      },
    ],
    subtotal: 189.0,
    shippingFee: 8.5,
    commissionRate: 0.07,
    commissionAmount: 13.23,
    netPayout: 175.77,
    status: 'placed',
    deliveryCode: '4921',
    history: [
      {
        status: 'placed',
        timestamp: '2026-10-06T08:00:00.000Z',
        actor: 'Customer',
        note: 'Order placed by Sarah Jenkins',
      },
    ],
    createdAt: '2026-10-06T08:00:00.000Z',
  },
  {
    id: 'sub-ord-2002',
    orderGroupId: 'ord-grp-2002',
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    items: [
      {
        id: 'item-2002-1',
        productId: 'prod-vend-2',
        title: 'KeebCraft Pro 75% Gasket-Mount Mechanical Keyboard',
        price: 159.0,
        quantity: 1,
        maxStock: 8,
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
        type: 'physical',
      },
    ],
    subtotal: 159.0,
    shippingFee: 8.5,
    commissionRate: 0.07,
    commissionAmount: 11.13,
    netPayout: 147.87,
    status: 'confirmed',
    deliveryCode: '7103',
    history: [
      {
        status: 'placed',
        timestamp: '2026-10-05T14:30:00.000Z',
        actor: 'Customer',
        note: 'Order placed by Marcus Vance',
      },
      {
        status: 'confirmed',
        timestamp: '2026-10-05T15:10:00.000Z',
        actor: 'Vendor',
        note: 'Inventory confirmed by SoundWave Direct',
      },
    ],
    createdAt: '2026-10-05T14:30:00.000Z',
  },
  {
    id: 'sub-ord-2003',
    orderGroupId: 'ord-grp-2003',
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    items: [
      {
        id: 'item-2003-1',
        productId: 'prod-vend-1',
        title: 'Aura Precision Studio Reference In-Ear Monitors',
        price: 189.0,
        quantity: 2,
        maxStock: 14,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
        type: 'physical',
      },
    ],
    subtotal: 378.0,
    shippingFee: 0.0,
    commissionRate: 0.07,
    commissionAmount: 26.46,
    netPayout: 351.54,
    status: 'packed',
    deliveryCode: '8834',
    history: [
      {
        status: 'placed',
        timestamp: '2026-10-05T09:15:00.000Z',
        actor: 'Customer',
        note: 'Order placed by Elena Rostova',
      },
      {
        status: 'confirmed',
        timestamp: '2026-10-05T10:00:00.000Z',
        actor: 'Vendor',
        note: 'Order confirmed',
      },
      {
        status: 'packed',
        timestamp: '2026-10-05T11:45:00.000Z',
        actor: 'Vendor',
        note: 'Package sealed in warehouse',
      },
    ],
    createdAt: '2026-10-05T09:15:00.000Z',
  },
  {
    id: 'sub-ord-2004',
    orderGroupId: 'ord-grp-2004',
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    items: [
      {
        id: 'item-2004-1',
        productId: 'prod-vend-2',
        title: 'KeebCraft Pro 75% Gasket-Mount Mechanical Keyboard',
        price: 159.0,
        quantity: 1,
        maxStock: 8,
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
        type: 'physical',
      },
    ],
    subtotal: 159.0,
    shippingFee: 8.5,
    commissionRate: 0.07,
    commissionAmount: 11.13,
    netPayout: 147.87,
    status: 'ready_for_pickup',
    deliveryCode: '3219',
    history: [
      {
        status: 'placed',
        timestamp: '2026-10-04T12:00:00.000Z',
        actor: 'Customer',
        note: 'Order placed by Alex Chen',
      },
      {
        status: 'ready_for_pickup',
        timestamp: '2026-10-04T14:30:00.000Z',
        actor: 'Vendor',
        note: 'Ready for rider collection',
      },
    ],
    createdAt: '2026-10-04T12:00:00.000Z',
  },
  {
    id: 'sub-ord-2005',
    orderGroupId: 'ord-grp-2005',
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    type: 'physical',
    items: [
      {
        id: 'item-2005-1',
        productId: 'prod-vend-1',
        title: 'Aura Precision Studio Reference In-Ear Monitors',
        price: 189.0,
        quantity: 1,
        maxStock: 14,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
        sellerId: 'vendor-tech-1',
        sellerName: 'SoundWave Direct',
        sellerType: 'vendor',
        type: 'physical',
      },
    ],
    subtotal: 189.0,
    shippingFee: 8.5,
    commissionRate: 0.07,
    commissionAmount: 13.23,
    netPayout: 175.77,
    status: 'delivered',
    deliveryCode: '9041',
    history: [
      {
        status: 'placed',
        timestamp: '2026-10-03T10:00:00.000Z',
        actor: 'Customer',
        note: 'Order placed by David Miller',
      },
      {
        status: 'delivered',
        timestamp: '2026-10-03T16:30:00.000Z',
        actor: 'Rider',
        note: 'Delivered',
      },
    ],
    createdAt: '2026-10-03T10:00:00.000Z',
  },
  {
    id: 'sub-ord-2006',
    orderGroupId: 'ord-grp-2006',
    sellerId: 'platform',
    sellerName: 'Vendora Direct',
    sellerType: 'platform',
    type: 'physical',
    items: [
      {
        id: 'item-2006-1',
        productId: 'prod-v-1',
        title: 'Vendora One Wireless ANC Flagship Headphones',
        price: 249.0,
        quantity: 1,
        maxStock: 45,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        sellerId: 'platform',
        sellerName: 'Vendora Direct',
        sellerType: 'platform',
        type: 'physical',
      },
    ],
    subtotal: 249.0,
    shippingFee: 0.0,
    commissionRate: 1.0,
    commissionAmount: 249.0,
    netPayout: 0,
    status: 'placed',
    history: [
      {
        status: 'placed',
        timestamp: '2026-10-06T13:10:00.000Z',
        actor: 'Customer',
        note: 'Order placed by David Chen',
      },
    ],
    createdAt: '2026-10-06T13:10:00.000Z',
  },
  {
    id: 'sub-ord-2007',
    orderGroupId: 'ord-grp-2007',
    sellerId: 'vendor-design-1',
    sellerName: 'StudioCraft Assets',
    sellerType: 'vendor',
    type: 'digital',
    items: [
      {
        id: 'item-2007-1',
        productId: 'prod-digi-1',
        title: 'Vendora Glass Design System UI Kit & Figma Tokens',
        price: 59.0,
        quantity: 1,
        maxStock: 9999,
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        sellerId: 'vendor-design-1',
        sellerName: 'StudioCraft Assets',
        sellerType: 'vendor',
        type: 'digital',
      },
    ],
    subtotal: 59.0,
    shippingFee: 0.0,
    commissionRate: 0.15,
    commissionAmount: 8.85,
    netPayout: 50.15,
    status: 'delivered',
    licenseKey: 'VEN-LIC-DIGI-8841',
    history: [
      {
        status: 'placed',
        timestamp: '2026-10-05T19:45:00.000Z',
        actor: 'Customer',
        note: 'Digital purchase settled',
      },
    ],
    createdAt: '2026-10-05T19:45:00.000Z',
  },
];

const INITIAL_CATEGORY_OVERRIDES: CategoryFeeOverride[] = [
  {
    id: 'cat-1',
    categoryName: 'Consumer Electronics',
    subtext: 'High-ticket hardware',
    baseTierFee: '12.0%',
    categoryOverride: '6.5%',
    fixedOrderFee: '$0.45',
    merchantsCount: 218,
    status: 'Active',
  },
  {
    id: 'cat-2',
    categoryName: 'Fine Jewelry & Watches',
    subtext: 'Luxury verified',
    baseTierFee: '12.0%',
    categoryOverride: '9.0%',
    fixedOrderFee: '$1.50',
    merchantsCount: 64,
    status: 'Active',
  },
  {
    id: 'cat-3',
    categoryName: 'Streetwear Apparel',
    subtext: 'Seasonal discounts',
    baseTierFee: '12.0%',
    categoryOverride: '10.0%',
    fixedOrderFee: '$0.25',
    merchantsCount: 540,
    status: 'Exp in 6d',
  },
  {
    id: 'cat-4',
    categoryName: 'Digital Licenses',
    subtext: 'Software & design tokens',
    baseTierFee: '12.0%',
    categoryOverride: '15.0%',
    fixedOrderFee: '$0.15',
    merchantsCount: 112,
    status: 'Active',
  },
];

const INITIAL_RETURNS_DATA: MarketplaceReturn[] = [
  {
    id: 'rma-1',
    rmaId: 'RMA-4029',
    orderNumber: '#ORD-9784',
    orderTime: 'Yesterday, 4:15 PM',
    customerName: 'Elena Rostova',
    customerCity: 'Chicago, IL',
    productImage: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?auto=format&fit=crop&w=120&q=80',
    productName: 'Anker 737 GaN Power Bank',
    productVariant: '140W (24,000mAh) • Space Gray',
    reason: 'Ports unresponsive',
    badgeType: 'photos',
    badgeLabel: '2 Photos',
    serialNote: 'Serial #AK-9921',
    refundAmount: 89.99,
    refundAmountFormatted: '$89.99',
    status: 'pending',
  },
  {
    id: 'rma-2',
    rmaId: 'RMA-4028',
    orderNumber: '#ORD-9740',
    orderTime: 'May 14, 11:20 AM',
    customerName: 'Marcus Vance',
    customerCity: 'Austin, TX',
    productImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=120&q=80',
    productName: 'Sony WH-1000XM5 ANC',
    productVariant: 'Platinum Silver • Over-Ear',
    reason: 'Buyer remorse / unopened',
    badgeType: 'unopened',
    badgeLabel: 'Unopened box',
    refundAmount: 348.0,
    refundAmountFormatted: '$348.00',
    status: 'approved',
  },
  {
    id: 'rma-3',
    rmaId: 'RMA-4027',
    orderNumber: '#ORD-9612',
    orderTime: 'May 13, 09:04 AM',
    customerName: 'Sophia Lin',
    customerCity: 'Seattle, WA',
    productImage: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=120&q=80',
    productName: 'Keychron Q1 Pro Wireless',
    productVariant: 'Carbon Black • Gateron Banana',
    reason: 'Scratch on frame',
    badgeType: 'dock',
    badgeLabel: 'Dock Bay 4 • Arrived 2h ago',
    refundAmount: 198.0,
    refundAmountFormatted: '$198.00',
    status: 'in_transit',
  },
];

const INITIAL_PROMOTIONS_DATA: MarketplacePromotion[] = [
  {
    id: 'promo-1',
    name: 'Fall Audio Blowout',
    code: 'FALLAUDIO15',
    typeValue: '15% Off',
    discountType: 'percentage',
    discountAmount: 15,
    minOrder: 'Min order $75',
    scope: 'Category: Audio',
    scopeIcon: 'audio',
    window: 'Oct 01 – Oct 31',
    windowSubtext: '14 days left',
    redemptionsCurrent: 74,
    redemptionsMax: 100,
    salesAttributed: 2140.0,
    ordersAttributed: 18,
    status: 'active',
    isEnabled: true,
  },
  {
    id: 'promo-2',
    name: 'Mechanical Keyboard Bundle',
    code: 'BUNDLE20',
    typeValue: '$20.00 Off',
    discountType: 'fixed',
    discountAmount: 20,
    minOrder: 'Min 2 items',
    scope: 'Keychron Q1 + Rest',
    scopeIcon: 'keyboard',
    window: 'Oct 05 – Nov 05',
    windowSubtext: '19 days left',
    redemptionsCurrent: 45,
    redemptionsMax: 500,
    salesAttributed: 1280.0,
    ordersAttributed: 11,
    status: 'active',
    isEnabled: true,
  },
  {
    id: 'promo-3',
    name: 'New Customer Welcome',
    code: 'WELCOME10',
    typeValue: '10% Storewide',
    discountType: 'percentage',
    discountAmount: 10,
    minOrder: 'No minimum',
    scope: 'Storewide',
    scopeIcon: 'storewide',
    window: 'Always active',
    windowSubtext: 'No expiry date',
    redemptionsCurrent: 142,
    redemptionsMax: 'unlimited',
    salesAttributed: 4980.0,
    ordersAttributed: 42,
    status: 'active',
    isEnabled: true,
  },
];

const INITIAL_PAYOUTS_DATA: MarketplacePayout[] = [
  {
    id: 'TR-90412-ACH',
    period: 'Oct 01 – Oct 15, 2026',
    destination: 'Chase ••••4821',
    amount: 2450.0,
    status: 'processing',
    traceId: 'ACH-48192019',
    createdAt: '2026-10-01T12:00:00Z',
  },
  {
    id: 'TR-89210-ACH',
    period: 'Sep 16 – Sep 30, 2026',
    destination: 'Chase ••••4821',
    amount: 2180.5,
    status: 'completed',
    traceId: 'ACH-48102911',
    createdAt: '2026-09-16T12:00:00Z',
  },
  {
    id: 'TR-88195-ACH',
    period: 'Sep 01 – Sep 15, 2026',
    destination: 'Chase ••••4821',
    amount: 2890.0,
    status: 'completed',
    traceId: 'ACH-47981290',
    createdAt: '2026-09-01T12:00:00Z',
  },
];

const INITIAL_BANK_ACCOUNTS_DATA: MarketplaceBankAccount[] = [
  {
    id: 'bank-1',
    bankName: 'JPMorgan Chase Bank, N.A.',
    accountType: 'Business Checking',
    last4: '4821',
    routing: '021000021',
    isDefault: true,
    statusText: 'Direct Deposit Active',
  },
  {
    id: 'bank-2',
    bankName: 'Silicon Valley Bank / First Rep.',
    accountType: 'Treasury Reserve',
    last4: '9102',
    routing: '121140399',
    isDefault: false,
    statusText: 'Secondary Wire Account',
  },
];

const INITIAL_THREADS_DATA: CustomerThread[] = [
  {
    id: 'th-1',
    buyerName: 'Elena Rostova',
    buyerEmail: 'elena.rostova@gmail.com',
    buyerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    country: 'United States (Austin, TX)',
    lifetimeSpend: '$1,420.00',
    totalOrders: 6,
    activeOrderId: '#ORD-9821',
    activeOrderProduct: 'Sony WH-1000XM5 Wireless Headphones (Black)',
    activeOrderTotal: '$348.00',
    activeOrderStatus: 'In Transit • Est. Tomorrow',
    subject: 'Package tracking delayed past scheduled 48h carrier cutoff',
    preview: 'Hi! The FedEx tracking hasn’t updated for 36 hours. Can you check whether the carrier picked it up?',
    timestamp: '12m ago',
    unread: true,
    status: 'urgent',
    channel: 'order_inquiry',
    productContext: 'Sony WH-1000XM5',
    slaMinutes: 18,
    messages: [
      {
        id: 'm-1',
        sender: 'customer',
        senderName: 'Elena Rostova',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        time: 'Today, 10:14 AM',
        text: 'Hello SoundWave team! My order #ORD-9821 was marked shipped yesterday morning, but the FedEx tracking number (781920391) still shows "Shipment Information Sent to FedEx" without scan activity. Will this still arrive by Friday?',
      },
      {
        id: 'm-2',
        sender: 'vendor',
        senderName: 'SoundWave Support (You)',
        avatar: 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=120&q=80',
        time: 'Today, 10:22 AM',
        text: 'Hi Elena! Thanks for reaching out. Our dispatch warehouse in Dallas had the bulk pallet collected by FedEx Ground at 4:30 PM yesterday. Sometimes their regional hub scan takes up to 24 hours to sync.',
      },
      {
        id: 'm-3',
        sender: 'customer',
        senderName: 'Elena Rostova',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        time: '12m ago',
        text: 'Understood, thank you! If it doesn\'t scan by this evening could you initiate an investigation ticket with the carrier?',
      },
    ],
  },
  {
    id: 'th-2',
    buyerName: 'Marcus Vance',
    buyerEmail: 'marcus.vance@techlead.io',
    buyerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    country: 'Canada (Toronto, ON)',
    lifetimeSpend: '$890.50',
    totalOrders: 3,
    activeOrderId: '#ORD-9799',
    activeOrderProduct: 'Keychron Q1 Pro Custom Mechanical Keyboard (Red Switch)',
    activeOrderTotal: '$199.00',
    activeOrderStatus: 'Delivered (3 days ago)',
    subject: 'Requesting warranty exchange for unresponsive spacebar stabilizer',
    preview: 'The right wire clip on the spacebar seems dislodged from factory.',
    timestamp: '1h ago',
    unread: true,
    status: 'open',
    channel: 'return_rma',
    productContext: 'Keychron Q1 Pro',
    slaMinutes: 42,
    messages: [
      {
        id: 'm-201',
        sender: 'customer',
        senderName: 'Marcus Vance',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        time: 'Today, 09:10 AM',
        text: 'The board arrived in pristine shape, but the spacebar has significant rattle and occasionally sticks on the right side. Would you prefer I open an RMA for replacement or do you ship spare screw-in stabilizers?',
      },
    ],
  },
];

const INITIAL_REVIEWS_DATA: MarketplaceReview[] = [
  {
    id: 'rev-1',
    authorName: 'David Kross',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    authorCountry: 'United States',
    verifiedPurchase: true,
    orderNumber: '#ORD-9812',
    rating: 5,
    date: 'Oct 04, 2026',
    productName: 'Sony WH-1000XM5 ANC Headphones',
    variant: 'Midnight Black • Over-Ear',
    headline: 'Stunning acoustic separation and flawless noise cancelling',
    body: 'The build quality exceeded my expectations. Fast dispatch from SoundWave Direct and arrived securely packaged with double bubble-wrap.',
    photos: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=400&q=80',
    ],
    helpfulCount: 24,
    hasSellerReply: true,
    sellerReply: {
      date: 'Oct 05, 2026',
      text: 'Thank you so much for the detailed review David! We are thrilled that the beryllium acoustic profile matched your expectations.',
    },
  },
  {
    id: 'rev-2',
    authorName: 'Elena Rostova',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    authorCountry: 'France',
    verifiedPurchase: true,
    orderNumber: '#ORD-9788',
    rating: 4,
    date: 'Oct 02, 2026',
    productName: 'Keychron Q1 Pro Custom Keyboard',
    variant: 'Carbon Black • Gateron Red',
    headline: 'Heavyweight CNC aluminum chassis, slight Bluetooth sleep delay',
    body: 'The tactile switches and keycap profile feel incredible. Only minor grievance is the 2-second wake latency when reconnecting to Mac after sleep.',
    photos: [],
    helpfulCount: 16,
    hasSellerReply: true,
    sellerReply: {
      date: 'Oct 03, 2026',
      text: 'Thanks Elena! Pro-tip: you can flash the custom QMK/VIA firmware from our support portal to reduce the Bluetooth sleep threshold.',
    },
  },
  {
    id: 'rev-3',
    authorName: 'Liam Torres',
    authorAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80',
    authorCountry: 'United Kingdom',
    verifiedPurchase: true,
    orderNumber: '#ORD-9714',
    rating: 2,
    date: 'Sep 29, 2026',
    productName: 'Anker 737 GaN Power Bank',
    variant: 'Space Gray • 140W',
    headline: 'Box arrived crushed by courier, port 2 intermittent',
    body: 'Outer retail packaging took a heavy blow during transit. The digital screen works but USB-C Port 2 sometimes drops down to 15W instead of full 140W PD.',
    photos: [
      'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?auto=format&fit=crop&w=400&q=80',
    ],
    helpfulCount: 38,
    hasSellerReply: false,
  },
];

const INITIAL_USERS_DATA: MarketplaceUserRecord[] = [
  {
    id: 'usr-1',
    initials: 'AC',
    name: 'Abigail Clark',
    email: 'abigail.clark@vendora.market',
    role: 'Vendor Admin',
    status: 'Active',
    totalVolume: '$48,290.00',
    lastActive: '10 Nov 2025',
    joinDate: '30 Oct 2025',
  },
  {
    id: 'usr-2',
    initials: 'MV',
    name: 'Marcus Vance',
    email: 'marcus.v@apextech.io',
    role: 'Vendor Staff',
    status: 'Active',
    totalVolume: '$124,500.00',
    lastActive: 'Just now',
    joinDate: '14 Jan 2025',
  },
  {
    id: 'usr-3',
    initials: 'AH',
    name: 'Amelia Harris',
    email: 'amelia.harris@gmail.com',
    role: 'Buyer',
    status: 'Active',
    totalVolume: '$3,420.50',
    lastActive: '20 Dec 2025',
    joinDate: '10 Apr 2025',
  },
  {
    id: 'usr-4',
    initials: 'AR',
    name: 'Andrew Robinson',
    email: 'andrew.robinson@outlook.com',
    role: 'Buyer',
    status: 'Suspended',
    totalVolume: '$890.00',
    lastActive: '18 Dec 2025',
    joinDate: '22 Sept 2025',
  },
  {
    id: 'usr-5',
    initials: 'AM',
    name: 'Ava Martinez',
    email: 'ava.martinez@vendora-ops.com',
    role: 'Dispute Moderator',
    status: 'Inactive',
    totalVolume: '--',
    lastActive: '01 Dec 2025',
    joinDate: '17 Aug 2025',
  },
  {
    id: 'usr-6',
    initials: 'CJ',
    name: 'Charlotte Jackson',
    email: 'charlotte.j@urbanstyle.co',
    role: 'Vendor Admin',
    status: 'Active',
    totalVolume: '$92,140.00',
    lastActive: '17 Dec 2025',
    joinDate: '28 Feb 2025',
  },
];

const INITIAL_REPORTS_DATA: MarketplaceReportArchive[] = [
  {
    id: 'rep-1',
    name: 'Oct_2026_Platform_GMV_Reconciliation.csv',
    type: 'Monthly Financial',
    dateRange: 'Oct 01, 2026 – Oct 31, 2026',
    fileSize: '14.8 MB',
    authorInitials: 'AU',
    authorName: 'Admin User',
    status: 'Ready',
  },
  {
    id: 'rep-2',
    name: 'Q3_2026_Vendor_1099K_Tax_Summary.pdf',
    type: 'Quarterly Tax',
    dateRange: 'Jul 01, 2026 – Sep 30, 2026',
    fileSize: '4.2 MB',
    authorInitials: 'SY',
    authorName: 'Automated Cron',
    status: 'Ready',
  },
  {
    id: 'rep-3',
    name: 'Weekly_Moderation_Dispute_Log.csv',
    type: 'Weekly SLA / Trust',
    dateRange: 'Oct 21, 2026 – Oct 28, 2026',
    fileSize: '860 KB',
    authorInitials: 'AU',
    authorName: 'Admin User',
    status: 'Processing',
  },
  {
    id: 'rep-4',
    name: 'FY2026_Category_Fee_Yield_Analysis.csv',
    type: 'Custom Analytics',
    dateRange: 'Jan 01, 2026 – Oct 28, 2026',
    fileSize: '28.4 MB',
    authorInitials: 'MK',
    authorName: 'M. Kross (Finance)',
    status: 'Ready',
  },
];

const INITIAL_ALERTS_DATA: MarketplaceAlert[] = [
  {
    id: 'alt-1',
    borderColor: 'border-l-rose-500',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    type: 'critical',
    title: 'High Dispute Rate Flag: Store #209',
    teamBadge: 'RISK TEAM',
    statusBadge: 'Critical',
    statusBadgeStyle: 'bg-rose-100 text-rose-800',
    timestamp: '5 mins ago',
    description: "Seller 'Apex Tech Logistics' breached the 3.5% rolling chargeback threshold. Order hold protocol has been automatically triggered on 14 open shipments pending fraud review.",
    meta: 'In-App + Email • Target: merchant-risk@vendora.internal',
    primaryAction: 'View Case',
    secondaryAction: 'Acknowledge',
  },
  {
    id: 'alt-2',
    borderColor: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    type: 'warning',
    title: 'Vendor KYC SLA Warning',
    teamBadge: 'MERCHANT OPS',
    statusBadge: 'Warning',
    statusBadgeStyle: 'bg-amber-100 text-amber-800',
    timestamp: '1 hour ago',
    description: 'Verification backlog: 18 vendor applications are within 4 hours of breaching the 48-hour onboarding SLA. Tier-2 documentation validation required.',
    meta: 'Push + Slack Webhook • Channel: #ops-kyc-feed',
    primaryAction: 'Acknowledge',
    secondaryAction: 'Dismiss',
  },
  {
    id: 'alt-3',
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    type: 'broadcast',
    title: 'Holiday Cutoff Schedule Broadcast',
    teamBadge: 'ALL SELLERS',
    statusBadge: 'Broadcast',
    statusBadgeStyle: 'bg-blue-100 text-blue-800',
    timestamp: 'Today, 09:30 AM',
    description: 'Published official mandatory handling timelines for winter peak season. Sent via merchant banner notice and direct digest to 4,892 verified seller storefronts.',
    meta: 'In-App Modal + Email • Status: 99.4% Delivered (31 bounces)',
    primaryAction: 'View Delivery Stats',
    secondaryAction: 'Resend',
  },
];

const INITIAL_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'Vendora Multi-Vendor Marketplace',
  supportEmail: 'ops@vendora.market',
  currency: 'USD ($) - United States Dollar',
  multiCurrency: true,
  payoutSchedule: 'Bi-weekly on Monday',
  minPayoutFloor: '50.00',
  reserveRetentionDays: '14',
  slaCeiling: '48',
  refundWindowDays: '30',
  aiModerationMode: 'Moderate (Standard)',
  autoRefundOnDispute: true,
  sessionTimeout: '60 minutes',
  ipWhitelisting: true,
};

const INITIAL_STORE_SETTINGS: Record<string, StoreSettings> = {
  'vendor-tech-1': {
    storeName: 'SoundWave Direct',
    slug: 'soundwave-direct',
    description: 'Premier studio-grade acoustics, reference balanced-armature IEMs, and audiophile gear engineered for creators and sound engineers.',
    category: 'Audio & Acoustics',
    email: 'support@soundwavedirect.com',
    phone: '+1 (512) 890-2194',
    taxId: 'US-94-2819024',
    registeredName: 'SoundWave Acoustics LLC',
    registrationNumber: 'LLC-TX-8841029',
    handlingTime: 'Same Day Dispatch (< 24h)',
    freeShippingThreshold: 99.0,
    vacationMode: false,
    enabledCarriers: {
      fedex: true,
      ups: true,
      dhl: true,
      vendoraExpress: true,
    },
  },
};

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set, get) => ({
      products: [...SEED_PRODUCTS],
      vendors: INITIAL_VENDORS_DATA,
      subOrders: INITIAL_SUB_ORDERS_DATA,
      disputes: [
        {
          id: 'dsp-501',
          subOrderId: 'sub-ord-2001',
          orderGroupId: 'ord-grp-2001',
          customerId: 'usr-customer-1',
          vendorId: 'vendor-tech-1',
          reason: 'Package delayed beyond guaranteed SLA window',
          status: 'escalated',
          messages: [
            {
              id: 'msg-dsp-1',
              senderRole: 'customer',
              senderName: 'Sarah Jenkins',
              content: 'My package has been delayed by 4 days without updates.',
              isInternalNote: false,
              timestamp: '2026-10-06T09:20:00Z',
            },
          ],
          createdAt: '2026-10-06T09:20:00Z',
        },
        {
          id: 'dsp-502',
          subOrderId: 'sub-ord-2002',
          orderGroupId: 'ord-grp-1988',
          customerId: 'usr-customer-2',
          vendorId: 'vendor-tech-1',
          reason: 'Item box had dent upon doorstep arrival',
          status: 'open',
          messages: [
            {
              id: 'msg-dsp-2',
              senderRole: 'customer',
              senderName: 'Alexander Pierce',
              content: 'Corner of keyboard chassis was dented.',
              isInternalNote: false,
              timestamp: '2026-10-05T15:40:00Z',
            },
          ],
          createdAt: '2026-10-05T15:40:00Z',
        },
      ],
      categoryOverrides: INITIAL_CATEGORY_OVERRIDES,
      globalCommissionRate: 0.10,
      returns: INITIAL_RETURNS_DATA,
      promotions: INITIAL_PROMOTIONS_DATA,
      payouts: INITIAL_PAYOUTS_DATA,
      bankAccounts: INITIAL_BANK_ACCOUNTS_DATA,
      threads: INITIAL_THREADS_DATA,
      reviews: INITIAL_REVIEWS_DATA,
      users: INITIAL_USERS_DATA,
      reports: INITIAL_REPORTS_DATA,
      alerts: INITIAL_ALERTS_DATA,
      platformSettings: INITIAL_PLATFORM_SETTINGS,
      storeSettings: INITIAL_STORE_SETTINGS,

      // --- Product Actions ---
      addProduct: (newProduct) => {
        set((state) => ({ products: [newProduct, ...state.products] }));
        if (!mockDb.products.some((p) => p.id === newProduct.id)) {
          mockDb.products.unshift(newProduct);
        }
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
        const idx = mockDb.products.findIndex((p) => p.id === id);
        if (idx >= 0) {
          mockDb.products[idx] = { ...mockDb.products[idx], ...updates };
        }
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
        mockDb.products = mockDb.products.filter((p) => p.id !== id);
      },

      moderateProduct: (id, status, reason) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, status, rejectionReason: reason } : p
          ),
        }));
        const idx = mockDb.products.findIndex((p) => p.id === id);
        if (idx >= 0) {
          mockDb.products[idx].status = status;
          if (reason) mockDb.products[idx].rejectionReason = reason;
        }
      },

      batchModerateProducts: (ids, status) => {
        set((state) => ({
          products: state.products.map((p) =>
            ids.includes(p.id) ? { ...p, status } : p
          ),
        }));
        for (const id of ids) {
          const idx = mockDb.products.findIndex((p) => p.id === id);
          if (idx >= 0) mockDb.products[idx].status = status;
        }
      },

      // --- Order Actions ---
      advanceSubOrderStatus: (id, nextStatus, actor = 'Vendor', note) => {
        set((state) => ({
          subOrders: state.subOrders.map((so) => {
            if (so.id === id) {
              return {
                ...so,
                status: nextStatus,
                history: [
                  ...so.history,
                  {
                    status: nextStatus,
                    timestamp: new Date().toISOString(),
                    actor,
                    note: note || `Status advanced to ${nextStatus}`,
                  },
                ],
              };
            }
            return so;
          }),
        }));
        try {
          mockDb.updateSubOrderStatus(id, nextStatus, actor, note);
        } catch {
          // Ignore if missing in mockDb
        }
      },

      bulkAdvanceOrders: (ids, nextStatus) => {
        set((state) => ({
          subOrders: state.subOrders.map((so) => {
            if (ids.includes(so.id)) {
              return {
                ...so,
                status: nextStatus,
                history: [
                  ...so.history,
                  {
                    status: nextStatus,
                    timestamp: new Date().toISOString(),
                    actor: 'Vendor',
                    note: `Bulk transitioned to ${nextStatus}`,
                  },
                ],
              };
            }
            return so;
          }),
        }));
      },

      refundOrder: (id, reason) => {
        get().advanceSubOrderStatus(id, 'refunded', 'Admin', reason || 'Refund issued');
      },

      // --- Vendor Actions ---
      updateVendorKyc: (id, kycStatus) => {
        set((state) => ({
          vendors: state.vendors.map((v) => (v.id === id ? { ...v, kycStatus } : v)),
        }));
      },

      updateVendorTier: (id, performanceTier) => {
        set((state) => ({
          vendors: state.vendors.map((v) => (v.id === id ? { ...v, performanceTier } : v)),
        }));
      },

      updateVendorStatus: (id, status) => {
        set((state) => ({
          vendors: state.vendors.map((v) => (v.id === id ? { ...v, status } : v)),
        }));
      },

      onboardVendor: (vendorData) => {
        const id = `vendor-${Date.now()}`;
        const newVendor: MarketplaceVendor = {
          ...vendorData,
          id,
          revenue: 0,
          revenueFormatted: '$0',
          trend: 'New',
          trendType: 'neutral',
          rating: 5.0,
          reviewCount: 0,
          joinedDate: 'Just now',
        };
        set((state) => ({ vendors: [newVendor, ...state.vendors] }));
      },

      // --- Dispute Actions ---
      resolveDispute: (id, resolution) => {
        set((state) => ({
          disputes: state.disputes.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: 'resolved_refund',
                  resolutionNote: resolution,
                }
              : d
          ),
        }));
        const dispute = get().disputes.find((d) => d.id === id);
        if (dispute) {
          get().refundOrder(dispute.subOrderId, resolution);
        }
      },

      escalateDispute: (id) => {
        set((state) => ({
          disputes: state.disputes.map((d) =>
            d.id === id ? { ...d, status: 'escalated' } : d
          ),
        }));
      },

      // --- Commission Actions ---
      updateGlobalCommissionRate: (rate) => {
        set({ globalCommissionRate: rate });
        mockDb.commissionConfig.globalDefaultRate = rate;
      },

      addCategoryOverride: (override) => {
        const id = `cat-${Date.now()}`;
        set((state) => ({
          categoryOverrides: [{ ...override, id }, ...state.categoryOverrides],
        }));
      },

      updateCategoryOverride: (id, rate, fixedFee) => {
        set((state) => ({
          categoryOverrides: state.categoryOverrides.map((c) =>
            c.id === id
              ? {
                  ...c,
                  categoryOverride: rate,
                  fixedOrderFee: fixedFee || c.fixedOrderFee,
                }
              : c
          ),
        }));
      },

      // --- Return Actions ---
      approveReturn: (rmaId, refundAmount) => {
        set((state) => ({
          returns: state.returns.map((r) =>
            r.rmaId === rmaId
              ? {
                  ...r,
                  status: 'approved',
                  refundAmount: refundAmount !== undefined ? refundAmount : r.refundAmount,
                  refundAmountFormatted: `$${(refundAmount !== undefined ? refundAmount : r.refundAmount).toFixed(2)}`,
                }
              : r
          ),
        }));
      },

      rejectReturn: (rmaId, reason) => {
        set((state) => ({
          returns: state.returns.map((r) =>
            r.rmaId === rmaId ? { ...r, status: 'rejected', reason: reason || r.reason } : r
          ),
        }));
      },

      markReturnRestocked: (rmaId) => {
        set((state) => ({
          returns: state.returns.map((r) =>
            r.rmaId === rmaId ? { ...r, status: 'restocked', badgeLabel: 'Restocked 100%' } : r
          ),
        }));
      },

      // --- Promotion Actions ---
      createPromotion: (promo) => {
        const id = `promo-${Date.now()}`;
        const newPromo: MarketplacePromotion = {
          ...promo,
          id,
          redemptionsCurrent: 0,
          salesAttributed: 0,
          ordersAttributed: 0,
        };
        set((state) => ({ promotions: [newPromo, ...state.promotions] }));
      },

      togglePromotion: (id, enabled) => {
        set((state) => ({
          promotions: state.promotions.map((p) =>
            p.id === id ? { ...p, isEnabled: enabled } : p
          ),
        }));
      },

      deletePromotion: (id) => {
        set((state) => ({
          promotions: state.promotions.filter((p) => p.id !== id),
        }));
      },

      // --- Payout Actions ---
      requestInstantPayout: (amount, destination) => {
        const id = `TR-${Date.now().toString().slice(-5)}-FAST`;
        const traceId = `FAST-${Math.floor(10000000 + Math.random() * 90000000)}`;
        const newPayout: MarketplacePayout = {
          id,
          period: 'Instant Accelerated Settlement',
          destination,
          amount,
          status: 'processing',
          traceId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ payouts: [newPayout, ...state.payouts] }));
      },

      addBankAccount: (bank) => {
        const id = `bank-${Date.now()}`;
        set((state) => ({
          bankAccounts: [...state.bankAccounts, { ...bank, id }],
        }));
      },

      setDefaultBankAccount: (id) => {
        set((state) => ({
          bankAccounts: state.bankAccounts.map((b) => ({
            ...b,
            isDefault: b.id === id,
          })),
        }));
      },

      // --- Message Actions ---
      sendCustomerMessage: (threadId, text, senderRole = 'vendor') => {
        const msgId = `m-${Date.now()}`;
        const newMsg: CustomerMessageItem = {
          id: msgId,
          sender: senderRole,
          senderName: senderRole === 'vendor' ? 'SoundWave Support (You)' : 'Platform Admin',
          avatar: 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=120&q=80',
          time: 'Just now',
          text,
        };
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  preview: text,
                  timestamp: 'Just now',
                  unread: false,
                  messages: [...t.messages, newMsg],
                }
              : t
          ),
        }));
      },

      updateThreadStatus: (threadId, status) => {
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === threadId ? { ...t, status } : t
          ),
        }));
      },

      // --- Review Actions ---
      addReviewReply: (reviewId, replyText) => {
        set((state) => ({
          reviews: state.reviews.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  hasSellerReply: true,
                  sellerReply: {
                    date: 'Today',
                    text: replyText,
                  },
                }
              : r
          ),
        }));
      },

      voteReviewHelpful: (reviewId) => {
        set((state) => ({
          reviews: state.reviews.map((r) =>
            r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
          ),
        }));
      },

      // --- User Actions ---
      updateUserStatus: (id, status) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, status } : u)),
        }));
      },

      updateUserRole: (id, role) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, role } : u)),
        }));
      },

      addUser: (userData) => {
        const id = `usr-${Date.now()}`;
        const initials = userData.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        const newUser: MarketplaceUserRecord = {
          ...userData,
          id,
          initials,
          totalVolume: '$0.00',
          lastActive: 'Just now',
          joinDate: 'Today',
        };
        set((state) => ({ users: [newUser, ...state.users] }));
      },

      // --- Report Actions ---
      generateReport: (name, type, dateRange) => {
        const id = `rep-${Date.now()}`;
        const newReport: MarketplaceReportArchive = {
          id,
          name: name.endsWith('.csv') ? name : `${name}.csv`,
          type,
          dateRange,
          fileSize: '1.4 MB',
          authorInitials: 'AU',
          authorName: 'Admin User',
          status: 'Ready',
        };
        set((state) => ({ reports: [newReport, ...state.reports] }));
      },

      // --- Alert Actions ---
      acknowledgeAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, isAcknowledged: true, statusBadge: 'Acknowledged' } : a
          ),
        }));
      },

      dismissAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        }));
      },

      createBroadcastAlert: (title, description, teamBadge = 'ALL SELLERS') => {
        const id = `alt-${Date.now()}`;
        const newAlert: MarketplaceAlert = {
          id,
          borderColor: 'border-l-blue-500',
          iconBg: 'bg-blue-50',
          iconColor: 'text-blue-600',
          type: 'broadcast',
          title,
          teamBadge,
          statusBadge: 'Broadcast',
          statusBadgeStyle: 'bg-blue-100 text-blue-800',
          timestamp: 'Just now',
          description,
          meta: 'In-App Banner + Dashboard Alert',
          primaryAction: 'View Delivery Stats',
          secondaryAction: 'Dismiss',
        };
        set((state) => ({ alerts: [newAlert, ...state.alerts] }));
      },

      // --- Settings Actions ---
      savePlatformSettings: (settingsUpdates) => {
        set((state) => ({
          platformSettings: { ...state.platformSettings, ...settingsUpdates },
        }));
      },

      saveStoreSettings: (vendorId, settingsUpdates) => {
        set((state) => {
          const current = state.storeSettings[vendorId] || INITIAL_STORE_SETTINGS['vendor-tech-1'];
          return {
            storeSettings: {
              ...state.storeSettings,
              [vendorId]: { ...current, ...settingsUpdates },
            },
          };
        });
      },
    }),
    {
      name: 'vd:v1:marketplace_store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
