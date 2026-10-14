import { useEffect, useState } from 'react';
import type { Product } from '../../types/domain';

/**
 * Recently Viewed — a per-browser history kept in localStorage.
 *
 * This is deliberately a local snapshot, not a server table: it is the
 * shopper's own browsing trail on this device, so it works for guests,
 * survives reloads, and needs no account. Each entry snapshots the fields
 * a product card renders (title/price/image/rating/seller) at view time,
 * most-recent first, capped at 12.
 */
export const RECENTLY_VIEWED_KEY = 'vendora_recently_viewed';
export const RECENTLY_VIEWED_LIMIT = 12;
export const RECENTLY_VIEWED_EVENT = 'vendora:recently-viewed';

export interface RecentlyViewedItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  rating: number;
  reviewCount: number;
  sellerName: string;
  viewedAt: string;
}

function readStored(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is RecentlyViewedItem =>
          Boolean(entry) &&
          typeof entry === 'object' &&
          typeof (entry as RecentlyViewedItem).id === 'string' &&
          typeof (entry as RecentlyViewedItem).slug === 'string',
      )
      .slice(0, RECENTLY_VIEWED_LIMIT);
  } catch {
    return [];
  }
}

function writeStored(items: RecentlyViewedItem[]): void {
  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items));
  } catch {
    // Storage full / unavailable (private mode): history is best-effort.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_EVENT));
  }
}

/** Records a product view: newest first, de-duplicated by product id. */
export function recordRecentlyViewed(product: Product): void {
  const item: RecentlyViewedItem = {
    id: product.id,
    slug: product.slug,
    name: product.title,
    price: product.price,
    image: product.images?.[0] ?? '',
    rating: product.rating ?? 0,
    reviewCount: product.reviewCount ?? 0,
    sellerName: product.sellerName ?? '',
    viewedAt: new Date().toISOString(),
  };
  const next = [item, ...readStored().filter((entry) => entry.id !== item.id)].slice(
    0,
    RECENTLY_VIEWED_LIMIT,
  );
  writeStored(next);
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  return readStored();
}

export function clearRecentlyViewed(): void {
  try {
    localStorage.removeItem(RECENTLY_VIEWED_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_EVENT));
  }
}

/** Live list: re-reads on the custom event and on cross-tab storage events. */
export function useRecentlyViewed(): RecentlyViewedItem[] {
  const [items, setItems] = useState<RecentlyViewedItem[]>(() => readStored());

  useEffect(() => {
    const refresh = () => setItems(readStored());
    window.addEventListener(RECENTLY_VIEWED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(RECENTLY_VIEWED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return items;
}

/**
 * Maps a snapshot onto the minimal `Product` shape `domainProductToCardItem`
 * needs, so the homepage rail renders snapshots through the exact same
 * card mapping as live catalogue products. Fields the snapshot does not
 * carry (stock, variants, category) stay honest defaults — the card only
 * renders the snapshotted facts plus its category fallback.
 */
export function recentlyViewedToProduct(item: RecentlyViewedItem): Product {
  return {
    id: item.id,
    title: item.name,
    slug: item.slug,
    description: '',
    category: '',
    brand: '',
    images: item.image ? [item.image] : [],
    price: item.price,
    type: 'physical',
    sellerId: '',
    sellerName: item.sellerName,
    sellerType: 'vendor',
    sellerLogo: null,
    variants: [],
    stock: 0,
    shippingSettings: { freeShipping: false, standardFee: 0 },
    rating: item.rating,
    reviewCount: item.reviewCount,
    status: 'approved',
    createdAt: item.viewedAt,
  };
}
