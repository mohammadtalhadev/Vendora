import { useEffect, useState } from 'react';

/**
 * Tracks the app's dark-mode state. The theme is class-based: the `dark`
 * class lives on <html> and is toggled by the workspace theme switch
 * (persisted in localStorage as `vd_theme`). A MutationObserver on the
 * root class keeps consumers — currently the Recharts pages — in sync
 * without re-rendering on every toggle flip elsewhere.
 */
export function useDarkMode(): boolean {
  const [dark, setDark] = useState<boolean>(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

/** Scheme-aware Recharts tokens (dark scheme). */
export const chartTheme = {
  gridStroke: (dark: boolean) => (dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
  tickFill: (dark: boolean) => (dark ? '#a1a1aa' : '#64748b'),
  inkStroke: (dark: boolean) => (dark ? '#ededed' : '#0F172A'),
  tooltipStyle: (dark: boolean) =>
    dark
      ? {
          backgroundColor: '#17171a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          color: '#f4f4f5',
          fontSize: '12px',
        }
      : undefined,
} as const;
