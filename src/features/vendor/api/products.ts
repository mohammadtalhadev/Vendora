import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import type { Product } from '../../../types/domain';
import { mapProduct, PRODUCT_SELECT, type ProductWithRefs } from '../../catalog/api/product-row';
import { json, requireVendorId, rpcFailed } from './vendor-client';

type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

/**
 * A listing the store is drafting or sending for review. `sellerId`, `rating`,
 * `reviewCount` and the moderation `status` are deliberately absent: RLS sets the
 * seller from the session, freezes the rollups, and only accepts `draft` /
 * `pending_review` on insert - a seller cannot approve their own work.
 */
export interface VendorProductDraft {
  title: string;
  slug?: string;
  description?: string;
  categoryId?: string | null;
  brand?: string;
  images?: string[];
  price: number;
  compareAtPrice?: number | null;
  type?: 'physical' | 'digital';
  variants?: Product['variants'];
  stock?: number;
  shippingSettings?: Product['shippingSettings'];
  digitalAssetInfo?: Product['digitalAssetInfo'];
  status?: 'draft' | 'pending_review';
}

/** The editable fields of a live listing. Moderation moves via `setProductListing`. */
export type VendorProductUpdate = Partial<
  Omit<VendorProductDraft, 'status'>
>;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';

function toRow(draft: VendorProductDraft, vendorId: string): ProductInsert {
  return {
    title: draft.title,
    slug: draft.slug || slugify(draft.title),
    description: draft.description ?? '',
    category_id: draft.categoryId ?? null,
    brand: draft.brand ?? '',
    images: draft.images ?? [],
    price: draft.price,
    compare_at_price: draft.compareAtPrice ?? null,
    type: draft.type ?? 'physical',
    seller_id: vendorId,
    variants: json(draft.variants ?? []),
    stock: draft.stock ?? 0,
    shipping_settings: json(draft.shippingSettings ?? {}),
    digital_asset_info: json(draft.digitalAssetInfo ?? {}),
    status: draft.status ?? 'pending_review',
    rating: 0,
    review_count: 0,
  };
}

/**
 * The columns a seller may write, mapped from the form's camelCase names to the row's
 * snake_case ones. Moderation state and the rating rollups are absent by design: the
 * database owns those, so no form can submit its way to `approved`.
 */
function toUpdate(updates: VendorProductUpdate): ProductUpdate {
  const row: ProductUpdate = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.slug !== undefined) row.slug = updates.slug;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.categoryId !== undefined) row.category_id = updates.categoryId;
  if (updates.brand !== undefined) row.brand = updates.brand;
  if (updates.images !== undefined) row.images = updates.images;
  if (updates.price !== undefined) row.price = updates.price;
  if (updates.compareAtPrice !== undefined) row.compare_at_price = updates.compareAtPrice;
  if (updates.type !== undefined) row.type = updates.type;
  if (updates.variants !== undefined) row.variants = json(updates.variants);
  if (updates.stock !== undefined) row.stock = updates.stock;
  if (updates.shippingSettings !== undefined) row.shipping_settings = json(updates.shippingSettings);
  if (updates.digitalAssetInfo !== undefined) row.digital_asset_info = json(updates.digitalAssetInfo);
  return row;
}

/**
 * Reads a listing and confirms it is this store's. `approved` rows from every store are
 * publicly selectable, so the id alone does not prove ownership - without this check a
 * seller could edit a competitor's price through the same code path.
 */
async function readOwnProduct(productId: string, signal?: AbortSignal): Promise<Product> {
  const vendorId = await requireVendorId();
  let query = supabase.from('products').select(PRODUCT_SELECT).eq('id', productId);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Failed to load this listing: ${error.message}`);
  if (!data) throw new Error('Listing not found.');
  const product = mapProduct(data as unknown as ProductWithRefs);
  if (product.sellerId !== vendorId) throw new Error('This listing belongs to another store.');
  return product;
}

/** Every listing this store owns, in any moderation state - RLS scopes it to the owner. */
export async function fetchVendorProducts(signal?: AbortSignal): Promise<Product[]> {
  const vendorId = await requireVendorId();
  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('seller_id', vendorId)
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load your listings: ${error.message}`);
  return ((data ?? []) as unknown as ProductWithRefs[]).map(mapProduct);
}

export async function fetchVendorProduct(productId: string, signal?: AbortSignal): Promise<Product> {
  return readOwnProduct(productId, signal);
}

/** Books the listing and returns the row the database kept, including its real id. */
export async function createVendorProduct(draft: VendorProductDraft): Promise<Product> {
  const vendorId = await requireVendorId();

  const { data, error } = await supabase
    .from('products')
    .insert(toRow(draft, vendorId))
    .select(PRODUCT_SELECT)
    .single();
  if (error) throw new Error(`Failed to create the listing: ${error.message}`);
  return mapProduct(data as unknown as ProductWithRefs);
}

/**
 * Edits a listing this store owns. Ownership is checked before the write because
 * `products_update_vendor` filters non-matching rows instead of raising, which would
 * otherwise look like a save that changed nothing.
 */
export async function updateVendorProduct(
  productId: string,
  updates: VendorProductUpdate,
): Promise<Product> {
  const existing = await readOwnProduct(productId);

  const row = toUpdate(updates);
  if (Object.keys(row).length === 0) return existing;

  const { error } = await supabase
    .from('products')
    .update(row)
    .eq('id', productId)
    .eq('seller_id', existing.sellerId);
  if (error) throw new Error(`Failed to save the listing: ${error.message}`);
  return readOwnProduct(productId);
}

/** Stock is the one field the inventory table edits in place. */
export async function setVendorProductStock(
  productId: string,
  stock: number,
): Promise<Product> {
  return updateVendorProduct(productId, { stock: Math.max(0, Math.trunc(stock)) });
}

/**
 * `submit` sends a draft or a rejected listing to moderation; `withdraw` pulls it back
 * to draft. The RPC enforces which transitions are legal and who owns the row - a
 * listing is withdrawn rather than deleted, because past orders still reference it.
 */
export async function setProductListing(
  productId: string,
  action: 'submit' | 'withdraw',
): Promise<Product> {
  const { error } = await supabase.rpc('set_vendor_product_listing', {
    p_product_id: productId,
    p_action: action,
  });
  if (error) throw rpcFailed(`Could not ${action} this listing`, error.message);
  return readOwnProduct(productId);
}
