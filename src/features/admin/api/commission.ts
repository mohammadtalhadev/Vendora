import { supabase } from '../../../lib/supabase';
import {
  asRecord,
  asRows,
  num,
  optionalNum,
  rpcFailed,
  text,
} from './admin-client';

/**
 * What the platform actually charges and what that charge collected. The tiers the
 * commission page used to render had no source; `effectiveRatePct` is the ledger's
 * commission over the volume that produced it, which is the only rate on offer here
 * that a row can be checked against.
 */

export interface CommissionByCategory {
  id: string;
  name: string;
  slug: string;
  /** `null` when the category follows the platform default. */
  override: number | null;
  /** The override when there is one, otherwise the global default. */
  effective: number;
  gross: number;
  commission: number;
  sellers: number;
}

export interface CommissionByVendor {
  id: string;
  storeName: string;
  override: number | null;
  gross: number;
  commission: number;
}

/** A commission change from the audit trail, so a rate is traceable to a decision. */
export interface CommissionChange {
  id: string;
  action: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
  actor: string | null;
}

export interface CommissionOverview {
  days: number;
  globalDefaultRate: number;
  earned: {
    commission: number;
    gross: number;
    packages: number;
  };
  /** Percent of booked volume; `null` when the window has no volume to divide by. */
  effectiveRatePct: number | null;
  byCategory: CommissionByCategory[];
  byVendor: CommissionByVendor[];
  changes: CommissionChange[];
}

function mapOverview(value: unknown): CommissionOverview {
  const root = asRecord(value);
  const earned = asRecord(root.earned);
  return {
    days: num(root.days),
    globalDefaultRate: num(root.globalDefaultRate),
    earned: {
      commission: num(earned.commission),
      gross: num(earned.gross),
      packages: num(earned.packages),
    },
    effectiveRatePct:
      root.effectiveRatePct === null || root.effectiveRatePct === undefined
        ? null
        : num(root.effectiveRatePct),
    byCategory: asRows(root.byCategory).map((row) => ({
      id: text(row.id),
      name: text(row.name),
      slug: text(row.slug),
      override: optionalNum(row.override),
      effective: num(row.effective),
      gross: num(row.gross),
      commission: num(row.commission),
      sellers: num(row.sellers),
    })),
    byVendor: asRows(root.byVendor).map((row) => ({
      id: text(row.id),
      storeName: text(row.storeName),
      override: optionalNum(row.override),
      gross: num(row.gross),
      commission: num(row.commission),
    })),
    changes: asRows(root.changes).map((row) => ({
      id: text(row.id),
      action: text(row.action),
      entityId: row.entityId === null || row.entityId === undefined ? null : text(row.entityId),
      before: row.before,
      after: row.after,
      createdAt: text(row.createdAt),
      actor: row.actor === null || row.actor === undefined ? null : text(row.actor),
    })),
  };
}

/** @param p_days the window the earned figures and per-seller rows are measured over. */
export async function fetchCommissionOverview(
  days = 30,
  signal?: AbortSignal,
): Promise<CommissionOverview> {
  let query = supabase.rpc('admin_commission_overview', { p_days: days });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the commission ledger', error.message);
  return mapOverview(data);
}

/**
 * Moves the platform default. The RPC refuses a rate outside 0-50 % and writes the
 * audit row in the same transaction, so the returned rate is the one on the row.
 */
export async function setGlobalCommission(rate: number): Promise<{ rate: number }> {
  const { data, error } = await supabase.rpc('admin_set_global_commission', { p_rate: rate });
  if (error) throw rpcFailed('Could not set the platform rate', error.message);
  return { rate: num(asRecord(data).rate) };
}
