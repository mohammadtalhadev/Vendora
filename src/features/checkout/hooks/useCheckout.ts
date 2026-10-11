import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartSignature, placeOrder, quoteCheckout } from '../api/checkout';
import type { DeliveryChoice, PlaceOrderInput } from '../api/checkout';
import { orderKeys } from '../../orders/hooks/useOrders';
import { useAuthStore } from '../../../store/auth-store';
import { useCartStore } from '../../../store/cart-store';
import { useCheckoutDraftStore } from '../store/checkout-draft';

export const checkoutKeys = {
  all: ['checkout'] as const,
  quote: (
    cartSignature: string,
    deliveryOptions: Record<string, DeliveryChoice>,
    couponCode: string | null,
  ) => ['checkout', 'quote', cartSignature, deliveryOptions, couponCode] as const,
};

/**
 * The bill for the cart as the database sees it. `cartSignature` is part of the key because
 * the quote is priced from the *stored* cart: a quantity change must re-price it, and the
 * RPC itself takes no line items. Guests get no query - checkout cannot price a cart that
 * lives only in their browser, and an error there would be noise.
 */
export function useCheckoutQuote(
  cartSignature: string,
  deliveryOptions: Record<string, DeliveryChoice>,
  couponCode: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: checkoutKeys.quote(cartSignature, deliveryOptions, couponCode),
    queryFn: ({ signal }) => quoteCheckout(deliveryOptions, couponCode, signal),
    enabled,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlaceOrderInput) => placeOrder(input),
    onSuccess: async () => {
      // place_order empties the customer's cart in the same transaction as the booking,
      // so the local cache is told to agree rather than left holding sold-out lines.
      await useCartStore.getState().clearCart();
      useCheckoutDraftStore.getState().reset();
      queryClient.removeQueries({ queryKey: checkoutKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

/**
 * The checkout quote for the current cart, delivery choices and coupon. Both halves of the
 * checkout page call this, and one request is made because the key is identical.
 */
export function useCheckoutTotals() {
  const signature = useCartStore((state) => cartSignature(state.items));
  const couponCode = useCartStore((state) => state.appliedCoupon?.code ?? null);
  const deliveryOptions = useCheckoutDraftStore((state) => state.deliveryOptions);
  const userId = useAuthStore((state) => state.user?.id);

  return useCheckoutQuote(signature, deliveryOptions, couponCode, Boolean(userId));
}
