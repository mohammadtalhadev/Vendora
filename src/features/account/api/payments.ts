import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import type { NewPaymentMethodInput, UserSavedPaymentMethod } from '../types';

type PaymentRow = Database['public']['Tables']['user_payment_methods']['Row'];
type PaymentInsert = Database['public']['Tables']['user_payment_methods']['Insert'];

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not read your session: ${error.message}`);
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in to manage your payment methods.');
  return userId;
}

function mapPaymentMethod(row: PaymentRow): UserSavedPaymentMethod {
  return {
    id: row.id,
    type: row.type === 'cod' ? 'cod' : 'card',
    brand: row.brand,
    cardholderName: row.cardholder_name ?? undefined,
    last4: row.last4 ?? undefined,
    expiryMonth: row.expiry_month ?? undefined,
    expiryYear: row.expiry_year ?? undefined,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

/** The caller's own saved payment methods, oldest first. Metadata only - see types.ts. */
export async function fetchPaymentMethods(signal?: AbortSignal): Promise<UserSavedPaymentMethod[]> {
  const userId = await requireUserId();

  let query = supabase
    .from('user_payment_methods')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your payment methods: ${error.message}`);
  return (data ?? []).map(mapPaymentMethod);
}

/** Same one-default discipline as the address book: unset first, then set. */
async function clearDefaultPaymentMethod(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_payment_methods')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
  if (error) throw new Error(`Could not update your default payment method: ${error.message}`);
}

export async function createPaymentMethod(input: NewPaymentMethodInput): Promise<UserSavedPaymentMethod> {
  const userId = await requireUserId();

  // The first method a customer saves becomes the one checkout reaches for.
  const existing = await fetchPaymentMethods();
  const isDefault = input.isDefault || existing.length === 0;
  if (isDefault) await clearDefaultPaymentMethod(userId);

  const insert: PaymentInsert = {
    user_id: userId,
    type: input.type,
    brand: input.brand,
    cardholder_name: input.cardholderName ?? null,
    last4: input.last4 ?? null,
    expiry_month: input.expiryMonth ?? null,
    expiry_year: input.expiryYear ?? null,
    is_default: isDefault,
  };
  const { data, error } = await supabase.from('user_payment_methods').insert(insert).select('*').single();
  if (error) throw new Error(`Could not save this payment method: ${error.message}`);
  return mapPaymentMethod(data);
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const userId = await requireUserId();

  const before = await fetchPaymentMethods();
  const removed = before.find((method) => method.id === id);

  const { error } = await supabase
    .from('user_payment_methods')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(`Could not delete this payment method: ${error.message}`);

  // Deleting the default hands the flag to the oldest remaining method.
  if (removed?.isDefault) {
    const next = before.find((method) => method.id !== id);
    if (next) {
      const { error: promoteError } = await supabase
        .from('user_payment_methods')
        .update({ is_default: true })
        .eq('id', next.id)
        .eq('user_id', userId);
      if (promoteError) throw new Error(`Could not update your default payment method: ${promoteError.message}`);
    }
  }
}

export async function setDefaultPaymentMethod(id: string): Promise<void> {
  const userId = await requireUserId();

  await clearDefaultPaymentMethod(userId);
  const { error } = await supabase
    .from('user_payment_methods')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(`Could not update your default payment method: ${error.message}`);
}
