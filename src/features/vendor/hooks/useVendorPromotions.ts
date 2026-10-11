import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPromotion,
  deletePromotion,
  fetchVendorPromotions,
  setPromotionActive,
  updatePromotion,
  type PromotionDraft,
  type PromotionUpdate,
} from '../api/promotions';
import { vendorKeys, useVendorScope } from './vendor-keys';

export type { VendorPromotion } from '../api/promotions';

/** The store's campaigns. Redemption counts come from the database and are not editable. */
export function useVendorPromotions() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.promotions(userId),
    queryFn: ({ signal }) => fetchVendorPromotions(signal),
    enabled: Boolean(userId),
  });
}

function usePromotionQueries() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: vendorKeys.promotions(userId) });
    // The dashboard badge counts active campaigns.
    queryClient.invalidateQueries({ queryKey: vendorKeys.dashboard(userId) });
  };
}

export function useCreatePromotion() {
  const refresh = usePromotionQueries();

  return useMutation({
    mutationFn: (draft: PromotionDraft) => createPromotion(draft),
    onSuccess: () => refresh(),
  });
}

export function useUpdatePromotion() {
  const refresh = usePromotionQueries();

  return useMutation({
    mutationFn: ({ promotionId, updates }: { promotionId: string; updates: PromotionUpdate }) =>
      updatePromotion(promotionId, updates),
    onSuccess: () => refresh(),
  });
}

export function useSetPromotionActive() {
  const refresh = usePromotionQueries();

  return useMutation({
    mutationFn: ({ promotionId, active }: { promotionId: string; active: boolean }) =>
      setPromotionActive(promotionId, active),
    onSuccess: () => refresh(),
  });
}

export function useDeletePromotion() {
  const refresh = usePromotionQueries();

  return useMutation({
    mutationFn: (promotionId: string) => deletePromotion(promotionId),
    onSuccess: () => refresh(),
  });
}
