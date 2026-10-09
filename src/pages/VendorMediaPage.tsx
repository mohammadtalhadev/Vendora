import React, { useState } from 'react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { ProductFormModal } from '../features/vendor/components/ProductFormModal';
import { MediaManagementView } from '../features/media/MediaManagementView';
import { useAuthStore } from '../store/auth-store';

export const VendorMediaPage: React.FC = () => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const { user } = useAuthStore();
  const vendorId = user?.vendorId ?? 'vendor-tech-1';
  const vendorName = user?.name ? `${user.name.split(' ')[0]} Electronics` : 'Nova Electronics';

  return (
    <WorkspaceLayout
      role="vendor"
      roleBadgeText="VENDOR PARTNER"
      sidebar={<VendorNav onOpenAddProduct={() => setIsProductModalOpen(true)} />}
    >
      <MediaManagementView mode="vendor" vendorId={vendorId} vendorName={vendorName} />

      <ProductFormModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
      />
    </WorkspaceLayout>
  );
};
