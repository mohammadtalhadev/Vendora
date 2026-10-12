import { supabase } from '../../../lib/supabase';
import { requireUserId, rpcFailed, text } from './support-client';

/**
 * A template the desk keeps for itself. `agent_id` is the author: staff read every template,
 * only the author edits or removes theirs, which is what the table's policies enforce.
 */
export interface CannedResponse {
  id: string;
  agentId: string;
  subject: string;
  body: string;
  category: string | null;
  createdAt: string;
}

function map(row: Record<string, unknown>): CannedResponse {
  return {
    id: text(row.id),
    agentId: text(row.agent_id),
    subject: text(row.subject),
    body: text(row.body),
    category: row.category === null || row.category === undefined ? null : text(row.category),
    createdAt: text(row.created_at),
  };
}

export async function fetchCannedResponses(
  params: { category?: string | null } = {},
  signal?: AbortSignal,
): Promise<CannedResponse[]> {
  let query = supabase
    .from('canned_responses')
    .select('id, agent_id, subject, body, category, created_at')
    .order('created_at', { ascending: false });
  if (params.category) query = query.eq('category', params.category);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Could not load the template library', error.message);
  return (data ?? []).map((row) => map(row as Record<string, unknown>));
}

export async function createCannedResponse(input: {
  subject: string;
  body: string;
  category?: string | null;
}): Promise<CannedResponse> {
  const agentId = await requireUserId();
  const { data, error } = await supabase
    .from('canned_responses')
    .insert({ agent_id: agentId, subject: input.subject, body: input.body, category: input.category ?? null })
    .select('id, agent_id, subject, body, category, created_at')
    .single();
  if (error || !data) throw rpcFailed('Could not save that template', error?.message ?? 'no row returned');
  return map(data as Record<string, unknown>);
}

export async function updateCannedResponse(
  id: string,
  input: { subject: string; body: string; category?: string | null },
): Promise<void> {
  // No `agent_id` in the filter would let the author's own policy pass on any row they own;
  // the update is scoped to the row and RLS refuses anyone else's.
  const { error } = await supabase
    .from('canned_responses')
    .update({ subject: input.subject, body: input.body, category: input.category ?? null })
    .eq('id', id);
  if (error) throw rpcFailed('Could not update that template', error.message);
}

export async function deleteCannedResponse(id: string): Promise<void> {
  const { error } = await supabase.from('canned_responses').delete().eq('id', id);
  if (error) throw rpcFailed('Could not delete that template', error.message);
}
