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
