import { create } from 'zustand';
import type { Product } from '../types/domain';
import { isProductId } from '../features/catalog/api/product-row';
import {
  addWishlistItem,
  clearServerWishlist,
  fetchWishlist,
  pushGuestWishlist,
  removeWishlistItem,
} from '../features/wishlist/api/wishlist';

const GUEST_STORAGE_KEY = 'vd:v1:wishlist:guest';
const getUserStorageKey = (userId: string) => `vd:v1:wishlist:${userId}`;
/** The single key the pre-Supabase build used; its items are re-keyed once, then removed. */
const LEGACY_STORAGE_KEY = 'vd:v1:wishlist';

/**
 * A signed-in customer's wishlist is a wishlist_items table read; localStorage only caches
 * the last server state so a reload is not a blank shelf. A guest has no server rows
 * (wishlist_items is writable by authenticated customers only), so their saves stay on the
 * device until they sign in.
 */
function readStorage(key: string): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const items = raw ? (JSON.parse(raw) as Product[]) : [];
    return items.filter((item) => isProductId(item.id));
  } catch {
    return [];
  }
}

function writeStorage(key: string, items: Product[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to cache wishlist items locally', err);
  }
}

function takeLegacyGuestItems(): Product[] {
  const items = readStorage(LEGACY_STORAGE_KEY);
  if (items.length === 0) return [];
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  return items;
}

interface WishlistState {
  items: Product[];
  activeUserId: string | null;
  hydrating: boolean;
  error: string | null;

  loadWishlistForUser: (userId: string) => Promise<void>;
  /** Signed out: the device's own saves, with anything synced on a previous visit kept. */
  initializeForGuest: () => void;
  toggleWishlist: (product: Product) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refresh: () => Promise<void>;
}

export const useWishlistStore = create<WishlistState>((set, get) => {
  const storageKey = () => {
    const { activeUserId } = get();
    return activeUserId ? getUserStorageKey(activeUserId) : GUEST_STORAGE_KEY;
  };

  const commit = (items: Product[]) => {
    writeStorage(storageKey(), items);
    set({ items });
  };

  const hydrate = async (userId: string) => {
    try {
      const serverItems = await fetchWishlist();
      if (get().activeUserId !== userId) return;
      writeStorage(getUserStorageKey(userId), serverItems);
      set({ items: serverItems, hydrating: false, error: null });
    } catch (err) {
      if (get().activeUserId !== userId) return;
      set({
        hydrating: false,
        error: err instanceof Error ? err.message : 'Your wishlist could not be loaded.',
      });
    }
  };

  /**
   * A rejected write means the device and the server disagree about what is saved, so the
   * list is re-read from the server instead of showing a heart that points at nothing.
   */
  const sync = async (userId: string | null, write: () => Promise<void>) => {
    if (!userId) return;
    try {
      await write();
      set({ error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Your wishlist could not be saved.' });
      await hydrate(userId);
    }
  };

  const guestItems = (): Product[] => {
    const stored = readStorage(GUEST_STORAGE_KEY);
    const legacy = takeLegacyGuestItems();
    const byId = new Map<string, Product>();
    for (const item of [...legacy, ...stored]) byId.set(item.id, item);
    return [...byId.values()];
  };

  return {
    items: guestItems(),
    activeUserId: null,
    hydrating: false,
    error: null,

    initializeForGuest: () => {
      set({
        activeUserId: null,
        hydrating: false,
        error: null,
        items: guestItems(),
      });
    },

    loadWishlistForUser: async (userId) => {
      const guest = get().items;
      set({ activeUserId: userId, hydrating: true, error: null });

      const cached = readStorage(getUserStorageKey(userId));
      if (cached.length > 0) set({ items: cached });

      // Saves made on this device come with the account; the server stays the authority on
      // everything else, so a signed-in list is never a device-only list.
      if (guest.length > 0) {
        try {
          await pushGuestWishlist(guest.map((item) => item.id));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Your saved items could not be synced.' });
        }
        writeStorage(GUEST_STORAGE_KEY, []);
      }

      await hydrate(userId);
    },

    refresh: async () => {
      const { activeUserId } = get();
      if (activeUserId) await hydrate(activeUserId);
    },

    toggleWishlist: async (product) => {
      const { items, activeUserId } = get();
      const exists = items.some((item) => item.id === product.id);
      const updated = exists
        ? items.filter((item) => item.id !== product.id)
        : [product, ...items];

      commit(updated);
      await sync(
        activeUserId,
        exists ? () => removeWishlistItem(product.id) : () => addWishlistItem(product.id),
      );
    },

    removeItem: async (productId) => {
      const { items, activeUserId } = get();
      if (!items.some((item) => item.id === productId)) return;

      commit(items.filter((item) => item.id !== productId));
      await sync(activeUserId, () => removeWishlistItem(productId));
    },

    clearWishlist: async () => {
      const { activeUserId } = get();
      commit([]);
      if (activeUserId) await sync(activeUserId, clearServerWishlist);
    },

    isInWishlist: (productId) => get().items.some((item) => item.id === productId),
  };
});
