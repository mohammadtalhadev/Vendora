import { create } from 'zustand';
import type { DeliveryChoice } from '../api/checkout';

interface CheckoutDraftState {
  /** sellerId (a `vendor_profiles` id) -> the service chosen for that package. */
  deliveryOptions: Record<string, DeliveryChoice>;
  chooseDeliveryOption: (sellerId: string, option: DeliveryChoice) => void;
  reset: () => void;
}

/**
 * The delivery choices live here rather than in the form component because the summary
 * sidebar and the accordion both show the same quoted total, and a quote is only
 * re-fetched once for identical keys.
 */
export const useCheckoutDraftStore = create<CheckoutDraftState>((set) => ({
  deliveryOptions: {},
  chooseDeliveryOption: (sellerId, option) =>
    set((state) => ({ deliveryOptions: { ...state.deliveryOptions, [sellerId]: option } })),
  reset: () => set({ deliveryOptions: {} }),
}));
