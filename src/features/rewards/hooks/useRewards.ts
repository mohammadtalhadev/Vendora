import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  applyGiftCardToOrder,
  fetchMyGiftCards,
  fetchMyRewards,
  purchaseGiftCard,
  redeemLoyaltyPoints,
  type MyRewards,
} from '../api/rewards';
import { useAuthStore } from '../../../store/auth-store';
import { orderKeys } from '../../orders/hooks/useOrders';

export const rewardsKeys = {
  all: ['rewards'] as const,
  mine: (userId: string | null | undefined) => ['rewards', 'mine', userId ?? 'anon'] as const,
  giftCards: (userId: string | null | undefined) => ['rewards', 'gift-cards', userId ?? 'anon'] as const,
};

export function useMyRewards() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: rewardsKeys.mine(userId),
    queryFn: () => fetchMyRewards(),
    enabled: Boolean(userId),
  });
}

export function useMyGiftCards() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: rewardsKeys.giftCards(userId),
    queryFn: () => fetchMyGiftCards(),
    enabled: Boolean(userId),
  });
}

export function usePurchaseGiftCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purchaseGiftCard,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardsKeys.all });
    },
  });
}

export function useRedeemLoyaltyPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: redeemLoyaltyPoints,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardsKeys.all });
    },
  });
}

export function useApplyGiftCardToOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => applyGiftCardToOrder(code, orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      void queryClient.invalidateQueries({ queryKey: rewardsKeys.all });
    },
  });
}

/**
 * A provider-free read of the caller's rewards summary, for pages that can
 * render outside the react-query tree (the affiliate page is also rendered
 * by tests with only a router). Signed-out visitors get `null` and no call
 * is made; failures leave the summary unset rather than breaking the page.
 */
export function useReferralSummary(): MyRewards | null {
  const user = useAuthStore((s) => s.user);
  const [loaded, setLoaded] = useState<{ userId: string; data: MyRewards } | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchMyRewards()
      .then((data) => {
        if (active) setLoaded({ userId: user.id, data });
      })
      .catch(() => {
        // A failed read leaves the summary unset rather than breaking the page.
      });
    return () => {
      active = false;
    };
  }, [user]);

  return user && loaded?.userId === user.id ? loaded.data : null;
}
