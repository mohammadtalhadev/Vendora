import React, { useState } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { RefreshCw, Home } from 'lucide-react';
import { isChunkLoadError, clearChunkReloadGuard } from '../../lib/chunk-recovery';
import { captureException } from '../../lib/error-reporter';

/**
 * The router's errorElement for every top-level route. Two audiences:
 *
 * - A stale tab after a redeploy (chunk-load failure): the copy says plainly
 *   that Vendora was updated and one reload fixes it — because it does.
 * - Any other route error: a calm generic screen with a way out, never React
 *   Router's default "Unexpected Application Error! Hey developer" page.
 *
 * This component must stay import-light (no lazy pages, no data hooks): it
 * renders precisely when the rest of the app may have failed to load.
 */
export const RouteErrorScreen: React.FC = () => {
  const error = useRouteError();
  const chunkError = isChunkLoadError(error);
  const status = isRouteErrorResponse(error) ? error.status : null;

  // The raw error is never rendered — it can carry service
  // internals. Instead the failure is reported and the user gets a short
  // reference they can quote to support. Chunk errors self-heal by reload
  // and plain 404s are navigation, not faults, so neither is reported.
  const [reference] = useState(() =>
    chunkError || status === 404
      ? undefined
      : captureException(error, { source: 'route-error' }),
  );

  const handleReload = () => {
    clearChunkReloadGuard();
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-[#0b1120]">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
          {chunkError ? 'Vendora just updated' : 'Something went wrong'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {chunkError
            ? 'A new version of the site went live while this tab was open, so one of its files is out of date. Reloading loads the current version — nothing in your cart or account is affected.'
            : 'This page hit an unexpected problem. Reloading usually fixes it; if it keeps happening, head back to the homepage and try again from there.'}
        </p>
        {reference && (
          <p className="mt-3 text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500">
            Reference: {reference.slice(0, 8)}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-sun-orange px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#ea580c]"
          >
            <RefreshCw className="h-4 w-4" />
            Reload the page
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Home className="h-4 w-4" />
            Go to homepage
          </a>
        </div>
      </div>
    </div>
  );
};
