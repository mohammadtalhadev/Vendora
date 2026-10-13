import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level safety net: a render error in any subtree shows this fallback
 * instead of a blank white screen. The app previously had no error boundary
 * at all, which is how a single import-time/config failure blanked the
 * whole production site.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-[#0b1120]">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h1 className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              The page hit an unexpected error. Reloading usually fixes it — if it keeps happening,
              please try again in a few minutes.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 w-full rounded-full bg-[#FF7A1A] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#EA6C13]"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
