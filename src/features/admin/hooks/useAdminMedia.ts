import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminMediaFolder,
  deleteAdminMedia,
  deleteAdminMediaFolder,
  listAdminMediaFolders,
  listAdminMediaStores,
  moveAdminMedia,
  renameAdminMedia,
  renameAdminMediaFolder,
  uploadAdminMedia,
  type AdminMediaItem,
} from '../api/media';
import { adminKeys, useAdminScope } from './admin-keys';

/**
 * the admin side of the shared media view gets the same mutation
 * shape the vendor workspace uses - every success invalidates
 * `adminKeys.media(userId)`, which is the query both the library list and the
 * folder rows hang off, so the screen repaints from the rows now stored.
 */

function useRefreshAdminMedia() {
  const userId = useAdminScope();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.media(userId) });
}

/**
 * Every store on the platform (the New Folder picker's list) - NOT just the
 * stores that own files, so a folder can be created for a store whose library
 * is still empty. Creating a folder does not change this list, so it does not
 * ride the media invalidation; it refetches on its own schedule.
 */
export function useAdminMediaStores(enabled = true) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: [...adminKeys.media(userId), 'stores'],
    queryFn: ({ signal }) => listAdminMediaStores(signal),
    enabled: enabled && Boolean(userId),
  });
}

/** Every store's `media_folders` rows; `enabled` keeps it out of the vendor workspace. */
export function useAdminMediaFolders(enabled = true) {
  const userId = useAdminScope();
  return useQuery({
    queryKey: [...adminKeys.media(userId), 'folders'],
    queryFn: ({ signal }) => listAdminMediaFolders(signal),
    enabled: enabled && Boolean(userId),
  });
}

export function useRenameAdminMedia() {
  const refresh = useRefreshAdminMedia();
  return useMutation({
    mutationFn: ({ itemId, name }: { itemId: string; name: string }) =>
      renameAdminMedia(itemId, name),
    onSuccess: () => refresh(),
  });
}

export function useMoveAdminMedia() {
  const refresh = useRefreshAdminMedia();
  return useMutation({
    mutationFn: ({ item, folder }: { item: AdminMediaItem; folder: string }) =>
      moveAdminMedia(item, folder),
    onSuccess: () => refresh(),
  });
}

export function useDeleteAdminMedia() {
  const refresh = useRefreshAdminMedia();
  return useMutation({
    mutationFn: (itemId: string) => deleteAdminMedia(itemId),
    onSuccess: () => refresh(),
  });
}

/** A folder for a store, or for the platform itself when vendorId is null. */
export function useCreateAdminMediaFolder() {
  const refresh = useRefreshAdminMedia();
  return useMutation({
    mutationFn: ({ vendorId, name }: { vendorId: string | null; name: string }) =>
      createAdminMediaFolder(vendorId, name),
    onSuccess: () => refresh(),
  });
}

export function useRenameAdminMediaFolder() {
  const refresh = useRefreshAdminMedia();
  return useMutation({
    mutationFn: ({
      vendorId,
      oldName,
      newName,
    }: {
      vendorId: string | null;
      oldName: string;
      newName: string;
    }) => renameAdminMediaFolder(vendorId, oldName, newName),
    onSuccess: () => refresh(),
  });
}

export function useDeleteAdminMediaFolder() {
  const refresh = useRefreshAdminMedia();
  return useMutation({
    mutationFn: ({ vendorId, name }: { vendorId: string | null; name: string }) =>
      deleteAdminMediaFolder(vendorId, name),
    onSuccess: () => refresh(),
  });
}

/** A staff upload to the platform's own library or a store's. */
export function useUploadAdminMedia() {
  const refresh = useRefreshAdminMedia();
  return useMutation({
    mutationFn: ({ file, vendorId, folder }: { file: File; vendorId: string | null; folder: string }) =>
      uploadAdminMedia(file, { vendorId, folder }),
    onSuccess: () => refresh(),
  });
}
