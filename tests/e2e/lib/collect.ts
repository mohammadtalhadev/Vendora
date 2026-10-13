import type { Page } from '@playwright/test';

export interface NetFailure {
  endpoint: string;
  status: number;
  code?: string;
  message?: string;
  hint?: string;
}

export interface PageSnapshot {
  finalUrl: string;
  mainText: string;
  errorBoundary: string | null;
  stuckLoading: boolean;
  blankMain: boolean;
  mainTextChars: number;
  brokenImages: string[];
  deadLinks: string[];
  internalLinks: number;
  unknownCategoryLinks: string[];
  interactive: { buttons: number; tabs: number; dialogs: number; forms: number; tables: number; links: number };
}

export interface ProbeResult extends PageSnapshot {
  consoleErrors: string[];
  pageErrors: string[];
  netFailures: NetFailure[];
  badDataFlags: string[];
  severity: string;
  why: string[];
}

const NOISE = [
  /favicon/i,
  /Download the React DevTools/i,
  /\[MSW\] Mock Service Worker registered/i,
  // Known and already reported as its own finding: the mock worker is still booting in main.tsx.
  /\[MSW\] Supabase is configured/i,
  /ResizeObserver loop/i,
];

const BAD_DATA: [RegExp, string][] = [
  [/\bNaN\b/, 'NaN'],
  [/\[object Object\]/, '[object Object]'],
  [/\bundefined\b/, 'undefined'],
  [/\bInfinity\b/, 'Infinity'],
  [/\bdemo1234\b/, 'seeded password leaked into the UI'],
  [/lorem ipsum/i, 'lorem ipsum'],
  [/\bTODO\b/, 'TODO'],
  [/\bFIXME\b/, 'FIXME'],
];

/** Everything the page throws or asks the backend for, while it is being walked. */
export function attachCollectors(page: Page, supabaseOrigin: string) {
  const store = { consoleErrors: [] as string[], pageErrors: [] as string[], netFailures: [] as NetFailure[] };

  page.on('console', (msg) => {
    const text = msg.text();
    if (NOISE.some((re) => re.test(text))) return;
    if (msg.type() === 'error' || msg.type() === 'warning') store.consoleErrors.push(`${msg.type()}: ${text}`.slice(0, 300));
  });

  page.on('pageerror', (err) => store.pageErrors.push(`${err.name}: ${err.message}`.slice(0, 300)));

  page.on('response', async (res) => {
    const url = res.url();
    if (!url.startsWith(supabaseOrigin) || res.status() < 400) return;
    let body: any = null;
    try {
      if ((res.headers()['content-type'] || '').includes('json')) body = await res.json();
    } catch {
      /* body already consumed or not json */
    }
    store.netFailures.push({
      endpoint: url.replace(supabaseOrigin, '').split('?')[0].slice(0, 120),
      status: res.status(),
      code: body?.code,
      message: typeof body?.message === 'string' ? body.message.slice(0, 300) : undefined,
      hint: typeof body?.hint === 'string' ? body.hint.slice(0, 160) : undefined,
    });
  });

  return store;
}

export async function settle(page: Page, ms = 1200) {
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page.waitForTimeout(ms);
}

