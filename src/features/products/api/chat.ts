import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';

type ThreadRow = Database['public']['Tables']['message_threads']['Row'];
type MessageRow = Database['public']['Tables']['messages']['Row'];

export interface ChatMessage {
  id: string;
  senderRole: 'customer' | 'vendor' | 'support';
  senderName: string;
  body: string;
  createdAt: string;
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

/**
 * Customer-side product chat, backed by the real `message_threads` / `messages`
 * tables (replaces the legacy service-layer chat writer, which wrote columns
 * that do not exist in this schema, and the modal's old habit of fabricating a
 * seller reply locally and persisting it as if the seller had written it).
 *
 * RLS does the policing: a customer may create a thread only as themselves
 * (threads_insert_customer) and post only to threads they participate in
 * (messages_insert_party).
 */
export async function findOrCreateProductThread(input: {
  vendorId: string;
  customerName: string;
  productRef: string;
}): Promise<{ id: string }> {
  const { data: sessionData, error: authError } = await supabase.auth.getSession();
  if (authError) throw new Error(`Could not read your session: ${authError.message}`);
  const user = sessionData.session?.user;
  if (!user) throw new Error('You must be signed in to message a seller.');

  const { data: existing, error: findError } = await supabase
    .from('message_threads')
    .select('id')
    .eq('customer_id', user.id)
    .eq('vendor_id', input.vendorId)
    .eq('product_ref', input.productRef)
    .eq('channel', 'product_question')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw new Error(`Could not open the conversation: ${findError.message}`);
  if (existing) return { id: (existing as Pick<ThreadRow, 'id'>).id };

  const { data, error } = await supabase
    .from('message_threads')
    .insert({
      vendor_id: input.vendorId,
      customer_id: user.id,
      customer_name: input.customerName,
      channel: 'product_question',
      product_ref: input.productRef,
      status: 'open',
    })
    .select('id')
    .single();
  if (error) throw new Error(`Could not start the conversation: ${error.message}`);
  return { id: (data as Pick<ThreadRow, 'id'>).id };
}

export async function fetchChatMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, thread_id, sender_id, sender_role, sender_name, body, attachments, read, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Could not load messages: ${error.message}`);
  return ((data ?? []) as MessageRow[]).map(mapMessage);
}

export async function sendChatMessage(input: {
  threadId: string;
  senderName: string;
  body: string;
}): Promise<ChatMessage> {
  const { data: sessionData, error: authError } = await supabase.auth.getSession();
  if (authError) throw new Error(`Could not read your session: ${authError.message}`);
  const user = sessionData.session?.user;
  if (!user) throw new Error('You must be signed in to message a seller.');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id: input.threadId,
      sender_id: user.id,
      sender_role: 'customer',
      sender_name: input.senderName,
      body: input.body,
      read: false,
    })
    .select('id, thread_id, sender_id, sender_role, sender_name, body, attachments, read, created_at')
    .single();
  if (error) throw new Error(`Could not send your message: ${error.message}`);
  return mapMessage(data as MessageRow);
}
