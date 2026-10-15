import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return {
    supabase: supabaseDouble,
    isSupabaseConfigured: true,
    TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
  };
});

import {
  fetchPublishedHeroLeftPromo,
  fetchPublishedHeroPortraits,
  heroLeftPromoFromRows,
  heroPortraitsFromRows,
} from './hero-banners';
import { contentBlockRow, supabaseDouble } from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
});

describe('heroPortraitsFromRows (Batch 85: the rail is a list)', () => {
  it('collects every usable portrait across rows, in order', () => {
    const portraits = heroPortraitsFromRows([
      contentBlockRow({
        slug: 'p-1',
        body: {
          headline: 'Home & Kitchen Made Beautiful',
          imageUrl: '/images/home/hero-home-kitchen.webp',
          ctaLink: '/products?category=home-kitchen',
        },
      }),
      contentBlockRow({
        slug: 'p-2',
        body: {
          headline: 'Your Beauty & Self-Care, All in One Place',
          imageUrl: '/images/home/hero-beauty.webp',
          ctaLink: '/products?category=beauty-personal-care',
        },
      }),
    ]);
    expect(portraits.map((p) => p.image)).toEqual([
      '/images/home/hero-home-kitchen.webp',
      '/images/home/hero-beauty.webp',
    ]);
    expect(portraits[0].link).toBe('/products?category=home-kitchen');
    expect(portraits[1].alt).toBe('Your Beauty & Self-Care, All in One Place');
  });

  it('expands array bodies and skips rows with no image', () => {
    const portraits = heroPortraitsFromRows([
      contentBlockRow({
        slug: 'p-array',
        body: [
          { headline: 'One', imageUrl: '/one.png', ctaLink: '/a' },
          { headline: 'No image here', ctaLink: '/b' },
          { headline: 'Two', imageUrl: '/two.png', ctaLink: '/c' },
        ],
      }),
    ]);
    expect(portraits.map((p) => p.image)).toEqual(['/one.png', '/two.png']);
  });
});

describe('fetchPublishedHeroPortraits', () => {
  it('returns published portrait-placement rows in sort order only', async () => {
    supabaseDouble.seedContentBlock(
      contentBlockRow({
        slug: 'beauty',
        placement: 'homepage_hero_portrait',
        sort_order: 20,
        body: { headline: 'Beauty', imageUrl: '/beauty.png', ctaLink: '/products?category=beauty-personal-care' },
      }),
    );
    supabaseDouble.seedContentBlock(
      contentBlockRow({
        slug: 'kitchen',
        placement: 'homepage_hero_portrait',
        sort_order: 10,
        body: { headline: 'Kitchen', imageUrl: '/kitchen.png', ctaLink: '/products?category=home-kitchen' },
      }),
    );
    supabaseDouble.seedContentBlock(
      contentBlockRow({
        slug: 'draft',
        placement: 'homepage_hero_portrait',
        published: false,
        sort_order: 5,
        body: { headline: 'Draft', imageUrl: '/draft.png', ctaLink: '/x' },
      }),
    );
    supabaseDouble.seedContentBlock(contentBlockRow({ slug: 'main-hero' }));

    const portraits = await fetchPublishedHeroPortraits();
    expect(portraits.map((p) => p.image)).toEqual(['/kitchen.png', '/beauty.png']);
  });
});

describe('heroLeftPromoFromRows / fetchPublishedHeroLeftPromo (Batch 85)', () => {
  it('maps the first usable left-promo banner', () => {
    const promo = heroLeftPromoFromRows([
      contentBlockRow({
        slug: 'hero-left-promo-best-seller',
        title: 'Best Seller Category',
        body: {
          headline: 'Best Seller Category',
          imageUrl: '/images/home/hero-left-best-seller.webp',
          ctaLink: '/deals',
        },
      }),
    ]);
    expect(promo).toEqual({
      image: '/images/home/hero-left-best-seller.webp',
      link: '/deals',
      alt: 'Best Seller Category',
      title: 'Best Seller Category',
    });
  });

  it('is null when nothing usable is published (the column stays absent)', async () => {
    expect(heroLeftPromoFromRows([])).toBeNull();
    await expect(fetchPublishedHeroLeftPromo()).resolves.toBeNull();
  });

  it('reads the published left-promo row from the CMS', async () => {
    supabaseDouble.seedContentBlock(
      contentBlockRow({
        slug: 'hero-left-promo-best-seller',
        placement: 'homepage_left_promo',
        body: {
          headline: 'Best Seller Category',
          imageUrl: '/images/home/hero-left-best-seller.webp',
          ctaLink: '/deals',
        },
      }),
    );
    const promo = await fetchPublishedHeroLeftPromo();
    expect(promo?.image).toBe('/images/home/hero-left-best-seller.webp');
    expect(promo?.link).toBe('/deals');
  });
});
