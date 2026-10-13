import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { parseRoutes } from './lib/routes';
import { attachCollectors, settle } from './lib/collect';
import { loadEnv } from './lib/qa';

const origin = (loadEnv().VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const BASE = 'http://127.0.0.1:5199';
const routes = parseRoutes();

// The guard each console sits behind, taken from router.tsx, plus the one documented
// exception: SupportOnlyRoute admits admin as well as support.
const GUARD: Record<string, string[]> = {
  vendor: ['vendor'],
  admin: ['admin'],
  rider: ['rider'],
  support: ['support', 'admin'],
};
const PERSONA_ROLES: Record<string, string[]> = {
  customer: ['customer'],
  newuser: ['customer'],
  vendor: ['vendor', 'customer'],
  admin: ['admin', 'customer'],
  support: ['support'],
  rider: ['rider'],
  guest: [],
};

const entries = Object.entries(GUARD).flatMap(([app, roles]) =>
  Object.entries(PERSONA_ROLES).map(([persona, owned]) => ({
    app,
    persona,
    path: `/${app}`,
    shouldPass: owned.some((r) => roles.includes(r)),
  })),
);

for (const e of entries) {
  // One probe per console is enough: the guard wraps the whole subtree.
  const route = routes.find((r) => r.app === (e.app as any) && r.isIndex) ?? routes.find((r) => r.app === (e.app as any));
  const target = route?.path ?? `/${e.app}`;
  test(`access control ${e.persona} -> ${target}`, async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: resolve(process.cwd(), `scratch/qa/state-${e.persona}.json`), baseURL: BASE });
    const page = await ctx.newPage();
    const store = attachCollectors(page, origin);
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => undefined);
    await settle(page, 1200);
    const landed = page.url().replace(BASE, '') || '/';
    const bounced = landed.startsWith('/403') || landed.startsWith('/login');

    if (e.shouldPass) {
      expect(bounced, `${e.persona} owns ${e.app} but was bounced to ${landed}`).toBe(false);
      expect(store.pageErrors, `crash opening ${target} as ${e.persona}: ${store.pageErrors[0] ?? ''}`).toHaveLength(0);
    } else {
      expect(bounced, `${e.persona} reached ${e.app} console at ${landed} without the role`).toBe(true);
    }
    // A persona without the guard role must be bounced; one with it must not be.
    const expectedBounce = !e.shouldPass;
    console.log(`${e.shouldPass ? 'allow' : 'deny '} ${e.persona.padEnd(9)} ${target.padEnd(12)} -> ${landed.padEnd(16)} ${bounced === expectedBounce ? 'as expected' : 'MISMATCH'}`);
    await ctx.close();
  });
}
