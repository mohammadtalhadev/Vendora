import { useEffect, useState } from 'react';

/**
 * theme — the site's colour-scheme preference, resolved the one way the
 * app already resolves it everywhere else.
 *
 * The mechanism (unchanged by this module): Tailwind's `dark:` variant is
 * the `.dark` class on <html> (see the @custom-variant in styles/base.css),
 * and the preference itself is the `vd_theme` localStorage value the
 * workspace header's toggle writes (WorkspaceLayout). Surfaces inside a
 * workspace inherit both for free. Surfaces OUTSIDE one — the staff portal
 * at /admin/login is the one that matters — must resolve the preference
 * themselves: read the stored value (or the class a previous surface left
 * on <html>, exactly the workspace toggle's own initializer) and apply the
 * class so their `dark:` variants follow the user's choice instead of a
 * hardcoded palette.
 */

export type ThemePreference = 'dark' | 'light';

const THEME_STORAGE_KEY = 'vd_theme';

/** The stored preference, resolved exactly like the workspace toggle resolves it. */
export function resolveThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'light';
  try {
    if (window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark') return 'dark';
  } catch {
    // Storage unavailable (private mode): the class check below still applies.
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Applies the preference to <html> so `dark:` variants render it. Only the
 * class is touched — persisting the choice stays the workspace toggle's
 * job, so a surface that merely honours the preference never rewrites it.
 */
export function applyThemePreference(theme: ThemePreference): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/** Resolves the preference on mount and applies it to <html>. */
export function useThemePreference(): ThemePreference {
  const [theme] = useState<ThemePreference>(() => resolveThemePreference());

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme]);

  return theme;
}
