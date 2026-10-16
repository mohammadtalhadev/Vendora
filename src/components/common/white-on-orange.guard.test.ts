/**
 * White-on-orange guard.
 *
 * Owner rule, confirmed three times: EVERY element whose background is
 * solid sun-orange — at rest (`bg-sun-orange`, `bg-sun-orange-600`) or in
 * any state variant (`hover:`, `group-hover:`, `dark:`, …) — carries WHITE
 * text in that same state. Pale shades (`bg-sun-orange-50`, `-200`) and
 * opacity tints (`bg-sun-orange/20`, `/[0.08]`) are not solid orange and
 * are out of scope, as is `selection:`.
 *
 * This test parses every non-test .ts/.tsx under src with the TypeScript
 * AST (no regex-on-source false pairings) and fails when a class literal
 * paints a solid sun-orange background without the matching white:
 *   - rest token            -> the literal needs plain `text-white`
 *   - `<prefix>:` token     -> the literal needs `<prefix>:text-white`
 *                              or plain `text-white`
 * A literal is also paired when a sibling literal in the same composing
 * expression (template string / className attribute / cn(...) call)
 * carries the white — classes compose across literals of one className.
 *
 * Non-text elements (status dots, logo dots, progress-bar fills, legend
 * swatches) render no text at all; they are exempted ONLY through the
 * ALLOWLIST below, keyed by file + exact literal + occurrence, each with
 * its reason. A stale allowlist entry (one that no longer matches
 * anything) fails the suite too, so the list cannot silently rot.
 *
 * The same file guards the forced-dark proofing: browsers with
 * forced/auto dark mode recolor pages that do not declare their own
 * schemes — the failure that flipped white labels dark on orange buttons.
 * index.html must declare the color-scheme meta and base.css must
 * declare `color-scheme: light` alone on :root (html.dark declares dark).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const SRC_ROOT = join(REPO_ROOT, 'src');

/** A solid sun-orange background token with its variant-prefix chain. */
const SOLID_RE = /((?:[a-zA-Z0-9_-]+:)*)bg-sun-orange(-600)?(?![-\w/[])/g;
const WHITE_PLAIN_RE = /(?<![\w:-])text-white(?![-\w/])/;

interface AllowEntry {
  file: string;
  literal: string;
  /** 1-based index among identical flagged literals in that file. */
  occurrence: number;
  reason: string;
}

const LOGO_DOT =
  'inline-block h-2 w-2 rounded-full bg-sun-orange group-hover:bg-slate-900 dark:group-hover:bg-white ml-0.5 transition-all duration-300 group-hover:scale-125';

const ALLOWLIST: AllowEntry[] = [
  // Logo dots — the "." after the Vendora wordmark; a 8px span, no text.
  { file: 'src/components/layout/Navbar.tsx', literal: 'inline-block h-2 w-2 rounded-full bg-sun-orange group-hover:bg-slate-900 dark:group-hover:bg-white ml-0.5 transition-colors', occurrence: 1, reason: 'logo dot, no text' },
  { file: 'src/features/admin/components/AdminNav.tsx', literal: LOGO_DOT, occurrence: 1, reason: 'logo dot, no text' },
  { file: 'src/features/rider/components/RiderNav.tsx', literal: LOGO_DOT, occurrence: 1, reason: 'logo dot, no text' },
  { file: 'src/features/support/components/SupportNav.tsx', literal: LOGO_DOT, occurrence: 1, reason: 'logo dot, no text' },
  { file: 'src/features/vendor/components/VendorNav.tsx', literal: LOGO_DOT, occurrence: 1, reason: 'logo dot, no text' },
  { file: 'src/features/workspaces/WorkspaceLayout.tsx', literal: 'inline-block h-2 w-2 rounded-full bg-sun-orange ml-0.5', occurrence: 1, reason: 'logo dot, no text' },
  { file: 'src/pages/LoginPage.tsx', literal: 'inline-block h-2 w-2 rounded-full bg-sun-orange ml-0.5 mb-0.5', occurrence: 1, reason: 'logo dot, no text' },
  { file: 'src/pages/RegisterPage.tsx', literal: 'inline-block h-2.5 w-2.5 rounded-full bg-sun-orange ml-0.5', occurrence: 1, reason: 'logo dot, no text' },
  { file: 'src/pages/ResetPasswordPage.tsx', literal: 'inline-block h-2 w-2 rounded-full bg-sun-orange ml-0.5 mb-0.5', occurrence: 1, reason: 'logo dot, no text' },
  { file: 'src/pages/AdminAddProductPage.tsx', literal: 'inline-block h-2 w-2 rounded-full bg-sun-orange', occurrence: 1, reason: 'logo dot, no text' },
  { file: 'src/pages/VendorAddProductPage.tsx', literal: 'inline-block h-2 w-2 rounded-full bg-sun-orange', occurrence: 1, reason: 'logo dot, no text' },
  // Status / indicator dots — aria-hidden or purely chromatic, no text.
  { file: 'src/components/common/NotificationDropdown.tsx', literal: 'mt-1 h-2 w-2 shrink-0 rounded-full bg-sun-orange', occurrence: 1, reason: 'unread dot, no text' },
  { file: 'src/features/rider/components/RiderHeader.tsx', literal: 'bg-sun-orange', occurrence: 1, reason: 'availability status dot class value, no text' },
  { file: 'src/features/rider/components/RiderNav.tsx', literal: 'bg-sun-orange', occurrence: 1, reason: 'rider status dot (aria-hidden), no text' },
  { file: 'src/features/workspaces/WorkspaceLayout.tsx', literal: 'bg-sun-orange', occurrence: 1, reason: 'role badge dot value; badge text sits on a pale tint, no text on the dot' },
  { file: 'src/pages/AboutPage.tsx', literal: 'h-1.5 w-1.5 rounded-full bg-sun-orange', occurrence: 1, reason: 'bullet dot, no text' },
  { file: 'src/pages/NotificationsPage.tsx', literal: 'h-1.5 w-1.5 rounded-full bg-sun-orange', occurrence: 1, reason: 'unread dot, no text' },
  { file: 'src/pages/HomePage.tsx', literal: 'h-2 w-7 bg-sun-orange', occurrence: 1, reason: 'hero carousel active dot, no text' },
  // Progress / meter bar fills and chart swatches — no text inside.
  { file: 'src/features/reviews/components/ReviewList.tsx', literal: 'h-full rounded-full bg-sun-orange transition-all duration-300 group-hover:bg-sun-orange-600', occurrence: 1, reason: 'rating bar fill, no text' },
  { file: 'src/pages/AdminAddProductPage.tsx', literal: 'h-full bg-sun-orange transition-all duration-300', occurrence: 1, reason: 'upload progress bar fill, no text' },
  { file: 'src/pages/AdminVendorsPage.tsx', literal: 'bg-sun-orange', occurrence: 1, reason: 'split-bar segment (width %), no text' },
  { file: 'src/pages/RegisterPage.tsx', literal: 'bg-sun-orange', occurrence: 1, reason: 'password strength meter colour value, no text' },
  { file: 'src/pages/RegisterPage.tsx', literal: 'bg-sun-orange', occurrence: 2, reason: 'password strength meter colour value, no text' },
  { file: 'src/pages/VendorAddProductPage.tsx', literal: 'h-full bg-sun-orange rounded-full transition-all duration-300', occurrence: 1, reason: 'progress bar fill, no text' },
  { file: 'src/pages/VendorAnalyticsPage.tsx', literal: 'h-2.5 w-2.5 rounded-sm bg-sun-orange', occurrence: 1, reason: 'chart legend swatch, no text' },
  { file: 'src/pages/VendorAnalyticsPage.tsx', literal: 'h-full rounded-full bg-sun-orange', occurrence: 1, reason: 'bar fill, no text' },
  { file: 'src/pages/VendorDashboardPage.tsx', literal: 'h-2.5 w-2.5 rounded-xs bg-sun-orange', occurrence: 1, reason: 'chart legend swatch, no text' },
  { file: 'src/pages/VendorDashboardPage.tsx', literal: 'h-full bg-sun-orange rounded-full transition-all', occurrence: 1, reason: 'bar fill, no text' },
];

interface LiteralUnit {
  text: string;
  node: ts.Node;
  line: number;
}

function collectFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      collectFiles(path, out);
    } else if (/\.(tsx|ts)$/.test(entry) && !/\.test\.(tsx|ts)$/.test(entry)) {
      out.push(path);
    }
  }
}

