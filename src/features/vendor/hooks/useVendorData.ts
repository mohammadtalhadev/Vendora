import { useCallback, useMemo } from 'react';
import type { Product, SubOrderStatus, VendorProfile } from '../../../types/domain';
import { useCurrency } from '../../../store/currency-store';
import { useVendorDashboard } from './useVendorDashboard';
import {
  useCreateVendorProduct,
  useSetProductStock,
  useUpdateVendorProduct,
  useVendorProducts,
} from './useVendorProducts';
import { useAdvancePackageStatus, useVendorPackages } from './useVendorPackages';
import { useVendorStore, useUpdateVendorStore } from './useVendorStore';
import type { VendorPackage } from '../api/packages';

/** The four money tiles, formatted once so a page cannot disagree with itself. */
export interface VendorKpiMetrics {
  grossSales: string;
  grossSalesNum: number;
  commissionDeducted: string;
  commissionDeductedNum: number;
  netPayout: string;
  netPayoutNum: number;
  pendingOrders: number;
  lowStockCount: number;
}

/**
 * The workspace's shared read model, built from the vendor API. It exists so pages that
 * still ask for one object keep working while they are rewired onto the individual hooks;
 * there is no mock behind it. A query that fails stays failed, and the page shows the
 * error - the numbers on screen are the database's.
 *
 * Store switching is gone with it: the session's account owns exactly one store, decided
 * by `current_vendor_id()`, so a picker could only have relabelled the same data.
 */
export function useVendorData() {
  const { formatPrice, currency } = useCurrency();
  const store = useVendorStore();
  const dashboard = useVendorDashboard();
  const products = useVendorProducts();
  const packages = useVendorPackages();
  const advanceStatus = useAdvancePackageStatus();
  const createProduct = useCreateVendorProduct();
  const updateProduct = useUpdateVendorProduct();
  const setStock = useSetProductStock();
  const updateStore = useUpdateVendorStore();

  const activeProfile = store.data;
  const isLoading = store.isPending || dashboard.isPending || products.isPending || packages.isPending;
  const isRefreshing =
    store.isRefetching || dashboard.isRefetching || products.isRefetching || packages.isRefetching;

  const error =
    store.error ?? dashboard.error ?? products.error ?? packages.error ?? null;

  /**
   * Everything the tiles report is computed by `vendor_dashboard`. `pendingOrders` is the
   * count still sitting at `placed`, and `lowStockCount` the catalog tile the same RPC
   * already counted at the store's own threshold.
   *
   * `formatPrice` owns the symbol, the rate and the decimal count; `currency` is passed
   * explicitly only so this memo re-keys when the app's display currency changes.
   */
  const kpis: VendorKpiMetrics = useMemo(() => {
    const data = dashboard.data;
    return {
      grossSales: formatPrice(data?.kpis.grossBooked ?? 0, { currency }),
      grossSalesNum: data?.kpis.grossBooked ?? 0,
      commissionDeducted: formatPrice(data?.kpis.commission ?? 0, { currency }),
      commissionDeductedNum: data?.kpis.commission ?? 0,
      netPayout: formatPrice(data?.kpis.netPayout ?? 0, { currency }),
      netPayoutNum: data?.kpis.netPayout ?? 0,
      pendingOrders: data?.stages.placed ?? 0,
      lowStockCount: data?.catalog.lowStock ?? 0,
    };
  }, [dashboard.data, formatPrice, currency]);

  const refresh = useCallback(async () => {
    await Promise.all([
      store.refetch(),
      dashboard.refetch(),
      products.refetch(),
      packages.refetch(),
    ]);
  }, [store, dashboard, products, packages]);

  /**
   * Moves a package through the state machine. `actor` is accepted for the pages that
   * still pass it and then ignored: the database stamps the history entry with the role of
   * the signed-in account, which is the only actor it can vouch for.
   */
  const advanceOrderStatus = useCallback(
    async (subOrderId: string, nextStatus: SubOrderStatus, _actor?: string, note?: string) =>
      advanceStatus.mutateAsync({ subOrderId, nextStatus, note }),
    [advanceStatus],
  );

  /**
   * Creates or edits a listing. Server-owned columns are refused rather than dropped: a
   * page that tries to set `status`, `rating` or `reviewCount` is asking for moderation,
   * which is the platform's job (`products_insert_vendor`, `products_update_vendor`).
   */
  const saveProduct = useCallback(
    async (productData: Partial<Product> & { id?: string }) => {
      const forbidden = ['status', 'rating', 'reviewCount'].filter(
        (key) => (productData as Record<string, unknown>)[key] !== undefined,
      );
      if (forbidden.length > 0) {
        throw new Error(`${forbidden.join(', ')} is set by the platform, not by the seller.`);
      }

      const fields = {
        title: productData.title,
        slug: productData.slug,
        description: productData.description,
        brand: productData.brand,
        images: productData.images,
        price: productData.price,
        compareAtPrice: productData.compareAtPrice ?? null,
        type: productData.type,
        variants: productData.variants,
        stock: productData.stock,
        shippingSettings: productData.shippingSettings,
        digitalAssetInfo: productData.digitalAssetInfo,
        ...(productData.category !== undefined ? { categoryId: productData.category } : {}),
      };

      if (productData.id) {
        return updateProduct.mutateAsync({ productId: productData.id, updates: fields });
      }
      if (fields.title === undefined || fields.price === undefined) {
        throw new Error('A listing needs a title and a price.');
      }
      return createProduct.mutateAsync({ ...fields, title: fields.title, price: fields.price });
    },
    [createProduct, updateProduct],
  );

  const updateProductStock = useCallback(
    async (productId: string, newStock: number) => {
      await setStock.mutateAsync({ productId, stock: newStock });
    },
    [setStock],
  );

  /**
   * A seller withdraws a listing rather than deleting it. `products_delete_admin` is the
   * only delete policy, and a listing that has been ordered cannot disappear from the
   * order's history - so this refuses instead of quietly updating a local array.
   */
  const deleteProduct = useCallback(async (productId: string): Promise<never> => {
    throw new Error(
      `Listing ${productId} cannot be deleted by a store: past orders still reference it. Withdraw the listing, or ask the platform to archive it.`,
    );
  }, []);

  /** Saves the store's own settings; `status` and the commission rate belong to the platform. */
  const updateProfile = useCallback(
    async (updates: Partial<VendorProfile>) => {
      if (updates.commissionRateOverride !== undefined || updates.status !== undefined) {
        throw new Error('Only the platform can change a store status or commission rate.');
      }
      await updateStore.mutateAsync({
        storeName: updates.storeName,
        slug: updates.slug,
        description: updates.description,
        logo: updates.logo,
        banner: updates.banner,
      });
      return true;
    },
    [updateStore],
  );

  const orders: VendorPackage[] = packages.data ?? [];

  return {
    vendorId: activeProfile?.id ?? '',
    activeProfile,
    storeName: activeProfile?.storeName ?? '',
    products: products.data ?? [],
    orders,
    kpis,
    isLoading,
    isRefreshing,
    error,
    /** False until the first read lands; there is no offline mode to fall back to. */
    isLiveDb: !isLoading && !error,
    refresh,
    advanceOrderStatus,
    saveProduct,
    updateProductStock,
    deleteProduct,
    updateProfile,
  };
}

/** Re-exported so pages can type the rows they render without importing the API layer. */
export type { VendorPackage };
export type { SubOrder as VendorSubOrder } from '../../../types/domain';
