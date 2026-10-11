import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteMedia,
  fetchMediaLibrary,
  moveMedia,
  renameMedia,
  uploadMedia,
  type VendorMediaItem,
} from '../api/media';
import { vendorKeys, useVendorScope } from './vendor-keys';

export function useMediaLibrary() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.media(userId),
    queryFn: ({ signal }) => fetchMediaLibrary(signal),
    enabled: Boolean(userId),
  });
}

function useMediaQueries() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: vendorKeys.media(userId) });
}

/** The file goes to the bucket first; a row is only recorded once the upload succeeded. */
export function useUploadMedia() {
  const refresh = useMediaQueries();

  return useMutation({
    mutationFn: ({ file, folder }: { file: File; folder?: string }) => uploadMedia(file, folder),
    onSuccess: () => refresh(),
  });
}

export function useRenameMedia() {
  const refresh = useMediaQueries();

  return useMutation({
    mutationFn: ({ itemId, name }: { itemId: string; name: string }) => renameMedia(itemId, name),
    onSuccess: () => refresh(),
  });
}

export function useMoveMedia() {
  const refresh = useMediaQueries();

  return useMutation({
    mutationFn: ({ itemId, folder }: { itemId: string; folder: string }) => moveMedia(itemId, folder),
    onSuccess: () => refresh(),
  });
}

export function useDeleteMedia() {
  const refresh = useMediaQueries();

  return useMutation({
    mutationFn: (itemId: string) => deleteMedia(itemId),
    onSuccess: () => refresh(),
  });
}

export type { VendorMediaItem };
