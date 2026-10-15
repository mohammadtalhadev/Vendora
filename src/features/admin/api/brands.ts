import { supabase } from '../../../lib/supabase';
import { asRecord, bool, num, rpcFailed, text } from './admin-client';

/**
 * The brand registry (Batch 62, migration 20261017010000): `brands` is a real
 * table now, written only through the `admin_*_brand` RPCs. It is a registry,
 * not a gate - `products.brand` stays free text, the add-product forms keep
 * their text inputs, and the catalog brand filter keeps matching the product
 * text exactly. What the directory shows is the MERGE of the two truths:
 *
 * - a registered brand appears even when no listing carries it yet
 *   (`registered: true`, its registry fields filled in);
 * - a brand string sellers typed that no admin has registered appears too,
 *   flagged `registered: false`, so the desk can register it in one click.
 *
 * Listing figures are computed from `products` exactly as before: only
 * approved listings count toward listings / sellers / lowest price, matching
 * how the storefront reads the catalog (`status = 'approved'`). A second
 * figure, `totalListings`, counts products in ANY status, because that is
 * what the delete RPC guards on - a brand is only deletable once no product
 * at all carries its name.
 */

export interface AdminBrandRow {
  /** Registry row id, or `null` for a products-only (unregistered) brand. */
  id: string | null;
  brand: string;
  slug: string | null;
  logoUrl: string | null;
  description: string | null;
  /** True when a row exists in the `brands` registry. */
  registered: boolean;
  /** Registry status; an unregistered brand has no status, so it reads active. */
  isActive: boolean;
  /** Approved listings carrying this brand. */
  listings: number;
  /** Products in any status carrying this brand - the delete guard's figure. */
  totalListings: number;
  /** Distinct sellers who list something under this brand (approved only). */
  sellers: number;
  /** Lowest approved listing price, the only money figure the query can prove. */
  lowestPrice: number;
}

interface BrandRegistryRow {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  isActive: boolean;
}

/** Mirrors the guard the other console writes open with. */
async function requireAdmin(operation: string): Promise<void> {
  const { error } = await supabase.rpc('admin_require_admin', { p_operation: operation });
  if (error) throw rpcFailed(operation, error.message);
}

const optionalText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

function mapRegistryRow(raw: Record<string, unknown>): BrandRegistryRow {
  return {
    id: text(raw.id),
    name: text(raw.name),
    slug: text(raw.slug),
    logoUrl: optionalText(raw.logo_url),
    description: optionalText(raw.description),
    isActive: bool(raw.is_active),
  };
}

function mapReturnedBrand(data: unknown): BrandRegistryRow {
  const row = mapRegistryRow(asRecord(data));
  if (!row.id) throw rpcFailed('The brand write returned no row', 'empty response');
  return row;
}

export async function fetchBrandDirectory(signal?: AbortSignal): Promise<AdminBrandRow[]> {
  let registryQuery = supabase.from('brands').select('*').order('name', { ascending: true });
  if (signal) registryQuery = registryQuery.abortSignal(signal);

  const { data: registryData, error: registryError } = await registryQuery;
  if (registryError) throw rpcFailed('Failed to load the brand directory', registryError.message);
  const registry = ((registryData ?? []) as unknown as Array<Record<string, unknown>>).map(mapRegistryRow);

  let query = supabase.from('products').select('brand, seller_id, price, status');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the brand directory', error.message);

  const grouped = new Map<
    string,
    { name: string; sellers: Set<string>; listings: number; totalListings: number; lowestPrice: number }
  >();

  for (const raw of data ?? []) {
    const row = raw as unknown as {
      brand: string | null;
      seller_id: string | null;
      price: number;
      status: string | null;
    };
    const name = text(row.brand).trim();
    if (!name) continue;

    const key = name.toLowerCase();
    const entry = grouped.get(key) ?? {
      name,
      sellers: new Set<string>(),
      listings: 0,
      totalListings: 0,
      lowestPrice: Number.POSITIVE_INFINITY,
    };
    entry.totalListings += 1;
    if (text(row.status) === 'approved') {
      const price = num(row.price);
      entry.listings += 1;
      if (row.seller_id) entry.sellers.add(row.seller_id);
      if (price < entry.lowestPrice) entry.lowestPrice = price;
    }
    grouped.set(key, entry);
  }

  const rows: AdminBrandRow[] = [];
  const registeredKeys = new Set<string>();

  for (const brand of registry) {
    const key = brand.name.trim().toLowerCase();
    registeredKeys.add(key);
    const entry = grouped.get(key);
    rows.push({
      id: brand.id,
      brand: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl,
      description: brand.description,
      registered: true,
      isActive: brand.isActive,
      listings: entry?.listings ?? 0,
      totalListings: entry?.totalListings ?? 0,
      sellers: entry ? entry.sellers.size : 0,
      lowestPrice: entry && entry.listings > 0 ? entry.lowestPrice : 0,
    });
  }

  for (const [key, entry] of grouped) {
    if (registeredKeys.has(key)) continue;
    rows.push({
      id: null,
      brand: entry.name,
      slug: null,
      logoUrl: null,
      description: null,
      registered: false,
      isActive: true,
      listings: entry.listings,
      totalListings: entry.totalListings,
      sellers: entry.sellers.size,
      lowestPrice: entry.listings > 0 ? entry.lowestPrice : 0,
    });
  }

  return rows.sort((a, b) => b.listings - a.listings || a.brand.localeCompare(b.brand));
}

export async function createBrand(input: {
  name: string;
  logoUrl?: string | null;
  description?: string | null;
}): Promise<BrandRegistryRow> {
  await requireAdmin('create a brand');
  const { data, error } = await supabase.rpc('admin_create_brand', {
    p_name: input.name,
    p_logo_url: input.logoUrl ?? null,
    p_description: input.description ?? null,
  });
  if (error) throw rpcFailed('Could not create the brand', error.message);
  return mapReturnedBrand(data);
}

/**
 * Only the keys the RPC is given are touched: it coalesces an absent or blank
 * value back to the column it already held, so a partial form cannot wipe a
 * brand. This edits the registry row only - moving the listings that carry
 * the old name is `renameBrand`.
 */
export async function updateBrand(input: {
  id: string;
  name?: string;
  logoUrl?: string | null;
  description?: string | null;
  isActive?: boolean | null;
}): Promise<BrandRegistryRow> {
  await requireAdmin('edit a brand');
  const { data, error } = await supabase.rpc('admin_update_brand', {
    p_id: input.id,
    p_name: input.name ?? null,
    p_logo_url: input.logoUrl ?? null,
    p_description: input.description ?? null,
    p_is_active: input.isActive ?? null,
  });
  if (error) throw rpcFailed('Could not update the brand', error.message);
  return mapReturnedBrand(data);
}

/**
 * Re-letters every product carrying the old brand name, in any status, and
 * moves the registry row with it. Returns how many products were updated.
 */
export async function renameBrand(oldName: string, newName: string): Promise<number> {
  await requireAdmin('rename a brand');
  const { data, error } = await supabase.rpc('admin_rename_brand', {
    p_old_name: oldName,
    p_new_name: newName,
  });
  if (error) throw rpcFailed('Could not rename the brand', error.message);
  return num(data);
}

/** Refused in SQL while any product still carries the brand name. */
export async function deleteBrand(id: string): Promise<BrandRegistryRow> {
  await requireAdmin('delete a brand');
  const { data, error } = await supabase.rpc('admin_delete_brand', { p_id: id });
  if (error) throw rpcFailed('Could not delete the brand', error.message);
  return mapReturnedBrand(data);
}
