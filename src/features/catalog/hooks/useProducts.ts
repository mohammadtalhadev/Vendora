import { useQuery } from '@tanstack/react-query';
import {
  fetchProducts,
  fetchProductDetail,
  fetchCategories,
  fetchSearchSuggestions,
} from '../api/products';
import type { ProductQueryParams } from '../api/products';

// Query Key Factory per architecture specification
export const catalogKeys = {
  all: ['catalog'] as const,
  products: (params: ProductQueryParams) => ['catalog', 'products', params] as const,
  productDetail: (id: string) => ['catalog', 'product', id] as const,
  categories: () => ['catalog', 'categories'] as const,
  suggestions: (q: string) => ['catalog', 'suggestions', q] as const,
};

/** `enabled` lets a caller wait for a dependency (a store id resolved from a slug) before asking. */
export function useProducts(params: ProductQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.products(params),
    queryFn: ({ signal }) => fetchProducts(params, signal),
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useProductDetail(id: string) {
  return useQuery({
    queryKey: catalogKeys.productDetail(id),
    queryFn: ({ signal }) => fetchProductDetail(id, signal),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: catalogKeys.suggestions(query),
    queryFn: ({ signal }) => fetchSearchSuggestions(query, signal),
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 30, // 30 seconds
  });
}
