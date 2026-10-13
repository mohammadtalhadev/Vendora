import { test, expect } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { attachCollectors, settle } from './lib/collect';
import { loadEnv } from './lib/qa';

const origin = (loadEnv().VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const BASE = 'http://127.0.0.1:5199';
const OUT = resolve(process.cwd(), 'scratch/qa/chrome.jsonl');

// Anything that could commit money or change an account is off limits; this pass opens
// overlays and reads them, it never presses the button at the bottom of the form.
const UNSAFE = /(sign out|log out|checkout|place|pay|buy|delete|remove|submit|save|refund|approve|decline)/i;

const PAGES: { persona: string; paths: string[] }[] = [
  { persona: 'guest', paths: ['/', '/products'] },
  { persona: 'customer', paths: ['/', '/products', '/orders'] },
  { persona: 'vendor', paths: ['/vendor'] },
  { persona: 'admin', paths: ['/admin'] },
  { persona: 'support', paths: ['/support'] },
  { persona: 'rider', paths: ['/rider'] },
];

mkdirSync(resolve(process.cwd(), 'scratch/qa/shots'), { recursive: true });
writeFileSync(OUT, '');

for (const group of PAGES) {
  for (const path of group.paths) {
    test(`chrome overlays ${group.persona} ${path}`, async ({ browser }) => {
      test.setTimeout(180_000);
      const ctx = await browser.newContext({ storageState: resolve(process.cwd(), `scratch/qa/state-${group.persona}.json`), baseURL: BASE });
      const page = await ctx.newPage();
      const store = attachCollectors(page, origin);
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 40_000 });
      await settle(page, 1500);

      const findings: any[] = [];
      for (const root of ['header', 'footer', 'nav']) {
        const handles = await page.locator(`${root} button, ${root} [role="button"], ${root} [aria-haspopup]`).elementHandles();
        let opened = 0;
        for (const h of handles) {
          if (opened >= 8) break;
          const label = (
            (await h.evaluate((n: Element) => n.getAttribute('aria-label') || n.textContent || '')) ?? ''
          ).trim().slice(0, 45);
          if (!label || UNSAFE.test(label)) continue;
          const before = {
            dialogs: await page.locator('[role="dialog"]').count(),
            menus: await page.locator('[role="menu"], [role="listbox"], [data-state="open"]').count(),
            url: page.url(),
          };
          try {
            await h.click({ timeout: 2500 });
          } catch {
            continue;
          }
          await page.waitForTimeout(500);
          const after = {
            dialogs: await page.locator('[role="dialog"]').count(),
            menus: await page.locator('[role="menu"], [role="listbox"], [data-state="open"]').count(),
            url: page.url(),
          };
          if (after.url !== before.url) {
            findings.push({ root, label, outcome: `navigated to ${new URL(after.url).pathname}`, problem: false });
            await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
            await settle(page, 700);
            continue;
          }
          const openedSomething = after.dialogs > before.dialogs || after.menus > before.menus;
          if (openedSomething) {
            opened++;
            const panelText = await page
              .locator('[role="dialog"], [role="menu"], [role="listbox"]')
              .last()
              .innerText()
              .catch(() => '');
            const bad = /\bNaN\b|\[object Object\]|\bundefined\b|demo1234/.test(panelText);
            findings.push({
              root,
              label,
              outcome: `opened ${after.dialogs > before.dialogs ? 'dialog' : 'menu'} with ${panelText.trim().length} chars of copy`,
              problem: bad || panelText.trim().length === 0,
              excerpt: panelText.replace(/\s+/g, ' ').slice(0, 140),
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
          } else {
            findings.push({ root, label, outcome: 'no overlay, no navigation', problem: false });
          }
        }
      }

      appendFileSync(OUT, `${JSON.stringify({ persona: group.persona, path, findings, pageErrors: store.pageErrors, netFailures: store.netFailures })}\n`);
      const deadClicks = findings.filter((f) => f.outcome === 'no overlay, no navigation').length;
      console.log(`[chrome ${group.persona} ${path}] ${findings.length} triggers walked, ${deadClicks} inert, ${store.pageErrors.length} crashes, ${store.netFailures.length} backend failures`);
      await page.screenshot({ path: resolve(process.cwd(), `scratch/qa/shots/chrome-${group.persona}-${path.replace(/[^\w]+/g, '_') || 'root'}.png`) }).catch(() => undefined);
      expect(store.pageErrors, `crash while walking chrome overlays on ${path}: ${store.pageErrors[0] ?? ''}`).toHaveLength(0);
      await ctx.close();
    });
  }
}
