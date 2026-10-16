import { supabase } from '../../../lib/supabase';

/**
 * The two public inboxes (migration 20261015000000): the footer newsletter
 * and the contact page write here for real. Both tables are insert-only for
 * the public — a successful call means the row was stored; there is no read
 * path, by policy design.
 *
 * Field caps: these inboxes accept anonymous inserts, so every
 * field is length-capped here AND by CHECK constraints in migration
 * 20261016020000 — the client cap gives the visitor a readable error, the
 * database cap stops a script that skips the client entirely.
 */
export const PUBLIC_FORM_LIMITS = {
  name: 120,
  email: 254,
  topic: 80,
  orderRef: 64,
  message: 4000,
} as const;

function overLimit(field: string, value: string, max: number): string | null {
  return value.length > max ? `${field} must be ${max} characters or fewer.` : null;
}

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
  const emailError = overLimit('Email', trimmed, PUBLIC_FORM_LIMITS.email);
  if (emailError) throw new Error(emailError);

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
  const name = input.name.trim();
  const email = input.email.trim();
  const orderRef = input.orderRef?.trim() ? input.orderRef.trim() : null;
  const message = input.message.trim();

  const limitError =
    overLimit('Name', name, PUBLIC_FORM_LIMITS.name) ??
    overLimit('Email', email, PUBLIC_FORM_LIMITS.email) ??
    overLimit('Topic', input.topic, PUBLIC_FORM_LIMITS.topic) ??
    (orderRef ? overLimit('Order reference', orderRef, PUBLIC_FORM_LIMITS.orderRef) : null) ??
    overLimit('Message', message, PUBLIC_FORM_LIMITS.message);
  if (limitError) throw new Error(limitError);

  const { error } = await supabase.from('contact_messages').insert({
    name,
    email,
    topic: input.topic,
    order_ref: orderRef,
    message,
  });
  if (error) throw new Error(`Could not send your message: ${error.message}`);
}
