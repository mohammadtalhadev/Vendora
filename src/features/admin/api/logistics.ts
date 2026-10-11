import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, num, rpcFailed, text } from './admin-client';
import { readShippingAddress, type AdminOrderAddress } from './orders';

/**
 * The dispatch board: every rider the platform has, the packages still moving, and
 * the counts the board's tiles show. Nothing here is remembered from a previous
 * render - `admin_logistics_board` reads the delivery rows on each call.
 */

export interface LogisticsRider {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  status: string;
  /** Deliveries currently assigned to the rider rather than finished. */
  active: number;
  completed: number;
}

/** The `deliveries` row attached to a package; `null` until one is opened. */
export interface LogisticsDelivery {
  id: string;
  status: string;
  riderId: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
}

export interface LogisticsQueueRow {
  id: string;
  status: string;
  type: string;
  storeName: string;
  gross: number;
  carrierName: string | null;
  trackingNumber: string | null;
  riderId: string | null;
  createdAt: string;
  updatedAt: string;
  delivery: LogisticsDelivery | null;
  address: AdminOrderAddress | null;
}

export interface LogisticsCounts {
  awaitingPickup: number;
  inTransit: number;
  failed: number;
  delivered: number;
  ridersAvailable: number;
}

export interface LogisticsBoard {
  fleet: LogisticsRider[];
  queue: LogisticsQueueRow[];
  counts: LogisticsCounts;
}

const nullableText = (value: unknown): string | null =>
  value === null || value === undefined ? null : text(value);

function mapBoard(value: unknown): LogisticsBoard {
  const root = asRecord(value);
  const counts = asRecord(root.counts);
  return {
    fleet: asRows(root.fleet).map((row) => ({
      id: text(row.id),
      name: text(row.name),
      phone: text(row.phone),
      vehicle: text(row.vehicle),
      status: text(row.status),
      active: num(row.active),
      completed: num(row.completed),
    })),
    queue: asRows(root.queue).map((row) => {
      const delivery = asRecord(row.delivery);
      return {
        id: text(row.id),
        status: text(row.status),
        type: text(row.type),
        storeName: text(row.storeName),
        gross: num(row.gross),
        carrierName: nullableText(row.carrierName),
        trackingNumber: nullableText(row.trackingNumber),
        riderId: nullableText(row.riderId),
        createdAt: text(row.createdAt),
        updatedAt: text(row.updatedAt),
        delivery:
          row.delivery === null || row.delivery === undefined
            ? null
            : {
                id: text(delivery.id),
                status: text(delivery.status),
                riderId: nullableText(delivery.riderId),
                assignedAt: nullableText(delivery.assignedAt),
                pickedUpAt: nullableText(delivery.pickedUpAt),
                deliveredAt: nullableText(delivery.deliveredAt),
              },
        address: readShippingAddress(row.address),
      };
    }),
    counts: {
      awaitingPickup: num(counts.awaitingPickup),
      inTransit: num(counts.inTransit),
      failed: num(counts.failed),
      delivered: num(counts.delivered),
      ridersAvailable: num(counts.ridersAvailable),
    },
  };
}

export async function fetchLogisticsBoard(signal?: AbortSignal): Promise<LogisticsBoard> {
  let query = supabase.rpc('admin_logistics_board');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the dispatch board', error.message);
  return mapBoard(data);
}
