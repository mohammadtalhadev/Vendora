import type {
  Product,
  Category,
  VendorProfile,
  OrderGroup,
  SubOrder,
  CommissionConfig,
  Dispute,
  DisputeStatus,
  CartItem,
  ShippingAddress,
  SubOrderStatus,
  UserRole,
  ModerationStatus,
} from '../../types/domain';
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_VENDORS } from '../seed/catalog';
import { SEED_SUB_ORDERS, SEED_ORDER_GROUPS, SEED_DISPUTES } from '../seed/operations';

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
    const storedCategories = loadFromStorage<Category[]>('categories', [...SEED_CATEGORIES]);
    this.categories = storedCategories.map((c) => {
      const seed = SEED_CATEGORIES.find((s) => s.id === c.id);
      return seed ? { ...c, image: seed.image } : c;
    });
    if (this.categories.length < SEED_CATEGORIES.length) {
      this.categories = [...SEED_CATEGORIES];
    }
    saveToStorage('categories', this.categories);

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
    this.orderGroups = loadFromStorage('orders', structuredClone(SEED_ORDER_GROUPS));
    this.subOrders = loadFromStorage('suborders', structuredClone(SEED_SUB_ORDERS));

    // 5. Disputes
    this.disputes = loadFromStorage('disputes', structuredClone(SEED_DISPUTES));

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
    this.orderGroups = structuredClone(SEED_ORDER_GROUPS);
    this.subOrders = structuredClone(SEED_SUB_ORDERS);
    this.disputes = structuredClone(SEED_DISPUTES);
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
    deliveryOptions?: Record<string, 'standard' | 'express'>;
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

      // Calculate shipping based on customer delivery option selection
      const deliveryOption = params.deliveryOptions?.[sellerId] || 'standard';
      const shippingFee = hasPhysical
        ? deliveryOption === 'express'
          ? 18.0
          : subtotal >= 100
            ? 0
            : 8.5
        : 0;

      // Calculate commission per item (accounting for multiple product categories)
      let totalCommissionAmount = 0;
      for (const item of items) {
        const productObj = this.products.find((p) => p.id === item.productId);
        const categoryId = productObj?.category || 'general';
        const itemSubtotal = item.price * item.quantity;
        const itemComm = this.calculateCommission(sellerId, categoryId, itemSubtotal);
        totalCommissionAmount += itemComm.amount;
      }
      totalCommissionAmount = Math.round(totalCommissionAmount * 100) / 100;
      const isPlatform =
        sellerId === 'platform' ||
        firstItem.sellerType === 'platform' ||
        firstItem.sellerId === 'platform' ||
        firstItem.sellerName?.toLowerCase() === 'vendora';

      const effectiveSellerId = isPlatform ? 'platform' : sellerId;
      const effectiveSellerName = isPlatform ? 'Vendora' : (firstItem.sellerName || 'Marketplace Vendor');
      const effectiveSellerType = isPlatform ? 'platform' : (firstItem.sellerType || 'vendor');

      const netPayout = isPlatform ? 0 : Math.round((subtotal - totalCommissionAmount) * 100) / 100;
      const effectiveRate = isPlatform ? 1.0 : (subtotal > 0 ? Math.round((totalCommissionAmount / subtotal) * 1000) / 1000 : 0);
      const commissionAmount = isPlatform ? subtotal : totalCommissionAmount;

      const initialStatus: SubOrderStatus = 'placed';

      const subOrder: SubOrder = {
        id: subOrderId,
        orderGroupId,
        sellerId: effectiveSellerId,
        sellerName: effectiveSellerName,
        sellerType: effectiveSellerType,
        type: hasPhysical ? 'physical' : 'digital',
        items: [...items],
        subtotal,
        shippingFee,
        deliveryOption: hasPhysical ? deliveryOption : undefined,
        commissionRate: effectiveRate,
        commissionAmount,
        netPayout,
        status: initialStatus,
        deliveryCode: hasPhysical ? Math.floor(1000 + Math.random() * 9000).toString() : undefined,
        licenseKey: !hasPhysical ? `VEN-LIC-${Date.now().toString(36).toUpperCase()}` : undefined,
        shippingAddress: params.shippingAddress,
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
      this.subOrders.unshift(subOrder);
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

    this.orderGroups.unshift(orderGroup);

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

  // --- Rider Deliveries Console ---
  public getRiderDeliveries(riderId?: string): SubOrder[] {
    const targetRider = riderId || 'usr-rider-1';
    return this.subOrders.filter(
      (so) =>
        so.type === 'physical' &&
        (so.riderId === targetRider || !so.riderId || ['ready_for_pickup', 'shipped', 'out_for_delivery'].includes(so.status)),
    );
  }

  public verifyRiderDelivery(
    subOrderId: string,
    code: string,
  ): { success: boolean; message: string; subOrder?: SubOrder } {
    const subOrder = this.subOrders.find((so) => so.id === subOrderId);
    if (!subOrder) {
      return { success: false, message: 'Sub-order not found' };
    }

    // Verify 4-digit code (or allow 1234/demo bypass)
    const normalizedInput = code.trim();
    const actualCode = subOrder.deliveryCode || '4829';

    if (normalizedInput !== actualCode && normalizedInput !== '1234') {
      return { success: false, message: 'Invalid delivery verification PIN' };
    }

    subOrder.status = 'delivered';
    subOrder.history.push({
      status: 'delivered',
      timestamp: new Date().toISOString(),
      actor: 'Rider',
      note: 'Customer handover confirmed with 4-digit PIN verification',
    });

    saveToStorage('suborders', this.subOrders);
    return { success: true, message: 'Handover verified and marked as delivered', subOrder };
  }

  // --- Support Disputes Console ---
  public updateDisputeStatus(
    disputeId: string,
    status: DisputeStatus,
    resolutionNote?: string,
    resolutionAmount?: number,
  ): Dispute {
    const dispute = this.disputes.find((d) => d.id === disputeId);
    if (!dispute) {
      throw new Error(`Dispute ${disputeId} not found`);
    }

    dispute.status = status;
    if (resolutionAmount !== undefined) {
      dispute.resolutionAmount = resolutionAmount;
    }
    if (resolutionNote) {
      dispute.resolutionNote = resolutionNote;
      dispute.messages.push({
        id: `msg-${Date.now()}`,
        senderRole: 'support',
        senderName: 'Platform Support',
        content: `Resolution update: ${resolutionNote}`,
        isInternalNote: false,
        timestamp: new Date().toISOString(),
      });
    }

    // If resolved with refund, also update the associated subOrder
    if (status === 'resolved_refund' && dispute.subOrderId) {
      const subOrder = this.subOrders.find((so) => so.id === dispute.subOrderId);
      if (subOrder) {
        subOrder.status = 'refunded';
        subOrder.history.push({
          status: 'refunded',
          timestamp: new Date().toISOString(),
          actor: 'Support Agent',
          note: `Refund issued via Dispute ${disputeId}`,
        });
        saveToStorage('suborders', this.subOrders);
      }
    }

    saveToStorage('disputes', this.disputes);
    return dispute;
  }

  public addDisputeMessage(
    disputeId: string,
    message: {
      senderRole: UserRole;
      senderName: string;
      content: string;
      isInternalNote: boolean;
    },
  ): Dispute {
    const dispute = this.disputes.find((d) => d.id === disputeId);
    if (!dispute) {
      throw new Error(`Dispute ${disputeId} not found`);
    }

    dispute.messages.push({
      id: `msg-${Date.now()}`,
      ...message,
      timestamp: new Date().toISOString(),
    });

    saveToStorage('disputes', this.disputes);
    return dispute;
  }

  public createDispute(params: Partial<Dispute>): Dispute {
    const newDispute: Dispute = {
      id: params.id || `DSP-${Math.floor(100 + Math.random() * 900)}`,
      subOrderId: params.subOrderId || '',
      orderGroupId: params.orderGroupId || '',
      customerId: params.customerId || 'guest',
      customerName: params.customerName || 'Customer',
      vendorId: params.vendorId || 'platform',
      vendorName: params.vendorName || 'Platform Vendor',
      reason: params.reason || 'General Issue',
      status: params.status || 'open',
      urgency: params.urgency || 'standard',
      createdAt: new Date().toISOString(),
      messages: params.messages || [],
    };
    this.disputes.unshift(newDispute);
    saveToStorage('disputes', this.disputes);
    return newDispute;
  }

  public moderateProduct(
    productId: string,
    status: ModerationStatus,
    rejectionReason?: string,
  ): Product {
    const product = this.products.find((p) => p.id === productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }
    product.status = status;
    if (rejectionReason) {
      product.rejectionReason = rejectionReason;
    }
    saveToStorage('products', this.products);
    return product;
  }

  public updateVendorStatus(
    vendorId: string,
    status: 'active' | 'suspended',
    _rejectionReason?: string,
  ): VendorProfile {
    const vendor = this.vendors.find((v) => v.id === vendorId);
    if (!vendor) {
      throw new Error(`Vendor ${vendorId} not found`);
    }
    vendor.status = status;
    saveToStorage('vendors', this.vendors);
    return vendor;
  }
}

export const mockDb = new MockDatabase();
