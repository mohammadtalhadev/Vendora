import { supabase } from '../../../lib/supabase';
import { asRecord, asRows, num, rpcFailed, text } from './admin-client';

/**
 * The reporting period, bucketed in SQL. The reports page used to keep "generated"
 * files in React state; there is no file behind this, only what the rows say.
 */

export interface ReportTotals {
  gross: number;
  commission: number;
  net: number;
  /** Shipping charged across the window, physical packages only. */
  freight: number;
  digitalGross: number;
  orders: number;
  packages: number;
  refunds: number;
  /** Commission as a percent of booked volume; `null` when the window has no volume. */
  takeRatePct: number | null;
}

export interface ReportSeriesPoint {
  /** `date_trunc` rendered as YYYY-MM-DD, so a bucket is a label and a sort key. */
  period: string;
  gross: number;
  commission: number;
  net: number;
  orders: number;
  packages: number;
}

export interface ReportByCategory {
  category: string;
  gross: number;
  commission: number;
  listings: number;
}

export interface ReportBySeller {
  storeName: string;
  gross: number;
  commission: number;
  net: number;
  packages: number;
  payoutsPaid: number;
}

export interface ReportSummary {
  days: number;
  bucket: 'day' | 'week' | 'month';
  totals: ReportTotals;
  series: ReportSeriesPoint[];
  byCategory: ReportByCategory[];
  bySeller: ReportBySeller[];
}

function mapSummary(value: unknown): ReportSummary {
  const root = asRecord(value);
  const totals = asRecord(root.totals);
  const bucket = text(root.bucket);
  return {
    days: num(root.days),
    bucket: bucket === 'month' || bucket === 'week' ? bucket : 'day',
    totals: {
      gross: num(totals.gross),
      commission: num(totals.commission),
      net: num(totals.net),
      freight: num(totals.freight),
      digitalGross: num(totals.digitalGross),
      orders: num(totals.orders),
      packages: num(totals.packages),
      refunds: num(totals.refunds),
      takeRatePct:
        totals.takeRatePct === null || totals.takeRatePct === undefined
          ? null
          : num(totals.takeRatePct),
    },
    series: asRows(root.series).map((row) => ({
      period: text(row.period),
      gross: num(row.gross),
      commission: num(row.commission),
      net: num(row.net),
      orders: num(row.orders),
      packages: num(row.packages),
    })),
    byCategory: asRows(root.byCategory).map((row) => ({
      category: text(row.category),
      gross: num(row.gross),
      commission: num(row.commission),
      listings: num(row.listings),
    })),
    bySeller: asRows(root.bySeller).map((row) => ({
      storeName: text(row.storeName),
      gross: num(row.gross),
      commission: num(row.commission),
      net: num(row.net),
      packages: num(row.packages),
      payoutsPaid: num(row.payoutsPaid),
    })),
  };
}

/**
 * @param p_days the window every figure is measured over.
 * @param p_bucket anything other than `week` or `month` buckets by day in SQL.
 */
export async function fetchReportSummary(
  days = 30,
  bucket: 'day' | 'week' | 'month' = 'day',
  signal?: AbortSignal,
): Promise<ReportSummary> {
  let query = supabase.rpc('admin_report_summary', { p_days: days, p_bucket: bucket });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the report', error.message);
  return mapSummary(data);
}