export function snapshotPage(page: Page, knownCategorySlugs: string[]) {
  return page.evaluate((slugs: string[]) => {
    const known = new Set(slugs);
    const main = document.querySelector('main') || document.body;
    const text = (main as HTMLElement).innerText || '';
    const lower = text.toLowerCase();
    const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
    const hrefs = anchors.map((a) => a.getAttribute('href') || '');
    const internal = Array.from(new Set(hrefs.filter((h) => h.startsWith('/'))));
    return {
      finalUrl: location.pathname + location.search,
      mainText: text.slice(0, 40_000),
      // Inline array on purpose: page.evaluate serializes the callback, so module scope is not reachable here.
      errorBoundary: ['something went wrong', 'application error', 'page crashed', 'failed to load', 'could not load', 'could not find', 'not found'].find((needle) => lower.includes(needle)) ?? null,
      stuckLoading: /loading vendora|verifying access/i.test(text),
      blankMain: text.trim().length < 120,
      mainTextChars: text.trim().length,
      brokenImages: Array.from(document.images)
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src)
        .slice(0, 15),
      deadLinks: hrefs.filter((h) => h === '#' || h === '' || h.startsWith('javascript:')).slice(0, 20),
      internalLinks: internal.length,
      unknownCategoryLinks: internal
        .filter((h) => {
          const m = h.match(/^\/(?:categories|category)\/([^/?#]+)/);
          return m ? !known.has(m[1]) : false;
        })
        .slice(0, 30),
      interactive: {
        buttons: document.querySelectorAll('button').length,
        tabs: document.querySelectorAll('[role="tab"]').length,
        dialogs: document.querySelectorAll('[role="dialog"]').length,
        forms: document.querySelectorAll('form').length,
        tables: document.querySelectorAll('table').length,
        links: anchors.length,
      },
    } satisfies PageSnapshot;
  }, knownCategorySlugs);
}

export async function probe(page: Page, store: ReturnType<typeof attachCollectors>, knownCategorySlugs: string[]): Promise<ProbeResult> {
  const snap = await snapshotPage(page, knownCategorySlugs);
  const badDataFlags = BAD_DATA.filter(([re]) => re.test(snap.mainText)).map(([, label]) => label);
  const result: ProbeResult = { ...snap, ...store, badDataFlags, severity: '', why: [] };
  const judged = classify(result);
  result.severity = judged.severity;
  result.why = judged.why;
  return result;
}

export function classify(r: ProbeResult): { severity: string; why: string[] } {
  const why: string[] = [];
  if (r.pageErrors.length) why.push(`uncaught exception: ${r.pageErrors[0]}`);
  if (r.netFailures.length) {
    const distinct = Array.from(new Map(r.netFailures.map((f) => [`${f.status}:${f.code}:${f.endpoint}`, f])).values());
    why.push(`${r.netFailures.length} backend failure(s): ${distinct.slice(0, 3).map((f) => `${f.status} ${f.code ?? ''} ${f.endpoint} ${f.message ?? ''}`.trim()).join(' | ')}`);
  }
  if (r.errorBoundary) why.push(`fallback copy shown: "${r.errorBoundary}"`);
  if (r.blankMain) why.push(`blank or near-empty panel (${r.mainTextChars} chars of text)`);
  if (r.stuckLoading) why.push('still in loading state after network idle');
  if (r.badDataFlags.length) why.push(`bad data rendered: ${r.badDataFlags.join(', ')}`);
  if (r.brokenImages.length) why.push(`${r.brokenImages.length} broken image(s): ${r.brokenImages[0]}`);
  if (r.deadLinks.length) why.push(`${r.deadLinks.length} dead link(s) (href="#")`);
  if (r.unknownCategoryLinks.length) why.push(`category links with no matching row: ${r.unknownCategoryLinks.join(', ')}`);
  if (r.consoleErrors.length) why.push(`${r.consoleErrors.length} console error(s): ${r.consoleErrors[0]?.slice(0, 140)}`);
  const severity = r.pageErrors.length
    ? 'crash'
    : r.netFailures.length
      ? 'backend'
      : r.blankMain || r.errorBoundary || r.stuckLoading
        ? 'blank'
        : r.badDataFlags.length
          ? 'baddata'
          : r.brokenImages.length || r.deadLinks.length || r.unknownCategoryLinks.length
            ? 'links'
            : r.consoleErrors.length
              ? 'console'
              : 'ok';
  return { severity, why };
}

export const SEVERITY_RANK: Record<string, number> = { ok: 0, console: 1, links: 2, blank: 3, baddata: 4, backend: 5, crash: 6 };
