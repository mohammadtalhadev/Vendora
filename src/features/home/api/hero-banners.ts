import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

/**
 * The homepage hero is fed by the CMS: hero banners are `content_blocks` rows of
 * placement `homepage_hero`, the same rows the admin console's CMS screen writes.
 * The public read asks for published rows only, which is also all the
 * `content_select_published` policy hands an anonymous client - so what the
 * console publishes is what the carousel shows, in the console's sort order.
 *
 * Until a banner is published (or if the read fails), the carousel keeps the
 * built-in slides below: they are real catalogue photography with copy this
 * codebase wrote, not placeholders standing in for the CMS.
 */

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  alt: string;
  ctaText: string;
}

/** The built-in slides: the owner's current 16:9 campaign banners. */
export const FALLBACK_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-iphone',
    title: 'iPhone 18 Pro Max',
    subtitle: 'The next generation is here — A19 Bionic, Holo-Display, Pro Camera.',
    image: '/banners/hero-iphone.webp',
    link: '/brands/apple-official',
    alt: 'iPhone 18 Pro Max',
    ctaText: 'Shop Now',
  },
  {
    id: 'hero-airpods',
    title: 'AirPods Pro 2',
    subtitle: 'Pure sound, zero distractions — Adaptive Audio and Active Noise Cancellation.',
    image: '/banners/hero-airpods.webp',
    link: '/products?category=audio-wearables',
    alt: 'AirPods Pro 2',
    ctaText: 'Shop Now',
  },
  {
    id: 'hero-fashion',
    title: 'Upgrade Your Style Today',
    subtitle: 'Premium fashion from top brands — trendy looks, better prices.',
    image: '/banners/hero-fashion.webp',
    link: '/products?category=fashion',
    alt: 'Fashion — upgrade your style',
    ctaText: 'Shop Now',
  },
];

/**
 * The hero's portrait rail: one tall (9:16) banner beside the carousel,
 * fed by its own CMS placement (`homepage_hero_portrait`) so the console's
 * landscape slides and the portrait slot never fight over one list.
 */
export interface HeroPortrait {
  image: string;
  link: string;
  alt: string;
}

/** The built-in portrait banner: the owner's 9:16 Apple Watch campaign. */
export const FALLBACK_HERO_PORTRAIT: HeroPortrait = {
  image: '/banners/hero-watch.webp',
  link: '/brands/apple-official',
  alt: 'Apple Watch Series 10',
};

const PORTRAIT_PLACEMENT = 'homepage_hero_portrait';

const PLACEMENT = 'homepage_hero';

const BANNER_SELECT =
  'id, slug, title, body, placement, published, sort_order, created_at, updated_at';

/* The small coercions are kept local on purpose, the same call the admin and
 * vendor clients made: feature modules that only share a database do not import
 * each other's plumbing. */
const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Maps banner rows onto the carousel's slide shape. The `body` jsonb is the
 * shape the admin console writes: headline, subtitle, imageUrl, ctaText,
 * ctaLink. A row with no image cannot be a slide - the carousel would render a
 * broken frame - so it is skipped rather than padded out.
 */
export function heroSlidesFromRows(rows: Array<Record<string, unknown>>): HeroSlide[] {
  const slides: HeroSlide[] = [];
  for (const row of rows) {
    /* The console writes one object per row. Rows seeded before that shape
     * settled can still hold an array of slide objects, so both are read:
     * an array contributes one slide per element instead of being skipped. */
    const bodies = Array.isArray(row.body) ? row.body.map(asRecord) : [asRecord(row.body)];
    const baseId = text(row.slug) || text(row.id);
    bodies.forEach((body, index) => {
      const image = text(body.imageUrl);
      if (!image) return;
      const headline = text(body.headline) || text(row.title);
      slides.push({
        id: index === 0 ? baseId : `${baseId}-${index + 1}`,
        title: headline,
        subtitle: text(body.subtitle),
        image,
        link: text(body.ctaLink) || '/products',
        alt: headline,
        ctaText: text(body.ctaText) || 'Shop Now',
      });
    });
  }
  return slides;
}

/** Published hero banners only, in the console's order (sort_order, then newest). */
export async function fetchPublishedHeroSlides(signal?: AbortSignal): Promise<HeroSlide[]> {
  let query = supabase
    .from('content_blocks')
    .select(BANNER_SELECT)
    .eq('placement', PLACEMENT)
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load the hero banners: ${error.message}`);
  return heroSlidesFromRows((data ?? []) as unknown as Array<Record<string, unknown>>);
}

/**
 * The slides the carousel renders: the published CMS banners when at least one
 * usable one loaded, the built-in slides otherwise - including when the read
 * failed, because a storefront hero must never go blank over a CMS hiccup.
 */
export function useHeroSlides(): HeroSlide[] {
  const { data } = useQuery({
    queryKey: ['home', 'hero-banners'] as const,
    queryFn: ({ signal }) => fetchPublishedHeroSlides(signal),
    staleTime: 1000 * 60 * 5,
  });
  return data && data.length > 0 ? data : FALLBACK_HERO_SLIDES;
}

/** Maps portrait-placement rows onto the rail's shape; the first usable row wins. */
export function heroPortraitFromRows(rows: Array<Record<string, unknown>>): HeroPortrait | null {
  for (const row of rows) {
    const bodies = Array.isArray(row.body) ? row.body.map(asRecord) : [asRecord(row.body)];
    for (const body of bodies) {
      const image = text(body.imageUrl);
      if (!image) continue;
      return {
        image,
        link: text(body.ctaLink) || '/products',
        alt: text(body.headline) || text(row.title) || 'Featured banner',
      };
    }
  }
  return null;
}

/** The published portrait banner, when the CMS has one. */
export async function fetchPublishedHeroPortrait(
  signal?: AbortSignal,
): Promise<HeroPortrait | null> {
  let query = supabase
    .from('content_blocks')
    .select(BANNER_SELECT)
    .eq('placement', PORTRAIT_PLACEMENT)
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load the hero portrait banner: ${error.message}`);
  return heroPortraitFromRows((data ?? []) as unknown as Array<Record<string, unknown>>);
}

