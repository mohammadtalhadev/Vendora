import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { asRecord, json, rpcFailed, text, bool, num } from './admin-client';

/**
 * Hero banners are real rows of `content_blocks`. This module reads and writes only the
 * columns that table actually has: `slug`, `title`, `body`, `placement`, `published`,
 * `sort_order`. There is no scheduling or campaign-analytics column behind those, so no
 * control for them lives here - a knob that writes nothing is exactly what the console
 * is not supposed to ship.
 */

const PLACEMENT = 'homepage_hero';

/**
 * The homepage banner placements the console manages (Batch 85 added the
 * portrait rail and the promo placement to the original hero carousel).
 * The storefront reads each placement separately; the console lists and
 * writes all three from this one screen. Batch 87: `homepage_left_promo`
 * renders as the left banner of the New Arrivals / Best Seller / Best
 * Offers section, not in the hero (its key keeps the Batch 85 name).
 */
export const BANNER_PLACEMENTS = [
  { value: 'homepage_hero', label: 'Homepage hero — main carousel' },
  { value: 'homepage_hero_portrait', label: 'Homepage hero — right carousel' },
  { value: 'homepage_left_promo', label: 'Best sellers section — left banner' },
] as const;

export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number]['value'];

const PLACEMENT_VALUES: string[] = BANNER_PLACEMENTS.map((entry) => entry.value);

export function bannerPlacementLabel(placement: string): string {
  return (
    BANNER_PLACEMENTS.find((entry) => entry.value === placement)?.label ??
    placement
  );
}

function asPlacement(value: string | undefined): BannerPlacement {
  return value && PLACEMENT_VALUES.includes(value)
    ? (value as BannerPlacement)
    : PLACEMENT;
}

const BANNER_SELECT =
  'id, slug, title, body, placement, published, sort_order, created_at, updated_at';

type BannerInsert = Database['public']['Tables']['content_blocks']['Insert'];
type BannerUpdate = Database['public']['Tables']['content_blocks']['Update'];

/** The `body` jsonb the storefront and this console agree on. */
interface BannerBody {
  headline: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
}

export interface AdminBanner {
  id: string;
  slug: string;
  title: string;
  placement: string;
  headline: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface BannerDraft {
  headline: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  published: boolean;
  /** Defaults to the main hero carousel placement. */
  placement?: string;
}

/**
 * The write is guarded before it is attempted: `admin_require_admin()` raises for anyone
 * who is not platform staff, which is a clearer refusal than a silent zero-row RLS filter.
 */
async function requireAdmin(operation: string): Promise<void> {
  const { error } = await supabase.rpc('admin_require_admin', { p_operation: operation });
  if (error) throw rpcFailed(operation, error.message);
}

function bodyOf(value: unknown): BannerBody {
  const raw = asRecord(value);
  return {
    headline: text(raw.headline),
    subtitle: text(raw.subtitle),
    imageUrl: text(raw.imageUrl),
    ctaText: text(raw.ctaText),
    ctaLink: text(raw.ctaLink),
  };
}

function mapBanner(row: Record<string, unknown>): AdminBanner {
  const body = bodyOf(row.body);
  return {
    id: text(row.id),
    slug: text(row.slug),
    title: text(row.title),
    placement: text(row.placement) || PLACEMENT,
    headline: body.headline || text(row.title),
    subtitle: body.subtitle,
    imageUrl: body.imageUrl,
    ctaText: body.ctaText,
    ctaLink: body.ctaLink,
    published: bool(row.published),
    sortOrder: num(row.sort_order),
    createdAt: text(row.created_at),
  };
}

function toBody(draft: BannerDraft): BannerBody {
  return {
    headline: draft.headline,
    subtitle: draft.subtitle,
    imageUrl: draft.imageUrl,
    ctaText: draft.ctaText,
    ctaLink: draft.ctaLink,
  };
}

export async function fetchBanners(signal?: AbortSignal): Promise<AdminBanner[]> {
  let query = supabase
    .from('content_blocks')
    .select(BANNER_SELECT)
    .in('placement', PLACEMENT_VALUES)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw rpcFailed('Failed to load the hero banners', error.message);
  return (data ?? []).map((row) => mapBanner(row as unknown as Record<string, unknown>));
}

export async function createBanner(draft: BannerDraft): Promise<AdminBanner> {
  await requireAdmin('create a hero banner');

  const placement = asPlacement(draft.placement);
  const row: BannerInsert = {
    slug: `${placement.replace(/_/g, '-')}-${Date.now()}`,
    title: draft.headline,
    body: json(toBody(draft)),
    placement,
    published: draft.published,
  };

  const { data, error } = await supabase
    .from('content_blocks')
    .insert(row)
    .select(BANNER_SELECT)
    .single();
  if (error) throw rpcFailed('Could not create the banner', error.message);
  return mapBanner(data as unknown as Record<string, unknown>);
}

/** Edits the banner, then re-reads it; the row that comes back is the proof it landed. */
export async function updateBanner(id: string, draft: BannerDraft): Promise<AdminBanner> {
  await requireAdmin('edit a hero banner');

  const patch: BannerUpdate = {
    title: draft.headline,
    body: json(toBody(draft)),
    published: draft.published,
    ...(draft.placement ? { placement: asPlacement(draft.placement) } : {}),
  };

  const { data, error } = await supabase
    .from('content_blocks')
    .update(patch)
    .eq('id', id)
    .select(BANNER_SELECT)
    .maybeSingle();
  if (error) throw rpcFailed('Could not save the banner', error.message);
  if (!data) throw rpcFailed('Could not save the banner', 'that banner is not editable');
  return mapBanner(data as unknown as Record<string, unknown>);
}

export async function setBannerPublished(id: string, published: boolean): Promise<AdminBanner> {
  await requireAdmin('change a hero banner');

  const { data, error } = await supabase
    .from('content_blocks')
    .update({ published })
    .eq('id', id)
    .select(BANNER_SELECT)
    .maybeSingle();
  if (error) throw rpcFailed('Could not update the banner', error.message);
  if (!data) throw rpcFailed('Could not update the banner', 'that banner is not editable');
  return mapBanner(data as unknown as Record<string, unknown>);
}

export async function deleteBanner(id: string): Promise<void> {
  await requireAdmin('delete a hero banner');

  const { data, error } = await supabase
    .from('content_blocks')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw rpcFailed('Could not delete the banner', error.message);
  if (!data || data.length === 0) {
    throw rpcFailed('Could not delete the banner', 'that banner is not one you can remove');
  }
}
