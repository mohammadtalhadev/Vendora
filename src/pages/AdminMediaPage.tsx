import React from 'react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { MediaManagementView } from '../features/media/MediaManagementView';

export const AdminMediaPage: React.FC = () => {
  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="File & Media Management"
      subtitle="Centralized asset repository. Organize platform media, product imagery, vendor uploads, legal documents, and marketing assets."
      sidebar={<AdminNav />}
    >
      <MediaManagementView mode="admin" />
    </WorkspaceLayout>
  );
};
