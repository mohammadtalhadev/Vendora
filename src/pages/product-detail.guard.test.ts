/**
 * Product page guard (Batch 126).
 *
 * The owner flagged the product page's decorative heading icons — the
 * orange Sparkles on "Product Overview", the orange Shield on "Vendora
 * 3–Step Buyer Assurance" and the ListFilter lines on "Technical
 * Specifications & Key Facts" (plus the matching Sparkles on the PDP
 * marketing summary) — as faltu clutter and ordered them removed. The same
 * QA pass found four logic/fabrication defects on this page, pinned here
 * so none of them can quietly come back:
 *   - the dossier claimed payments sit in buyer escrow and its fallback
 *     facts promised a 1-year warranty — the platform does neither;
 *   - the gallery padded its image list to four with duplicates and a
 *     fake "video" tile whose Play button only opened the still zoom;
 *   - the desktop buy box left Add to Cart / Buy Now enabled at zero
 *     stock (the mobile bar already disabled them);
 *   - Send Offer showed a fake success screen (in a hard-coded "$") and
 *     persisted nothing — it now posts through the real product chat.
 * Functional icons (stars, wishlist, share, compare, delivery, payment
 * marks) are untouched and out of scope for this guard.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(HERE, '..');

const read = (rel: string) => readFileSync(join(SRC_ROOT, rel), 'utf8');

const PDP = 'pages/ProductDetailPage.tsx';
const DOSSIER = 'features/products/components/ProductDossierSection.tsx';
const OFFER = 'features/products/components/SendOfferModal.tsx';

describe('product page decorative heading icons stay removed', () => {
  it('the dossier imports no lucide icons at all', () => {
    expect(read(DOSSIER)).not.toContain('lucide-react');
  });

  it('the PDP marketing summary carries no Sparkles icon', () => {
    const source = read(PDP);
    expect(source).not.toContain('Sparkles');
  });
});

describe('product page fabrication pins', () => {
  it('the dossier makes no escrow or warranty claim', () => {
    const source = read(DOSSIER);
    expect(source.toLowerCase()).not.toContain('escrow');
    expect(source).not.toContain('Warranty');
  });

  it('the gallery never pads images and has no Play/video tile', () => {
    const source = read(PDP);
    expect(source).not.toContain('while (list.length < 4)');
    expect(source).not.toContain('<Play');
    expect(source).not.toContain('Play,');
  });

  it('Send Offer posts through the real product chat, in the store currency', () => {
    const source = read(OFFER);
    expect(source).toContain('findOrCreateProductThread');
    expect(source).toContain('sendChatMessage');
    expect(source).not.toContain('email response');
    expect(source).not.toContain('${offerPrice}');
  });

});

describe('product page out-of-stock parity', () => {
  it('the desktop buy box disables its CTAs at zero stock, like the mobile bar', () => {
    const source = read(PDP);
    expect(source).toContain('disabled={effectiveStock <= 0}');
    expect(source).toContain('Out of Stock');
  });
});
