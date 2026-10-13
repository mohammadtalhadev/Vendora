import type { Page } from '@playwright/test';

/** Buttons that could commit something. The panel census opens UI, it never submits it. */
const UNSAFE = /(delete|remove|destroy|cancel|refund|approve|decline|reject|accept|submit|save|place|pay|publish|suspend|strike|issue|send|sign out|log out|logout|reset|import|upload|purchase|checkout|buy|apply|continue)/i;

export interface PanelProbe {
  kind: 'tab' | 'dialog' | 'accordion';
  label: string;
  outcome: string;
  chars: number;
  badData: string[];
  error: string | null;
}

const BAD = [/\bNaN\b/, /\[object Object\]/, /\bundefined\b/, /\bInfinity\b/];

function flags(text: string) {
  return BAD.filter((re) => re.test(text)).map((re) => String(re.source).replace(/\\b/g, ''));
}

/** Walks every tab, then every obviously safe trigger, and reports what each panel shows. */
export async function censusPanels(page: Page, maxTabs = 4, maxTriggers = 3, rootSelector = 'main button'): Promise<PanelProbe[]> {
  const probes: PanelProbe[] = [];

  const tabs = page.locator('[role="tab"]');
  const tabCount = Math.min(await tabs.count(), maxTabs);
  for (let i = 0; i < tabCount; i++) {
    const tab = tabs.nth(i);
    const label = ((await tab.getAttribute('aria-label')) || (await tab.innerText().catch(() => ''))).trim().slice(0, 40);
    try {
      await tab.click({ timeout: 4000 });
      await page.waitForTimeout(700);
      const text = await page.evaluate(() => (document.querySelector('main') || document.body).innerText);
      const selected = await tab.getAttribute('aria-selected');
      probes.push({
        kind: 'tab',
        label,
        outcome: selected === 'false' ? `did not stay selected; ${text.trim().length} chars shown` : `${text.trim().length} chars shown`,
        chars: text.trim().length,
        badData: flags(text),
        error: null,
      });
    } catch (e: any) {
      probes.push({ kind: 'tab', label, outcome: 'not clickable', chars: 0, badData: [], error: String(e.message).slice(0, 160) });
    }
  }

  const buttons = page.locator(`${rootSelector}, [role="dialog"] button`);
  const total = Math.min(await buttons.count(), 40);
  let opened = 0;
  for (let i = 0; i < total && opened < maxTriggers; i++) {
    const btn = buttons.nth(i);
    const label = ((await btn.getAttribute('aria-label')) || (await btn.innerText().catch(() => ''))).trim().slice(0, 40);
    if (!label || UNSAFE.test(label)) continue;
    const hadDialog = await page.locator('[role="dialog"]').count();
    const beforeUrl = page.url();
    try {
      await btn.click({ timeout: 3000 });
      await page.waitForTimeout(600);
      if (page.url() !== beforeUrl) {
        // A safe-looking label that navigates is itself a finding; put the page back.
        probes.push({ kind: 'accordion', label, outcome: `navigated to ${new URL(page.url()).pathname}`, chars: 0, badData: [], error: null });
        await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await page.waitForTimeout(500);
        continue;
      }
      const nowDialog = await page.locator('[role="dialog"]').count();
      if (nowDialog > hadDialog) {
        const title = (await page.locator('[role="dialog"]').last().innerText().catch(() => '')).trim().slice(0, 120);
        const fields = await page.locator('[role="dialog"] input, [role="dialog"] select, [role="dialog"] textarea').count();
        probes.push({ kind: 'dialog', label, outcome: `opened with ${fields} field(s): ${title.replace(/\s+/g, ' ')}`, chars: title.length, badData: flags(title), error: null });
        opened++;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else {
        const text = await page.evaluate(() => (document.querySelector('main') || document.body).innerText);
        probes.push({ kind: 'accordion', label, outcome: `no dialog; page now ${text.trim().length} chars`, chars: text.trim().length, badData: flags(text), error: null });
      }
    } catch (e: any) {
      probes.push({ kind: 'accordion', label, outcome: 'click failed', chars: 0, badData: [], error: String(e.message).slice(0, 160) });
      await page.keyboard.press('Escape').catch(() => undefined);
    }
  }

  return probes;
}
