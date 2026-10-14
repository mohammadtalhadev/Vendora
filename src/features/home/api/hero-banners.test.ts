import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import {
  FALLBACK_HERO_SLIDES,
  fetchPublishedHeroSlides,
  heroSlidesFromRows,
} from './hero-banners';
import { contentBlockRow, supabaseDouble } from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
});

describe('fetchPublishedHeroSlides', () => {
  it('reads only the published hero banners, not drafts or other placements', async () => {
    supabaseDouble.seedContentBlock(contentBlockRow({ id: 'b-live', slug: 'hero-live' }));
    supabaseDouble.seedContentBlock(contentBlockRow({
      id: 'b-draft', slug: 'hero-draft', published: false,
    }));
    supabaseDouble.seedContentBlock(contentBlockRow({
      id: 'b-other', slug: 'footer-note', placement: 'footer_note',
    }));

    const slides = await fetchPublishedHeroSlides();

    expect(slides.map((slide) => slide.id)).toEqual(['hero-live']);
  });

  it('keeps the console order: sort_order first, then newest first', async () => {
    supabaseDouble.seedContentBlock(contentBlockRow({
      id: 'b-second', slug: 'hero-second', sort_order: 20, created_at: '2026-10-09T00:00:00.000Z',
    }));
    supabaseDouble.seedContentBlock(contentBlockRow({
      id: 'b-first', slug: 'hero-first', sort_order: 10, created_at: '2026-10-05T00:00:00.000Z',
    }));
    supabaseDouble.seedContentBlock(contentBlockRow({
      id: 'b-tie-new', slug: 'hero-tie-new', sort_order: 10, created_at: '2026-10-08T00:00:00.000Z',
    }));

    const slides = await fetchPublishedHeroSlides();

    expect(slides.map((slide) => slide.id)).toEqual(['hero-tie-new', 'hero-first', 'hero-second']);
  });

  it('maps the banner body the console writes onto the slide shape', async () => {
    supabaseDouble.seedContentBlock(contentBlockRow({
      slug: 'hero-audio',
      title: 'Row title is not the headline',
      body: {
        headline: 'Sound, sorted',
        subtitle: 'Headphones from verified sellers.',
        imageUrl: 'https://cdn.example.test/hero-audio.jpg',
        ctaText: 'Shop Audio',
        ctaLink: '/products?category=audio-wearables',
      },
    }));

    const slides = await fetchPublishedHeroSlides();

    expect(slides).toEqual([{
      id: 'hero-audio',
      title: 'Sound, sorted',
      subtitle: 'Headphones from verified sellers.',
      image: 'https://cdn.example.test/hero-audio.jpg',
      link: '/products?category=audio-wearables',
      alt: 'Sound, sorted',
      ctaText: 'Shop Audio',
    }]);
  });

  it('returns nothing when no banner is published, so the caller falls back', async () => {
    supabaseDouble.seedContentBlock(contentBlockRow({ published: false }));

    await expect(fetchPublishedHeroSlides()).resolves.toEqual([]);
  });

  it('throws when the read fails instead of pretending the CMS is empty', async () => {
    supabaseDouble.failures.content_blocks = 'permission denied for table content_blocks';

    await expect(fetchPublishedHeroSlides()).rejects.toThrow(/failed to load the hero banners/i);
  });
});

describe('heroSlidesFromRows', () => {
  it('falls back to the row title when the body carries no headline', () => {
    const slides = heroSlidesFromRows([
      contentBlockRow({ title: 'Title only banner', body: { imageUrl: 'https://cdn.example.test/x.jpg' } }),
    ]);

    expect(slides[0]?.title).toBe('Title only banner');
    expect(slides[0]?.alt).toBe('Title only banner');
  });

  it('skips a banner with no image rather than rendering a broken frame', () => {
    const slides = heroSlidesFromRows([
      contentBlockRow({ id: 'no-image', slug: 'no-image', body: { headline: 'No picture' } }),
      contentBlockRow({ id: 'with-image', slug: 'with-image' }),
    ]);

    expect(slides.map((slide) => slide.id)).toEqual(['with-image']);
  });

  it('defaults the call to action when the body leaves it blank', () => {
    const slides = heroSlidesFromRows([
      contentBlockRow({ body: { headline: 'H', imageUrl: 'https://cdn.example.test/y.jpg' } }),
    ]);

    expect(slides[0]?.ctaText).toBe('Shop Now');
    expect(slides[0]?.link).toBe('/products');
  });
});

describe('FALLBACK_HERO_SLIDES', () => {
  it('are the built-in slides the hero shipped with, images and links intact', () => {
    expect(FALLBACK_HERO_SLIDES.map((slide) => slide.id)).toEqual([
      'hero-smartphones',
      'hero-wearables',
      'hero-tech',
    ]);
    for (const slide of FALLBACK_HERO_SLIDES) {
      expect(slide.image).toMatch(/^\/images\//);
      expect(slide.link).toMatch(/^\/products/);
      expect(slide.ctaText).toBe('Shop Now');
    }
  });
});
