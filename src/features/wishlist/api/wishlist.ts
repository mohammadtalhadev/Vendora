import { supabase } from '../../../lib/supabase';
import type { Product } from '../../../types/domain';
import type { Database } from '../../../types/database';
import { PRODUCT_SELECT, isProductId, mapProduct, type ProductWithRefs } from '../../catalog/api/product-row';

type WishlistRow = Database['public']['Tables']['wishlist_items']['Row'];

type WishlistLine = WishlistRow & { product: ProductWithRefs | null };

const WISHLIST_SELECT = `id, product_id, created_at, product:products(${PRODUCT_SELECT})`;

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not read your session: ${error.message}`);
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in to save items.');
  return userId;
}

/** The signed-in customer's saved items, read live so price and stock cannot drift. */
export async function fetchWishlist(signal?: AbortSignal): Promise<Product[]> {
  await requireUserId();

  let query = supabase
    .from('wishlist_items')
    .select(WISHLIST_SELECT)
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your wishlist: ${error.message}`);

  const products: Product[] = [];
  for (const row of (data ?? []) as unknown as WishlistLine[]) {
    // A save made before the product left the marketplace can never be bought, so it has
    // no place on the shelf either.
    if (!row.product || row.product.status !== 'approved') continue;
    products.push(mapProduct(row.product));
  }
  return products;
}

export async function addWishlistItem(productId: string): Promise<void> {
  const user_id = await requireUserId();
  const { error } = await supabase
    .from('wishlist_items')
    .upsert({ user_id, product_id: productId }, { onConflict: 'user_id,product_id' });
  if (error) throw new Error(`Could not save this item: ${error.message}`);
}

export async function removeWishlistItem(productId: string): Promise<void> {
  const user_id = await requireUserId();
  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('user_id', user_id)
    .eq('product_id', productId);
  if (error) throw new Error(`Could not remove this item: ${error.message}`);
}

export async function clearServerWishlist(): Promise<void> {
  const user_id = await requireUserId();
  const { error } = await supabase.from('wishlist_items').delete().eq('user_id', user_id);
  if (error) throw new Error(`Could not clear your wishlist: ${error.message}`);
}

/**
 * Replays a guest wishlist onto the signed-in account. Saved rows are keyed by
 * (user_id, product_id), so a product already saved on the account is left alone instead
 * of becoming a duplicate heart. Items carried over from the old mock data (ids that are
 * not product uuids) cannot exist in the database and are dropped.
 */
export async function pushGuestWishlist(productIds: string[]): Promise<string[]> {
  const uuids = [...new Set(productIds.filter(isProductId))];
  if (uuids.length === 0) return [];
  const user_id = await requireUserId();

  const { error } = await supabase.from('wishlist_items').upsert(
    uuids.map((product_id) => ({ user_id, product_id })),
    { onConflict: 'user_id,product_id' },
  );
  if (error) throw new Error(`Could not sync your wishlist: ${error.message}`);
  return uuids;
}
