import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { asRecord, json, rpcFailed, text, bool, num } from './admin-client';

/**
 * Homepage sections: the console's read/write of `site_sections`
 * and `site_section_items`. Unlike the storefront read (features/home),
 * this one returns EVERYTHING - disabled sections and inactive items
 * included - because managing the hidden rows is the console's job. RLS
 * backs that split: staff read all rows, only admins write, and every
 * write here opens with the `admin_require_admin()` guard so a refused
 * write says so instead of silently touching zero rows.
 */

const SECTION_SELECT =
  'id, key, type, title, settings, sort_order, is_enabled, created_at, updated_at';
const ITEM_SELECT =
  'id, section_id, image_url, heading, subtext, cta_label, cta_link, sort_order, is_active, created_at, updated_at';

type SectionInsert = Database['public']['Tables']['site_sections']['Insert'];
type SectionUpdate = Database['public']['Tables']['site_sections']['Update'];
type ItemInsert = Database['public']['Tables']['site_section_items']['Insert'];
type ItemUpdate = Database['public']['Tables']['site_section_items']['Update'];

export interface AdminSectionItem {
  id: string;
  sectionId: string;
  imageUrl: string;
  heading: string;
  subtext: string;
  ctaLabel: string;
  ctaLink: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface AdminSection {
  id: string;
  key: string;
  type: string;
  title: string;
  settings: Record<string, unknown>;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  items: AdminSectionItem[];
}

export interface SectionDraft {
  key: string;
  type: string;
  title: string;
  settings?: Record<string, unknown>;
  isEnabled?: boolean;
  sortOrder?: number;
}

export interface SectionPatch {
  title?: string;
  settings?: Record<string, unknown>;
  sortOrder?: number;
  isEnabled?: boolean;
}

export interface SectionItemDraft {
  imageUrl: string;
  heading: string;
  subtext: string;
  ctaLabel: string;
  ctaLink: string;
  isActive: boolean;
}

async function requireAdmin(operation: string): Promise<void> {
  const { error } = await supabase.rpc('admin_require_admin', { p_operation: operation });
  if (error) throw rpcFailed(operation, error.message);
}

/** "My New Section!" -> "my-new-section" - the key a section is created with. */
export function slugifySectionKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapItem(row: Record<string, unknown>): AdminSectionItem {
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
    createdAt: text(row.created_at),
  };
}

