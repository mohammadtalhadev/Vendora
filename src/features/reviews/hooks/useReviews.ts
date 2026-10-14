import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyReviews,
  fetchProductReviews,
  fetchVendorReviews,
  replyToReview,
  submitReview,
  type NewReview,
} from '../api/reviews';
import type { ReviewSort } from '../types';
import { isProductId } from '../../catalog/api/product-row';

export const reviewsKeys = {
  all: ['reviews'] as const,
  product: (productId: string, sort: ReviewSort) => ['reviews', 'product', productId, sort] as const,
  vendor: (sellerId: string) => ['reviews', 'vendor', sellerId] as const,
  mine: ['reviews', 'mine'] as const,
};

export function useProductReviews(productId: string | undefined, sort: ReviewSort = 'recent') {
  return useQuery({
    queryKey: reviewsKeys.product(productId ?? '', sort),
    queryFn: ({ signal }) => fetchProductReviews(productId as string, sort, signal),
    enabled: Boolean(productId && isProductId(productId)),
    staleTime: 1000 * 60,
  });
}

export function useVendorReviews(sellerId: string | null | undefined) {
  return useQuery({
    queryKey: reviewsKeys.vendor(sellerId ?? ''),
    queryFn: ({ signal }) => fetchVendorReviews(sellerId as string, signal),
    enabled: Boolean(sellerId),
    staleTime: 1000 * 30,
  });
}

export function useMyReviews(enabled = true) {
  return useQuery({
    queryKey: reviewsKeys.mine,
    queryFn: ({ signal }) => fetchMyReviews(signal),
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useSubmitReview(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (review: NewReview) => submitReview(review),
    onSuccess: () => {
      // The rating rollup and the verified flag are both computed by Postgres, so the
      // list and the product card are re-read rather than patched from the client.
      queryClient.invalidateQueries({ queryKey: ['reviews', 'product', productId] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'product', productId] });
    },
  });
}

export function useReplyToReview(sellerId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      replyToReview(reviewId, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewsKeys.vendor(sellerId ?? '') });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'product'] });
    },
  });
}
