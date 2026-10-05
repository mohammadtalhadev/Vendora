import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '../types/domain';

export interface WishlistState {
  items: Product[];
  lastSnapshot: Product[] | null;
  toggleWishlist: (
    product: Product,
    syncFn?: () => Promise<unknown>,
  ) => Promise<void> | void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  rollback: () => void;
  removeItem: (productId: string) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      lastSnapshot: null,

      toggleWishlist: (product: Product, syncFn?: () => Promise<unknown>) => {
        const previousItems = get().items;
        const exists = previousItems.some((item) => item.id === product.id);
        const updatedItems = exists
          ? previousItems.filter((item) => item.id !== product.id)
          : [...previousItems, product];

        set({
          items: updatedItems,
          lastSnapshot: previousItems,
        });

        if (syncFn) {
          return (async () => {
            try {
              await syncFn();
            } catch (error) {
              set({
                items: previousItems,
                lastSnapshot: null,
              });
              throw error;
            }
          })();
        }
      },

      isInWishlist: (productId: string) => {
        return get().items.some((item) => item.id === productId);
      },

      clearWishlist: () => {
        const previousItems = get().items;
        set({
          items: [],
          lastSnapshot: previousItems,
        });
      },

      rollback: () => {
        const { lastSnapshot } = get();
        if (lastSnapshot !== null) {
          set({
            items: lastSnapshot,
            lastSnapshot: null,
          });
        }
      },

      removeItem: (productId: string) => {
        const previousItems = get().items;
        set({
          items: previousItems.filter((item) => item.id !== productId),
          lastSnapshot: previousItems,
        });
      },
    }),
    {
      name: 'vd:v1:wishlist',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
