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

if (!isSupabaseConfigured && !isTest) {
  throw new Error(
    'Supabase is not configured: set valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example).',
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  isTest ? TEST_SUPABASE_URL : (url as string),
  isTest ? 'test-anon-key' : (anonKey as string),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
