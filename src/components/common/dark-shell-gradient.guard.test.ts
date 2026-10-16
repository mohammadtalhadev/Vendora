/**
 * Dark-shell gradient guard.
 *
 * The storefront shells paint the ambient page canvas as a LIGHT gradient
 * (`bg-gradient-to-br from-slate-50 via-[#f8fafc] to-[#eef2f6]`). A
 * `dark:bg-*` token only sets background-COLOR — the gradient is a
 * background-IMAGE and paints OVER the colour, so a shell that forgets
 * `dark:bg-none` keeps the whole page light in dark mode while the
 * adaptation layer has already flipped its headings to white:
 * white-on-white section titles and a half-dark page (the failure
 * first seen on the homepage). WorkspaceLayout
 * (panels) always carried `dark:bg-none`; the storefront shells did not.
 *
 * Same family: the ambient orbs' hex gradient stops are NOT remapped by
 * the palette layer (only palette stops are), so a light hex
 * stop (`via-[#F1F5F9]`, `to-[#F1F5F9]`) survives into dark mode as a
 * bright blob unless the literal neutralises it in dark.
 *
 * Rules (per source line, all shell/orb literals are single-line):
 *  1. a line with the shell gradient must also carry `dark:bg-none`;
 *  2. a line with `via-[#F1F5F9]` must also carry `dark:via-transparent`;
 *  3. a line with `to-[#F1F5F9]` must also carry `dark:to-transparent`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(HERE, '..', '..');

const SHELL_GRADIENT = 'from-slate-50 via-[#f8fafc] to-[#eef2f6]';

function collectTsx(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collectTsx(full, out);
    else if (name.endsWith('.tsx') && !name.includes('.test.')) out.push(full);
  }
}

describe('dark-shell gradient guard', () => {
  it('every light shell gradient / orb hex stop is neutralised in dark mode', () => {
    const files: string[] = [];
    collectTsx(SRC_ROOT, files);
    const violations: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        const where = `${relative(SRC_ROOT, file).split(sep).join('/')}:${i + 1}`;
        if (line.includes(SHELL_GRADIENT) && !line.includes('dark:bg-none')) {
          violations.push(`${where} — shell gradient without dark:bg-none`);
        }
        if (line.includes('via-[#F1F5F9]') && !line.includes('dark:via-transparent')) {
          violations.push(`${where} — light via-[#F1F5F9] orb stop without dark:via-transparent`);
        }
        if (line.includes('to-[#F1F5F9]') && !line.includes('dark:to-transparent')) {
          violations.push(`${where} — light to-[#F1F5F9] orb stop without dark:to-transparent`);
        }
      });
    }
    expect(violations).toEqual([]);
  });
});
