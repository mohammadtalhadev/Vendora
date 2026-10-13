import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type App = 'storefront' | 'vendor' | 'admin' | 'rider' | 'support';

export interface RouteDef {
  app: App;
  /** Path exactly as the router declares it, with the app root already joined. */
  path: string;
  /** Root-level guard wrapper on the app, when there is one. */
  guard?: 'vendor' | 'admin' | 'rider' | 'support';
  /** Route just redirects elsewhere. */
  redirectTo?: string;
  /** Whether the child route is `index: true`. */
  isIndex: boolean;
}

const ROOTS: Record<string, { app: App; guard?: RouteDef['guard'] }> = {
  '/': { app: 'storefront' },
  '/vendor': { app: 'vendor', guard: 'vendor' },
  '/admin': { app: 'admin', guard: 'admin' },
  '/rider': { app: 'rider', guard: 'rider' },
  '/support': { app: 'support', guard: 'support' },
};

/**
 * Reads the router source rather than a hand-kept list, so the sweep cannot drift from
 * the app. Indentation is load-bearing here: app roots sit at 4 spaces, children at 8.
 */
export function parseRoutes(routerFile = resolve(process.cwd(), 'src/app/router.tsx')): RouteDef[] {
  const lines = readFileSync(routerFile, 'utf8').split('\n');
  const routes: RouteDef[] = [];
  let root: string | null = null;
  let pending: { path: string; isIndex: boolean; line: number } | null = null;

  const flush = (elementLines: string[]) => {
    if (!pending || !root) return;
    const conf = ROOTS[root];
    if (!conf) return;
    const joined = pending.path === '' ? root : `${root === '/' ? '' : root}/${pending.path}`;
    const nav = elementLines.join(' ').match(/Navigate to="(\/[^"]*)"/);
    routes.push({ app: conf.app, path: joined, guard: conf.guard, redirectTo: nav?.[1], isIndex: pending.isIndex });
    pending = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rootMatch = line.match(/^ {4}path: '(\/[^']*)',$/);
    if (rootMatch) {
      flush(lines.slice(i, i + 4));
      root = rootMatch[1];
      continue;
    }
    if (!root) continue;
    const childMatch = line.match(/^ {6,}path: '([^']*)',$/);
    if (childMatch) {
      flush(lines.slice(i, i + 4));
      pending = { path: childMatch[1], isIndex: false, line: i };
      continue;
    }
    if (/^ {6,}index: true,$/.test(line)) {
      flush(lines.slice(i, i + 4));
      pending = { path: '', isIndex: true, line: i };
      continue;
    }
    // A route with an inline element (the 404 catch-all) never gets a pending entry,
    // so only flush when the next declaration boundary shows up.
    if (pending && /^ {6}(element|children):/.test(line) && pending.line < i - 6) flush([line]);
  }
  flush([]);

  const seen = new Set<string>();
  return routes.filter((r) => {
    const k = `${r.app}:${r.path}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const PERSONAS = ['guest', 'customer', 'newuser', 'vendor', 'admin', 'support', 'rider'] as const;
export type Persona = (typeof PERSONAS)[number];

/** Which persona drives which app, kept explicit so the sweep cost stays predictable. */
export function sweepPlan(): { persona: Persona; apps: App[] }[] {
  return [
    { persona: 'guest', apps: ['storefront'] },
    { persona: 'customer', apps: ['storefront'] },
    { persona: 'vendor', apps: ['vendor'] },
    { persona: 'admin', apps: ['admin'] },
    { persona: 'rider', apps: ['rider'] },
    { persona: 'support', apps: ['support'] },
  ];
}

/** Routes a persona must NOT be able to open, used by the access-control pass. */
export function forbiddenRoutes(routes: RouteDef[], persona: Persona): RouteDef[] {
  const own: Record<Persona, App[]> = {
    guest: [],
    customer: [],
    newuser: [],
    vendor: ['vendor', 'storefront'],
    admin: ['admin', 'storefront'],
    rider: ['rider', 'storefront'],
    support: ['support', 'storefront'],
  };
  const allowed = own[persona];
  return routes.filter((r) => r.app !== 'storefront' && !allowed.includes(r.app));
}
