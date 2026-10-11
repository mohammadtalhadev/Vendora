import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { asRecord, asRows, num, optionalNum, requireVendorId, rpcFailed, text } from './vendor-client';

type PayoutRow = Database['public']['Tables']['payouts']['Row'];
type BankRow = Database['public']['Tables']['bank_accounts']['Row'];

/** The Payouts page header: what has been earned, what has left, what may leave now. */
export interface VendorBalance {
  vendorId: string;
  lifetimeNet: number;
  paidOut: number;
  reserve: number;
  available: number;
  pendingPayouts: number;
}

export interface EarningsTotals {
  gross: number;
  /** Goods only - the commission is taken on this, not on freight. */
  subtotal: number;
  shipping: number;
  fees: number;
  net: number;
  packages: number;
  settled: number;
  processing: number;
}

export interface EarningsMonth {
  month: string;
  gross: number;
  net: number;
  packages: number;
}

export interface LedgerRow {
  id: string;
  status: string;
  type: 'physical' | 'digital';
  subtotal: number;
  shipping: number;
  gross: number;
  fees: number;
  net: number;
  settledAt: string;
}

export interface VendorEarnings {
  totals: EarningsTotals;
  months: EarningsMonth[];
  ledger: LedgerRow[];
}

export interface VendorPayout {
  id: string;
  amount: number;
  currency: string;
  status: 'processing' | 'completed' | 'failed';
  method: string;
  reference?: string;
  fee: number;
  deposit: number;
  balanceAfter?: number;
  createdAt: string;
}

export interface VendorBankAccount {
  id: string;
  holderName: string;
  bankName: string;
  /** Last digits only; a full account number is never stored, so it can never leak. */
  maskedAccount: string;
  maskedRouting?: string;
  accountType: string;
  isDefault: boolean;
  createdAt: string;
}

export interface PayoutReceipt {
  payoutId: string;
  reference: string;
  amount: number;
  fee: number;
  deposit: number;
}

function mapBalance(payload: unknown): VendorBalance {
  const row = asRecord(payload);
  return {
    vendorId: text(row.vendorId),
    lifetimeNet: num(row.lifetimeNet),
    paidOut: num(row.paidOut),
    reserve: num(row.reserve),
    available: num(row.available),
    pendingPayouts: num(row.pendingPayouts),
  };
}

export async function fetchVendorBalance(signal?: AbortSignal): Promise<VendorBalance> {
  let query = supabase.rpc('vendor_balance');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load your balance', error.message);
  return mapBalance(data);
}

function mapEarnings(payload: unknown): VendorEarnings {
  const root = asRecord(payload);
  const totals = asRecord(root.totals);
  return {
    totals: {
      gross: num(totals.gross),
      subtotal: num(totals.subtotal),
      shipping: num(totals.shipping),
      fees: num(totals.fees),
      net: num(totals.net),
      packages: num(totals.packages),
      settled: num(totals.settled),
      processing: num(totals.processing),
    },
    months: asRows(root.months).map((row) => ({
      month: text(row.month),
      gross: num(row.gross),
      net: num(row.net),
      packages: num(row.packages),
    })),
    ledger: asRows(root.ledger).map((row) => ({
      id: text(row.id),
      status: text(row.status),
      type: row.type === 'digital' ? 'digital' : 'physical',
      subtotal: num(row.subtotal),
      shipping: num(row.shipping),
      gross: num(row.gross),
      fees: num(row.fees),
      net: num(row.net),
      settledAt: text(row.settledAt),
    })),
  };
}

/**
 * The earnings ledger and the monthly series, computed from the same columns a payout is
 * settled against. `net = subtotal - fees`; freight is reported apart because it never
 * enters the payout.
 *
 * @param months how many calendar months of history to return (clamped 1..24 in SQL).
 */
