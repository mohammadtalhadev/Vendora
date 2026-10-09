import { z } from 'zod';

/**
 * Zod-sanitised URL search params for the catalog listing (PRD §12):
 * invalid values fall back to defaults instead of leaking into queries.
 */

export const CATALOG_SORTS = ['featured', 'price_asc', 'price_desc', 'rating', 'newest'] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const catalogParamsSchema = z.object({
  q: z.string().trim().max(120).default('').catch(''),
  category: z.string().trim().max(80).default('').catch(''),
  brand: z.string().trim().max(80).default('').catch(''),
  type: z.enum(['physical', 'digital']).optional().catch(undefined),
  seller: z.enum(['platform', 'vendor']).optional().catch(undefined),
  minPrice: z.coerce.number().min(0).max(1_000_000).default(0).catch(0),
  maxPrice: z.coerce.number().min(0).max(1_000_000).default(1_000_000).catch(1_000_000),
  rating: z.coerce.number().min(0).max(5).default(0).catch(0),
  sort: z.enum(CATALOG_SORTS).default('featured').catch('featured'),
  page: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
  limit: z.coerce.number().int().min(1).max(96).default(12).catch(12),
});

export type CatalogParams = z.infer<typeof catalogParamsSchema>;

export const CATALOG_DEFAULTS: CatalogParams = catalogParamsSchema.parse({});

/**
 * Parses a URLSearchParams instance (or raw query string) into sanitised
 * catalog params. Unknown keys are ignored; invalid values revert to defaults.
 */
export function parseCatalogParams(search: URLSearchParams | string): CatalogParams {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const raw: Record<string, string> = {};
  for (const key of Object.keys(CATALOG_DEFAULTS) as Array<keyof CatalogParams>) {
    const value = params.get(key);
    if (value !== null && value !== '') {
      raw[key] = value;
    }
  }
  return catalogParamsSchema.parse(raw);
}

/**
 * Serialises catalog params back to a query string, omitting default values so
 * URLs stay short and shareable.
 */
export function serializeCatalogParams(params: Partial<CatalogParams>): string {
  const merged: CatalogParams = { ...CATALOG_DEFAULTS, ...params };
  const search = new URLSearchParams();
  (Object.keys(CATALOG_DEFAULTS) as Array<keyof CatalogParams>).forEach((key) => {
    const value = merged[key];
    const fallback = CATALOG_DEFAULTS[key];
    if (value === undefined || value === fallback || value === '') return;
    search.set(key, String(value));
  });
  return search.toString();
}
