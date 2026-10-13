import { test } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseRoutes, sweepPlan } from './lib/routes';
import type { Persona } from './lib/routes';
import { loadFixture, loadEnv, urlsForRoute } from './lib/qa';
import { attachCollectors, probe, settle, type NetFailure } from './lib/collect';
import { censusPanels } from './lib/panels';

const fx = loadFixture();
const origin = (loadEnv().VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const routes = parseRoutes();
const catSlugs = Array.isArray(fx.params.categories) ? fx.params.categories.map((c) => c.slug) : [];
const BASE = 'http://127.0.0.1:5199';
const OUT = resolve(process.cwd(), 'scratch/qa/sweep.jsonl');

mkdirSync(resolve(process.cwd(), 'scratch/qa/shots'), { recursive: true });
writeFileSync(OUT, '');

/** Only what this page caused, not what earlier pages left in the same listener. */
function slice(store: ReturnType<typeof attachCollectors>, mark: { c: number; p: number; n: number }) {
  return {
    consoleErrors: store.consoleErrors.slice(mark.c),
    pageErrors: store.pageErrors.slice(mark.p),
    netFailures: store.netFailures.slice(mark.n) as NetFailure[],
  };
}

const seen = new Set<string>();
const cases: { persona: Persona; url: string; route: string; app: string; basis: string }[] = [];
for (const { persona, apps } of sweepPlan()) {
  for (const app of apps) {
    for (const route of routes.filter((r) => r.app === app)) {
      const { urls, basis } = urlsForRoute(route, fx);
      for (const url of urls.length ? urls : [route.path]) {
        const key = `${persona}|${url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        cases.push({ persona, url, route: route.path, app, basis });
      }
    }
  }
}

console.log(`[route-sweep] ${cases.length} page visits planned`);

for (const c of cases) {
  test(`sweep ${c.persona} ${c.url}`, async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ storageState: resolve(process.cwd(), `scratch/qa/state-${c.persona}.json`), baseURL: BASE });
    const page = await ctx.newPage();
    const store = attachCollectors(page, origin);
    const mark = { c: 0, p: 0, n: 0 };

    let navError: string | null = null;
    try {
      await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    } catch (e: any) {
      navError = String(e.message).slice(0, 200);
    }
    await settle(page, 1000);

    let row: Record<string, unknown>;
    try {
      const snap = await probe(page, slice(store, mark), catSlugs);
      const asked = c.url.split('?')[0];
      const landed = snap.finalUrl.split('?')[0];
      const redirectedTo = landed !== asked ? snap.finalUrl : null;
      // Panels cost the most time, so only walk pages that actually have something to walk.
      const worthCensus = snap.severity === 'ok' || snap.severity === 'links' || snap.severity === 'console';
      const panels = worthCensus && (snap.interactive.tabs > 0 || snap.interactive.buttons > 5) ? await censusPanels(page, 4, 3) : [];
      row = { ...c, navError, redirectedTo, panels, ...snap };
      if (String(snap.severity) !== 'ok') {
        await page.screenshot({ path: resolve(process.cwd(), `scratch/qa/shots/${c.persona}-${c.app}-${asked.replace(/[^\w]+/g, '_') || 'root'}.png`) }).catch(() => undefined);
      }
    } catch (e: any) {
      row = { ...c, navError, severity: 'harness', why: [`probe failed: ${String(e.message).slice(0, 160)}`], consoleErrors: store.consoleErrors, pageErrors: store.pageErrors, netFailures: store.netFailures };
    }

    appendFileSync(OUT, `${JSON.stringify(row)}\n`);
    const flag = String(row.severity) === 'ok' ? '  ok' : String(row.severity).toUpperCase();
    console.log(`${flag.padEnd(9)} ${c.persona.padEnd(9)} ${c.url.padEnd(40)} ${String((row.why as string[])?.[0] ?? (row.redirectedTo ? `-> ${row.redirectedTo}` : '')).slice(0, 120)}`);
    await ctx.close();
  });
}
