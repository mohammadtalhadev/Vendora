import { supabase } from '../../../lib/supabase';
import {
  asRecord,
  asRows,
  bool,
  num,
  optionalNum,
  rpcFailed,
  text,
} from './admin-client';

/** One row of the merchant queue. Money and risk come from the rows, not the page. */
export interface AdminVendorRow {
  id: string;
  storeName: string;
  slug: string;
  sellerType: 'platform' | 'vendor';
  status: 'active' | 'suspended';
  rating: number;
  reviewCount: number;
  commissionRate: number | null;
  joinedAt: string;
  gross: number;
  commission: number;
  net: number;
  packages: number;
  listings: number;
  pendingListings: number;
  balance: number;
  paidOut: number;
  strikes: number;
  openDisputes: number;
  tier: string;
  kyc: 'verified' | 'submitted' | 'rejected' | 'unverified';
}

export interface AdminVendorQueue {
  page: number;
  pageSize: number;
  total: number;
  /** Applicants who have no store row yet, so they are not in `rows`. */
  pending: number;
  suspended: number;
  rows: AdminVendorRow[];
}

export interface AdminVendorPackage {
  id: string;
  orderGroupId: string;
  status: string;
  type: string;
  gross: number;
  commission: number;
  net: number;
  createdAt: string;
  updatedAt: string;
  buyerEmail: string;
}

export interface AdminVendorStrike {
  id: string;
  reason: string;
  note: string | null;
  createdAt: string;
  issuedBy: string | null;
}

export interface AdminVendorPayout {
  id: string;
  amount: number;
  status: string;
  method: string;
  reference: string | null;
  createdAt: string;
}

export interface AdminVendorDetail {
  id: string;
  userId: string | null;
  storeName: string;
  slug: string;
  description: string;
  logo: string;
  banner: string | null;
  sellerType: 'platform' | 'vendor';
  status: 'active' | 'suspended';
  rating: number;
  reviewCount: number;
  commissionRate: number | null;
  joinedAt: string;
  email: string;
  name: string;
  vendorStatus: string;
  accountStatus: string;
  accountRoles: string[];
  gross: number;
  net: number;
  balance: number;
  reserve: number;
  paidOut: number;
  tier: string;
  payoutSchedule: string | null;
  packages: AdminVendorPackage[];
  strikes: AdminVendorStrike[];
  payouts: AdminVendorPayout[];
  bankAccounts: { id: string; holderName: string; bankName: string; maskedAccount: string; isDefault: boolean }[];
  disputes: {
    id: string;
    reason: string;
    status: string;
    urgency: string;
    createdAt: string;
    resolutionAmount: number | null;
  }[];
  applications: {
    id: string;
    status: string;
    businessType: string;
    contactEmail: string;
    createdAt: string;
    reviewNote: string | null;
  }[];
  auditTrail: {
    id: string;
    action: string;
    actorRole: string;
    createdAt: string;
    before: unknown;
    after: unknown;
    actor: string | null;
  }[];
}

const str = (value: unknown) => text(value);

function mapRow(row: Record<string, unknown>): AdminVendorRow {
  return {
    id: str(row.id),
    storeName: str(row.storeName),
    slug: str(row.slug),
    sellerType: row.sellerType === 'platform' ? 'platform' : 'vendor',
    status: row.status === 'suspended' ? 'suspended' : 'active',
    rating: num(row.rating),
    reviewCount: num(row.reviewCount),
    commissionRate: optionalNum(row.commissionRate),
    joinedAt: str(row.joinedAt),
    gross: num(row.gross),
    commission: num(row.commission),
    net: num(row.net),
    packages: num(row.packages),
    listings: num(row.listings),
    pendingListings: num(row.pendingListings),
    balance: num(row.balance),
    paidOut: num(row.paidOut),
    strikes: num(row.strikes),
    openDisputes: num(row.openDisputes),
    tier: str(row.tier),
    kyc: (['verified', 'submitted', 'rejected'] as const).includes(row.kyc as never)
      ? (row.kyc as AdminVendorRow['kyc'])
      : 'unverified',
  };
}

function mapQueue(value: unknown): AdminVendorQueue {
  const root = asRecord(value);
  return {
    page: num(root.page),
    pageSize: num(root.pageSize),
    total: num(root.total),
    pending: num(root.pending),
    suspended: num(root.suspended),
    rows: asRows(root.rows).map(mapRow),
  };
}

