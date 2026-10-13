import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/** Vitest points the client here so a local .env can never aim the suite at a live project. */
export const TEST_SUPABASE_URL = 'http://127.0.0.1:54321';

const isTest = import.meta.env.MODE === 'test';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured =
  !isTest &&
  Boolean(
    url &&
      anonKey &&
      !url.includes('<your-project-ref>') &&
      anonKey !== 'your-supabase-anon-key-here' &&
      !anonKey.includes('<your-anon-public-key>'),
  );

/**
 * Production builds must keep rendering, even when the operator has not set the
 * Supabase environment yet. The previous import-time throw blank-screened every
 * page before the app could explain the misconfiguration.
 */
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_ANON_KEY = 'placeholder-anon-key';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  isTest ? TEST_SUPABASE_URL : isSupabaseConfigured ? (url as string) : PLACEHOLDER_URL,
  isTest ? 'test-anon-key' : isSupabaseConfigured ? (anonKey as string) : PLACEHOLDER_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
