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

/** The built-in slides, matching the user-upscaled images the hero shipped with. */
export const FALLBACK_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-smartphones',
    title: 'Smartphones & Flagship Tech',
    subtitle: 'Latest phones and wearables from verified sellers, with genuine warranty picks.',
    image: '/images/products/iphone_15_pro_natural.png',
    link: '/products?category=electronics',
    alt: 'Smartphones and flagship tech',
    ctaText: 'Shop Now',
  },
  {
    id: 'hero-wearables',
    title: 'Smartwatches & Wearables',
    subtitle: 'Fitness, health and notifications — on your wrist.',
    image: '/images/products/prod_smart_watch.jpg',
    link: '/products?category=electronics',
    alt: 'Smartwatches and wearables',
    ctaText: 'Shop Now',
  },
  {
    id: 'hero-tech',
    title: 'Phones, Cameras & More Tech',
    subtitle: 'Compare top brands side by side and shop the real catalogue.',
    image: '/images/bevesi/art_elec_phones.png',
    link: '/products?category=electronics',
    alt: 'Phones, cameras and more tech',
    ctaText: 'Shop Now',
  },
];

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
    const body = asRecord(row.body);
    const image = text(body.imageUrl);
    if (!image) continue;
    const headline = text(body.headline) || text(row.title);
    slides.push({
      id: text(row.slug) || text(row.id),
      title: headline,
      subtitle: text(body.subtitle),
      image,
      link: text(body.ctaLink) || '/products',
      alt: headline,
      ctaText: text(body.ctaText) || 'Shop Now',
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
