import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastState {
  message: string;
  tone: 'success' | 'error' | 'info';
}

/**
 * Minimal local toast hook for demo actions (no external deps).
 * Auto-dismisses after `durationMs`. Consecutive toasts replace each other.
 */
export function useToast(durationMs = 2600) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, tone: ToastState['tone'] = 'success') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ message, tone });
      timerRef.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { toast, showToast, hideToast };
}
