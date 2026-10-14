import { supabase } from '../../../lib/supabase';
import { PRODUCT_SELECT, mapProduct, type ProductWithRefs } from './product-row';
import { normalizeSearchQuery } from './search-terms';
import type { Category, Product, ProductType } from '../../../types/domain';

export interface ProductQueryParams {
  q?: string;
  category?: string;
  /** Exact brand string as stored on the product row (see fetchProductBrands). */
  brand?: string;
  /** Keep only products whose stored rating is at least this value. */
  minRating?: number;
  /** Keep only products with stock on hand. */
  inStock?: boolean;
  /**
   * Keep only products carrying a compare-at price. A compare-at price is only
   * ever recorded for a was/now offer, and a NULL never satisfies `> 0`, so this
   * is the sale shelf; the cards still compute the visible discount from
   * compare_at_price > price exactly as before.
   */
  onSale?: boolean;
  type?: ProductType;
  seller?: 'platform' | 'vendor';
  /** One store's shelf, for a public storefront page. */
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SearchSuggestion {
  type: 'product' | 'category';
  title: string;
  id: string;
  price?: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SORTS: Record<string, Array<{ column: string; ascending: boolean }>> = {
  featured: [{ column: 'created_at', ascending: false }],
  newest: [{ column: 'created_at', ascending: false }],
  best_selling: [{ column: 'review_count', ascending: false }],
  rating: [{ column: 'rating', ascending: false }],
  price_asc: [{ column: 'price', ascending: true }],
  price_desc: [{ column: 'price', ascending: false }],
};

/** Storefront filters take a category id or slug; an unknown slug must yield no products. */
async function resolveCategoryIds(category: string): Promise<string[]> {
  if (UUID.test(category)) return [category];
  const { data, error } = await supabase.from('categories').select('id').eq('slug', category);
  if (error) throw new Error(`Could not resolve category "${category}": ${error.message}`);
  return (data ?? []).map((row) => row.id);
}

async function resolveSellerIds(seller: 'platform' | 'vendor'): Promise<string[]> {
  const { data, error } = await supabase.from('vendor_profiles').select('id').eq('seller_type', seller);
  if (error) throw new Error(`Could not resolve sellers: ${error.message}`);
  return (data ?? []).map((row) => row.id);
}

function emptyPage(page: number): ProductsResponse {
  return { items: [], total: 0, page, totalPages: 1, hasMore: false };
}

export async function fetchProducts(
  params: ProductQueryParams = {},
  signal?: AbortSignal,
): Promise<ProductsResponse> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 12);

  const categoryIds = params.category ? await resolveCategoryIds(params.category) : null;
  if (categoryIds && categoryIds.length === 0) return emptyPage(page);

  const sellerIds = params.seller ? await resolveSellerIds(params.seller) : null;
  if (sellerIds && sellerIds.length === 0) return emptyPage(page);

  type SearchMode = { kind: 'text'; term: string } | { kind: 'ilike'; term: string } | null;

  const runQuery = async (search: SearchMode): Promise<ProductsResponse> => {
    let query = supabase
      .from('products')
      .select(PRODUCT_SELECT, { count: 'exact' })
      .eq('status', 'approved');

    if (search?.kind === 'text') {
      query = query.textSearch('search_vector', search.term, { type: 'plain' });
    } else if (search?.kind === 'ilike') {
      // The products table's display-name column is `title`. Feature-detect
      // `ilike` so a query builder without it (older test doubles) simply
      // skips this fallback instead of throwing a TypeError.
      const builder = query as typeof query & {
        ilike?: (column: string, pattern: string) => typeof query;
      };
      if (typeof builder.ilike === 'function') {
        query = builder.ilike('title', `%${search.term}%`);
      }
    }
    if (categoryIds) query = query.in('category_id', categoryIds);
    if (sellerIds) query = query.in('seller_id', sellerIds);
    if (params.sellerId) query = query.eq('seller_id', params.sellerId);
    if (params.brand) query = query.eq('brand', params.brand);
    if (params.minRating !== undefined) query = query.gte('rating', params.minRating);
    if (params.inStock) query = query.gte('stock', 1);
    if (params.onSale) query = query.gt('compare_at_price', 0);
    if (params.type) query = query.eq('type', params.type);
    if (params.minPrice !== undefined) query = query.gte('price', params.minPrice);
    if (params.maxPrice !== undefined) query = query.lte('price', params.maxPrice);

    for (const sort of SORTS[params.sort ?? ''] ?? SORTS.featured) {
      query = query.order(sort.column, { ascending: sort.ascending });
    }

    if (signal) query = query.abortSignal(signal);

    const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
    if (error) throw new Error(`Failed to load products: ${error.message}`);

    const items = (data ?? []).map((row) => mapProduct(row as ProductWithRefs));
    const total = count ?? items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return { items, total, page, totalPages, hasMore: page < totalPages };
  };