export async function fetchVendorEarnings(
  months = 6,
  signal?: AbortSignal,
): Promise<VendorEarnings> {
  let query = supabase.rpc('vendor_earnings', { p_months: months });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load your earnings', error.message);
  return mapEarnings(data);
}

function mapPayout(row: PayoutRow): VendorPayout {
  const meta = asRecord(row.metadata);
  return {
    id: row.id,
    amount: num(row.amount),
    currency: row.currency,
    status: row.status,
    method: row.payment_method,
    reference: row.payment_reference ?? undefined,
    fee: num(meta.fee),
    deposit: optionalNum(meta.deposit) ?? num(row.amount) - num(meta.fee),
    balanceAfter: optionalNum(meta.balanceAfter),
    createdAt: row.created_at,
  };
}

export async function fetchPayoutHistory(limit = 40, signal?: AbortSignal): Promise<VendorPayout[]> {
  const vendorId = await requireVendorId();
  let query = supabase
    .from('payouts')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your payouts: ${error.message}`);
  return ((data ?? []) as unknown as PayoutRow[]).map(mapPayout);
}

/**
 * Asks the platform to move money out. The database re-checks the available balance and
 * charges the instant-transfer fee, so the receipt is what was actually booked.
 */
export async function requestPayout(
  amount: number,
  method: 'instant' | 'standard' = 'instant',
): Promise<PayoutReceipt> {
  const { data, error } = await supabase.rpc('request_payout', {
    p_amount: amount,
    p_method: method,
  });
  if (error) throw rpcFailed('Could not request this payout', error.message);
  const row = asRecord(data);
  return {
    payoutId: text(row.payoutId),
    reference: text(row.reference),
    amount: num(row.amount),
    fee: num(row.fee),
    deposit: num(row.deposit),
  };
}

function mapBank(row: BankRow): VendorBankAccount {
  return {
    id: row.id,
    holderName: row.holder_name,
    bankName: row.bank_name,
    maskedAccount: row.masked_account,
    maskedRouting: row.masked_routing ?? undefined,
    accountType: row.account_type,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

export async function fetchBankAccounts(signal?: AbortSignal): Promise<VendorBankAccount[]> {
  const vendorId = await requireVendorId();
  let query = supabase
    .from('bank_accounts')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('is_default', { ascending: false })
    .order('created_at');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your payout accounts: ${error.message}`);
  return ((data ?? []) as unknown as BankRow[]).map(mapBank);
}

/**
 * Adds a destination. Only masked digits are kept: `bank_insert_vendor` scopes the row to
 * the caller's store, so a forged `vendorId` in the payload is not the authority here.
 */
export async function addBankAccount(input: {
  holderName: string;
  bankName: string;
  maskedAccount: string;
  maskedRouting?: string;
  accountType?: string;
}): Promise<VendorBankAccount> {
  const vendorId = await requireVendorId();

  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      vendor_id: vendorId,
      holder_name: input.holderName,
      bank_name: input.bankName,
      masked_account: input.maskedAccount,
      masked_routing: input.maskedRouting ?? null,
      account_type: input.accountType ?? 'checking',
    })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to add the payout account: ${error.message}`);
  return mapBank(data as unknown as BankRow);
}

export async function removeBankAccount(bankAccountId: string): Promise<void> {
  const vendorId = await requireVendorId();
  const { error } = await supabase
    .from('bank_accounts')
    .delete()
    .eq('id', bankAccountId)
    .eq('vendor_id', vendorId);
  if (error) throw new Error(`Failed to remove the payout account: ${error.message}`);
}

/** One default per store; the RPC clears the others in the same transaction. */
export async function setDefaultBankAccount(bankAccountId: string): Promise<VendorBankAccount[]> {
  const { error } = await supabase.rpc('set_default_bank_account', {
    p_bank_account_id: bankAccountId,
  });
  if (error) throw rpcFailed('Could not set the default payout account', error.message);
  return fetchBankAccounts();
}
