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

/** Every listing this store owns, in any moderation state. */
export function useVendorProducts() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.products(userId),
    queryFn: ({ signal }) => fetchVendorProducts(signal),
    enabled: Boolean(userId),
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

  return useMutation({
    mutationFn: ({ productId, updates }: { productId: string; updates: VendorProductUpdate }) =>
      updateVendorProduct(productId, updates),
    onSuccess: (product: Product) => invalidate(product.id),
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
