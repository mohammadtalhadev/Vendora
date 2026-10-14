import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import type {
  CartItem,
  OrderGroup,
  ProductType,
  ShippingAddress,
  SubOrder,
  SubOrderStatus,
  TrackingEvent,
} from '../../../types/domain';

type SellerEmbed = { id: string; store_name: string; seller_type: 'platform' | 'vendor' } | null;
type OrderRow = Database['public']['Tables']['orders']['Row'] & { sub_orders: SubOrderRow[] };
type SubOrderRow = Database['public']['Tables']['sub_orders']['Row'] & { seller: SellerEmbed };

/**
 * An order is booked by the `place_order` RPC, never written from here: orders and
 * sub_orders have no insert policy, so the database is the only writer.
 * @see src/features/checkout/api/checkout.ts
 */
export interface OrdersListResponse {
  orderGroups: OrderGroup[];
  subOrders: SubOrder[];
}

export interface OrderDetailResponse {
  orderGroup: OrderGroup;
  subOrders: SubOrder[];
}

/** One purchased digital line, with the licence the server issued for it. */
export interface DigitalDownload {
  id: string;
  orderGroupId: string;
  title: string;
  image: string;
  licenseKey: string;
  sellerName: string;
  purchasedAt: string;
  fileFormat?: string;
  fileSizeMb?: number;
  licenseType?: string;
  downloadUrl?: string;
}

/**
 * `delivery_code_hash` is deliberately absent: a handover code is hashed on the way in, so
 * the columns below can show status and money but never the code. `issueDeliveryCode`
 * mints a new one instead.
 */
const SUB_ORDER_SELECT =
  'id, order_group_id, seller_id, type, items, subtotal, shipping_fee, delivery_option, ' +
  'commission_rate, commission_amount, net_payout, status, rider_id, license_key, history, ' +
  'return_reason, rma_code, refund_amount, return_reject_reason, carrier_name, tracking_number, customer_notes, created_at, ' +
  'seller:vendor_profiles(id, store_name, seller_type)';

const ORDER_SELECT =
  'id, customer_id, customer_email, shipping_address, payment_method, payment_details, ' +
  `payment_status, gift_card_amount, created_at, sub_orders(${SUB_ORDER_SELECT})`;

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value));

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not read your session: ${error.message}`);
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in to view your orders.');
  return userId;
}

function readAddress(value: unknown): ShippingAddress | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  // A digital-only order has nothing to deliver, so it books an empty address.
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

/** The frozen cart line an order was booked with, shaped like the cart rows the UI renders. */
function readItem(raw: unknown, row: SubOrderRow, sellerName: string, sellerType: 'platform' | 'vendor'): CartItem {
  const line = (raw ?? {}) as Record<string, unknown>;
  const productId = text(line.productId);
  const variantId = text(line.variantId);
  const quantity = Number(line.quantity ?? 0);
  return {
    id: variantId ? `${productId}-${variantId}` : productId,
    productId,
    variantId: variantId || undefined,
    title: text(line.title),
    price: Number(line.price ?? 0),
    quantity,
    // A booked line has no live stock ceiling; it is a record of what was ordered.
    maxStock: quantity,
    image: text(line.image),
    sellerId: row.seller_id,
    sellerName,
    sellerType,
    type: row.type as ProductType,
  };
}

function mapSubOrder(row: SubOrderRow): SubOrder {
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
    subtotal: Number(row.subtotal),
    shippingFee: Number(row.shipping_fee),
    deliveryOption: row.delivery_option as SubOrder['deliveryOption'],
    commissionRate: Number(row.commission_rate),
    commissionAmount: Number(row.commission_amount),
    netPayout: Number(row.net_payout),
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
    rmaCode: row.rma_code ?? undefined,
    refundAmount: row.refund_amount === null || row.refund_amount === undefined ? undefined : Number(row.refund_amount),
    returnRejectReason: row.return_reject_reason ?? undefined,
    createdAt: row.created_at,
    carrierName: row.carrier_name ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    customerNotes: row.customer_notes ?? undefined,
  };
}

function mapOrderGroup(row: OrderRow): OrderGroup {
  const details = (row.payment_details ?? {}) as Record<string, unknown>;
  const subOrders = Array.isArray(row.sub_orders) ? row.sub_orders : [];
  return {
    id: row.id,
    customerId: row.customer_id ?? '',
    customerEmail: row.customer_email,
    shippingAddress: readAddress(row.shipping_address),
    paymentMethod: row.payment_method as OrderGroup['paymentMethod'],
    paymentDetails: {
      brand: details.brand === undefined ? undefined : text(details.brand),
      last4: details.last4 === undefined ? undefined : text(details.last4),
    },
    paymentStatus: row.payment_status,
    giftCardAmount: Number(row.gift_card_amount ?? 0),
    subOrderIds: subOrders.map((sub) => sub.id),
    createdAt: row.created_at,
  };
}

/** The signed-in customer's orders, each with the packages it split into. */
export async function fetchOrders(signal?: AbortSignal): Promise<OrdersListResponse> {
  const userId = await requireUserId();

  let query = supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your orders: ${error.message}`);

  const rows = (data ?? []) as unknown as OrderRow[];
  return {
    orderGroups: rows.map(mapOrderGroup),
    subOrders: rows.flatMap((row) => (Array.isArray(row.sub_orders) ? row.sub_orders : []).map(mapSubOrder)),
  };
}