/** The merchant queue: filter and paging are done in SQL, so the total is the table's. */
export async function fetchVendorQueue(
  params: { status?: string; search?: string; page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<AdminVendorQueue> {
  let query = supabase.rpc('admin_vendor_queue', {
    p_status: params.status ?? 'all',
    p_search: params.search ?? '',
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 12,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load merchants', error.message);
  return mapQueue(data);
}

function mapDetail(value: unknown): AdminVendorDetail {
  const root = asRecord(value);
  return {
    id: str(root.id),
    userId: root.userId === null || root.userId === undefined ? null : str(root.userId),
    storeName: str(root.storeName),
    slug: str(root.slug),
    description: str(root.description),
    logo: str(root.logo),
    banner: root.banner === null || root.banner === undefined ? null : str(root.banner),
    sellerType: root.sellerType === 'platform' ? 'platform' : 'vendor',
    status: root.status === 'suspended' ? 'suspended' : 'active',
    rating: num(root.rating),
    reviewCount: num(root.reviewCount),
    commissionRate: optionalNum(root.commissionRate),
    joinedAt: str(root.joinedAt),
    email: str(root.email),
    name: str(root.name),
    vendorStatus: str(root.vendorStatus),
    accountStatus: str(root.accountStatus),
    accountRoles: Array.isArray(root.roles) ? root.roles.map(str) : [],
    gross: num(root.gross),
    net: num(root.net),
    balance: num(root.balance),
    reserve: num(root.reserve),
    paidOut: num(root.paidOut),
    tier: str(root.tier),
    payoutSchedule:
      root.payoutSchedule === null || root.payoutSchedule === undefined
        ? null
        : str(root.payoutSchedule),
    packages: asRows(root.packages).map((row) => ({
      id: str(row.id),
      orderGroupId: str(row.orderGroupId),
      status: str(row.status),
      type: str(row.type),
      gross: num(row.gross),
      commission: num(row.commission),
      net: num(row.net),
      createdAt: str(row.createdAt),
      updatedAt: str(row.updatedAt),
      buyerEmail: str(row.buyerEmail),
    })),
    strikes: asRows(root.strikes).map((row) => ({
      id: str(row.id),
      reason: str(row.reason),
      note: row.note === null || row.note === undefined ? null : str(row.note),
      createdAt: str(row.createdAt),
      issuedBy: row.issuedBy === null || row.issuedBy === undefined ? null : str(row.issuedBy),
    })),
    payouts: asRows(root.payouts).map((row) => ({
      id: str(row.id),
      amount: num(row.amount),
      status: str(row.status),
      method: str(row.method),
      reference: row.reference === null || row.reference === undefined ? null : str(row.reference),
      createdAt: str(row.createdAt),
    })),
    bankAccounts: asRows(root.bankAccounts).map((row) => ({
      id: str(row.id),
      holderName: str(row.holderName),
      bankName: str(row.bankName),
      maskedAccount: str(row.maskedAccount),
      isDefault: bool(row.isDefault),
    })),
    disputes: asRows(root.disputes).map((row) => ({
      id: str(row.id),
      reason: str(row.reason),
      status: str(row.status),
      urgency: str(row.urgency),
      createdAt: str(row.createdAt),
      resolutionAmount: optionalNum(row.resolutionAmount),
    })),
    applications: asRows(root.applications).map((row) => ({
      id: str(row.id),
      status: str(row.status),
      businessType: str(row.businessType),
      contactEmail: str(row.contactEmail),
      createdAt: str(row.createdAt),
      reviewNote:
        row.reviewNote === null || row.reviewNote === undefined ? null : str(row.reviewNote),
    })),
    auditTrail: asRows(root.auditTrail).map((row) => ({
      id: str(row.id),
      action: str(row.action),
      actorRole: str(row.actorRole),
      createdAt: str(row.createdAt),
      before: row.before,
      after: row.after,
      actor: row.actor === null || row.actor === undefined ? null : str(row.actor),
    })),
  };
}

/**
 * One store's dossier. `admin_vendor_detail` raises when the id is unknown, so an
 * admin pointing at another store's record gets a failure, not a near-miss profile.
 */
export async function fetchVendorDetail(
  vendorId: string,
  signal?: AbortSignal,
): Promise<AdminVendorDetail> {
  let query = supabase.rpc('admin_vendor_detail', { p_vendor_id: vendorId });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load this merchant', error.message);
  return mapDetail(data);
}

/** Suspends or restores a store; the owning account's standing follows in SQL. */
export async function setVendorStatus(
  vendorId: string,
  status: 'active' | 'suspended',
  note?: string,
): Promise<{ id: string; status: string }> {
  const { data, error } = await supabase.rpc('admin_set_vendor_status', {
    p_vendor_id: vendorId,
    p_status: status,
    p_note: note ?? null,
  });
  if (error) throw rpcFailed(`Could not mark this store ${status}`, error.message);
  return asRecord(data) as { id: string; status: string };
}

/** `null` clears the override, which returns the store to the platform default. */
export async function setVendorCommission(
  vendorId: string,
  rate: number | null,
): Promise<{ id: string; rate: number | null }> {
  // An omitted argument and an explicit NULL both reach Postgres as NULL, which is
  // what "no override" means; the generated arg type only admits a number, so the
  // null is carried through it instead of being turned into a rate nobody set.
  const { data, error } = await supabase.rpc('admin_set_vendor_commission', {
    p_vendor_id: vendorId,
    p_rate: rate as number,
  });
  if (error) throw rpcFailed('Could not set the commission rate', error.message);
  return asRecord(data) as { id: string; rate: number | null };
}

export async function issueStrike(
  vendorId: string,
  reason: string,
  note?: string,
): Promise<{ vendorId: string; strikes: number }> {
  const { data, error } = await supabase.rpc('admin_issue_strike', {
    p_vendor_id: vendorId,
    p_reason: reason,
    p_note: note ?? null,
  });
  if (error) throw rpcFailed('Could not record the strike', error.message);
  return {
    vendorId: text(asRecord(data).vendorId),
    strikes: num(asRecord(data).strikes),
  };
}

/** Approval of a seller application - the existing RPC also opens the store row. */
export async function reviewApplication(
  applicationId: string,
  decision: 'approved' | 'rejected' | 'under_review',
  note?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('review_vendor_application', {
    p_application_id: applicationId,
    p_decision: decision,
    p_note: note ?? null,
  });
  if (error) throw rpcFailed(`Could not mark this application ${decision}`, error.message);
  return bool(data);
}
