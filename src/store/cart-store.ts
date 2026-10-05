import { create } from 'zustand';
import type { CartItem } from '../types/domain';
import type { Coupon } from '../features/cart/utils/totals';
import { groupCartBySeller, calculateCartTotals } from '../features/cart/utils/totals';

const GUEST_STORAGE_KEY = 'vd:v1:cart:guest';
const getUserStorageKey = (userId: string) => `vd:v1:cart:${userId}`;

function loadCartFromStorage(storageKey: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCartToStorage(storageKey: string, items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to persist cart items to localStorage', err);
  }
}

interface CartState {
  items: CartItem[];
  activeUserId: string | null;
  appliedCoupon: Coupon | null;

  // Actions
  initializeForUser: (userId: string | null) => void;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;

  // Merge logic on login
  mergeGuestCartIntoUser: (userId: string) => void;
}

export const useCartStore = create<CartState>((set, get) => {
  // Initial load for guest
  const initialItems = loadCartFromStorage(GUEST_STORAGE_KEY);

  return {
    items: initialItems,
    activeUserId: null,
    appliedCoupon: null,

    initializeForUser: (userId) => {
      const storageKey = userId ? getUserStorageKey(userId) : GUEST_STORAGE_KEY;
      const loadedItems = loadCartFromStorage(storageKey);
      set({ items: loadedItems, activeUserId: userId });
    },

    addItem: (newItem, quantity = 1) => {
      const { items, activeUserId } = get();
      const existingIndex = items.findIndex((i) => i.id === newItem.id);

      let updatedItems: CartItem[];
      if (existingIndex > -1) {
        const existing = items[existingIndex];
        const newQty = Math.min(existing.maxStock, existing.quantity + quantity);
        updatedItems = [...items];
        updatedItems[existingIndex] = { ...existing, quantity: newQty };
      } else {
        const itemToAdd: CartItem = {
          ...newItem,
          quantity: Math.min(newItem.maxStock, Math.max(1, quantity)),
        };
        updatedItems = [...items, itemToAdd];
      }

      const storageKey = activeUserId ? getUserStorageKey(activeUserId) : GUEST_STORAGE_KEY;
      saveCartToStorage(storageKey, updatedItems);
      set({ items: updatedItems });
    },

    removeItem: (itemId) => {
      const { items, activeUserId } = get();
      const updatedItems = items.filter((i) => i.id !== itemId);
      const storageKey = activeUserId ? getUserStorageKey(activeUserId) : GUEST_STORAGE_KEY;
      saveCartToStorage(storageKey, updatedItems);
      set({ items: updatedItems });
    },

    updateQuantity: (itemId, quantity) => {
      const { items, activeUserId } = get();
      if (quantity <= 0) {
        get().removeItem(itemId);
        return;
      }

      const updatedItems = items.map((i) => {
        if (i.id === itemId) {
          return { ...i, quantity: Math.min(i.maxStock, quantity) };
        }
        return i;
      });

      const storageKey = activeUserId ? getUserStorageKey(activeUserId) : GUEST_STORAGE_KEY;
      saveCartToStorage(storageKey, updatedItems);
      set({ items: updatedItems });
    },

    clearCart: () => {
      const { activeUserId } = get();
      const storageKey = activeUserId ? getUserStorageKey(activeUserId) : GUEST_STORAGE_KEY;
      saveCartToStorage(storageKey, []);
      set({ items: [], appliedCoupon: null });
    },

    applyCoupon: (coupon) => {
      set({ appliedCoupon: coupon });
    },

    removeCoupon: () => {
      set({ appliedCoupon: null });
    },

    mergeGuestCartIntoUser: (userId: string) => {
      const guestItems = loadCartFromStorage(GUEST_STORAGE_KEY);
      if (guestItems.length === 0) {
        get().initializeForUser(userId);
        return;
      }

      const userItems = loadCartFromStorage(getUserStorageKey(userId));
      const mergedMap = new Map<string, CartItem>();

      // Populate existing user items
      for (const item of userItems) {
        mergedMap.set(item.id, { ...item });
      }

      // Merge guest items
      for (const guestItem of guestItems) {
        const existing = mergedMap.get(guestItem.id);
        if (existing) {
          existing.quantity = Math.min(existing.maxStock, existing.quantity + guestItem.quantity);
        } else {
          mergedMap.set(guestItem.id, { ...guestItem });
        }
      }

      const mergedList = Array.from(mergedMap.values());
      saveCartToStorage(getUserStorageKey(userId), mergedList);
      // Clear guest cart
      saveCartToStorage(GUEST_STORAGE_KEY, []);

      set({
        items: mergedList,
        activeUserId: userId,
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