/** The portrait the rail renders: the CMS banner when published, the built-in otherwise. */
export function useHeroPortrait(): HeroPortrait {
  const { data } = useQuery({
    queryKey: ['home', 'hero-portrait'] as const,
    queryFn: ({ signal }) => fetchPublishedHeroPortrait(signal),
    staleTime: 1000 * 60 * 5,
  });
  return data ?? FALLBACK_HERO_PORTRAIT;
}

/* --------------------------------------------------------------------------
 * the portrait rail is a carousel, not a single banner. Every
 * published `homepage_hero_portrait` row contributes its usable bodies in
 * the console's order, and the rail rotates through them. The single-
 * portrait helpers above stay for compatibility; the homepage uses the
 * list. Zero published rows (or a failed read) keeps the built-in watch
 * banner as a one-item rail - the pre-batch behaviour, unchanged.
 * ------------------------------------------------------------------------ */

/** All usable portrait banners in a row set, in order (a row can hold several bodies). */
export function heroPortraitsFromRows(rows: Array<Record<string, unknown>>): HeroPortrait[] {
  const portraits: HeroPortrait[] = [];
  for (const row of rows) {
    const bodies = Array.isArray(row.body) ? row.body.map(asRecord) : [asRecord(row.body)];
    for (const body of bodies) {
      const image = text(body.imageUrl);
      if (!image) continue;
      portraits.push({
        image,
        link: text(body.ctaLink) || '/products',
        alt: text(body.headline) || text(row.title) || 'Featured banner',
      });
    }
  }
  return portraits;
}

/** Every published portrait banner, in the console's order. */
export async function fetchPublishedHeroPortraits(
  signal?: AbortSignal,
): Promise<HeroPortrait[]> {
  let query = supabase
    .from('content_blocks')
    .select(BANNER_SELECT)
    .eq('placement', PORTRAIT_PLACEMENT)
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load the hero portrait banners: ${error.message}`);
  return heroPortraitsFromRows((data ?? []) as unknown as Array<Record<string, unknown>>);
}

/** The rail's rotation list: the published portraits, or the built-in one alone. */
export function useHeroPortraits(): HeroPortrait[] {
  const { data } = useQuery({
    queryKey: ['home', 'hero-portraits'] as const,
    queryFn: ({ signal }) => fetchPublishedHeroPortraits(signal),
    staleTime: 1000 * 60 * 5,
  });
  return data && data.length > 0 ? data : [FALLBACK_HERO_PORTRAIT];
}

/* --------------------------------------------------------------------------
 * The `homepage_left_promo` placement (added in re-homed in
 *): the left promo picture of the homepage's New Arrivals /
 * Best Seller / Best Offers section (DealsStrip). A published banner
 * replaces that card's built-in Tech Fest creative; no published banner
 * means the section renders its built-in card, exactly as before. (The
 * placement key keeps its name; only its home on the page moved.)
 * ------------------------------------------------------------------------ */

const LEFT_PROMO_PLACEMENT = 'homepage_left_promo';

export interface HeroLeftPromo {
  image: string;
  link: string;
  alt: string;
  title: string;
}

/** The first usable left-promo banner in a row set, if any. */
export function heroLeftPromoFromRows(
  rows: Array<Record<string, unknown>>,
): HeroLeftPromo | null {
  for (const row of rows) {
    const bodies = Array.isArray(row.body) ? row.body.map(asRecord) : [asRecord(row.body)];
    for (const body of bodies) {
      const image = text(body.imageUrl);
      if (!image) continue;
      const headline = text(body.headline) || text(row.title);
      return {
        image,
        link: text(body.ctaLink) || '/products',
        alt: headline || 'Featured promotion',
        title: headline,
      };
    }
  }
  return null;
}

/** The published left-promo banner, when the CMS has one. */
export async function fetchPublishedHeroLeftPromo(
  signal?: AbortSignal,
): Promise<HeroLeftPromo | null> {
  let query = supabase
    .from('content_blocks')
    .select(BANNER_SELECT)
    .eq('placement', LEFT_PROMO_PLACEMENT)
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load the hero left promo banner: ${error.message}`);
  return heroLeftPromoFromRows((data ?? []) as unknown as Array<Record<string, unknown>>);
}

/** The promo the deals section's left card renders, or null for the built-in card. */
export function useHeroLeftPromo(): HeroLeftPromo | null {
  const { data } = useQuery({
    queryKey: ['home', 'hero-left-promo'] as const,
    queryFn: ({ signal }) => fetchPublishedHeroLeftPromo(signal),
    staleTime: 1000 * 60 * 5,
  });
  return data ?? null;
}
