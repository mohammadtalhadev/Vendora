import { supabase } from '../../../lib/supabase';
import {
  asRecord,
  asRows,
  bool,
  num,
  optionalNum,
  rpcFailed,
  text,
} from './admin-client';

/**
 * The taxonomy as `admin_category_tree` shapes it: roots with their direct children,
 * the counts the categories page claimed to have, and the listings that belong to no
 * category at all. Every figure is counted from `products`, not typed into a form.
 */

/** A second-level category: the tree's children carry no icon, image or further nesting. */
export interface AdminCategoryChild {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  /** `null` means the category is charged at the platform default. */
  commissionOverride: number | null;
  products: number;
  sellers: number;
  shelfValue: number;
}

export interface AdminCategoryRoot {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image: string | null;
  isActive: boolean;
  commissionOverride: number | null;
  products: number;
  sellers: number;
  shelfValue: number;
  children: AdminCategoryChild[];
}

/** A listing with no category, which is what a delete refuses to orphan silently. */
export interface AdminUnmappedProduct {
  id: string;
  title: string;
  slug: string;
  brand: string;
  price: number;
  stock: number;
  status: string;
  storeName: string;
}

export interface AdminCategoryTree {
  total: number;
  roots: AdminCategoryRoot[];
  unmapped: AdminUnmappedProduct[];
}

function mapChild(row: Record<string, unknown>): AdminCategoryChild {
  return {
    id: text(row.id),
    name: text(row.name),
    slug: text(row.slug),
    isActive: bool(row.isActive),
    commissionOverride: optionalNum(row.commissionOverride),
    products: num(row.products),
    sellers: num(row.sellers),
    shelfValue: num(row.shelfValue),
  };
}

function mapTree(value: unknown): AdminCategoryTree {
  const root = asRecord(value);
  return {
    total: num(root.total),
    roots: asRows(root.roots).map((row) => ({
      ...mapChild(row),
      icon: row.icon === null || row.icon === undefined ? null : text(row.icon),
      image: row.image === null || row.image === undefined ? null : text(row.image),
      children: asRows(row.children).map(mapChild),
    })),
    unmapped: asRows(root.unmapped).map((row) => ({
      id: text(row.id),
      title: text(row.title),
      slug: text(row.slug),
      brand: text(row.brand),
      price: num(row.price),
      stock: num(row.stock),
      status: text(row.status),
      storeName: text(row.storeName),
    })),
  };
}

export async function fetchCategoryTree(signal?: AbortSignal): Promise<AdminCategoryTree> {
  let query = supabase.rpc('admin_category_tree');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the category tree', error.message);
  return mapTree(data);
}

export async function createCategory(input: {
  name: string;
  slug: string;
  parentId?: string | null;
  icon?: string | null;
  image?: string | null;
}): Promise<{ id: string; name: string; slug: string }> {
  const { data, error } = await supabase.rpc('admin_create_category', {
    p_name: input.name,
    p_slug: input.slug,
    p_parent_id: input.parentId ?? null,
    p_icon: input.icon ?? null,
    p_image: input.image ?? null,
  });
  if (error) throw rpcFailed('Could not create the category', error.message);
  const root = asRecord(data);
  return { id: text(root.id), name: text(root.name), slug: text(root.slug) };
}

/**
 * Only the keys the RPC is given are touched: it coalesces an absent or blank value
 * back to the column it already held, so a partial form cannot wipe a category.
 * The one deliberate exception is the banner: `clearImage: true` sends the RPC's
 * explicit `p_clear_image` flag, which nulls the image instead of keeping it —
 * the only way to REMOVE a banner rather than replace it (Batch 75).
 */
export async function updateCategory(input: {
  categoryId: string;
  name?: string;
  slug?: string;
  parentId?: string | null;
  isActive?: boolean | null;
  icon?: string | null;
  image?: string | null;
  clearImage?: boolean;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('admin_update_category', {
    p_category_id: input.categoryId,
    p_name: input.name ?? null,
    p_slug: input.slug ?? null,
    p_parent_id: input.parentId ?? null,
    p_is_active: input.isActive ?? null,
    p_icon: input.icon ?? null,
    p_image: input.image ?? null,
    p_clear_image: input.clearImage ?? false,
  });
  if (error) throw rpcFailed('Could not update the category', error.message);
  return { id: text(asRecord(data).id) };
}

/** Refused while listings or subcategories still point at the category, in SQL. */
export async function deleteCategory(categoryId: string): Promise<{ id: string; deleted: boolean }> {
  const { data, error } = await supabase.rpc('admin_delete_category', {
    p_category_id: categoryId,
  });
  if (error) throw rpcFailed('Could not delete the category', error.message);
  const root = asRecord(data);
  return { id: text(root.id), deleted: bool(root.deleted) };
}

/** `null` moves the listing out of the taxonomy, back to unmapped. */
export async function assignProductCategory(
  productId: string,
  categoryId: string | null,
): Promise<{ id: string; categoryId: string | null }> {
  // The generated arg type only admits a string; an explicit NULL is how the RPC is
  // told to clear the column, exactly as an omitted argument would be.
  const { data, error } = await supabase.rpc('admin_assign_product_category', {
    p_product_id: productId,
    p_category_id: categoryId as string,
  });
  if (error) throw rpcFailed('Could not move that listing', error.message);
  const root = asRecord(data);
  return {
    id: text(root.id),
    categoryId: root.categoryId === null || root.categoryId === undefined
      ? null
      : text(root.categoryId),
  };
}

/** `null` clears the override, which returns the category to the platform default. */
export async function setCategoryCommission(
  categoryId: string,
  rate: number | null,
): Promise<{ id: string; rate: number | null }> {
  const { data, error } = await supabase.rpc('admin_set_category_commission', {
    p_category_id: categoryId,
    p_rate: rate as number,
  });
  if (error) throw rpcFailed('Could not set the category rate', error.message);
  const root = asRecord(data);
  return { id: text(root.id), rate: optionalNum(root.rate) };
}