function literalsOf(sf: ts.SourceFile): LiteralUnit[] {
  const text = sf.getFullText();
  const units: LiteralUnit[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      units.push({ text: node.text, node, line: text.slice(0, node.getStart(sf)).split('\n').length });
    } else if (ts.isTemplateExpression(node)) {
      // One stitched unit for the template's own literal chunks; the
      // string literals inside ${…} are visited as their own units too.
      let stitched = node.head.text;
      for (const span of node.templateSpans) stitched += ` ${span.literal.text}`;
      units.push({ text: stitched, node, line: text.slice(0, node.getStart(sf)).split('\n').length });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return units;
}

/** All literal texts under a node (for the composing-expression rescue). */
function literalTextsUnder(node: ts.Node): string[] {
  const texts: string[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) texts.push(n.text);
    else if (ts.isTemplateExpression(n)) texts.push(n.head.text, ...n.templateSpans.map((s) => s.literal.text));
    ts.forEachChild(n, visit);
  };
  visit(node);
  return texts;
}

function whiteSatisfies(prefix: string, texts: string[]): boolean {
  for (const t of texts) {
    if (WHITE_PLAIN_RE.test(t)) return true;
    if (prefix && new RegExp(`(?<![\\w-])${prefix.replace(/:/g, '\\:')}text-white(?![-\\w/])`).test(t)) return true;
  }
  return false;
}

