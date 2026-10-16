import { useMutation, useQueryClient } from '@tanstack/react-query';
import { issueStrike, reviewApplication, setVendorCommission, setVendorStatus } from '../api/vendors';
import { assignModerator, createFirstPartyProduct, moderateProducts } from '../api/moderation';
import { escalateDispute, refundSubOrder, resolveDispute } from '../api/disputes';
import { setUserRoles, setUserStatus } from '../api/users';
import {
  assignProductCategory,
  createCategory,
  deleteCategory,
  setCategoryCommission,
  updateCategory,
} from '../api/categories';
import { createBrand, deleteBrand, renameBrand, updateBrand } from '../api/brands';
import { setGlobalCommission } from '../api/commission';
import { savePlatformSettings, type PlatformSettingsPatch } from '../api/settings';
import { setMediaStatus, type MediaStatus } from '../api/media';
import { confirmCodHandover, inviteRider, setRiderApproval, type RiderInviteInput } from '../api/logistics';
import { adminKeys, useAdminScope } from './admin-keys';

/**
 * Every action here returns to Postgres, and every success invalidates the console's
 * reads so the screen repaints from the rows the database now holds - not from what
 * the form intended. A rejected write surfaces its message and leaves the queue alone.
 */
export function useAdminActions() {
  const userId = useAdminScope();
  const queryClient = useQueryClient();

  /** The overview quotes counts from every queue, so any decision moves it. */
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.scope(userId) });
    queryClient.invalidateQueries({ queryKey: adminKeys.all });
  };

  /** A taxonomy write is also a write against the listings counted into the tree. */
  const refreshCategories = () => {
    refresh();
    queryClient.invalidateQueries({ queryKey: adminKeys.categories(userId) });
  };

  /** A brand write moves the merged registry + catalog directory the page reads. */
  const refreshBrands = () => {
    refresh();
    queryClient.invalidateQueries({ queryKey: adminKeys.brands(userId) });
  };

  /** A rate change moves the ledger for every window it is read over. */
  const refreshCommission = () => {
    refresh();
    queryClient.invalidateQueries({ queryKey: adminKeys.commission(userId) });
  };

  return {
    /** Confirms the desk received a rider's COD cash; the settlements list re-reads. */
    confirmCodHandover: useMutation({
      mutationFn: (deliveryId: string) => confirmCodHandover(deliveryId),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: adminKeys.codSettlements(userId) });
        refresh();
      },
    }),
    /** Invites a rider by email; the fleet roster re-reads so the new rider appears. */
    inviteRider: useMutation({
      mutationFn: (input: RiderInviteInput) => inviteRider(input),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: adminKeys.logistics(userId) });
        refresh();
      },
    }),
    /**
     * The desk's decision on a rider application: the applications
     * list and the fleet board both re-read — an approval moves the applicant
     * onto the roster, a rejection takes the application off the desk.
     */
    setRiderApproval: useMutation({
      mutationFn: ({ userId: applicantId, approve }: { userId: string; approve: boolean }) =>
        setRiderApproval(applicantId, approve),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: adminKeys.riderApplications(userId) });
        void queryClient.invalidateQueries({ queryKey: adminKeys.logistics(userId) });
        refresh();
      },
    }),
    setVendorStatus: useMutation({
      mutationFn: ({ vendorId, status, note }: { vendorId: string; status: 'active' | 'suspended'; note?: string }) =>
        setVendorStatus(vendorId, status, note),
      onSuccess: refresh,
    }),
    setVendorCommission: useMutation({
      mutationFn: ({ vendorId, rate }: { vendorId: string; rate: number | null }) =>
        setVendorCommission(vendorId, rate),
      onSuccess: refresh,
    }),
    issueStrike: useMutation({
      mutationFn: ({ vendorId, reason, note }: { vendorId: string; reason: string; note?: string }) =>
        issueStrike(vendorId, reason, note),
      onSuccess: refresh,
    }),
    reviewApplication: useMutation({
      mutationFn: ({
        applicationId,
        decision,
        note,
      }: {
        applicationId: string;
        decision: 'approved' | 'rejected' | 'under_review';
        note?: string;
      }) => reviewApplication(applicationId, decision, note),
      onSuccess: refresh,
    }),
    moderateProducts: useMutation({
      mutationFn: ({
        productIds,
        status,
        reason,
      }: {
        productIds: string[];
        status: 'approved' | 'rejected' | 'archived' | 'pending_review';
        reason?: string;
      }) => moderateProducts(productIds, status, reason),
      onSuccess: refresh,
    }),
    assignModerator: useMutation({
      mutationFn: ({ productId, moderatorId }: { productId: string; moderatorId: string }) =>
        assignModerator(productId, moderatorId),
      onSuccess: refresh,
    }),
    createFirstPartyProduct: useMutation({
      mutationFn: createFirstPartyProduct,
      onSuccess: refresh,
    }),
    escalateDispute: useMutation({
      mutationFn: ({ disputeId, note }: { disputeId: string; note?: string }) =>
        escalateDispute(disputeId, note),
      onSuccess: refresh,
    }),
    resolveDispute: useMutation({
      mutationFn: ({
        disputeId,
        outcome,
        note,
        amount,
      }: {
        disputeId: string;
        outcome: 'resolved_refund' | 'resolved_denied';
        note: string;
        amount?: number | null;
      }) => resolveDispute(disputeId, outcome, note, amount),
      onSuccess: refresh,
    }),
    refundSubOrder: useMutation({
      mutationFn: ({ subOrderId, amount, reason }: { subOrderId: string; amount: number; reason: string }) =>
        refundSubOrder(subOrderId, amount, reason),
      onSuccess: refresh,
    }),
    setUserStatus: useMutation({
      mutationFn: ({ userId: target, status, reason }: { userId: string; status: 'active' | 'suspended' | 'banned'; reason?: string }) =>
        setUserStatus(target, status, reason),
      onSuccess: refresh,
    }),
    setUserRoles: useMutation({
      mutationFn: ({ userId: target, roles }: { userId: string; roles: string[] }) =>
        setUserRoles(target, roles),
      onSuccess: refresh,
    }),
    createCategory: useMutation({
      mutationFn: ({
        name,
        slug,
        parentId,
        icon,
        image,
      }: {
        name: string;
        slug: string;
        parentId?: string | null;
        icon?: string | null;
        image?: string | null;
      }) => createCategory({ name, slug, parentId, icon, image }),
      onSuccess: refreshCategories,
    }),
    updateCategory: useMutation({
      mutationFn: ({
        categoryId,
        name,
        slug,
        parentId,
        isActive,
        icon,
        image,
        clearImage,
      }: {
        categoryId: string;
        name?: string;
        slug?: string;
        parentId?: string | null;
        isActive?: boolean | null;
        icon?: string | null;
        image?: string | null;
        clearImage?: boolean;
      }) => updateCategory({ categoryId, name, slug, parentId, isActive, icon, image, clearImage }),
      onSuccess: refreshCategories,
    }),
    /** The RPC refuses while listings or subcategories still point at the category. */
    deleteCategory: useMutation({
      mutationFn: (categoryId: string) => deleteCategory(categoryId),
      onSuccess: refreshCategories,
    }),
    assignProductCategory: useMutation({
      mutationFn: ({ productId, categoryId }: { productId: string; categoryId: string | null }) =>
        assignProductCategory(productId, categoryId),
      // Both the tree's counts and the moderation queue's category column follow.
      onSuccess: () => {
        refreshCategories();
        queryClient.invalidateQueries({ queryKey: adminKeys.moderation(userId, {}) });
      },
    }),
    createBrand: useMutation({
      mutationFn: ({
        name,
        logoUrl,
        description,
      }: {
        name: string;
        logoUrl?: string | null;
        description?: string | null;
      }) => createBrand({ name, logoUrl, description }),
      onSuccess: refreshBrands,
    }),
    updateBrand: useMutation({
      mutationFn: ({
        id,
        name,
        logoUrl,
        description,
        isActive,
      }: {
        id: string;
        name?: string;
        logoUrl?: string | null;
        description?: string | null;
        isActive?: boolean | null;
      }) => updateBrand({ id, name, logoUrl, description, isActive }),
      onSuccess: refreshBrands,
    }),
    /** Re-letters every product carrying the old name, in any status. */
    renameBrand: useMutation({
      mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
        renameBrand(oldName, newName),
      onSuccess: refreshBrands,
    }),
    /** The RPC refuses while any product still carries the brand name. */
    deleteBrand: useMutation({
      mutationFn: (id: string) => deleteBrand(id),
      onSuccess: refreshBrands,
    }),
    setGlobalCommission: useMutation({
      mutationFn: (rate: number) => setGlobalCommission(rate),
      onSuccess: refreshCommission,
    }),
    /** `null` clears the override, which returns the category to the platform default. */
    setCategoryCommission: useMutation({
      mutationFn: ({ categoryId, rate }: { categoryId: string; rate: number | null }) =>
        setCategoryCommission(categoryId, rate),
      onSuccess: () => {
        refreshCommission();
        queryClient.invalidateQueries({ queryKey: adminKeys.categories(userId) });
      },
    }),
    savePlatformSettings: useMutation({
      mutationFn: (patch: PlatformSettingsPatch) => savePlatformSettings(patch),
      onSuccess: () => {
        refresh();
        queryClient.invalidateQueries({ queryKey: adminKeys.settings(userId) });
      },
    }),
    setMediaStatus: useMutation({
      mutationFn: ({ itemId, status }: { itemId: string; status: MediaStatus }) =>
        setMediaStatus(itemId, status),
      onSuccess: () => {
        refresh();
        queryClient.invalidateQueries({ queryKey: adminKeys.media(userId) });
      },
    }),
  };
}
