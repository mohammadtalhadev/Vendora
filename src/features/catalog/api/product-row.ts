import type { Database } from '../../../types/database';
import type { ModerationStatus, Product, ProductType, Variant } from '../../../types/domain';

export type ProductRow = Database['public']['Tables']['products']['Row'];

/** A products row read with the two joins the storefront needs to render a card. */
export interface ProductWithRefs extends ProductRow {
  category: { id: string; name: string; slug: string } | null;
  seller: {
    id: string;
    store_name: string;
    slug: string;
    seller_type: 'platform' | 'vendor';
    logo: string | null;
    rating: number | null;
    review_count: number | null;
  } | null;
}

/**
 * Every storefront read of a product goes through this list: `category` and `seller` are
 * FK embeds, so no extra round-trip is needed to name the store or the shelf.
 */
export const PRODUCT_SELECT =
  '*, category:categories(id, name, slug), seller:vendor_profiles(id, store_name, slug, seller_type, logo, rating, review_count)';

export function mapProduct(row: ProductWithRefs): Product {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category?.name ?? '',
    brand: row.brand,
    images: row.images,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? undefined : Number(row.compare_at_price),
    type: row.type as ProductType,
    sellerId: row.seller_id,
    sellerName: row.seller?.store_name ?? '',
    sellerType: row.seller?.seller_type ?? 'vendor',
    sellerLogo: row.seller?.logo ?? null,
    sellerRating: Number(row.seller?.rating ?? 0),
    sellerReviewCount: row.seller?.review_count ?? 0,
    variants: (row.variants ?? []) as unknown as Variant[],
    stock: row.stock,
    shippingSettings: row.shipping_settings as Product['shippingSettings'],
    digitalAssetInfo: row.digital_asset_info as Product['digitalAssetInfo'],
    rating: Number(row.rating),
    reviewCount: row.review_count,
    status: row.status as ModerationStatus,
    rejectionReason: row.rejection_reason ?? undefined,
    createdAt: row.created_at,
  };
}

/** `products.variants` is a jsonb array; a cart line prices off it when it resolves. */
export function variantPrice(product: Product, variantId?: string | null): number {
  const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined;
  // place_order uses the same rule: variant price when it resolves, else the base price.
  return variant ? Number(variant.price) : product.price;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Product ids are uuids since the database rebuild. Anything shaped differently came from
 * the old mock catalogue, and no row can match it - a cart or wishlist that still holds
 * such an id must not send it to Postgres.
 */
export function isProductId(id: string): boolean {
  return UUID.test(id);
}
