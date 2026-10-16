import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Product } from '../../../types/domain';
import {
  createVendorProduct,
  deleteVendorProduct,
  fetchVendorProduct,
  fetchVendorProducts,
  setProductListing,
  setVendorProductStock,
  updateVendorProduct,
  type VendorProductDraft,
  type VendorProductUpdate,
} from '../api/products';
import { vendorKeys, useVendorScope } from './vendor-keys';
import { liveList } from './live-list';

/** Every listing this store owns, in any moderation state. */
export function useVendorProducts() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.products(userId),
    queryFn: ({ signal }) => fetchVendorProducts(signal),
    enabled: Boolean(userId),
    // The Products, Inventory and Import/Export boards watch this list
    // (freshness standard).
    ...liveList,
  });
}

export function useVendorProduct(productId: string) {
  return useQuery({
    queryKey: vendorKeys.product(productId),
    queryFn: ({ signal }) => fetchVendorProduct(productId, signal),
    enabled: Boolean(productId),
  });
}

/** Stock changes, listing state changes and catalog counts all move the dashboard tiles. */
function useInvalidateCatalog() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return (productId?: string) => {
    if (productId) queryClient.invalidateQueries({ queryKey: vendorKeys.product(productId) });
    queryClient.invalidateQueries({ queryKey: vendorKeys.products(userId) });
    queryClient.invalidateQueries({ queryKey: vendorKeys.dashboard(userId) });
  };
}

export function useCreateVendorProduct() {
  const invalidate = useInvalidateCatalog();

  return useMutation({
    mutationFn: (draft: VendorProductDraft) => createVendorProduct(draft),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateVendorProduct() {
  const invalidate = useInvalidateCatalog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, updates }: { productId: string; updates: VendorProductUpdate }) =>
      updateVendorProduct(productId, updates),
    onSuccess: (product: Product) => {
      // Prime the detail cache with the row the server just returned, THEN
      // invalidate. Invalidation alone left a window the edit form fell
      // into: reopening it served the pre-save cache first, the form
      // pre-filled from that stale copy, and the background refetch that
      // invalidation triggered arrived after the form had locked its
      // fields — so a save that had reached the database still "looked"
      // unsaved. With the fresh row already cached there is no stale
      // first paint to pre-fill from.
      queryClient.setQueryData(vendorKeys.product(product.id), product);
      invalidate(product.id);
    },
  });
}

export function useSetProductStock() {
  const invalidate = useInvalidateCatalog();

  return useMutation({
    mutationFn: ({ productId, stock }: { productId: string; stock: number }) =>
      setVendorProductStock(productId, stock),
    onSuccess: (product: Product) => invalidate(product.id),
  });
}

/** Hard delete via the RPC; refused listings (orders/reviews) throw the server's reason. */
export function useDeleteVendorProduct() {
  const invalidate = useInvalidateCatalog();

  return useMutation({
    mutationFn: (productId: string) => deleteVendorProduct(productId),
    onSuccess: () => invalidate(),
  });
}

/** `submit` sends a draft or rejected listing to moderation; `withdraw` returns it to draft. */
export function useSetProductListing() {
  const invalidate = useInvalidateCatalog();

  return useMutation({
    mutationFn: ({ productId, action }: { productId: string; action: 'submit' | 'withdraw' }) =>
      setProductListing(productId, action),
    onSuccess: (product: Product) => invalidate(product.id),
  });
}
