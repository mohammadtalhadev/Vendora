import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { heroSlidesFromRows } from './hero-banners';

/* Rows seeded before the console's body shape settled can hold an ARRAY of
 * slide objects in `body` instead of the single object the console writes.
 * The mapper must read those too, not silently drop the banner. */
describe('heroSlidesFromRows with array-shaped bodies (legacy seed rows)', () => {
  it('maps a one-element array body onto a slide', () => {
    const slides = heroSlidesFromRows([
      {
        id: 'b1',
        slug: 'main-hero',
        title: 'Main Hero Carousel',
        body: [
          {
            headline: 'Own Your Everyday.',
            subtitle: 'Verified flagship stores.',
            imageUrl: 'https://example.com/hero.jpg',
            ctaText: 'Shop the edit',
            ctaLink: '/products',
          },
        ],
      },
    ]);

    expect(slides).toHaveLength(1);
    expect(slides[0]).toMatchObject({
      id: 'main-hero',
      title: 'Own Your Everyday.',
      image: 'https://example.com/hero.jpg',
      ctaText: 'Shop the edit',
      link: '/products',
    });
  });

  it('maps every element of a multi-slide array body, with unique ids', () => {
    const slides = heroSlidesFromRows([
      {
        id: 'b2',
        slug: 'seasonal',
        title: 'Seasonal',
        body: [
          { headline: 'One', imageUrl: 'https://example.com/1.jpg' },
          { headline: 'Two', imageUrl: 'https://example.com/2.jpg' },
        ],
      },
    ]);

    expect(slides.map((s) => s.title)).toEqual(['One', 'Two']);
    expect(new Set(slides.map((s) => s.id)).size).toBe(2);
  });

  it('skips array elements without an image and empty arrays', () => {
    const slides = heroSlidesFromRows([
      { id: 'b3', slug: 'no-img', title: 'X', body: [{ headline: 'No image here' }] },
      { id: 'b4', slug: 'empty', title: 'Y', body: [] },
    ]);

    expect(slides).toHaveLength(0);
  });
});
