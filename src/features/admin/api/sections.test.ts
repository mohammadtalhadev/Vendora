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
  createSection,
  createSectionItem,
  deleteSection,
  deleteSectionItem,
  fetchAdminSections,
  slugifySectionKey,
  updateSection,
  updateSectionItem,
} from './sections';
import {
  siteSectionItemRow,
  siteSectionRow,
  supabaseDouble,
} from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
});

describe('slugifySectionKey', () => {
  it('slugifies titles into keys', () => {
    expect(slugifySectionKey('My New Section!')).toBe('my-new-section');
    expect(slugifySectionKey('  Summer  Sale ')).toBe('summer-sale');
    expect(slugifySectionKey('already-a-key')).toBe('already-a-key');
  });
});

describe('fetchAdminSections', () => {
  it('returns every section and item, disabled and inactive included', async () => {
    supabaseDouble.seedSiteSection(siteSectionRow({ id: 's-1', sort_order: 10 }));
    supabaseDouble.seedSiteSection(
      siteSectionRow({ id: 's-2', key: 'draft-promo', sort_order: 20, is_enabled: false }),
    );
    supabaseDouble.seedSiteSectionItem(siteSectionItemRow({ id: 'i-1', section_id: 's-1' }));
    supabaseDouble.seedSiteSectionItem(
      siteSectionItemRow({ id: 'i-2', section_id: 's-1', heading: 'Off tile', is_active: false, sort_order: 2 }),
    );

    const sections = await fetchAdminSections();
    expect(sections.map((s) => s.key)).toEqual(['popular-categories', 'draft-promo']);
    expect(sections[0].items.map((i) => i.heading)).toEqual(['Electronics', 'Off tile']);
    expect(sections[1].isEnabled).toBe(false);
  });
});

describe('section writes', () => {
  it('creates a section with a slugified key and reads it back', async () => {
    const created = await createSection({
      key: '',
      type: 'category-tiles',
      title: 'Weekend Picks',
      sortOrder: 40,
    });
    expect(created.key).toBe('weekend-picks');
    expect(created.type).toBe('category-tiles');
    expect(created.isEnabled).toBe(true);
    const sections = await fetchAdminSections();
    expect(sections.map((s) => s.key)).toContain('weekend-picks');
  });

  it('updates title, settings and the enabled switch', async () => {
    supabaseDouble.seedSiteSection(siteSectionRow({ id: 's-1' }));
    const updated = await updateSection('s-1', {
      title: 'Shop by Category',
      isEnabled: false,
      settings: { note: 'kept' },
    });
    expect(updated.title).toBe('Shop by Category');
    expect(updated.isEnabled).toBe(false);
    expect(updated.settings).toEqual({ note: 'kept' });
  });

  it('deletes a section', async () => {
    supabaseDouble.seedSiteSection(siteSectionRow({ id: 's-1' }));
    await deleteSection('s-1');
    await expect(fetchAdminSections()).resolves.toEqual([]);
  });
});

describe('item writes', () => {
  it('adds, edits and deletes an item under its section', async () => {
    supabaseDouble.seedSiteSection(siteSectionRow({ id: 's-1' }));
    const item = await createSectionItem(
      's-1',
      {
        imageUrl: '/images/categories/cat_fashion_2k.png',
        heading: 'Fashion',
        subtext: '',
        ctaLabel: '',
        ctaLink: '/products?category=fashion',
        isActive: true,
      },
      2,
    );
    expect(item.heading).toBe('Fashion');
    expect(item.sortOrder).toBe(2);

    const edited = await updateSectionItem(item.id, { heading: 'Fashion & Style', isActive: false });
    expect(edited.heading).toBe('Fashion & Style');
    expect(edited.isActive).toBe(false);

    await deleteSectionItem(item.id);
    const sections = await fetchAdminSections();
    expect(sections[0].items).toEqual([]);
  });
});
