import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

/**
 * Homepage sections: the image blocks of the homepage live in
 * `site_sections` + `site_section_items`, managed from the admin console's
 * Homepage Sections page. This module is the storefront's read of them.
 *
 * The read is deliberately two-state. A SUCCESSFUL read is honoured exactly
 * - including "no sections", which is what an admin deleting or disabling
 * a block must mean. A FAILED read (the table is not there yet because the
 * migration has not run on the host, or the network hiccuped) reports
 * `error`, and the section slots render the built-in composition instead:
 * the homepage must never go blank over a CMS table.
 */

export interface SiteSectionItem {
  id: string;
  sectionId: string;
  imageUrl: string;
  heading: string;
  subtext: string;
  ctaLabel: string;
  ctaLink: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SiteSection {
  id: string;
  key: string;
  type: string;
  title: string;
  settings: Record<string, unknown>;
  sortOrder: number;
  isEnabled: boolean;
  items: SiteSectionItem[];
}

const SECTION_SELECT =
  'id, key, type, title, settings, sort_order, is_enabled, created_at, updated_at';
const ITEM_SELECT =
  'id, section_id, image_url, heading, subtext, cta_label, cta_link, sort_order, is_active, created_at, updated_at';

/* Local coercions, the same call the neighbouring home modules made:
 * feature modules that only share a database do not import each other's
 * plumbing. */
const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const bool = (value: unknown): boolean => value === true;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function sectionItemFromRow(row: Record<string, unknown>): SiteSectionItem {
  return {
    id: text(row.id),
    sectionId: text(row.section_id),
    imageUrl: text(row.image_url),
    heading: text(row.heading),
    subtext: text(row.subtext),
    ctaLabel: text(row.cta_label),
    ctaLink: text(row.cta_link),
    sortOrder: num(row.sort_order),
    isActive: bool(row.is_active),
  };
}

/**
 * Joins section rows with their item rows. Only enabled sections and
 * active items survive (the RLS view already enforces this for shoppers;
 * filtering here too keeps a signed-in staff session's storefront visit
 * showing the same public page), each list in its stored order.
 */
export function sectionsFromRows(
  sectionRows: Array<Record<string, unknown>>,
  itemRows: Array<Record<string, unknown>>,
): SiteSection[] {
  const itemsBySection = new Map<string, SiteSectionItem[]>();
  for (const raw of itemRows) {
    const item = sectionItemFromRow(raw);
    if (!item.isActive) continue;
    const list = itemsBySection.get(item.sectionId) ?? [];
    list.push(item);
    itemsBySection.set(item.sectionId, list);
  }

  const sections: SiteSection[] = [];
  for (const raw of sectionRows) {
    if (!bool(raw.is_enabled)) continue;
    const id = text(raw.id);
    sections.push({
      id,
      key: text(raw.key),
      type: text(raw.type),
      title: text(raw.title),
      settings: asRecord(raw.settings),
      sortOrder: num(raw.sort_order),
      isEnabled: true,
      items: (itemsBySection.get(id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
    });
  }
  return sections.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Enabled sections with their active items, in console order. */
export async function fetchPublishedSections(signal?: AbortSignal): Promise<SiteSection[]> {
  let sectionQuery = supabase
    .from('site_sections')
    .select(SECTION_SELECT)
    .eq('is_enabled', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (signal) sectionQuery = sectionQuery.abortSignal(signal);

  const { data: sectionData, error: sectionError } = await sectionQuery;
  if (sectionError) {
    throw new Error(`Failed to load the homepage sections: ${sectionError.message}`);
  }
  const sectionRows = (sectionData ?? []) as unknown as Array<Record<string, unknown>>;
  if (sectionRows.length === 0) return [];

  let itemQuery = supabase
    .from('site_section_items')
    .select(ITEM_SELECT)
    .eq('is_active', true)
    .in(
      'section_id',
      sectionRows.map((row) => text(row.id)),
    )
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (signal) itemQuery = itemQuery.abortSignal(signal);

  const { data: itemData, error: itemError } = await itemQuery;
  if (itemError) {
    throw new Error(`Failed to load the homepage section items: ${itemError.message}`);
  }
  return sectionsFromRows(
    sectionRows,
    (itemData ?? []) as unknown as Array<Record<string, unknown>>,
  );
}

export type PublishedSectionsState =
  | { status: 'pending'; sections: SiteSection[] }
  | { status: 'error'; sections: SiteSection[] }
  | { status: 'ready'; sections: SiteSection[] };

/**
 * The sections state the slots render from. `pending` and `error` both
 * carry no sections: slots show their built-in fallback for both, so the
 * page is complete while the read is in flight and stays complete if the
 * sections table is not there. Only `ready` is data-driven.
 */
export function usePublishedSections(): PublishedSectionsState {
  const query = useQuery({
    queryKey: ['home', 'sections'] as const,
    queryFn: ({ signal }) => fetchPublishedSections(signal),
    staleTime: 1000 * 60 * 5,
  });
  if (query.data) return { status: 'ready', sections: query.data };
  if (query.isError) return { status: 'error', sections: [] };
  return { status: 'pending', sections: [] };
}
