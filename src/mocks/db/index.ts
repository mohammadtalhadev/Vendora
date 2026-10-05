import type {
  Product,
  Category,
  VendorProfile,
  OrderGroup,
  SubOrder,
  CommissionConfig,
  Dispute,
  CartItem,
  ShippingAddress,
  SubOrderStatus,
} from '../../types/domain';
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_VENDORS } from '../seed/catalog';

const STORAGE_PREFIX = 'vd:v1:';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

export class MockDatabase {
  public products: Product[] = [];
  public categories: Category[] = [];
  public vendors: VendorProfile[] = [];
  public orderGroups: OrderGroup[] = [];
  public subOrders: SubOrder[] = [];
  public disputes: Dispute[] = [];
  public commissionConfig: CommissionConfig = {
    globalDefaultRate: 0.1, // 10%
    categoryOverrides: { 'cat-digital': 0.15 },
    vendorOverrides: { 'vendor-tech-1': 0.07 },
  };

  public simulatedLatencyMs = { min: 150, max: 400 };
  public failureRate = 0.0; // 0% by default, can be toggled for testing error states

  constructor() {
    this.hydrate();
  }

  public hydrate(): void {
    // 1. Categories
    this.categories = loadFromStorage('categories', [...SEED_CATEGORIES]);

    // 2. Vendors
    this.vendors = loadFromStorage('vendors', [...SEED_VENDORS]);

    // 3. Products: Seed plus overlay deltas
    const storedProducts = loadFromStorage<Product[]>('products', []);
    if (storedProducts.length > 0) {
      this.products = storedProducts;
    } else {
      this.products = [...SEED_PRODUCTS];
    }

    // 4. Orders & SubOrders
    this.orderGroups = loadFromStorage('orders', []);
    this.subOrders = loadFromStorage('suborders', []);

    // 5. Disputes
    this.disputes = loadFromStorage('disputes', []);

    // 6. Commission config
    this.commissionConfig = loadFromStorage('commission_config', this.commissionConfig);
  }

  public resetToSeed(): void {
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }

    this.categories = [...SEED_CATEGORIES];
    this.vendors = [...SEED_VENDORS];
    this.products = [...SEED_PRODUCTS];
    this.orderGroups = [];
    this.subOrders = [];
    this.disputes = [];
    this.commissionConfig = {
      globalDefaultRate: 0.1,
      categoryOverrides: { 'cat-digital': 0.15 },
      vendorOverrides: { 'vendor-tech-1': 0.07 },
    };
  }

  // --- Commission Resolution Engine ---
  public calculateCommission(
    vendorId: string,
    categoryId: string,
    subtotal: number,
  ): { rate: number; amount: number; netPayout: number } {
    if (vendorId === 'platform') {
      // Platform takes 100% of its own first-party revenue, 0% payout
      return { rate: 1.0, amount: subtotal, netPayout: 0 };
    }

    // 1. Vendor override takes highest precedence
    let effectiveRate = this.commissionConfig.vendorOverrides[vendorId];

    // 2. Category override takes second precedence
    if (effectiveRate === undefined) {
      effectiveRate = this.commissionConfig.categoryOverrides[categoryId];
    }

    // 3. Global default
    if (effectiveRate === undefined) {
      effectiveRate = this.commissionConfig.globalDefaultRate;
    }

    const amount = Math.round(subtotal * effectiveRate * 100) / 100;
    const netPayout = Math.round((subtotal - amount) * 100) / 100;

    return { rate: effectiveRate, amount, netPayout };
  }

  // --- Split Order Creation ---
  public createOrderGroup(params: {
    customerId: string;
    customerEmail: string;
    items: CartItem[];
    shippingAddress?: ShippingAddress;
    paymentMethod: 'card' | 'cod';
    paymentBrand?: string;
    last4?: string;
  }): { orderGroup: OrderGroup; createdSubOrders: SubOrder[] } {
    const orderGroupId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Group items by seller
    const sellerItemMap = new Map<string, CartItem[]>();
    for (const item of params.items) {
      const existing = sellerItemMap.get(item.sellerId) || [];
      existing.push(item);
      sellerItemMap.set(item.sellerId, existing);
    }

    const createdSubOrders: SubOrder[] = [];

    let subIndex = 1;
    for (const [sellerId, items] of sellerItemMap.entries()) {
      const subOrderId = `${orderGroupId}-S${subIndex++}`;
      const firstItem = items[0];
      const hasPhysical = items.some((i) => i.type === 'physical');
      const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const shippingFee = hasPhysical ? (subtotal >= 100 ? 0 : 8.5) : 0;

      // Lookup product category for commission
      const productObj = this.products.find((p) => p.id === firstItem.productId);
      const categoryId = productObj?.category || 'general';

      const commission = this.calculateCommission(sellerId, categoryId, subtotal);

      const initialStatus: SubOrderStatus = hasPhysical ? 'placed' : 'paid';

      const subOrder: SubOrder = {
        id: subOrderId,
        orderGroupId,
        sellerId,
        sellerName: firstItem.sellerName,
        sellerType: firstItem.sellerType,
        type: hasPhysical ? 'physical' : 'digital',
        items: [...items],
        subtotal,
        shippingFee,
        commissionRate: commission.rate,
        commissionAmount: commission.amount,
        netPayout: commission.netPayout,
        status: initialStatus,
        deliveryCode: hasPhysical ? Math.floor(1000 + Math.random() * 9000).toString() : undefined,
        licenseKey: !hasPhysical ? `VEN-LIC-${Date.now().toString(36).toUpperCase()}` : undefined,
        history: [
          {
            status: initialStatus,
            timestamp: new Date().toISOString(),
            actor: 'System',
            note: 'Order successfully placed and split',
          },
        ],
        createdAt: new Date().toISOString(),
      };

      createdSubOrders.push(subOrder);
      this.subOrders.push(subOrder);
    }

    const orderGroup: OrderGroup = {
      id: orderGroupId,
      customerId: params.customerId,
      customerEmail: params.customerEmail,
      shippingAddress: params.shippingAddress,
      paymentMethod: params.paymentMethod,
      paymentDetails: {
        brand: params.paymentBrand || 'Visa',
        last4: params.last4 || '4242',
      },
      subOrderIds: createdSubOrders.map((so) => so.id),
      createdAt: new Date().toISOString(),
    };

    this.orderGroups.push(orderGroup);

    // Save to persistent localStorage
    saveToStorage('orders', this.orderGroups);
    saveToStorage('suborders', this.subOrders);

    return { orderGroup, createdSubOrders };
  }

  // --- Sub-Order Status Progression ---
  public updateSubOrderStatus(
    subOrderId: string,
    nextStatus: SubOrderStatus,
    actor: string,
    note?: string,
  ): SubOrder {
    const subOrder = this.subOrders.find((so) => so.id === subOrderId);
    if (!subOrder) {
      throw new Error(`SubOrder with ID ${subOrderId} not found`);
    }

    subOrder.status = nextStatus;
    subOrder.history.push({
      status: nextStatus,
      timestamp: new Date().toISOString(),
      actor,
      note,
    });

    saveToStorage('suborders', this.subOrders);
    return subOrder;
  }
}

export const mockDb = new MockDatabase();
