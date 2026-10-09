import type { SubOrder, Product, SubOrderStatus } from '../../types/domain';
import { mockDb } from '../../mocks/db';
import { SEED_PRODUCTS } from '../../mocks/seed/catalog';

export interface VendorKpiMetrics {
  grossSales: string;
  grossSalesNum: number;
  commissionDeducted: string;
  commissionDeductedNum: number;
  netPayout: string;
  netPayoutNum: number;
  pendingOrders: number;
  lowStockCount: number;
}

export const DEFAULT_VENDOR_KPIS: VendorKpiMetrics = {
  grossSales: '$34,820',
  grossSalesNum: 34820,
  commissionDeducted: '$3,482',
  commissionDeductedNum: 3482,
  netPayout: '$31,338',
  netPayoutNum: 31338,
  pendingOrders: 14,
  lowStockCount: 3,
};

const BASELINE_VENDOR_SUB_ORDERS: SubOrder[] = [
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
        note: 'Order placed by customer Sarah Jenkins',
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
        note: 'Order placed by customer Marcus Vance',
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
        note: 'Order placed by customer Elena Rostova',
      },
      {
        status: 'confirmed',
        timestamp: '2026-10-05T10:00:00.000Z',
        actor: 'Vendor',
        note: 'Order confirmed by SoundWave Direct',
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
        note: 'Order placed by customer Alex Chen',
      },
      {
        status: 'confirmed',
        timestamp: '2026-10-04T12:30:00.000Z',
        actor: 'Vendor',
        note: 'Confirmed',
      },
      {
        status: 'packed',
        timestamp: '2026-10-04T14:00:00.000Z',
        actor: 'Vendor',
        note: 'Packed',
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
        note: 'Order placed by customer David Miller',
      },
      {
        status: 'delivered',
        timestamp: '2026-10-03T16:30:00.000Z',
        actor: 'Rider',
        note: 'Successfully delivered to customer',
      },
    ],
    createdAt: '2026-10-03T10:00:00.000Z',
  },
];

const BASELINE_VENDOR_PRODUCTS: Product[] = [
  ...SEED_PRODUCTS.filter((p) => p.sellerId === 'vendor-tech-1'),
  {
    id: 'prod-vend-3',
    title: 'Studio Master XLR Cardioid Condenser Microphone',
    slug: 'studio-master-xlr-condenser-mic',
    description: 'Gold-sputtered capsule, custom shockmount, ultra-low self noise for broadcast recording.',
    category: 'cat-audio',
    brand: 'Aura Acoustics',
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    ],
    price: 219.0,
    compareAtPrice: 249.0,
    type: 'physical',
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    variants: [],
    stock: 2,
    shippingSettings: { standardFee: 8.5 },
    rating: 4.8,
    reviewCount: 39,
    status: 'approved',
    createdAt: '2025-02-20T00:00:00Z',
  },
  {
    id: 'prod-vend-4',
    title: 'Audiophile Braided Silver MMCX IEM Replacement Cable',
    slug: 'audiophile-silver-mmcx-cable',
    description: '8-core silver-plated copper wire with 3.5mm gold-plated termination.',
    category: 'cat-audio',
    brand: 'Aura Acoustics',
    images: [
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    ],
    price: 49.0,
    type: 'physical',
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    variants: [],
    stock: 1,
    shippingSettings: { standardFee: 4.5 },
    rating: 4.6,
    reviewCount: 18,
    status: 'pending_review',
    createdAt: '2025-02-25T00:00:00Z',
  },
  {
    id: 'prod-vend-5',
    title: 'High-Density Acoustic Studio Foam Panels (12-Pack)',
    slug: 'high-density-acoustic-foam-panels',
    description: 'Beveled studio absorption tiles for home recording studios and mixing suites.',
    category: 'cat-audio',
    brand: 'Aura Acoustics',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    ],
    price: 39.0,
    type: 'physical',
    sellerId: 'vendor-tech-1',
    sellerName: 'SoundWave Direct',
    sellerType: 'vendor',
    variants: [],
    stock: 3,
    shippingSettings: { standardFee: 9.0 },
    rating: 4.7,
    reviewCount: 45,
    status: 'approved',
    createdAt: '2025-02-28T00:00:00Z',
  },
];

/**
 * Ensures vendor sub-orders are seeded in mockDb if not already present.
 * Uses structured deep clone to guarantee test isolation.
 */
export function getVendorSubOrders(vendorId: string = 'vendor-tech-1'): SubOrder[] {
  const hasBaseline = mockDb.subOrders.some((so) => so.id === 'sub-ord-2001');
  if (!hasBaseline) {
    const seeded: SubOrder[] = JSON.parse(JSON.stringify(BASELINE_VENDOR_SUB_ORDERS)).map(
      (so: SubOrder) => ({
        ...so,
        sellerId: vendorId,
      }),
    );
    mockDb.subOrders.push(...seeded);
  }

  return mockDb.subOrders.filter((so) => so.sellerId === vendorId);
}

/**
 * Advances a sub-order's status and records audit history in mockDb.
 */
export function advanceSubOrderStatus(
  subOrderId: string,
  nextStatus: SubOrderStatus,
  actor: string = 'Vendor',
  note?: string,
): SubOrder {
  const existing = mockDb.subOrders.find((so) => so.id === subOrderId);
  if (existing) {
    return mockDb.updateSubOrderStatus(subOrderId, nextStatus, actor, note);
  }

  // Fallback if not found in mockDb
  const seededList = getVendorSubOrders();
  const target = seededList.find((so) => so.id === subOrderId);
  if (target) {
    return mockDb.updateSubOrderStatus(subOrderId, nextStatus, actor, note);
  }

  throw new Error(`SubOrder with ID ${subOrderId} not found.`);
}

/**
 * Retrieves vendor products from mockDb, seeding defaults if needed.
 */
export function getVendorProducts(vendorId: string = 'vendor-tech-1'): Product[] {
  const existing = mockDb.products.filter((p) => p.sellerId === vendorId);
  if (existing.length >= BASELINE_VENDOR_PRODUCTS.length) {
    return existing;
  }

  // Add missing initial products with fresh clones
  const freshCopies: Product[] = JSON.parse(JSON.stringify(BASELINE_VENDOR_PRODUCTS));
  for (const item of freshCopies) {
    if (!mockDb.products.some((p) => p.id === item.id)) {
      mockDb.products.push({
        ...item,
        sellerId: vendorId,
      });
    }
  }

  return mockDb.products.filter((p) => p.sellerId === vendorId);
}

/**
 * Adds a new product to mockDb.
 */
export function addVendorProduct(product: Product): Product {
  mockDb.products.unshift(product);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('vd:v1:products', JSON.stringify(mockDb.products));
    } catch {
      // ignore
    }
  }
  return product;
}
