import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastState } from '../../hooks/useToast';

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

/** Fixed bottom-center toast in the site's frosted-glass language. */
export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  const toneDisc = {
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    error: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    info: 'bg-orange-500/15 text-sun-orange-600 dark:text-sun-orange-400',
  } as const;

  const Icon =
    toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertTriangle : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/50 bg-white/75 px-5 py-2.5 text-xs font-bold text-slate-800 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${toneDisc[toast.tone]}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-1 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
