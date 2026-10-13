import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import type { AddressType, AddressUpdates, NewAddressInput, UserSavedAddress } from '../types';

type AddressRow = Database['public']['Tables']['user_addresses']['Row'];
type AddressInsert = Database['public']['Tables']['user_addresses']['Insert'];
type AddressUpdate = Database['public']['Tables']['user_addresses']['Update'];

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not read your session: ${error.message}`);
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in to manage your saved addresses.');
  return userId;
}

function mapAddress(row: AddressRow): UserSavedAddress {
  return {
    id: row.id,
    type: (row.type as AddressType) ?? 'home',
    label: row.label,
    fullName: row.full_name,
    phone: row.phone,
    street: row.street,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    country: row.country,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

/** The caller's own addresses, oldest first - the order default promotion reads. */
export async function fetchAddresses(signal?: AbortSignal): Promise<UserSavedAddress[]> {
  const userId = await requireUserId();

  let query = supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your addresses: ${error.message}`);
  return (data ?? []).map(mapAddress);
}

/**
 * Clears the caller's current default. The partial unique index
 * (`user_addresses_one_default_per_user`) forbids two defaults even transiently, so
 * every "make this the default" path unsets first and sets second.
 */
async function clearDefaultAddress(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_addresses')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
  if (error) throw new Error(`Could not update your default address: ${error.message}`);
}

export async function createAddress(input: NewAddressInput): Promise<UserSavedAddress> {
  const userId = await requireUserId();

  // The first address a customer saves is the one checkout should reach for.
  const existing = await fetchAddresses();
  const isDefault = input.isDefault || existing.length === 0;
  if (isDefault) await clearDefaultAddress(userId);

  const insert: AddressInsert = {
    user_id: userId,
    type: input.type,
    label: input.label,
    full_name: input.fullName,
    phone: input.phone,
    street: input.street,
    city: input.city,
    state: input.state,
    zip_code: input.zipCode,
    country: input.country,
    is_default: isDefault,
  };
  const { data, error } = await supabase.from('user_addresses').insert(insert).select('*').single();
  if (error) throw new Error(`Could not save this address: ${error.message}`);
  return mapAddress(data);
}

export async function updateAddress(id: string, updates: AddressUpdates): Promise<void> {
  const userId = await requireUserId();

  if (updates.isDefault) await clearDefaultAddress(userId);

  const patch: AddressUpdate = {};
  if (updates.type !== undefined) patch.type = updates.type;
  if (updates.label !== undefined) patch.label = updates.label;
  if (updates.fullName !== undefined) patch.full_name = updates.fullName;
  if (updates.phone !== undefined) patch.phone = updates.phone;
  if (updates.street !== undefined) patch.street = updates.street;
  if (updates.city !== undefined) patch.city = updates.city;
  if (updates.state !== undefined) patch.state = updates.state;
  if (updates.zipCode !== undefined) patch.zip_code = updates.zipCode;
  if (updates.country !== undefined) patch.country = updates.country;
  if (updates.isDefault !== undefined) patch.is_default = updates.isDefault;

  const { error } = await supabase
    .from('user_addresses')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(`Could not update this address: ${error.message}`);
}

export async function deleteAddress(id: string): Promise<void> {
  const userId = await requireUserId();

  const before = await fetchAddresses();
  const removed = before.find((address) => address.id === id);

  const { error } = await supabase
    .from('user_addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(`Could not delete this address: ${error.message}`);

  // Deleting the default hands the flag to the oldest remaining address, so the
  // book never sits without one while it still has rows.
  if (removed?.isDefault) {
    const next = before.find((address) => address.id !== id);
    if (next) {
      const { error: promoteError } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', next.id)
        .eq('user_id', userId);
      if (promoteError) throw new Error(`Could not update your default address: ${promoteError.message}`);
    }
  }
}

export async function setDefaultAddress(id: string): Promise<void> {
  const userId = await requireUserId();

  await clearDefaultAddress(userId);
  const { error } = await supabase
    .from('user_addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(`Could not update your default address: ${error.message}`);
}
