import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignSupportTicket,
  createSupportTicket,
  fetchMyTickets,
  fetchTicketDetail,
  fetchTicketQueue,
  replySupportTicket,
  setSupportTicketStatus,
  type SupportTicketStatus,
} from '../api/tickets';
import { supportKeys, useSupportScope } from './support-keys';

/**
 * Ticket reads + writes for both desks. Like the dispute hooks, every read
 * goes to Postgres and throws on failure - an error renders as an error,
 * never as an empty queue - and every successful write invalidates the
 * support scope so the screens repaint from the rows the database now holds.
 */

export function useTicketQueue(
  params: {
    status?: string;
    mine?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const userId = useSupportScope();
  return useQuery({
    queryKey: supportKeys.ticketQueue(userId, params),
    queryFn: ({ signal }) => fetchTicketQueue(params, signal),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}

export function useTicketDetail(ticketId: string | null) {
  const userId = useSupportScope();
  return useQuery({
    queryKey: supportKeys.ticketDetail(userId, ticketId),
    queryFn: ({ signal }) => fetchTicketDetail(ticketId as string, signal),
    enabled: Boolean(userId && ticketId),
  });
}

export function useMyTickets() {
  const userId = useSupportScope();
  return useQuery({
    queryKey: supportKeys.myTickets(userId),
    queryFn: ({ signal }) => fetchMyTickets(signal),
    enabled: Boolean(userId),
  });
}

export function useTicketActions() {
  const userId = useSupportScope();
  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: supportKeys.scope(userId) });
    queryClient.invalidateQueries({ queryKey: supportKeys.all });
  };

  const refreshTicket = (ticketId: string) => {
    queryClient.invalidateQueries({ queryKey: supportKeys.ticketDetail(userId, ticketId) });
    refresh();
  };

  return {
    createTicket: useMutation({
      mutationFn: createSupportTicket,
      onSuccess: refresh,
    }),

    replyTicket: useMutation({
      mutationFn: ({
        ticketId,
        body,
        internalNote,
      }: {
        ticketId: string;
        body: string;
        internalNote?: boolean;
      }) => replySupportTicket(ticketId, body, internalNote),
      onSuccess: (_data, variables) => refreshTicket(variables.ticketId),
    }),

    assignTicket: useMutation({
      mutationFn: ({ ticketId, agentId }: { ticketId: string; agentId: string }) =>
        assignSupportTicket(ticketId, agentId),
      onSuccess: (_data, variables) => refreshTicket(variables.ticketId),
    }),

    setTicketStatus: useMutation({
      mutationFn: ({ ticketId, status }: { ticketId: string; status: SupportTicketStatus }) =>
        setSupportTicketStatus(ticketId, status),
      onSuccess: (_data, variables) => refreshTicket(variables.ticketId),
    }),
  };
}
