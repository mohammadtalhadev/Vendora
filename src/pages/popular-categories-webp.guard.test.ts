/**
 * Popular-categories WebP guard (Batch 109 thumbs, kept by Batch 112 SPEED).
 *
 * The category tiles render at 80–112px circles; the original 1024px PNGs
 * cost 243–646 KB each (12 tiles ≈ 5.7 MB on the homepage). Batch 109 ships
 * 256px WebP thumbs and POPULAR_CATEGORIES (the built-in fallback for the
 * category-tiles section) must point at them — a tile that falls back to a
 * .png silently brings the heavy file back. The CMS rows move to the same
 * URLs via files/VENDORA_B113_IMAGE_URLS.sql.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const homePageSource = readFileSync(resolve(HERE, 'HomePage.tsx'), 'utf8');

describe('POPULAR_CATEGORIES image URLs (Batch 109/112)', () => {
  it('points every fallback category tile at its .webp version', () => {
    const block = homePageSource.match(/const POPULAR_CATEGORIES = \[([\s\S]*?)\];/);
    expect(block, 'POPULAR_CATEGORIES block not found in HomePage.tsx').not.toBeNull();
    const images = [...block![1].matchAll(/image: '([^']+)'/g)].map((m) => m[1]);
    expect(images).toHaveLength(12);
    for (const image of images) {
      expect(image).toMatch(/^\/images\/categories\/cat_.+\.webp$/);
    }
  });
});