async function readOrderRow(orderId: string, signal?: AbortSignal): Promise<OrderRow> {
  let query = supabase.from('orders').select(ORDER_SELECT).eq('id', orderId);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Failed to load this order: ${error.message}`);
  // RLS hides another customer's order, so "not found" is the whole truth.
  if (!data) throw new Error('Order not found.');
  return data as unknown as OrderRow;
}

export async function fetchOrderDetail(orderId: string, signal?: AbortSignal): Promise<OrderDetailResponse> {
  await requireUserId();

  const row = await readOrderRow(orderId, signal);
  return {
    orderGroup: mapOrderGroup(row),
    subOrders: (Array.isArray(row.sub_orders) ? row.sub_orders : []).map(mapSubOrder),
  };
}

async function readSubOrderRow(subOrderId: string): Promise<SubOrder> {
  const { data, error } = await supabase
    .from('sub_orders')
    .select(SUB_ORDER_SELECT)
    .eq('id', subOrderId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load this package: ${error.message}`);
  if (!data) throw new Error('Package not found.');
  return mapSubOrder(data as unknown as SubOrderRow);
}

/**
 * Moves one package along the state machine. The database decides whether this caller and
 * this status are a legal pair, so the row is re-read afterwards rather than patched here.
 */
export async function advanceSubOrderStatus(
  subOrderId: string,
  nextStatus: SubOrderStatus,
  note?: string,
): Promise<SubOrder> {
  const { error } = await supabase.rpc('advance_sub_order_status', {
    p_sub_order_id: subOrderId,
    p_next: nextStatus,
    p_note: note,
  });
  if (error) throw new Error(error.message);
  return readSubOrderRow(subOrderId);
}

/** A new handover code for a package still in transit; the old one stops working. */
export async function issueDeliveryCode(subOrderId: string): Promise<string> {
  const { data, error } = await supabase.rpc('issue_delivery_code', { p_sub_order_id: subOrderId });
  if (error) throw new Error(error.message);
  const code = (data as { code?: unknown } | null)?.code;
  if (typeof code !== 'string') throw new Error('The handover code could not be issued.');
  return code;
}

/**
 * Licences the customer holds, read from their digital packages. File metadata comes from
 * the live product row, because the order snapshot keeps the price and title, not the file.
 */
export async function fetchDigitalDownloads(signal?: AbortSignal): Promise<DigitalDownload[]> {
  const { subOrders } = await fetchOrders(signal);
  const licensed = subOrders.filter((sub) => sub.type === 'digital' && sub.licenseKey);
  const productIds = Array.from(new Set(licensed.flatMap((sub) => sub.items.map((item) => item.productId))));
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from('products')
    .select('id, digital_asset_info')
    .in('id', productIds);
  if (error) throw new Error(`Failed to load your downloads: ${error.message}`);

  const assets = new Map<string, Record<string, unknown>>(
    ((data ?? []) as unknown as { id: string; digital_asset_info: unknown }[]).map((row) => [
      row.id,
      (row.digital_asset_info ?? {}) as Record<string, unknown>,
    ]),
  );

  return licensed.map((sub) => {
    const first = sub.items[0];
    const asset = first ? (assets.get(first.productId) ?? {}) : {};
    const fileSizeMb = asset.fileSizeMb === undefined ? undefined : Number(asset.fileSizeMb);
    const downloadUrl = asset.downloadUrl === undefined ? undefined : text(asset.downloadUrl) || undefined;
    const recordedFormat = asset.fileFormat === undefined ? '' : text(asset.fileFormat);
    return {
      id: sub.id,
      orderGroupId: sub.orderGroupId,
      title: first?.title ?? '',
      image: first?.image ?? '',
      licenseKey: sub.licenseKey ?? '',
      sellerName: sub.sellerName,
      purchasedAt: sub.createdAt,
      // Most sellers record only the file name, so the format is read off its extension.
      fileFormat:
        recordedFormat ||
        (downloadUrl ? text(downloadUrl.split('?')[0].split('.').pop()).toUpperCase() : '') ||
        undefined,
      downloadUrl,
      fileSizeMb: Number.isFinite(fileSizeMb) ? fileSizeMb : undefined,
      licenseType: asset.licenseType === undefined ? undefined : text(asset.licenseType),
    };
  });
}
