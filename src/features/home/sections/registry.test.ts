import { describe, expect, it } from 'vitest';
import {
  ADMIN_CREATABLE_TYPES,
  SECTION_TYPE_REGISTRY,
  sectionTypeDefinition,
  sectionsForAnchor,
} from './registry';
import type { SiteSection } from '../api/sections';

const section = (type: string, key = type): SiteSection => ({
  id: `id-${key}`,
  key,
  type,
  title: key,
  settings: {},
  sortOrder: 0,
  isEnabled: true,
  items: [],
});

describe('section registry (Batch 85)', () => {
  it('has unique type names', () => {
    const types = SECTION_TYPE_REGISTRY.map((def) => def.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('every admin-creatable type has a renderer and an anchor', () => {
    for (const def of ADMIN_CREATABLE_TYPES) {
      expect(def.component, def.type).not.toBeNull();
      expect(def.anchor, def.type).not.toBeNull();
    }
  });

  it('registers the three converted types as creatable', () => {
    for (const type of ['category-tiles', 'inspiration-mosaic', 'promo-banner']) {
      expect(sectionTypeDefinition(type)?.component, type).not.toBeNull();
    }
  });

  it('registers the product-data rails as documentation only (no renderer)', () => {
    for (const type of [
      'best-sellers-rail',
      'recommended-shelf',
      'deals-strip',
      'brand-spotlight',
      'seller-spotlight',
      'digital-showcase',
    ]) {
      const def = sectionTypeDefinition(type);
      expect(def, type).toBeDefined();
      expect(def?.component).toBeNull();
      expect(def?.anchor).toBeNull();
    }
  });

  it('the promo banner is copy-only: no items, settings fields instead', () => {
    const def = sectionTypeDefinition('promo-banner');
    expect(def?.usesItems).toBe(false);
    expect(def?.settingsFields.map((f) => f.key)).toEqual([
      'eyebrow',
      'headingLead',
      'headingAccent',
      'subtext',
      'bullets',
    ]);
  });

  it('sectionsForAnchor groups sections by their type anchor', () => {
    const sections = [
      section('promo-banner', 'promo'),
      section('category-tiles', 'tiles'),
      section('inspiration-mosaic', 'mosaic'),
      section('best-sellers-rail', 'rail'),
      section('category-tiles', 'tiles-2'),
    ];
    expect(sectionsForAnchor(sections, 'categories').map((s) => s.key)).toEqual([
      'tiles',
      'tiles-2',
    ]);
    expect(sectionsForAnchor(sections, 'mosaic').map((s) => s.key)).toEqual(['mosaic']);
    expect(sectionsForAnchor(sections, 'promo').map((s) => s.key)).toEqual(['promo']);
  });
});
