import { apiClient } from '../../../lib/api-client';
import type { Product, Category } from '../../../types/domain';

export interface ProductQueryParams {
  q?: string;
  category?: string;
  type?: 'physical' | 'digital';
  seller?: 'platform' | 'vendor';
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

export async function fetchProducts(
  params: ProductQueryParams = {},
  signal?: AbortSignal,
): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.category) searchParams.set('category', params.category);
  if (params.type) searchParams.set('type', params.type);
  if (params.seller) searchParams.set('seller', params.seller);
  if (params.minPrice !== undefined) searchParams.set('minPrice', params.minPrice.toString());
  if (params.maxPrice !== undefined) searchParams.set('maxPrice', params.maxPrice.toString());
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const queryString = searchParams.toString();
  const endpoint = `/api/products${queryString ? `?${queryString}` : ''}`;
  return apiClient<ProductsResponse>(endpoint, { signal });
}

export async function fetchProductDetail(id: string, signal?: AbortSignal): Promise<Product> {
  return apiClient<Product>(`/api/products/${id}`, { signal });
}

export async function fetchCategories(signal?: AbortSignal): Promise<{ categories: Category[] }> {
  return apiClient<{ categories: Category[] }>('/api/categories', { signal });
}

export async function fetchSearchSuggestions(
  q: string,
  signal?: AbortSignal,
): Promise<{ suggestions: SearchSuggestion[] }> {
  return apiClient<{ suggestions: SearchSuggestion[] }>(`/api/search/suggestions?q=${encodeURIComponent(q)}`, {
    signal,
  });
}