  const rawQuery = params.q?.trim() ?? '';
  const primary = await runQuery(rawQuery ? { kind: 'text', term: rawQuery } : null);
  if (!rawQuery || primary.items.length > 0) return primary;

  // Fuzzy fallback — only after the exact full-text search found nothing:
  // (a) retry full-text with misspellings corrected / synonyms expanded,
  // (b) fall back to a substring match on the product title with that term.
  const normalized = normalizeSearchQuery(rawQuery);
  if (normalized && normalized !== rawQuery.toLowerCase()) {
    const corrected = await runQuery({ kind: 'text', term: normalized });
    if (corrected.items.length > 0) return corrected;
  }
  const ilikeTerm = normalized || rawQuery;
  const substring = await runQuery({ kind: 'ilike', term: ilikeTerm });
  if (substring.items.length > 0) return substring;

  return primary;
}

export async function fetchProductDetail(idOrSlug: string, signal?: AbortSignal): Promise<Product> {
  const lookupColumn = UUID.test(idOrSlug) ? 'id' : 'slug';
  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq(lookupColumn, idOrSlug);

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();

  if (error) throw new Error(`Failed to load product: ${error.message}`);
  if (!data) throw new Error('Product not found');
  return mapProduct(data as unknown as ProductWithRefs);
}

export async function fetchCategories(signal?: AbortSignal): Promise<{ categories: Category[] }> {
  let query = supabase
    .from('categories')
    .select('id, name, slug, icon, image, commission_rate_override')
    .order('name', { ascending: true });

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;

  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return {
    categories: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon: row.icon ?? undefined,
      image: row.image ?? undefined,
      commissionRateOverride:
        row.commission_rate_override === null ? undefined : Number(row.commission_rate_override),
    })),
  };
}

/**
 * The distinct brand strings carried by approved products — the catalogue's
 * brand facet reads its options from the shelf itself, never a hardcoded list.
 */
export async function fetchProductBrands(signal?: AbortSignal): Promise<{ brands: string[] }> {
  let query = supabase.from('products').select('brand').eq('status', 'approved');

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;

  if (error) throw new Error(`Failed to load brands: ${error.message}`);
  const brands = [...new Set((data ?? []).map((row) => row.brand?.trim()).filter(Boolean) as string[])];
  brands.sort((a, b) => a.localeCompare(b));
  return { brands };
}

export async function fetchSearchSuggestions(
  q: string,
  signal?: AbortSignal,
): Promise<{ suggestions: SearchSuggestion[] }> {
  const term = q.trim();
  if (term.length < 2) return { suggestions: [] };
  const pattern = `%${term}%`;

  let productsQuery = supabase
    .from('products')
    .select('id, title, price')
    .eq('status', 'approved')
    .ilike('title', pattern)
    .order('review_count', { ascending: false })
    .limit(6);
  let categoriesQuery = supabase.from('categories').select('id, name').ilike('name', pattern).limit(4);

  if (signal) {
    productsQuery = productsQuery.abortSignal(signal);
    categoriesQuery = categoriesQuery.abortSignal(signal);
  }

  const [productsResult, categoriesResult] = await Promise.all([productsQuery, categoriesQuery]);

  const productsError = productsResult.error ?? categoriesResult.error;
  if (productsError) throw new Error(`Failed to load suggestions: ${productsError.message}`);

  return {
    suggestions: [
      ...(productsResult.data ?? []).map((row) => ({
        type: 'product' as const,
        id: row.id,
        title: row.title,
        price: Number(row.price),
      })),
      ...(categoriesResult.data ?? []).map((row) => ({
        type: 'category' as const,
        id: row.id,
        title: row.name,
      })),
    ],
  };
}
