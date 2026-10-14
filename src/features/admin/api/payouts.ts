import { supabase } from '../../../lib/supabase';
import { asRecord, num, text } from './admin-client';

/**
 * Admin payouts (Admin → Payouts). Vendors request payouts through
 * `request_payout`, which books a `processing` row; releasing the money is
 * an admin act recorded by moving the row to `completed` (or `failed`),
 * which `payouts_write_admin` permits and the `payouts_notify` trigger
 * announces to the vendor. There is deliberately no other write path here.
 */
export type AdminPayoutStatus = 'processing' | 'completed' | 'failed';

export interface AdminPayout {
  id: string;
  vendorId: string;
  storeName: string;
  storeSlug: string;
  amount: number;
  status: AdminPayoutStatus;
  method: string;
  reference?: string;
  fee?: number;
  createdAt: string;
  updatedAt: string;
}

interface PayoutRow {
  id: string;
  vendor_id: string;
  amount: number | string;
  status: string;
  payment_method: string;
  payment_reference: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  vendor?: { store_name?: string; slug?: string } | null;
}

function mapPayout(row: PayoutRow): AdminPayout {
  const meta = asRecord(row.metadata);
  const fee = meta.fee === null || meta.fee === undefined ? undefined : num(meta.fee);
  return {
    id: row.id,
    vendorId: row.vendor_id,
    storeName: row.vendor?.store_name ?? 'Unknown store',
    storeSlug: row.vendor?.slug ?? '',
    amount: num(row.amount),
    status: (row.status === 'completed' || row.status === 'failed'
      ? row.status
      : 'processing') as AdminPayoutStatus,
    method: text(row.payment_method),
    reference: row.payment_reference ?? undefined,
    fee,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchAdminPayouts(signal?: AbortSignal): Promise<AdminPayout[]> {
  let query = supabase
    .from('payouts')
    .select(
      'id, vendor_id, amount, status, payment_method, payment_reference, metadata, created_at, updated_at, vendor:vendor_profiles(store_name, slug)',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load payouts: ${error.message}`);
  return ((data ?? []) as unknown as PayoutRow[]).map(mapPayout);
}

/**
 * Records the outcome of a payout. `reference` is the bank/processor
 * reference for a completed payout; pass it whenever the money moved so the
 * vendor's notification and history can quote it.
 */
export async function setPayoutStatus(
  payoutId: string,
  status: Exclude<AdminPayoutStatus, 'processing'>,
  reference?: string,
): Promise<void> {
  const patch: { status: AdminPayoutStatus; payment_reference?: string } = { status };
  if (reference !== undefined && reference.trim() !== '') {
    patch.payment_reference = reference.trim();
  }
  const { error } = await supabase.from('payouts').update(patch).eq('id', payoutId);
  if (error) throw new Error(`Could not update the payout: ${error.message}`);
}
