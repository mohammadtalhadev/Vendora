import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ThreadStatus, VendorMessage } from '../api/messages';
import {
  fetchThreadMessages,
  fetchVendorThreads,
  markThreadRead,
  sendThreadMessage,
  setThreadStatus,
} from '../api/messages';
import { vendorKeys, useVendorScope } from './vendor-keys';

/** Threads for this store, each with its newest message and unread count. */
export function useVendorThreads() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.threads(userId),
    queryFn: ({ signal }) => fetchVendorThreads(signal),
    enabled: Boolean(userId),
  });
}

export function useThreadMessages(threadId: string) {
  return useQuery({
    queryKey: vendorKeys.thread(threadId),
    queryFn: ({ signal }) => fetchThreadMessages(threadId, signal),
    enabled: Boolean(threadId),
  });
}

function useThreadQueries() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return (threadId?: string) => {
    if (threadId) queryClient.invalidateQueries({ queryKey: vendorKeys.thread(threadId) });
    queryClient.invalidateQueries({ queryKey: vendorKeys.threads(userId) });
    queryClient.invalidateQueries({ queryKey: vendorKeys.dashboard(userId) });
  };
}

export function useSendThreadMessage() {
  const refresh = useThreadQueries();

  return useMutation({
    mutationFn: ({ threadId, body }: { threadId: string; body: string }) =>
      sendThreadMessage(threadId, body),
    onSuccess: (message: VendorMessage) => refresh(message.threadId),
  });
}

export function useSetThreadStatus() {
  const refresh = useThreadQueries();

  return useMutation({
    mutationFn: ({ threadId, status }: { threadId: string; status: ThreadStatus }) =>
      setThreadStatus(threadId, status),
    onSuccess: () => refresh(),
  });
}

export function useMarkThreadRead() {
  const refresh = useThreadQueries();

  return useMutation({
    mutationFn: (threadId: string) => markThreadRead(threadId),
    onSuccess: (_count, threadId) => refresh(threadId),
  });
}