function mapSection(
  row: Record<string, unknown>,
  itemsBySection: Map<string, AdminSectionItem[]>,
): AdminSection {
  const id = text(row.id);
  return {
    id,
    key: text(row.key),
    type: text(row.type),
    title: text(row.title),
    settings: asRecord(row.settings),
    sortOrder: num(row.sort_order),
    isEnabled: bool(row.is_enabled),
    createdAt: text(row.created_at),
    items: (itemsBySection.get(id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

/** Every section with every item, in console order (sort_order, then creation). */
export async function fetchAdminSections(signal?: AbortSignal): Promise<AdminSection[]> {
  let sectionQuery = supabase
    .from('site_sections')
    .select(SECTION_SELECT)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (signal) sectionQuery = sectionQuery.abortSignal(signal);

  const { data: sectionData, error: sectionError } = await sectionQuery;
  if (sectionError) throw rpcFailed('Failed to load the homepage sections', sectionError.message);
  const sectionRows = (sectionData ?? []) as unknown as Array<Record<string, unknown>>;

  const itemsBySection = new Map<string, AdminSectionItem[]>();
  if (sectionRows.length > 0) {
    let itemQuery = supabase
      .from('site_section_items')
      .select(ITEM_SELECT)
      .in(
        'section_id',
        sectionRows.map((row) => text(row.id)),
      )
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (signal) itemQuery = itemQuery.abortSignal(signal);

    const { data: itemData, error: itemError } = await itemQuery;
    if (itemError) throw rpcFailed('Failed to load the section items', itemError.message);
    for (const raw of (itemData ?? []) as unknown as Array<Record<string, unknown>>) {
      const item = mapItem(raw);
      const list = itemsBySection.get(item.sectionId) ?? [];
      list.push(item);
      itemsBySection.set(item.sectionId, list);
    }
  }

  return sectionRows.map((row) => mapSection(row, itemsBySection));
}

export async function createSection(draft: SectionDraft): Promise<AdminSection> {
  await requireAdmin('create a homepage section');

  const key = slugifySectionKey(draft.key || draft.title);
  if (!key) throw rpcFailed('Could not create the section', 'give the section a title or a key');
  if (!draft.type) throw rpcFailed('Could not create the section', 'choose a section type');

  const row: SectionInsert = {
    key,
    type: draft.type,
    title: draft.title,
    settings: json(draft.settings ?? {}),
    is_enabled: draft.isEnabled ?? true,
    sort_order: draft.sortOrder ?? 1000,
  };

  const { data, error } = await supabase
    .from('site_sections')
    .insert(row)
    .select(SECTION_SELECT)
    .single();
  if (error) throw rpcFailed('Could not create the section', error.message);
  return mapSection(data as unknown as Record<string, unknown>, new Map());
}

export async function updateSection(id: string, patch: SectionPatch): Promise<AdminSection> {
  await requireAdmin('edit a homepage section');

  const update: SectionUpdate = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.settings !== undefined) update.settings = json(patch.settings);
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
  if (patch.isEnabled !== undefined) update.is_enabled = patch.isEnabled;

  const { data, error } = await supabase
    .from('site_sections')
    .update(update)
    .eq('id', id)
    .select(SECTION_SELECT)
    .maybeSingle();
  if (error) throw rpcFailed('Could not save the section', error.message);
  if (!data) throw rpcFailed('Could not save the section', 'that section is not editable');
  return mapSection(data as unknown as Record<string, unknown>, new Map());
}

/** Deletes the section; its items go with it (ON DELETE CASCADE). */
export async function deleteSection(id: string): Promise<void> {
  await requireAdmin('delete a homepage section');

  const { data, error } = await supabase
    .from('site_sections')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw rpcFailed('Could not delete the section', error.message);
  if (!data || data.length === 0) {
    throw rpcFailed('Could not delete the section', 'that section is not one you can remove');
  }
}

function itemInsert(sectionId: string, draft: SectionItemDraft, sortOrder: number): ItemInsert {
  return {
    section_id: sectionId,
    image_url: draft.imageUrl,
    heading: draft.heading,
    subtext: draft.subtext,
    cta_label: draft.ctaLabel,
    cta_link: draft.ctaLink,
    is_active: draft.isActive,
    sort_order: sortOrder,
  };
}

export async function createSectionItem(
  sectionId: string,
  draft: SectionItemDraft,
  sortOrder: number,
): Promise<AdminSectionItem> {
  await requireAdmin('add a section item');

  const { data, error } = await supabase
    .from('site_section_items')
    .insert(itemInsert(sectionId, draft, sortOrder))
    .select(ITEM_SELECT)
    .single();
  if (error) throw rpcFailed('Could not add the item', error.message);
  return mapItem(data as unknown as Record<string, unknown>);
}

export async function updateSectionItem(
  id: string,
  patch: Partial<SectionItemDraft> & { sortOrder?: number },
): Promise<AdminSectionItem> {
  await requireAdmin('edit a section item');

  const update: ItemUpdate = {};
  if (patch.imageUrl !== undefined) update.image_url = patch.imageUrl;
  if (patch.heading !== undefined) update.heading = patch.heading;
  if (patch.subtext !== undefined) update.subtext = patch.subtext;
  if (patch.ctaLabel !== undefined) update.cta_label = patch.ctaLabel;
  if (patch.ctaLink !== undefined) update.cta_link = patch.ctaLink;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;

  const { data, error } = await supabase
    .from('site_section_items')
    .update(update)
    .eq('id', id)
    .select(ITEM_SELECT)
    .maybeSingle();
  if (error) throw rpcFailed('Could not save the item', error.message);
  if (!data) throw rpcFailed('Could not save the item', 'that item is not editable');
  return mapItem(data as unknown as Record<string, unknown>);
}

export async function deleteSectionItem(id: string): Promise<void> {
  await requireAdmin('delete a section item');

  const { data, error } = await supabase
    .from('site_section_items')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw rpcFailed('Could not delete the item', error.message);
  if (!data || data.length === 0) {
    throw rpcFailed('Could not delete the item', 'that item is not one you can remove');
  }
}
