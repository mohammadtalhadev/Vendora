import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import {
  advanceDrop,
  fetchRiderBoard,
  setAvailability,
  verifyHandover,
  type RiderMove,
} from '../api/board';
import { fetchRiderHistory, fetchRiderLedger, updateRiderContact } from '../api/history';

/** The board belongs to the signed-in rider, so it is keyed by them. */
export const riderKeys = {
  all: ['rider'] as const,
  board: (userId: string | null | undefined) => ['rider', userId ?? 'anon', 'board'] as const,
  history: (userId: string | null | undefined) => ['rider', userId ?? 'anon', 'history'] as const,
  ledger: (userId: string | null | undefined) => ['rider', userId ?? 'anon', 'ledger'] as const,
};

function useRiderScope(): string | null | undefined {
  return useAuthStore((s) => s.user?.id);
}

export function useRiderBoard() {
  const userId = useRiderScope();
  return useQuery({
    queryKey: riderKeys.board(userId),
    queryFn: ({ signal }) => fetchRiderBoard(signal),
    enabled: Boolean(userId),
  });
}

/** Closed parcels (delivered + failed), read from the rider's own delivery rows. */
export function useRiderHistory() {
  const userId = useRiderScope();
  return useQuery({
    queryKey: riderKeys.history(userId),
    queryFn: ({ signal }) => fetchRiderHistory(signal),
    enabled: Boolean(userId),
  });
}

/** Every delivered parcel with its booked value and payment method, for the earnings screen. */
export function useRiderLedger() {
  const userId = useRiderScope();
  return useQuery({
    queryKey: riderKeys.ledger(userId),
    queryFn: ({ signal }) => fetchRiderLedger(signal),
    enabled: Boolean(userId),
  });
}

/**
 * Every rider action is a write against the package state machine, and every success
 * re-reads the board so the screen shows the row Postgres now holds rather than the
 * status the button was clicked for.
 */
export function useRiderActions() {
  const userId = useRiderScope();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: riderKeys.board(userId) });

  return {
    move: useMutation({
      mutationFn: ({ subOrderId, next, note }: { subOrderId: string; next: RiderMove; note?: string }) =>
        advanceDrop(subOrderId, next, note),
      onSuccess: refresh,
    }),
    handover: useMutation({
      mutationFn: ({ deliveryId, code }: { deliveryId: string; code: string }) =>
        verifyHandover(deliveryId, code),
      onSuccess: refresh,
    }),
    availability: useMutation({
      mutationFn: setAvailability,
      onSuccess: refresh,
    }),
    profile: useMutation({
      mutationFn: updateRiderContact,
      onSuccess: refresh,
    }),
  };
}
