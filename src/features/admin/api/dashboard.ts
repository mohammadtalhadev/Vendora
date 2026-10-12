import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, num, rpcFailed, text } from './admin-client';

/**
 * The platform overview, exactly as `admin_dashboard` shapes it. Every number here is
 * one the database computed over the rows it holds: booked volume, the commission that
 * volume produced, what sellers earned, and the two queues that need a decision.
 */
export interface AdminDashboard {
  days: number;
  kpis: {
    gmvBooked: number;
    commission: number;
    netToSellers: number;
    packages: number;
    orders: number;
    openPackages: number;
    /** `round(gmv / nullif(orders, 0))`: no orders in the window means no average, not a zero one. */
    averageOrderValue: number | null;
    refundAmount: number;
    refundCount: number;
    payoutsPaid: number;
    payoutsPending: number;
    payoutsPendingCount: number;
  };
  growth: {
    revenue7d: number;
    revenue30d: number;
    orders7d: number;
    orders30d: number;
    previousGmv: number;
    /** Percent against the previous window; `null` when there was no previous window. */
    deltaPct: number | null;
  };
  sellers: { active: number; suspended: number; awaitingReview: number };
  catalog: {
    approved: number;
    pendingReview: number;
    rejected: number;
    draft: number;
    archived: number;
    outOfStock: number;
    lowStock: number;
  };
  trust: {
    openDisputes: number;
    escalatedDisputes: number;
    pendingReturns: number;
    strikes: number;
  };
  stages: Record<string, number>;
  monthly: { month: string; label: string; gross: number; commission: number; net: number }[];
  topVendors: { id: string; storeName: string; gross: number; commission: number; packages: number }[];
}

const count = (row: Record<string, unknown>, key: string) => num(row[key]);

function mapDashboard(value: unknown): AdminDashboard {
  const root = asRecord(value);
  const kpis = asRecord(root.kpis);
  const growth = asRecord(root.growth);
  const sellers = asRecord(root.sellers);
  const catalog = asRecord(root.catalog);
  const trust = asRecord(root.trust);

  return {
    days: num(root.days),
    kpis: {
      gmvBooked: num(kpis.gmvBooked),
      commission: num(kpis.commission),
      netToSellers: num(kpis.netToSellers),
      packages: count(kpis, 'packages'),
      orders: count(kpis, 'orders'),
      openPackages: count(kpis, 'openPackages'),
      averageOrderValue:
        kpis.averageOrderValue === null || kpis.averageOrderValue === undefined
          ? null
          : num(kpis.averageOrderValue),
      refundAmount: num(kpis.refundAmount),
      refundCount: count(kpis, 'refundCount'),
      payoutsPaid: num(kpis.payoutsPaid),
      payoutsPending: num(kpis.payoutsPending),
      payoutsPendingCount: count(kpis, 'payoutsPendingCount'),
    },
    growth: {
      revenue7d: num(growth.revenue7d),
      revenue30d: num(growth.revenue30d),
      orders7d: count(growth, 'orders7d'),
      orders30d: count(growth, 'orders30d'),
      previousGmv: num(growth.previousGmv),
      deltaPct:
        growth.deltaPct === null || growth.deltaPct === undefined
          ? null
          : num(growth.deltaPct),
    },
    sellers: {
      active: count(sellers, 'active'),
      suspended: count(sellers, 'suspended'),
      awaitingReview: count(sellers, 'awaitingReview'),
    },
    // `catalog` is `to_jsonb(c)` over the SQL CTE, so its keys really are the column names.
    catalog: {
      approved: count(catalog, 'approved'),
      pendingReview: count(catalog, 'pending_review'),
      rejected: count(catalog, 'rejected'),
      draft: count(catalog, 'draft'),
      archived: count(catalog, 'archived'),
      outOfStock: count(catalog, 'out_of_stock'),
      lowStock: count(catalog, 'low_stock'),
    },
    trust: {
      openDisputes: count(trust, 'openDisputes'),
      escalatedDisputes: count(trust, 'escalatedDisputes'),
      pendingReturns: count(trust, 'pendingReturns'),
      strikes: count(trust, 'strikes'),
    },
    stages: Object.fromEntries(
      Object.entries(asRecord(root.stages)).map(([status, n]) => [status, num(n)]),
    ),
    monthly: asRows(root.monthly).map((row) => ({
      month: text(row.month),
      label: text(row.label),
      gross: num(row.gross),
      commission: num(row.commission),
      net: num(row.net),
    })),
    topVendors: asRows(root.topVendors).map((row) => ({
      id: text(row.id),
      storeName: text(row.storeName),
      gross: num(row.gross),
      commission: num(row.commission),
      packages: count(row, 'packages'),
    })),
  };
}

/** @param p_days the window every figure is measured over; clamped to at least a day in SQL. */
export async function fetchAdminDashboard(
  days = 30,
  signal?: AbortSignal,
): Promise<AdminDashboard> {
  let query = supabase.rpc('admin_dashboard', { p_days: days });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the platform overview', error.message);
  return mapDashboard(data);
}
