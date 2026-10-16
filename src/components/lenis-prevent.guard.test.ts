/**
 * Lenis nested-scroll guard.
 *
 * The window Lenis smooths page scroll; any OVERLAY surface with its own
 * scrollable area must carry `data-lenis-prevent`, or wheel events over
 * it get claimed by the page scroller and the surface feels broken (the
 * classic Lenis + dropdown/dialog fight). The shared building blocks
 * were covered early (Radix DialogContent, the workspace wrapper-Lenis
 * containers, the cart drawer's pause/resume), but the storefront's
 * hand-rolled overlay scrollers were not: the MegaMenu panes, the header
 * search-category list, the notification list, the currency list, the
 * Radix Select popup, the cart drawer's item list, the catalogue mobile
 * filter drawer and the privacy page's sticky TOC. This guard pins the
 * attribute in each of those files so a future refactor cannot quietly
 * drop it again.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(HERE, '..');

const read = (rel: string) => readFileSync(join(SRC_ROOT, rel), 'utf8');

const OVERLAY_SCROLLERS: Array<{ file: string; surface: string }> = [
  { file: 'components/ui/dialog.tsx', surface: 'Radix DialogContent' },
  { file: 'components/ui/select.tsx', surface: 'Radix SelectContent popup' },
  { file: 'components/layout/MegaMenu.tsx', surface: 'MegaMenu panes' },
  { file: 'components/layout/Navbar.tsx', surface: 'header search-category list' },
  { file: 'components/common/NotificationDropdown.tsx', surface: 'notification list' },
  { file: 'components/common/CurrencySelector.tsx', surface: 'currency list' },
  { file: 'features/cart/components/CartDrawer.tsx', surface: 'cart drawer item list' },
  { file: 'features/catalog/components/CatalogBrowser.tsx', surface: 'mobile filter drawer' },
  { file: 'pages/PrivacyPolicyPage.tsx', surface: 'sticky table of contents' },
];

describe('data-lenis-prevent coverage on overlay scrollers', () => {
  for (const { file, surface } of OVERLAY_SCROLLERS) {
    it(`${surface} (${file}) carries data-lenis-prevent`, () => {
      expect(read(file)).toContain('data-lenis-prevent');
    });
  }

  it('MegaMenu keeps its scrollable panes (the attribute guards real overflow containers)', () => {
    const megaMenu = read('components/layout/MegaMenu.tsx');
    expect(megaMenu.match(/overflow-y-auto/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
