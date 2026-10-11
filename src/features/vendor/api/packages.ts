import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import type {
  CartItem,
  ProductType,
  ShippingAddress,
  SubOrder,
  SubOrderStatus,
  TrackingEvent,
} from '../../../types/domain';
import { num, requireVendorId, rpcFailed, text } from './vendor-client';

type SubOrderRow = Database['public']['Tables']['sub_orders']['Row'] & {
  seller: { id: string; store_name: string; seller_type: 'platform' | 'vendor' } | null;
  order: {
    id: string;
    customer_email: string | null;
    shipping_address: unknown;
    payment_method: 'card' | 'cod';
  } | null;
};

/**
 * A package as the store sees it: the buyer's contact and address come from the parent
 * order (which `orders_select_vendor` opens for a package you own), and the return
 * columns added in the vendor migration ride along so the Returns page needs no join.
 */
export interface VendorPackage extends SubOrder {
  updatedAt: string;
  buyerEmail: string;
  buyerAddress?: ShippingAddress;
  paymentMethod: 'card' | 'cod';
  /** What the buyer was charged: `subtotal` plus freight, neither of which is stored summed. */
  gross: number;
  rmaCode?: string;
  refundAmount?: number;
  returnDecidedAt?: string;
  returnRejectReason?: string;
}

/**
 * `delivery_code_hash` is not selected: the handover PIN is hashed on the way in and only
 * the rider verifies it, so no workspace screen can read it back.
 */
const PACKAGE_SELECT =
  'id, order_group_id, seller_id, type, items, subtotal, shipping_fee, delivery_option, ' +
  'commission_rate, commission_amount, net_payout, status, rider_id, license_key, history, ' +
  'return_reason, rma_code, refund_amount, return_decided_at, return_reject_reason, ' +
  'carrier_name, tracking_number, customer_notes, created_at, updated_at, ' +
  'seller:vendor_profiles(id, store_name, seller_type), ' +
  'order:orders(id, customer_email, shipping_address, payment_method)';

function readAddress(value: unknown): ShippingAddress | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  // A digital-only order books an empty address; there is nothing to ship to.
  if (!raw.street) return undefined;
  return {
    fullName: text(raw.fullName),
    street: text(raw.street),
    city: text(raw.city),
    state: text(raw.state),
    zipCode: text(raw.zipCode),
    country: text(raw.country),
    phone: text(raw.phone),
  };
}

/** `sub_orders.items` is the cart snapshot `place_order` froze, in camelCase. */
function readItem(
  raw: unknown,
  row: SubOrderRow,
  sellerName: string,
  sellerType: 'platform' | 'vendor',
): CartItem {
  const line = (raw ?? {}) as Record<string, unknown>;
  const productId = text(line.productId);
  const variantId = text(line.variantId);
  const quantity = num(line.quantity);
  return {
    id: variantId ? `${productId}-${variantId}` : productId,
    productId,
    variantId: variantId || undefined,
    title: text(line.title),
    price: num(line.price),
    quantity,
    // A booked line records what was ordered, not what is on the shelf now.
    maxStock: quantity,
    image: text(line.image),
    sellerId: row.seller_id,
    sellerName,
    sellerType,
    type: row.type as ProductType,
  };
}

function mapPackage(row: SubOrderRow): VendorPackage {
  const sellerName = row.seller?.store_name ?? '';
  const sellerType = row.seller?.seller_type ?? 'vendor';
  return {
    id: row.id,
    orderGroupId: row.order_group_id,
    sellerId: row.seller_id,
    sellerName,
    sellerType,
    type: row.type as ProductType,
    items: (Array.isArray(row.items) ? (row.items as unknown[]) : []).map((item) =>
      readItem(item, row, sellerName, sellerType),
    ),
    subtotal: num(row.subtotal),
    shippingFee: num(row.shipping_fee),
    gross: num(row.subtotal) + num(row.shipping_fee),
    deliveryOption: row.delivery_option as SubOrder['deliveryOption'],
    commissionRate: num(row.commission_rate),
    commissionAmount: num(row.commission_amount),
    netPayout: num(row.net_payout),
    status: row.status as SubOrderStatus,
    riderId: row.rider_id ?? undefined,
    licenseKey: row.license_key ?? undefined,
    history: (Array.isArray(row.history) ? (row.history as unknown[]) : []).map((event) => {
      const raw = (event ?? {}) as Record<string, unknown>;
      return {
        status: text(raw.status) as TrackingEvent['status'],
        timestamp: text(raw.timestamp),
        actor: text(raw.actor),
        note: raw.note === undefined ? undefined : text(raw.note),
      };
    }),
    returnReason: row.return_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    carrierName: row.carrier_name ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    customerNotes: row.customer_notes ?? undefined,
    buyerEmail: text(row.order?.customer_email),
    buyerAddress: readAddress(row.order?.shipping_address),
    paymentMethod: row.order?.payment_method ?? 'card',
    rmaCode: row.rma_code ?? undefined,
    refundAmount: row.refund_amount === null ? undefined : num(row.refund_amount),
    returnDecidedAt: row.return_decided_at ?? undefined,
    returnRejectReason: row.return_reject_reason ?? undefined,
  };
}

/** Every package this store has to fulfil, newest first. */
export async function fetchVendorPackages(signal?: AbortSignal): Promise<VendorPackage[]> {
  const vendorId = await requireVendorId();
  let query = supabase
    .from('sub_orders')
    .select(PACKAGE_SELECT)
    .eq('seller_id', vendorId)
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your orders: ${error.message}`);
  return ((data ?? []) as unknown as SubOrderRow[]).map(mapPackage);
}

export async function fetchVendorPackage(
  subOrderId: string,
  signal?: AbortSignal,
): Promise<VendorPackage> {
  const vendorId = await requireVendorId();
  let query = supabase
    .from('sub_orders')
    .select(PACKAGE_SELECT)
    .eq('id', subOrderId)
    .eq('seller_id', vendorId);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Failed to load this package: ${error.message}`);
  if (!data) throw new Error('Package not found. It may belong to another store.');
  return mapPackage(data as unknown as SubOrderRow);
}

/**
 * Moves a package along the state machine. `advance_sub_order_status` owns the legal
 * transitions and appends the history entry, so the row is re-read rather than patched.
 */
export async function advancePackageStatus(
  subOrderId: string,
  nextStatus: SubOrderStatus,
  note?: string,
): Promise<VendorPackage> {
  const { error } = await supabase.rpc('advance_sub_order_status', {
    p_sub_order_id: subOrderId,
    p_next: nextStatus,
    p_note: note,
  });
  if (error) throw rpcFailed(`Could not move this package to ${nextStatus}`, error.message);
  return fetchVendorPackage(subOrderId);
}

/** Records the carrier and tracking number; the table itself has no UPDATE policy. */
export async function updatePackageTracking(
  subOrderId: string,
  carrierName: string,
  trackingNumber: string,
): Promise<VendorPackage> {
  const { error } = await supabase.rpc('update_sub_order_tracking', {
    p_sub_order_id: subOrderId,
    p_carrier_name: carrierName,
    p_tracking_number: trackingNumber,
  });
  if (error) throw rpcFailed('Could not record the tracking details', error.message);
  return fetchVendorPackage(subOrderId);
}
