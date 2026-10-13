import { create } from 'zustand';
import type { CartItem } from '../types/domain';
import type { Coupon } from '../features/cart/utils/totals';
import { groupCartBySeller, calculateCartTotals } from '../features/cart/utils/totals';
import { isProductId } from '../features/catalog/api/product-row';
import {
  cartLineId,
  clearServerCart,
  deleteCartItem,
  fetchCart,
  pushMergedCart,
  saveCartItem,
} from '../features/cart/api/cart';

const GUEST_STORAGE_KEY = 'vd:v1:cart:guest';
const getUserStorageKey = (userId: string) => `vd:v1:cart:${userId}`;

/**
 * A signed-in customer's cart lives in Supabase; localStorage only caches the last
 * server state so a reload is not an empty shelf. A guest cart has no server rows at
 * all (cart_items is writable by authenticated customers only), so it stays local and
 * is replayed on sign-in.
 */
function readStorage(key: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const items = raw ? (JSON.parse(raw) as CartItem[]) : [];
    // Lines saved by the old mock catalogue carry product ids no row can match, and a
    // checkout would reject them. They are dropped rather than synced.
    return items.filter((item) => isProductId(item.productId));
  } catch {
    return [];
  }
}

function writeStorage(key: string, items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to cache cart items locally', err);
  }
}

const clampQuantity = (quantity: number, maxStock: number) =>
  Math.max(1, Math.min(maxStock, Math.trunc(quantity)));

interface CartState {
  items: CartItem[];
  activeUserId: string | null;
  appliedCoupon: Coupon | null;
  /** True while the server cart is being read for the first time after a sign-in. */
  hydrating: boolean;
  error: string | null;