/**
 * Literal texts that compose the SAME element's className as `unit`:
 * the template / cn()-call scopes between the literal and its owning
 * JSX attribute. The walk stops at the attribute (collecting its whole
 * initializer) and never crosses a JSX element boundary — literals
 * elsewhere in the file (sibling elements, enclosing .map() callbacks)
 * must not rescue a violation.
 */
function composingTexts(unit: LiteralUnit): string[] {
  const texts: string[] = [];
  let node: ts.Node | undefined = unit.node.parent;
  while (node) {
    if (ts.isJsxAttribute(node)) {
      if (node.initializer) texts.push(...literalTextsUnder(node.initializer));
      break;
    }
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) break;
    if (ts.isTemplateExpression(node) || ts.isCallExpression(node)) {
      texts.push(...literalTextsUnder(node));
    }
    node = node.parent;
  }
  return texts;
}

describe('white-on-orange guard', () => {
  it('every solid sun-orange background is paired with white text', { timeout: 120_000 }, () => {
    const files: string[] = [];
    collectFiles(SRC_ROOT, files);
    const violations: string[] = [];
    const usedAllow = new Set<number>();
    // occurrence counters per (file, literal) among flagged candidates
    const seen = new Map<string, number>();

    for (const file of files) {
      const rel = relative(REPO_ROOT, file).split(sep).join('/');
      const source = readFileSync(file, 'utf8');
      const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
        file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      for (const unit of literalsOf(sf)) {
        if (!unit.text.includes('bg-sun-orange')) continue;
        const missing: string[] = [];
        for (const m of unit.text.matchAll(SOLID_RE)) {
          const prefix = m[1];
          if (prefix.startsWith('selection:')) continue;
          if (whiteSatisfies(prefix, [unit.text])) continue;
          // Rescue: a sibling literal composing the same element's
          // className (template / cn() call / the attribute itself)
          // carries the white.
          if (!whiteSatisfies(prefix, composingTexts(unit))) missing.push(m[0]);
        }
        if (missing.length === 0) continue;
        const key = `${rel}${unit.text}`;
        const occurrence = (seen.get(key) ?? 0) + 1;
        seen.set(key, occurrence);
        const allowIdx = ALLOWLIST.findIndex(
          (a) => a.file === rel && a.literal === unit.text && a.occurrence === occurrence,
        );
        if (allowIdx >= 0) {
          usedAllow.add(allowIdx);
        } else {
          violations.push(
            `${rel}:${unit.line} — "${unit.text.length > 140 ? `${unit.text.slice(0, 140)}…` : unit.text}" ` +
            `paints solid [${missing.join(', ')}] without white text. Add the matching ` +
            `text-white (or <prefix>:text-white), or — only if the element renders no text — ` +
            `add a reasoned ALLOWLIST entry in white-on-orange.guard.test.ts.`,
          );
        }
      }
    }

    const stale = ALLOWLIST.filter((_, i) => !usedAllow.has(i)).map(
      (a) => `${a.file} — "${a.literal.slice(0, 80)}" (occurrence ${a.occurrence}): ${a.reason}`,
    );
    expect(stale, `Stale white-on-orange ALLOWLIST entries (no longer matching anything — remove or update):\n${stale.join('\n')}`).toEqual([]);
    expect(violations, `Solid sun-orange without white text:\n${violations.join('\n')}`).toEqual([]);
  });

  it('declares its own colour schemes so forced dark mode stands down', () => {
    const html = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');
    expect(html).toContain('<meta name="color-scheme" content="light dark"');
    const baseCss = readFileSync(join(SRC_ROOT, 'styles', 'base.css'), 'utf8');
    const rootBlock = baseCss.match(/:root\s*\{[^}]*\}/s)?.[0] ?? '';
    expect(rootBlock).toContain('color-scheme: light;');
    expect(rootBlock).not.toContain('color-scheme: light dark;');
    // The dark theme narrows the scheme when .dark is active.
    expect(baseCss).toContain('color-scheme: dark;');
  });
});
