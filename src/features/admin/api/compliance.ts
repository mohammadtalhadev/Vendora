import { supabase } from '../../../lib/supabase';
import { asRecord, num, rpcFailed, text } from './admin-client';

/**
 * Compliance evidence that actually lives in the database. There is no tax-jurisdiction or
 * 1099-K filing table anywhere in this schema, so those invented workflows are gone; what
 * remains honest is the seller-verification, strike and buyer-protection trail Postgres keeps:
 * `vendor_profiles.status`, `vendor_applications.status`, `vendor_strikes`, `disputes` and
 * `refunds`. Every figure below is counted from those rows, never typed into a form.
 */

export interface SellerVerification {
  activeStores: number;
  suspendedStores: number;
  applicationsPending: number;
  applicationsUnderReview: number;
  applicationsApproved: number;
  applicationsRejected: number;
}

export interface BuyerProtection {
  openDisputes: number;
  underReviewDisputes: number;
  escalatedDisputes: number;
  resolvedWithRefund: number;
  resolvedDenied: number;
  refundsCount: number;
  refundsTotal: number;
}

export interface ComplianceStrike {
  id: string;
  storeName: string;
  reason: string;
  note: string;
  createdAt: string;
}

export interface ComplianceEvidence {
  sellers: SellerVerification;
  protection: BuyerProtection;
  totalStrikes: number;
  recentStrikes: ComplianceStrike[];
}

type CountResult = { count: number | null; error: { message: string } | null };

/** Surfaces the database's own refusal, then hands back the number it counted. */
function unwrapCount(res: CountResult, label: string): number {
  if (res.error) throw rpcFailed(`Failed to read ${label}`, res.error.message);
  return num(res.count ?? 0);
}

/** A head count is the same shape everywhere, so one runner covers every status facet. */
function count(
  label: string,
  run: () => PromiseLike<CountResult>,
): Promise<number> {
  return Promise.resolve(run()).then((res) => unwrapCount(res, label));
}

/** The refunds ledger is small enough to total honestly from the rows the read returns. */
async function refundTotals(signal?: AbortSignal): Promise<{ count: number; total: number }> {
  let query = supabase.from('refunds').select('amount');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to read refunds', error.message);
  const rows = data ?? [];
  return {
    count: rows.length,
    total: rows.reduce((sum, row) => sum + num((row as unknown as { amount: number }).amount), 0),
  };
}

async function recentStrikes(signal?: AbortSignal): Promise<ComplianceStrike[]> {
  let query = supabase
    .from('vendor_strikes')
    .select('id, reason, note, created_at, vendor_profiles(store_name)')
    .order('created_at', { ascending: false })
    .limit(10);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to read seller strikes', error.message);

  return (data ?? []).map((raw) => {
    const row = raw as unknown as Record<string, unknown>;
    return {
      id: text(row.id),
      storeName: text(asRecord(row.vendor_profiles).store_name) || 'Unknown store',
      reason: text(row.reason),
      note: row.note === null || row.note === undefined ? '' : text(row.note),
      createdAt: text(row.created_at),
    };
  });
}

const byStatus = (
  table: 'vendor_profiles' | 'vendor_applications' | 'disputes',
  status: 'active' | 'suspended' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'open' | 'escalated' | 'resolved_refund' | 'resolved_denied',
) =>
  supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', status);

export async function fetchComplianceEvidence(
  signal?: AbortSignal,
): Promise<ComplianceEvidence> {
  const [
    activeStores,
    suspendedStores,
    applicationsPending,
    applicationsUnderReview,
    applicationsApproved,
    applicationsRejected,
    totalStrikes,
    openDisputes,
    underReviewDisputes,
    escalatedDisputes,
    resolvedWithRefund,
    resolvedDenied,
    refunds,
    recent,
  ] = await Promise.all([
    count('active stores', () => byStatus('vendor_profiles', 'active')),
    count('suspended stores', () => byStatus('vendor_profiles', 'suspended')),
    count('pending applications', () => byStatus('vendor_applications', 'pending')),
    count('applications under review', () => byStatus('vendor_applications', 'under_review')),
    count('approved applications', () => byStatus('vendor_applications', 'approved')),
    count('rejected applications', () => byStatus('vendor_applications', 'rejected')),
    count('strikes', () => supabase.from('vendor_strikes').select('id', { count: 'exact', head: true })),
    count('open disputes', () => byStatus('disputes', 'open')),
    count('disputes under review', () => byStatus('disputes', 'under_review')),
    count('escalated disputes', () => byStatus('disputes', 'escalated')),
    count('disputes resolved with refund', () => byStatus('disputes', 'resolved_refund')),
    count('disputes denied', () => byStatus('disputes', 'resolved_denied')),
    refundTotals(signal),
    recentStrikes(signal),
  ]);

  return {
    sellers: {
      activeStores,
      suspendedStores,
      applicationsPending,
      applicationsUnderReview,
      applicationsApproved,
      applicationsRejected,
    },
    protection: {
      openDisputes,
      underReviewDisputes,
      escalatedDisputes,
      resolvedWithRefund,
      resolvedDenied,
      refundsCount: refunds.count,
      refundsTotal: refunds.total,
    },
    totalStrikes,
    recentStrikes: recent,
  };
}
