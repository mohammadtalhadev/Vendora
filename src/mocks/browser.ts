import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { isSupabaseConfigured } from '../lib/supabase';

export const worker = setupWorker(...handlers);

export async function enableMocking(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const registration = await worker.start({
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
    console.info('[MSW] Mock Service Worker registered successfully', registration);
    if (isSupabaseConfigured) {
      console.warn(
        '[MSW] Supabase is configured, but the mock worker is still intercepting /api/*. ' +
          'Pages that have not been migrated to the typed Supabase client yet show mock data.',
      );
    }
  } catch (error) {
    console.warn('[MSW] Service Worker failed to start; fallback mode active', error);
  }
}
