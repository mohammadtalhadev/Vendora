import { supabase } from '../../../lib/supabase';
import { PRODUCT_SELECT, mapProduct, type ProductWithRefs } from './product-row';
import type { Category, Product, ProductType } from '../../../types/domain';

export interface ProductQueryParams {
  q?: string;
  category?: string;
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

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('status', 'approved');

  if (params.q?.trim()) query = query.textSearch('search_vector', params.q.trim(), { type: 'plain' });
  if (categoryIds) query = query.in('category_id', categoryIds);
  if (sellerIds) query = query.in('seller_id', sellerIds);
  if (params.sellerId) query = query.eq('seller_id', params.sellerId);
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
