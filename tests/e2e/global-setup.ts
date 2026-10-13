import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { loadEnv } from './lib/qa';

const BASE = 'http://127.0.0.1:5199';

/** supabase-js keys its localStorage entry after the project ref in the URL. */
function storageKey(url: string) {
  const ref = new URL(url).hostname.split('.')[0];
  return `sb-${ref}-auth-token`;
}

export default async function globalSetup() {
  const root = process.cwd();
  mkdirSync(resolve(root, 'scratch/qa'), { recursive: true });
  mkdirSync(resolve(root, 'scratch/qa/shots'), { recursive: true });

  // Refresh the live fixture: signs every persona in and re-reads real ids from Postgres.
  execFileSync('node', ['--env-file=.env', 'scripts/qa-live-probe.mjs'], { cwd: root, stdio: 'pipe' });

  const env = loadEnv(resolve(root, '.env'));
  const url = env.VITE_SUPABASE_URL;
  if (!url) throw new Error('.env has no VITE_SUPABASE_URL - the sweep cannot talk to the real backend');
  const fx = JSON.parse(readFileSync(resolve(root, 'scratch/qa/live-fixture.json'), 'utf8'));
  const key = storageKey(url);

  const browser = await chromium.launch();
  for (const [persona, info] of Object.entries<any>(fx.personas)) {
    if (!info?.session) {
      writeFileSync(resolve(root, `scratch/qa/state-${persona}.json`), JSON.stringify({ cookies: [], origins: [] }));
      continue;
    }
    const state = {
      cookies: [],
      origins: [
        {
          origin: BASE,
          localStorage: [{ name: key, value: JSON.stringify(info.session) }],
        },
      ],
    };
    writeFileSync(resolve(root, `scratch/qa/state-${persona}.json`), JSON.stringify(state));
  }
  writeFileSync(resolve(root, 'scratch/qa/state-guest.json'), JSON.stringify({ cookies: [], origins: [] }));

  // Boot check: if the app cannot render at all, every result downstream is meaningless.
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  // The first hit after a cold start pays for Vite's dependency scan, so keep trying
  // rather than failing the whole sweep on one slow navigation.
  let mounted = false;
  for (let attempt = 1; attempt <= 3 && !mounted; attempt++) {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 90_000 }).catch((e) => errors.push(String(e.message)));
    await page.waitForTimeout(5000);
    mounted = await page.evaluate(() => !!document.querySelector('#root')?.children.length);
    if (!mounted) console.log(`[setup] boot attempt ${attempt} did not mount`);
  }
  if (!mounted) throw new Error(`app did not mount on ${BASE}: ${errors.join(' | ')}`);
  if (errors.length) console.log(`[setup] boot page errors: ${errors.slice(0, 3).join(' | ')}`);
  await browser.close();
}
