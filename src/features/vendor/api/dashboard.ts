import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, num, rpcFailed, text } from './vendor-client';

/**
 * One RPC feeds the dashboard. Every tile, stage count and chart value is computed by
 * Postgres from the same columns a payout is settled against, so the page cannot show a
 * number that the ledger does not support.
 */
export interface VendorDashboard {
  store: {
    id: string;
    storeName: string;
    slug: string;
    sellerType: 'platform' | 'vendor';
    status: 'active' | 'suspended';
    rating: number;
    reviewCount: number;
    vacationMode: boolean;
  };
  kpis: {
    grossBooked: number;
    commission: number;
    netPayout: number;
    physicalSales: number;
    digitalSales: number;
    revenue7d: number;
    revenue30d: number;
    orders7d: number;
    balance: number;
  };
  stages: {
    placed: number;
    confirmed: number;
    packed: number;
    inTransit: number;
    delivered: number;
    returns: number;
    cancelled: number;
  };
  catalog: {
    approved: number;
    pendingReview: number;
    rejected: number;
    draft: number;
    archived: number;
    lowStock: number;
    outOfStock: number;
    units: number;
    valuation: number;
  };
  engagement: {
    openThreads: number;
    unreadMessages: number;
    activePromotions: number;
    unansweredQuestions: number;
  };
  topProducts: { productId: string; title: string; units: number; revenue: number }[];
  recentPackages: {
    id: string;
    status: string;
    type: string;
    net: number;
    buyerEmail: string;
    createdAt: string;
  }[];
}

const count = (raw: Record<string, unknown>, key: string) => num(raw[key]);

function mapDashboard(payload: unknown): VendorDashboard {
  const root = asRecord(payload);
  const store = asRecord(root.store);
  const kpis = asRecord(root.kpis);
  const stages = asRecord(root.stages);
  const catalog = asRecord(root.catalog);
  const engagement = asRecord(root.engagement);

  return {
    store: {
      id: text(store.id),
      storeName: text(store.storeName),
      slug: text(store.slug),
      sellerType: store.sellerType === 'platform' ? 'platform' : 'vendor',
      status: store.status === 'suspended' ? 'suspended' : 'active',
      rating: num(store.rating),
      reviewCount: count(store, 'reviewCount'),
      vacationMode: store.vacationMode === true,
    },
    kpis: {
      grossBooked: num(kpis.grossBooked),
      commission: num(kpis.commission),
      netPayout: num(kpis.netPayout),
      physicalSales: num(kpis.physicalSales),
      digitalSales: num(kpis.digitalSales),
      revenue7d: num(kpis.revenue7d),
      revenue30d: num(kpis.revenue30d),
      orders7d: count(kpis, 'orders7d'),
      balance: num(kpis.balance),
    },
    stages: {
      placed: count(stages, 'placed'),
      confirmed: count(stages, 'confirmed'),
      packed: count(stages, 'packed'),
      inTransit: count(stages, 'inTransit'),
      delivered: count(stages, 'delivered'),
      returns: count(stages, 'returns'),
      cancelled: count(stages, 'cancelled'),
    },
    catalog: {
      approved: count(catalog, 'approved'),
      pendingReview: count(catalog, 'pendingReview'),
      rejected: count(catalog, 'rejected'),
      draft: count(catalog, 'draft'),
      archived: count(catalog, 'archived'),
      lowStock: count(catalog, 'lowStock'),
      outOfStock: count(catalog, 'outOfStock'),
      units: count(catalog, 'units'),
      valuation: num(catalog.valuation),
    },
    engagement: {
      openThreads: count(engagement, 'openThreads'),
      unreadMessages: count(engagement, 'unreadMessages'),
      activePromotions: count(engagement, 'activePromotions'),
      unansweredQuestions: count(engagement, 'unansweredQuestions'),
    },
    topProducts: asRows(root.topProducts).map((row) => ({
      productId: text(row.productId),
      title: text(row.title),
      units: num(row.units),
      revenue: num(row.revenue),
    })),
    recentPackages: asRows(root.recentPackages).map((row) => ({
      id: text(row.id),
      status: text(row.status),
      type: text(row.type),
      net: num(row.net),
      buyerEmail: text(row.buyerEmail),
      createdAt: text(row.createdAt),
    })),
  };
}

/** @param lowStockAt what counts as low stock; the query param is clamped in SQL. */
export async function fetchVendorDashboard(
  lowStockAt = 5,
  signal?: AbortSignal,
): Promise<VendorDashboard> {
  let query = supabase.rpc('vendor_dashboard', { p_low_stock: lowStockAt });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load your dashboard', error.message);
  return mapDashboard(data);
}
