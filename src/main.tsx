import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/base.css';
import { router } from './app/router';
import { SmoothScrollProvider } from './components/SmoothScrollProvider';
import { GlobalCarouselArrows } from './components/GlobalCarouselArrows';
import { AuthProvider } from './lib/auth-context';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { isSupabaseConfigured } from './lib/supabase';
import { reloadOnceForNewVersion } from './lib/chunk-recovery';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Prevents sudden refetch when switching windows or tabs
      refetchOnReconnect: false,   // Prevents sudden refetch on network jitter
    },
  },
});

/**
 * Shown instead of the storefront when the Supabase env vars are missing, so a
 * misconfigured deployment explains itself instead of white-screening (which
 * is what the old import-time throw in lib/supabase did to production).
 */
function ConfigErrorScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-[#0b1120]">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
          Vendora is not configured
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          This deployment is missing its Supabase connection. The site operator needs to set{' '}
          <code className="font-mono text-[13px] text-slate-800 dark:text-slate-200">
            VITE_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code className="font-mono text-[13px] text-slate-800 dark:text-slate-200">
            VITE_SUPABASE_ANON_KEY
          </code>{' '}
          in the environment variables (see <span className="font-mono text-[13px]">.env.example</span>)
          and redeploy.
        </p>
      </div>
    </div>
  );
}

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        {isSupabaseConfigured ? (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SmoothScrollProvider>
                <GlobalCarouselArrows />
                <RouterProvider router={router} />
              </SmoothScrollProvider>
            </AuthProvider>
          </QueryClientProvider>
        ) : (
          <ConfigErrorScreen />
        )}
      </ErrorBoundary>
    </StrictMode>,
  );
}

// Vite fires `vite:preloadError` when a lazy chunk cannot be loaded — in
// practice that means this tab predates the current deployment and asked for
// a hashed file that no longer exists. One guarded reload picks up the fresh
// index.html instead of surfacing a broken page (see lib/chunk-recovery; the
// lazy wrapper in app/router handles the same failure on the import path).
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadOnceForNewVersion();
});

// Every read and write goes to the real Supabase database through the typed
// features/** APIs — there is no mock layer in any mode, so the app renders
// immediately.
renderApp();
