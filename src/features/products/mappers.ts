import type { Product } from '../../types/domain';
import type { ProductItem } from './components/ProductCard';

const DEFAULT_IMAGE_BY_CATEGORY: Array<[string, string]> = [
  ['audio', '/images/bevesi/1-13.jpg'],
  ['beauty', '/images/bevesi/beauty_primer_full.jpg'],
  ['home', '/images/bevesi/banner-16.jpg'],
  ['fashion', '/images/categories/cat_fashion_2k.png'],
  ['shoes', '/images/categories/cat_shoes_2k.png'],
];

/** Prefer the stored category id/name over the title heuristics when it is a known taxonomy key. */
function taxonomyFromCategory(category: string): { subCategoryId: string; childCategoryId?: string } | null {
  const key = category.replace(/^cat-/, '').toLowerCase();
  if (/audio|computer|camera|beauty|home|phone/.test(key)) {
    return { subCategoryId: `sub-${key}`, childCategoryId: undefined };
  }
  return null;
}

/** Infer the sub/child taxonomy a product belongs to, used by the category chain links. */
function inferTaxonomy(title: string, category: string): { subCategoryId: string; childCategoryId?: string } {
  if (category === 'audio' || /headphone|earbud|audio|speaker|soundbar|earphone|(^|\d|\s)iem/.test(title)) {
    if (/speaker|soundbar/.test(title)) return { subCategoryId: 'sub-audio', childCategoryId: 'child-audio-speakers' };
    if (/iem|monitor/.test(title)) return { subCategoryId: 'sub-audio', childCategoryId: 'child-audio-iem' };
    return { subCategoryId: 'sub-audio', childCategoryId: 'child-audio-headphones' };
  }
  if (/laptop|computer|monitor|keyboard|dock|macbook/.test(title)) {
    if (/laptop|macbook/.test(title)) return { subCategoryId: 'sub-computers', childCategoryId: 'child-comp-laptops' };
    if (/monitor|display/.test(title)) return { subCategoryId: 'sub-computers', childCategoryId: 'child-comp-displays' };
    return { subCategoryId: 'sub-computers', childCategoryId: 'child-comp-accessories' };
  }
  if (category === 'cameras' || /camera|lens|drone|gopro/.test(title)) {
    if (/drone/.test(title)) return { subCategoryId: 'sub-cameras', childCategoryId: 'child-cam-drones' };
    if (/action|gopro/.test(title)) return { subCategoryId: 'sub-cameras', childCategoryId: 'child-cam-action' };
    return { subCategoryId: 'sub-cameras', childCategoryId: 'child-cam-mirrorless' };
  }
  if (category === 'beauty' || /serum|cream|perfume|shampoo|primer|cleanser/.test(title)) {
    if (/perfume|fragrance|mist/.test(title)) return { subCategoryId: 'sub-beauty-fragrance', childCategoryId: 'child-fragrance-edp' };
    if (/hair|shampoo/.test(title)) return { subCategoryId: 'sub-beauty-hair', childCategoryId: 'child-hair-shampoo' };
    if (/roller|brush|tool/.test(title)) return { subCategoryId: 'sub-beauty-tools', childCategoryId: 'child-tools-rollers' };
    if (/serum/.test(title)) return { subCategoryId: 'sub-beauty-skincare', childCategoryId: 'child-beauty-serums' };
    if (/cleanser|wash/.test(title)) return { subCategoryId: 'sub-beauty-skincare', childCategoryId: 'child-beauty-cleansers' };
    return { subCategoryId: 'sub-beauty-skincare', childCategoryId: 'child-beauty-creams' };
  }
  if (category === 'home' || /cookware|kettle|coffee|blender|lamp|air fryer|toaster/.test(title)) {
    if (/coffee|espresso|kettle/.test(title)) return { subCategoryId: 'sub-home-coffee', childCategoryId: 'child-coffee-espresso' };
    if (/lamp|light|vase/.test(title)) return { subCategoryId: 'sub-home-living', childCategoryId: 'child-living-lamps' };
    if (/cookware|knife|pot|pan/.test(title)) return { subCategoryId: 'sub-home-cookware', childCategoryId: 'child-cookware-pots' };
    return { subCategoryId: 'sub-home-appliances', childCategoryId: 'child-appliances-fryers' };
  }
  if (/watch|band/.test(title)) return { subCategoryId: 'sub-smartphones', childCategoryId: 'child-phone-wearables' };
  if (/charger|cable|dock/.test(title)) return { subCategoryId: 'sub-smartphones', childCategoryId: 'child-phone-chargers' };
  return { subCategoryId: 'sub-smartphones', childCategoryId: 'child-phone-flagship' };
}

/**
 * Rebuild the domain `Product` a card-level action (compare) stores, from the
 * fields the card itself carries — the same reconstruction the wishlist
 * toggle performs. Variants and shipping settings are not card data, so they
 * stay empty rather than invented; the compare matrix renders card-level
 * fields, and a product added from its own page carries the full record.
 */
export function cardItemToProduct(item: ProductItem): Product {
  return {
    id: item.id,
    title: item.title,
    slug: item.id,
    description: item.title,
    category: item.category,
    brand: '',
    images: [item.image],
    price: item.price,
    compareAtPrice: item.compareAtPrice,
    type: item.type,
    sellerId: item.sellerId,
    sellerName: item.sellerName,
    sellerType: item.sellerType,
    sellerLogo: item.sellerLogo ?? null,
    variants: [],
    stock: item.stock,
    rating: item.rating,
    reviewCount: item.reviewCount,
    status: 'approved',
    createdAt: new Date().toISOString(),
  };
}

/** Map a catalog `Product` onto the shape the shared product card renders. */
export function domainProductToCardItem(p: Product): ProductItem {
  const categoryKey = (p.category || '').replace(/^cat-/, '').toLowerCase();
  const compareAt = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice : undefined;
  const discountPercent = compareAt ? Math.round(((compareAt - p.price) / compareAt) * 100) : undefined;
  // products.stock is nullable in the database; an untracked product
  // reads as 0 — the same fallback the admin/vendor product APIs use.
  // The old `?? 20` invented twenty units that do not exist (Batch 102).
  const stock = p.stock ?? 0;
  const fallbackImage =
    DEFAULT_IMAGE_BY_CATEGORY.find(([key]) => categoryKey.includes(key))?.[1] ??
    '/images/products/prod_titanium_phone.jpg';

  return {
    id: p.id,
    title: p.title,
    category: (categoryKey || 'general').toUpperCase(),
    ...(taxonomyFromCategory(p.category || '') ?? inferTaxonomy(p.title.toLowerCase(), categoryKey)),
    price: p.price,
    compareAtPrice: compareAt,
    discountPercent,
    rating: p.rating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    stock,
    // The cart cap is the real stock on hand — the same value the cart,
    // compare and wishlist producers already use. The old
    // Math.max(stock, 50) let a card sell up to 50 units of a product
    // that might hold 3, and it was the fabricated denominator behind
    // the card's old stock progress bar (Batch 102).
    maxStock: stock,
    sellerId: p.sellerId || 'platform',
    sellerName: p.sellerName || 'Vendora Verified',
    sellerLogo: p.sellerLogo ?? null,
    sellerType: p.sellerType || 'vendor',
    isVerified: true,
    type: p.type || 'physical',
    image: p.images?.[0] || fallbackImage,
  };
}
