import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, num, rpcFailed, text } from './admin-client';

/**
 * The order queue is the platform's view of a purchase: one row per order group, with
 * every seller's slice of it attached. The money is summed in SQL from the packages,
 * so a page of orders cannot disagree with the ledger.
 */

/** One package inside an order, as the queue's `lines` array reports it. */
export interface AdminOrderQueueLine {
  id: string;
  sellerId: string;
  status: string;
  gross: number;
}

export interface AdminOrderRow {
  id: string;
  customerEmail: string;
  createdAt: string;
  paymentMethod: string;
  paymentStatus: string;
  gross: number;
  commission: number;
  /** What the sellers were actually paid: net payout on delivered and refunded packages. */
  paidToSellers: number;
  packages: number;
  /** The leading package's status, which is what the queue filters on. */
  leadStatus: string;
  lines: AdminOrderQueueLine[];
}

export interface AdminOrderQueue {
  page: number;
  pageSize: number;
  total: number;
  /** Booked volume across every order, not only the filtered page. */
  booked: number;
  rows: AdminOrderRow[];
}

/** A frozen cart line from `sub_orders.items`, in the keys `place_order` wrote. */
export interface AdminOrderLineItem {
  productId: string;
  variantId: string | null;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

/** A tracking entry appended by `advance_sub_order_status`. */
export interface AdminOrderHistoryEvent {
  status: string;
  timestamp: string;
  actor: string;
  note: string | null;
}

/** The address snapshot on the order; `null` when nothing was shipped to. */
export interface AdminOrderAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

/** Shared with the dispatch board: both read the same `orders.shipping_address` jsonb. */
export function readShippingAddress(value: unknown): AdminOrderAddress | null {
  const raw = asRecord(value);
  // A digital-only order books an empty address object: there is nothing to ship to.
  if (!raw.street) return null;
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

/** The `deliveries` row embedded in a package. */
export interface AdminOrderDelivery {
  status: string;
  riderId: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
}

export interface AdminOrderPackage {
  id: string;
  sellerId: string;
  storeName: string;
  type: string;
  status: string;
  items: AdminOrderLineItem[];
  subtotal: number;
  shippingFee: number;
  commissionRate: number;
  commissionAmount: number;
  netPayout: number;
  riderId: string | null;
  licenseKey: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  returnReason: string | null;
  history: AdminOrderHistoryEvent[];
  createdAt: string;
  updatedAt: string;
  delivery: AdminOrderDelivery | null;
}

export interface AdminOrderDispute {
  id: string;
  reason: string;
  status: string;
  urgency: string;
  vendorName: string;
  resolutionNote: string | null;
  resolutionAmount: number | null;
  createdAt: string;
}

export interface AdminOrderRefund {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  processedBy: string | null;
}

export interface AdminOrderDetail {
  id: string;
  customerEmail: string;
  customerId: string | null;
  shippingAddress: AdminOrderAddress | null;
  paymentMethod: string;
  /** `place_order` stores either `{brand, last4}` for a card or `{method: 'cod'}`. */
  paymentDetails: { brand: string | null; last4: string | null; method: string | null };
  paymentStatus: string;
  createdAt: string;
  gross: number;
  commission: number;
  refunded: number;
  packages: AdminOrderPackage[];
  disputes: AdminOrderDispute[];
  refunds: AdminOrderRefund[];
}

/** `jsonb_build_object` drops a NULL entry, so an absent key and a null one are the same thing. */
const nullableText = (value: unknown): string | null =>
  value === null || value === undefined ? null : text(value);

function readItems(value: unknown): AdminOrderLineItem[] {
  return asRows(value).map((line) => ({
    productId: text(line.productId),
    variantId: nullableText(line.variantId),
    title: text(line.title),
    price: num(line.price),
    quantity: num(line.quantity),
    image: text(line.image),
  }));
}

function readHistory(value: unknown): AdminOrderHistoryEvent[] {
  return asRows(value).map((event) => ({
    status: text(event.status),
    timestamp: text(event.timestamp),
    actor: text(event.actor),
    note: nullableText(event.note),
  }));
}

function mapQueueRow(row: Record<string, unknown>): AdminOrderRow {
  return {
    id: text(row.id),
    customerEmail: text(row.customerEmail),
    createdAt: text(row.createdAt),
    paymentMethod: text(row.paymentMethod),
    paymentStatus: text(row.paymentStatus),
    gross: num(row.gross),
    commission: num(row.commission),
    paidToSellers: num(row.paidToSellers),
    packages: num(row.packages),
    leadStatus: text(row.leadStatus),
    lines: asRows(row.lines).map((line) => ({
      id: text(line.id),
      sellerId: text(line.sellerId),
      status: text(line.status),
      gross: num(line.gross),
    })),
  };
}

function mapQueue(value: unknown): AdminOrderQueue {
  const root = asRecord(value);
  return {
    page: num(root.page),
    pageSize: num(root.pageSize),
    total: num(root.total),
    booked: num(root.booked),
    rows: asRows(root.rows).map(mapQueueRow),
  };
}

/**
 * Orders across every store. Filtering and paging happen in SQL, so `total` is the
 * table's count of matching order groups rather than the length of a page.
 */
export async function fetchAdminOrderQueue(
  params: {
    status?: string;
    payment?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
  signal?: AbortSignal,
): Promise<AdminOrderQueue> {
  let query = supabase.rpc('admin_order_queue', {
    p_status: params.status ?? 'all',
    p_payment: params.payment ?? 'all',
    p_search: params.search ?? '',
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 12,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the order queue', error.message);
  return mapQueue(data);
}

function mapDetail(value: unknown): AdminOrderDetail {
  const root = asRecord(value);
  const paymentDetails = asRecord(root.paymentDetails);
  return {
    id: text(root.id),
    customerEmail: text(root.customerEmail),
    customerId: nullableText(root.customerId),
    shippingAddress: readShippingAddress(root.shippingAddress),
    paymentMethod: text(root.paymentMethod),
    paymentDetails: {
      brand: nullableText(paymentDetails.brand),
      last4: nullableText(paymentDetails.last4),
      method: nullableText(paymentDetails.method),
    },
    paymentStatus: text(root.paymentStatus),
    createdAt: text(root.createdAt),
    gross: num(root.gross),
    commission: num(root.commission),
    refunded: num(root.refunded),
    packages: asRows(root.packages).map((row) => {
      const delivery = asRecord(row.delivery);
      return {
        id: text(row.id),
        sellerId: text(row.sellerId),
        storeName: text(row.storeName),
        type: text(row.type),
        status: text(row.status),
        items: readItems(row.items),
        subtotal: num(row.subtotal),
        shippingFee: num(row.shippingFee),
        commissionRate: num(row.commissionRate),
        commissionAmount: num(row.commissionAmount),
        netPayout: num(row.netPayout),
        riderId: nullableText(row.riderId),
        licenseKey: nullableText(row.licenseKey),
        carrierName: nullableText(row.carrierName),
        trackingNumber: nullableText(row.trackingNumber),
        returnReason: nullableText(row.returnReason),
        history: readHistory(row.history),
        createdAt: text(row.createdAt),
        updatedAt: text(row.updatedAt),
        delivery:
          row.delivery === null || row.delivery === undefined
            ? null
            : {
                status: text(delivery.status),
                riderId: nullableText(delivery.riderId),
                pickedUpAt: nullableText(delivery.pickedUpAt),
                deliveredAt: nullableText(delivery.deliveredAt),
              },
      };
    }),
    disputes: asRows(root.disputes).map((row) => ({
      id: text(row.id),
      reason: text(row.reason),
      status: text(row.status),
      urgency: text(row.urgency),
      vendorName: text(row.vendorName),
      resolutionNote: nullableText(row.resolutionNote),
      resolutionAmount:
        row.resolutionAmount === null || row.resolutionAmount === undefined
          ? null
          : num(row.resolutionAmount),
      createdAt: text(row.createdAt),
    })),
    refunds: asRows(root.refunds).map((row) => ({
      id: text(row.id),
      amount: num(row.amount),
      reason: text(row.reason),
      createdAt: text(row.createdAt),
      processedBy: nullableText(row.processedBy),
    })),
  };
}

/**
 * One order with its packages, refund rows and any dispute against it.
 * `admin_order_detail` returns no row for an unknown id, and an empty dossier is not
 * an answer a support agent can act on, so that is raised as a failure.
 */
export async function fetchAdminOrderDetail(
  orderGroupId: string,
  signal?: AbortSignal,
): Promise<AdminOrderDetail> {
  let query = supabase.rpc('admin_order_detail', { p_order_group_id: orderGroupId });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load this order', error.message);
  if (data === null || data === undefined) {
    throw rpcFailed('Failed to load this order', 'no order with that reference');
  }
  return mapDetail(data);
}

/**
 * Hands one package to a rider. `assign_rider` is admin-only in the database and
 * refuses an unknown package or rider, so the wrapper only carries the pair across
 * and surfaces the refusal; which packages may take a rider is the caller's read of
 * the package's type and status, not something this call invents.
 */
export async function assignRider(
  subOrderId: string,
  riderId: string,
): Promise<{ subOrderId: string; riderId: string }> {
  const { data, error } = await supabase.rpc('assign_rider', {
    p_sub_order_id: subOrderId,
    p_rider_id: riderId,
  });
  if (error) throw rpcFailed('Could not assign this rider', error.message);
  const root = asRecord(data);
  return { subOrderId: text(root.subOrderId), riderId: text(root.riderId) };
}