  initializeForUser: (userId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;

  mergeGuestCartIntoUser: (userId: string) => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => {
  /**
   * Concurrency guards (QA C-2). Two mechanisms keep a server read from ever
   * clobbering a newer local mutation:
   *
   * - `revision` is bumped by every local change to `items`. A hydrate captures
   *   it before fetching; if it moved while the read was in flight — or a write
   *   is still flushing — the snapshot predates the mutation's server write, so
   *   it is discarded and a follow-up read is scheduled instead. (Before this,
   *   the late read replaced `items` and the localStorage cache wholesale:
   *   add → item shows → the in-flight read landed → the item vanished and the
   *   cart reverted to the older server state. Rapid adds and even a cart
   *   clear were lost the same way.)
   * - Writes (line saves/deletes, the guest merge) are serialised through
   *   `writeQueue` in issue order. Reads never join that queue, so a mutation
   *   never waits on a slow read; the revision guard above is what keeps the
   *   two lanes from stepping on each other.
   */
  let revision = 0;
  let writeQueue: Promise<void> = Promise.resolve();
  let pendingWrites = 0;
  let followUpReadScheduled = false;

  const enqueueWrite = (task: () => Promise<void>): Promise<void> => {
    pendingWrites += 1;
    const run = writeQueue.then(task, task);
    writeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run.then(
      () => {
        pendingWrites -= 1;
      },
      () => {
        pendingWrites -= 1;
      },
    );
  };

  /** Where the current cart is persisted locally, and whether the server holds it. */
  const storageKey = () => {
    const { activeUserId } = get();
    return activeUserId ? getUserStorageKey(activeUserId) : GUEST_STORAGE_KEY;
  };

  /** Applies a local change to the cart: caches it, publishes it, marks it newer than any in-flight read. */
  const commit = (items: CartItem[]) => {
    revision += 1;
    writeStorage(storageKey(), items);
    set({ items });
  };

  /** Re-reads the server cart once the writes that made a snapshot stale have flushed. */
  const scheduleFollowUpRead = (userId: string) => {
    if (followUpReadScheduled) return;
    followUpReadScheduled = true;
    void writeQueue.then(() => {
      followUpReadScheduled = false;
      void runHydrate(userId);
    });
  };

  /**
   * Reads the server cart into the store. A read whose snapshot turns out to be
   * older than the local state (a mutation committed, or a write is still
   * flushing) is dropped; a follow-up read converges the store once the writes
   * have landed.
   */
  const runHydrate = async (userId: string): Promise<void> => {
    if (get().activeUserId !== userId) return;
    const startRevision = revision;
    try {
      const serverItems = await fetchCart();
      // Signed out or switched accounts while the read was in flight: drop the result.
      if (get().activeUserId !== userId) return;
      if (revision !== startRevision || pendingWrites > 0) {
        scheduleFollowUpRead(userId);
        return;
      }
      writeStorage(getUserStorageKey(userId), serverItems);
      set({ items: serverItems, hydrating: false, error: null });
    } catch (err) {
      if (get().activeUserId !== userId) return;
      set({
        hydrating: false,
        error: err instanceof Error ? err.message : 'Your cart could not be loaded.',
      });
    }
  };

  /**
   * Runs a server write for the active customer, inside the write queue. A
   * rejected write means the local cart and the server disagree, so the cart is
   * re-read from the server instead of keeping a state checkout would later
   * refuse.
   */
  const runWrite = async (userId: string, write: () => Promise<unknown>): Promise<void> => {
    if (get().activeUserId !== userId) return;
    try {
      await write();
      if (get().activeUserId === userId) set({ error: null });
    } catch (err) {
      if (get().activeUserId !== userId) return;
      set({ error: err instanceof Error ? err.message : 'Your cart could not be saved.' });
      await runHydrate(userId);
    }
  };

  const sync = (userId: string | null, write: () => Promise<unknown>): Promise<void> =>
    userId ? enqueueWrite(() => runWrite(userId, write)) : Promise.resolve();

  const findLine = (items: CartItem[], itemId: string) => items.find((item) => item.id === itemId);

  return {
    items: readStorage(GUEST_STORAGE_KEY),
    activeUserId: null,
    appliedCoupon: null,
    hydrating: false,
    error: null,

    initializeForUser: async (userId) => {
      if (!userId) {
        set({ activeUserId: null, hydrating: false, error: null, items: readStorage(GUEST_STORAGE_KEY) });
        return;
      }
      // Show the cached cart immediately, then let the server correct it.
      set({ activeUserId: userId, hydrating: true, error: null, items: readStorage(getUserStorageKey(userId)) });
      await runHydrate(userId);
    },

    refresh: async () => {
      const { activeUserId } = get();
      if (!activeUserId) return;
      await runHydrate(activeUserId);
    },

    addItem: async (newItem, quantity = 1) => {
      const { items, activeUserId } = get();
      // The caller's `id` is ignored: the line is addressed by (product, variant), which
      // is also the key cart_items enforces.
      const id = cartLineId({ productId: newItem.productId, variantId: newItem.variantId });
      const existing = findLine(items, id);
      const nextQuantity = clampQuantity(
        existing ? existing.quantity + quantity : quantity,
        newItem.maxStock,
      );

      const updatedItems = existing
        ? items.map((item) => (item.id === id ? { ...item, quantity: nextQuantity } : item))
        : [...items, { ...newItem, id, quantity: nextQuantity }];

      commit(updatedItems);
      if (activeUserId) {
        await sync(activeUserId, () => saveCartItem(newItem, nextQuantity));
      }
    },

    removeItem: async (itemId) => {
      const { items, activeUserId } = get();
      const line = findLine(items, itemId);
      if (!line) return;

      commit(items.filter((item) => item.id !== itemId));
      if (activeUserId) {
        await sync(activeUserId, () =>
          deleteCartItem({ productId: line.productId, variantId: line.variantId }),
        );
      }
    },

    updateQuantity: async (itemId, quantity) => {
      const { items, activeUserId } = get();
      if (quantity <= 0) {
        await get().removeItem(itemId);
        return;
      }

      const line = findLine(items, itemId);
      if (!line) return;
      const nextQuantity = clampQuantity(quantity, line.maxStock);
      if (nextQuantity === line.quantity) return;

      commit(items.map((item) => (item.id === itemId ? { ...item, quantity: nextQuantity } : item)));
      if (activeUserId) {
        await sync(activeUserId, () =>
          saveCartItem({ productId: line.productId, variantId: line.variantId }, nextQuantity),
        );
      }
    },

    clearCart: async () => {
      const { activeUserId } = get();
      revision += 1;
      writeStorage(storageKey(), []);
      set({ items: [], appliedCoupon: null });
      if (activeUserId) {
        await sync(activeUserId, clearServerCart);
      }
    },

    applyCoupon: (coupon) => set({ appliedCoupon: coupon }),

    removeCoupon: () => set({ appliedCoupon: null }),

    mergeGuestCartIntoUser: async (userId) => {
      // The whole read-merge-push runs as one write-queue operation: sign-in
      // starts an initialize hydrate at the same time, and interleaving the two
      // used to let whichever read landed last silently replace the other.
      await enqueueWrite(async () => {
        const guestItems = readStorage(GUEST_STORAGE_KEY);
        set({ activeUserId: userId, hydrating: guestItems.length === 0, error: null });

        if (guestItems.length === 0) {
          await runHydrate(userId);
          return;
        }

        const startRevision = revision;
        const serverItems = await fetchCart().catch((err) => {
          set({ error: err instanceof Error ? err.message : 'Your cart could not be loaded.' });
          return null;
        });
        if (!serverItems) {
          commit(guestItems);
          set({ hydrating: false });
          return;
        }
        if (get().activeUserId !== userId) return;

        const merged = [...serverItems];
        for (const guestItem of guestItems) {
          const index = merged.findIndex((item) => item.id === guestItem.id);
          if (index === -1) {
            merged.push(guestItem);
            continue;
          }
          const existing = merged[index];
          merged[index] = {
            ...existing,
            quantity: clampQuantity(existing.quantity + guestItem.quantity, existing.maxStock),
          };
        }

        writeStorage(getUserStorageKey(userId), merged);
        writeStorage(GUEST_STORAGE_KEY, []);
        if (revision === startRevision) {
          revision += 1;
          set({ items: merged, hydrating: false });
        } else {
          // The customer changed the cart while the merge was reading; their
          // newer local state stays on screen and a follow-up read converges it
          // with the merged server cart once the queued writes have flushed.
          set({ hydrating: false });
          scheduleFollowUpRead(userId);
        }

        await runWrite(userId, () => pushMergedCart(merged));
      });
    },
  };
});

// Selectors for optimized component subscriptions
export const useCartGroups = () => {
  const items = useCartStore((s) => s.items);
  return groupCartBySeller(items);
};

export const useCartCalculations = () => {
  const items = useCartStore((s) => s.items);
  const coupon = useCartStore((s) => s.appliedCoupon);
  return calculateCartTotals(items, coupon);
};
