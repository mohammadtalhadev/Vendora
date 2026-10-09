import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastState } from '../../hooks/useToast';

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

/** Fixed bottom-center toast banner matching the bright-glass design system. */
export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  const toneStyles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-coral-200 bg-coral-50 text-coral-700',
    info: 'border-aqua-200 bg-aqua-50 text-aqua-700',
  } as const;

  const Icon =
    toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertTriangle : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2.5 rounded-full border px-5 py-2.5 text-xs font-bold shadow-lg backdrop-blur-sm ${toneStyles[toast.tone]}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
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
