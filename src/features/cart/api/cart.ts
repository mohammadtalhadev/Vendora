import { supabase } from '../../../lib/supabase';
import type { CartItem } from '../../../types/domain';
import type { Database } from '../../../types/database';
import { PRODUCT_SELECT, mapProduct, variantPrice, isProductId, type ProductWithRefs } from '../../catalog/api/product-row';

type CartRow = Database['public']['Tables']['cart_items']['Row'];

interface CartLine extends CartRow {
  product: ProductWithRefs | null;
}

/** A cart line is identified server-side by (user_id, product_id, variant_id). */
export interface CartLineKey {
  productId: string;
  /** Empty string and undefined both mean "no variant chosen for this product". */
  variantId?: string | null;
}

const CART_SELECT =
  'id, product_id, variant_id, quantity, created_at, updated_at, ' +
  `product:products(${PRODUCT_SELECT})`;

/** The key the UI uses for a line, so remove and update calls address the same row. */
export function cartLineId({ productId, variantId }: CartLineKey): string {
  return variantId ? `${productId}-${variantId}` : productId;
}

function toCartItem(row: CartLine, product: ProductWithRefs): CartItem {
  const variantId = row.variant_id || undefined;
  return {
    id: cartLineId({ productId: product.id, variantId }),
    productId: product.id,
    variantId,
    title: product.title,
    price: variantPrice(mapProduct(product), variantId),
    compareAtPrice: product.compare_at_price === null ? undefined : Number(product.compare_at_price),
    quantity: row.quantity,
    maxStock: product.stock,
    image: product.images[0] ?? '',
    sellerId: product.seller_id,
    sellerName: product.seller?.store_name ?? '',
    sellerType: product.seller?.seller_type ?? 'vendor',
    type: product.type as CartItem['type'],
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not read your session: ${error.message}`);
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in to use your cart.');
  return userId;
}

/** The signed-in customer's cart, priced from live product rows. */
export async function fetchCart(signal?: AbortSignal): Promise<CartItem[]> {
  await requireUserId();

  let query = supabase.from('cart_items').select(CART_SELECT).order('created_at', { ascending: true });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your cart: ${error.message}`);

  const items: CartItem[] = [];
  for (const row of (data ?? []) as unknown as CartLine[]) {
    // A product that left the shelf since the line was added can never be ordered, so it
    // has no place in the cart either. place_order refuses it the same way.
    if (!row.product || row.product.status !== 'approved') continue;
    items.push(toCartItem(row, row.product));
  }
  return items;
}

/** Insert or update one line. `quantity` is the absolute new quantity. */
export async function saveCartItem(key: CartLineKey, quantity: number): Promise<void> {
  const user_id = await requireUserId();
  const { error } = await supabase
    .from('cart_items')
    .upsert(
      { user_id, product_id: key.productId, variant_id: key.variantId ?? '', quantity },
      { onConflict: 'user_id,product_id,variant_id' },
    );
  if (error) throw new Error(`Could not save your cart: ${error.message}`);
}

export async function deleteCartItem(key: CartLineKey): Promise<void> {
  const user_id = await requireUserId();
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user_id)
    .eq('product_id', key.productId)
    .eq('variant_id', key.variantId ?? '');
  if (error) throw new Error(`Could not update your cart: ${error.message}`);
}

export async function clearServerCart(): Promise<void> {
  const user_id = await requireUserId();
  const { error } = await supabase.from('cart_items').delete().eq('user_id', user_id);
  if (error) throw new Error(`Could not empty your cart: ${error.message}`);
}

/**
 * Replays a merged guest cart onto the signed-in account. The unique key keeps one row
 * per (product, variant), so a line both carts held is stored once at the merged
 * quantity instead of stacking a second row. Lines left over from the mock catalogue
 * (product ids that are not uuids) cannot be stored and are dropped.
 */
export async function pushMergedCart(items: CartItem[]): Promise<CartItem[]> {
  const storable = items.filter((item) => isProductId(item.productId));
  if (storable.length === 0) return [];
  const user_id = await requireUserId();

  const rows = storable.map((item) => ({
    user_id,
    product_id: item.productId,
    variant_id: item.variantId ?? '',
    quantity: item.quantity,
  }));
  const { error } = await supabase.from('cart_items').upsert(rows, {
    onConflict: 'user_id,product_id,variant_id',
  });
  if (error) throw new Error(`Could not sync your cart: ${error.message}`);
  return storable;
}
