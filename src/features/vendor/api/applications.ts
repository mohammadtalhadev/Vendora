import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import type { Json } from '../../../types/database';

type ApplicationInsert = Database['public']['Tables']['vendor_applications']['Insert'];

export interface VendorApplicationInput {
  proposedStoreName: string;
  proposedSlug: string;
  description?: string;
  businessType?: string;
  contactEmail: string;
  contactPhone?: string;
  businessAddress?: Record<string, unknown>;
  kycDocuments?: Record<string, unknown>;
  policyAccepted?: boolean;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VendorApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

/** One of the signed-in applicant's own `vendor_applications` rows. */
export interface MyVendorApplication {
  id: string;
  proposedStoreName: string;
  proposedSlug: string;
  businessType: string;
  status: VendorApplicationStatus;
  /** The reviewer's note (the table's `review_note` column); set on a decision. */
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The caller's own applications, newest first. The `applications_select_own`
 * RLS policy already scopes selects to `user_id = auth.uid()`; the explicit
 * filter keeps the query honest if a staff account (which can read more)
 * ever lands on the tracking page.
 */
export async function fetchMyApplications(userId: string): Promise<MyVendorApplication[]> {
  const { data, error } = await supabase
    .from('vendor_applications')
    .select(
      'id, proposed_store_name, proposed_slug, business_type, status, review_note, reviewed_at, created_at, updated_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load your applications: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    proposedStoreName: row.proposed_store_name,
    proposedSlug: row.proposed_slug,
    businessType: row.business_type,
    status: row.status,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Submit a seller application to `vendor_applications` (the typed replacement for the
 * legacy service-layer writer, which inserted a non-existent `slug` column and so
 * failed silently against the real schema).
 *
 * The caller supplies the applicant's id from the app's auth state — the same
 * contract the legacy writer had. Only a real auth UUID can own a row (the
 * `applications_insert_own` policy requires user_id = auth.uid()), so a
 * non-UUID local/demo identity degrades to null instead of crashing the
 * insert, as the legacy writer did. Unlike the legacy writer, a database
 * rejection throws so the form can surface it instead of reporting success.
 */
export async function submitVendorApplication(
  input: VendorApplicationInput,
  userId?: string | null,
): Promise<{ id: string }> {
  const row: ApplicationInsert = {
    user_id: userId && UUID_PATTERN.test(userId) ? userId : null,
    proposed_store_name: input.proposedStoreName,
    proposed_slug: input.proposedSlug,
    description: input.description ?? '',
    business_type: input.businessType ?? 'General Retail',
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone ?? null,
    business_address: (input.businessAddress ?? null) as Json,
    kyc_documents: (input.kycDocuments ?? null) as Json,
    policy_accepted: input.policyAccepted ?? true,
    status: 'pending',
  };

  const { data, error } = await supabase
    .from('vendor_applications')
    .insert(row)
    .select('id')
    .single();
  if (error) throw new Error(`Could not submit your application: ${error.message}`);
  return { id: data.id };
}
