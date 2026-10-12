import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Realtime does one job in this app: it tells a screen that its numbers are stale, and the
 * screen re-reads them from Postgres. It never carries a value the cache should keep, because
 * a client that trusted the payload over the row would be believing a copy of the database that
 * RLS had not vetted. So every subscription here ends in a query invalidation.
 *
 * These are the tables the migrations add to the `supabase_realtime` publication
 * (`20261011000300_vendora_rpc_storage_realtime.sql` and
 * `20261011001200_vendora_notification_fanout.sql`). A change to anything outside the list
 * simply never arrives, which is the difference between a live screen and a quietly stale one.
 */
const WATCHED_TABLES = [
  'orders',
  'sub_orders',
  'deliveries',
  'disputes',
  'dispute_messages',
  'notifications',
  'products',
  'vendor_profiles',
  'vendor_applications',
  'payouts',
  'vendor_strikes',
  'refunds',
  'message_threads',
  'messages',
] as const;

export type WatchedTable = (typeof WATCHED_TABLES)[number];

export interface RealtimeChange {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  /** The row after the change; null on a delete. */
  record: Record<string, unknown> | null;
  /** The row before the change; null on an insert. */
  previous: Record<string, unknown> | null;
}

export interface RealtimeWatch {
  table: WatchedTable;
  /** Postgres' own spelling, e.g. `user_id=eq.${userId}`. RLS still decides what is visible. */
  filter?: string;
  /** Called on every change; this is where a feature invalidates its own query keys. */
  onChange: (change: RealtimeChange) => void;
}

let channelSeq = 0;

/**
 * Subscribes to one table and leaves again on unmount. `onChange` is held in a ref so that a new
 * closure on each render cannot tear the channel down and rebuild it between keystrokes.
 */
export function useRealtimeWatch({ table, filter, onChange }: RealtimeWatch): void {
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    // A name per mount: two screens watching the same table must not remove each other's channel.
    const name = `vendora:${table}:${filter ?? 'all'}:${(channelSeq += 1)}`;

    const channel: RealtimeChannel = supabase
      .channel(name)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        (event) => {
          handler.current({
            eventType: (event.eventType ?? 'UPDATE') as RealtimeChange['eventType'],
            record: (event.new as Record<string, unknown> | null) ?? null,
            previous: (event.old as Record<string, unknown> | null) ?? null,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, filter]);
}
