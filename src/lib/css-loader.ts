/**
 * Panel-specific themes, loaded on demand per route group.
 *
 * The themes are pulled in through the bundler rather than by writing a
 * `<link href="/src/styles/panels/x.css">` into the head: that URL only exists on the
 * dev server, so every panel theme silently 404'd in a production build.
 */

const panelStylesheets = import.meta.glob('../styles/panels/*.css') as Record<
  string,
  () => Promise<unknown>
>;

const loadedStylesheets = new Set<string>();

/** Load `/<name>.css` from src/styles/panels once; a missing file is not an error. */
export async function loadPanelCSS(href: string): Promise<void> {
  const file = href.startsWith('/') ? href.slice(1) : href;
  const key = `../styles/panels/${file}`;

  const load = panelStylesheets[key];
  if (!load || loadedStylesheets.has(key)) return;

  await load();
  loadedStylesheets.add(key);
}

/** The panel theme a route needs; `/vendors/:id` is a storefront page, not the seller workspace. */
export function getPanelCSSForRoute(pathname: string): string | null {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return '/admin.css';
  if (pathname === '/vendor' || pathname.startsWith('/vendor/')) return '/vendor.css';
  if (pathname === '/rider' || pathname.startsWith('/rider/')) return '/rider.css';
  if (pathname === '/support' || pathname.startsWith('/support/')) return '/support.css';

  return '/homepage.css';
}
