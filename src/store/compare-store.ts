import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '../types/domain';

interface CompareState {
  items: Product[];
  addItem: (product: Product) => boolean;
  removeItem: (productId: string) => void;
  clearCompare: () => void;
  isInCompare: (productId: string) => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const { items } = get();
        if (items.some((item) => item.id === product.id)) {
          return false;
        }
        if (items.length >= 4) {
          return false; // Capped at 4 items per PRD specification
        }
        set({ items: [...items, product] });
        return true;
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },

      clearCompare: () => {
        set({ items: [] });
      },

      isInCompare: (productId) => {
        return get().items.some((item) => item.id === productId);
      },
    }),
    {
      name: 'vd:v1:compare',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
