import { supabase } from '../../../lib/supabase';

/**
 * The two public inboxes (migration 20261015000000): the footer newsletter
 * and the contact page write here for real. Both tables are insert-only for
 * the public — a successful call means the row was stored; there is no read
 * path, by policy design.
 */

export type SubscribeResult = 'subscribed' | 'already-subscribed';

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '23505' ||
    (error.message ?? '').toLowerCase().includes('duplicate key value')
  );
}

/** Stores a newsletter signup. A repeat address is a friendly outcome, not an error. */
export async function subscribeToNewsletter(email: string): Promise<SubscribeResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error('Enter an email address to subscribe.');

  const { error } = await supabase.from('newsletter_subscribers').insert({ email: trimmed });
  if (error) {
    if (isUniqueViolation(error)) return 'already-subscribed';
    throw new Error(`Could not subscribe you: ${error.message}`);
  }
  return 'subscribed';
}

export interface ContactMessageInput {
  name: string;
  email: string;
  topic: string;
  orderRef?: string;
  message: string;
}

/** Stores one contact-page message in the contact_messages inbox. */
export async function sendContactMessage(input: ContactMessageInput): Promise<void> {
  const { error } = await supabase.from('contact_messages').insert({
    name: input.name.trim(),
    email: input.email.trim(),
    topic: input.topic,
    order_ref: input.orderRef?.trim() ? input.orderRef.trim() : null,
    message: input.message.trim(),
  });
  if (error) throw new Error(`Could not send your message: ${error.message}`);
}
