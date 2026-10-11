import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { asStringList, requireUserId, requireVendorId, text } from './vendor-client';

type ThreadRow = Database['public']['Tables']['message_threads']['Row'];
type MessageRow = Database['public']['Tables']['messages']['Row'];

export type ThreadChannel = ThreadRow['channel'];
export type ThreadStatus = ThreadRow['status'];

export interface VendorThread {
  id: string;
  customerId?: string;
  customerName: string;
  channel: ThreadChannel;
  orderRef?: string;
  productRef?: string;
  status: ThreadStatus;
  createdAt: string;
  updatedAt: string;
}

/** With the newest message and the buyer's unread count, so the list needs one screen-worth of rows. */
export interface VendorThreadSummary extends VendorThread {
  lastMessage?: VendorMessage;
  unreadCount: number;
}

export interface VendorMessage {
  id: string;
  threadId: string;
  senderRole: 'customer' | 'vendor' | 'support';
  senderName: string;
  body: string;
  read: boolean;
  attachments: string[];
  createdAt: string;
}

function mapThread(row: ThreadRow): VendorThread {
  return {
    id: row.id,
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_name,
    channel: row.channel,
    orderRef: row.order_ref ?? undefined,
    productRef: row.product_ref ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: MessageRow): VendorMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    body: row.body,
    read: row.read,
    attachments: asStringList(row.attachments),
    createdAt: row.created_at,
  };
}

/**
 * Threads for this store, each summarised from its own messages. Two reads rather than a
 * filtered aggregate embed, because the preview and the unread badge want different
 * slices of the same rows.
 */
export async function fetchVendorThreads(signal?: AbortSignal): Promise<VendorThreadSummary[]> {
  const vendorId = await requireVendorId();

  let threadsQuery = supabase
    .from('message_threads')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('updated_at', { ascending: false });
  if (signal) threadsQuery = threadsQuery.abortSignal(signal);

  const { data: threadRows, error: threadsError } = await threadsQuery;
  if (threadsError) throw new Error(`Failed to load your conversations: ${threadsError.message}`);

  const threads = ((threadRows ?? []) as unknown as ThreadRow[]).map(mapThread);
  if (threads.length === 0) return [];

  let messagesQuery = supabase
    .from('messages')
    .select('*')
    .in('thread_id', threads.map((thread) => thread.id))
    .order('created_at', { ascending: true });
  if (signal) messagesQuery = messagesQuery.abortSignal(signal);

  const { data: messageRows, error: messagesError } = await messagesQuery;
  if (messagesError) throw new Error(`Failed to load your messages: ${messagesError.message}`);

  const messages = ((messageRows ?? []) as unknown as MessageRow[]).map(mapMessage);
  return threads.map((thread) => {
    const ofThread = messages.filter((message) => message.threadId === thread.id);
    return {
      ...thread,
      lastMessage: ofThread[ofThread.length - 1],
      unreadCount: ofThread.filter((message) => !message.read && message.senderRole === 'customer')
        .length,
    };
  });
}

export async function fetchThreadMessages(
  threadId: string,
  signal?: AbortSignal,
): Promise<VendorMessage[]> {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load this conversation: ${error.message}`);
  return ((data ?? []) as unknown as MessageRow[]).map(mapMessage);
}

/**
 * Replies as the store. `sender_role` and `sender_name` are taken from the session's own
 * store row, because `messages_insert_party` only proves participation - it cannot tell
 * the database which name the browser wanted to wear.
 */
export async function sendThreadMessage(threadId: string, body: string): Promise<VendorMessage> {
  const [userId, vendorId] = [await requireUserId(), await requireVendorId()];

  const { data: store, error: storeError } = await supabase
    .from('vendor_profiles')
    .select('store_name')
    .eq('id', vendorId)
    .single();
  if (storeError) throw new Error(`Failed to load your store: ${storeError.message}`);

  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      sender_id: userId,
      sender_role: 'vendor',
      sender_name: text(store.store_name) || 'Store',
      body,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to send the message: ${error.message}`);
  return mapMessage(data as unknown as MessageRow);
}

/** Resolving or escalating a thread is a write to the thread row, which RLS allows its owner. */
export async function setThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
  const vendorId = await requireVendorId();
  const { data, error } = await supabase
    .from('message_threads')
    .update({ status })
    .eq('id', threadId)
    .eq('vendor_id', vendorId)
    .select('id');
  if (error) throw new Error(`Failed to update this conversation: ${error.message}`);
  if (!data || data.length === 0) throw new Error('This conversation is not yours to update.');
}

/** Clears the badge by marking the buyer's messages read; the store's own stay as they are. */
export async function markThreadRead(threadId: string): Promise<number> {
  const { data, error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('thread_id', threadId)
    .eq('sender_role', 'customer')
    .eq('read', false)
    .select('id');
  if (error) throw new Error(`Failed to mark this conversation read: ${error.message}`);
  return data?.length ?? 0;
}
