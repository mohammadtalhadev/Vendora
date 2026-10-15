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
  fetchPublishedSections,
  sectionsFromRows,
} from './sections';
import {
  siteSectionItemRow,
  siteSectionRow,
  supabaseDouble,
} from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
});

describe('sectionsFromRows', () => {
  it('joins items onto their sections, each list in sort order', () => {
    const sections = sectionsFromRows(
      [
        siteSectionRow({ id: 's-2', key: 'promo', sort_order: 20 }),
        siteSectionRow({ id: 's-1', key: 'tiles', sort_order: 10 }),
      ],
      [
        siteSectionItemRow({ id: 'i-2', section_id: 's-1', heading: 'Second', sort_order: 2 }),
        siteSectionItemRow({ id: 'i-1', section_id: 's-1', heading: 'First', sort_order: 1 }),
        siteSectionItemRow({ id: 'i-3', section_id: 's-2', heading: 'Promo item', sort_order: 1 }),
      ],
    );
    expect(sections.map((s) => s.key)).toEqual(['tiles', 'promo']);
    expect(sections[0].items.map((i) => i.heading)).toEqual(['First', 'Second']);
    expect(sections[1].items).toHaveLength(1);
  });

  it('drops disabled sections and inactive items (the public view)', () => {
    const sections = sectionsFromRows(
      [
        siteSectionRow({ id: 's-1', key: 'on' }),
        siteSectionRow({ id: 's-2', key: 'off', is_enabled: false }),
      ],
      [
        siteSectionItemRow({ id: 'i-1', section_id: 's-1', is_active: true }),
        siteSectionItemRow({ id: 'i-2', section_id: 's-1', is_active: false }),
        siteSectionItemRow({ id: 'i-3', section_id: 's-2', is_active: true }),
      ],
    );
    expect(sections.map((s) => s.key)).toEqual(['on']);
    expect(sections[0].items.map((i) => i.id)).toEqual(['i-1']);
  });

  it('carries settings through as an object, never a string', () => {
    const sections = sectionsFromRows(
      [siteSectionRow({ id: 's-1', settings: { bullets: ['One', 'Two'] } })],
      [],
    );
    expect(sections[0].settings).toEqual({ bullets: ['One', 'Two'] });
  });
});

describe('fetchPublishedSections', () => {
  it('returns enabled sections with active items only, in console order', async () => {
    supabaseDouble.seedSiteSection(
      siteSectionRow({ id: 's-promo', key: 'app-promo', type: 'promo-banner', sort_order: 30 }),
    );
    supabaseDouble.seedSiteSection(siteSectionRow({ id: 's-tiles', sort_order: 10 }));
    supabaseDouble.seedSiteSection(
      siteSectionRow({ id: 's-off', key: 'hidden', sort_order: 20, is_enabled: false }),
    );
    supabaseDouble.seedSiteSectionItem(
      siteSectionItemRow({ id: 'i-1', section_id: 's-tiles', heading: 'Electronics', sort_order: 1 }),
    );
    supabaseDouble.seedSiteSectionItem(
      siteSectionItemRow({ id: 'i-2', section_id: 's-tiles', heading: 'Draft tile', is_active: false }),
    );
    supabaseDouble.seedSiteSectionItem(
      siteSectionItemRow({ id: 'i-3', section_id: 's-off', heading: 'Hidden tile' }),
    );

    const sections = await fetchPublishedSections();
    expect(sections.map((s) => s.key)).toEqual(['popular-categories', 'app-promo']);
    expect(sections[0].items.map((i) => i.heading)).toEqual(['Electronics']);
  });

  it('returns an empty list (not an error) when the console has no sections', async () => {
    await expect(fetchPublishedSections()).resolves.toEqual([]);
  });

  it('rejects when the sections table cannot be read, so slots can fall back', async () => {
    supabaseDouble.failures.site_sections = 'relation "site_sections" does not exist';
    await expect(fetchPublishedSections()).rejects.toThrow(/Failed to load the homepage sections/);
  });
});
